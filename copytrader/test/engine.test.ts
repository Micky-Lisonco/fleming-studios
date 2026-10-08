import assert from 'node:assert/strict';
import { test } from 'node:test';

// Runs the real engine against a fake market: no network, in-memory database.
process.env.DB_PATH = ':memory:';
process.env.DATA_DIR = '/tmp/copytrader-test';

const WSOL = 'So11111111111111111111111111111111111111112';
const LEADER = 'Leader1111111111111111111111111111111111111';
const market: Record<string, { price: number; liq: number; sells?: number; buys?: number; change?: number }> = {};

globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
  const url = String(input);
  const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
  if (url.includes('api.dexscreener.com/tokens/v1/solana/')) {
    const mints = url.split('/').pop()!.split(',');
    return json(
      mints
        .filter((m) => market[m])
        .map((m) => ({
          baseToken: { address: m, symbol: m === WSOL ? 'SOL' : m.slice(0, 4) },
          quoteToken: { address: WSOL },
          pairAddress: `pair-${m}`,
          priceUsd: String(market[m].price),
          priceNative: String(market[m].price / 150),
          liquidity: { usd: market[m].liq },
          pairCreatedAt: Date.now() - 86400_000,
          txns: { m5: { buys: market[m].buys ?? 50, sells: market[m].sells ?? 30 } },
          priceChange: { m5: market[m].change ?? 1 },
        })),
    );
  }
  if (url.includes('geckoterminal')) return json({ data: { attributes: { ohlcv_list: [] } } });
  if (init?.method === 'POST') {
    const { method, id } = JSON.parse(String(init.body));
    if (method === 'getAccountInfo') {
      return json({ id, result: { value: { data: { parsed: { info: { mintAuthority: null, freezeAuthority: null } } } } } });
    }
  }
  throw new Error(`unexpected fetch ${url}`);
}) as typeof fetch;

const { db, getCash, getKv, getSettings, saveSettings, setKv } = await import('../src/db.ts');
const engine = await import('../src/engine.ts');

market[WSOL] = { price: 150, liq: 10_000_000 };
db.prepare(
  `INSERT INTO wallets (address, source, followed, pinned, score, stats, created_at) VALUES (?, 'manual', 1, 1, 80, ?, 0)`,
).run(LEADER, JSON.stringify({ avgPositionSol: 2 }));

let sig = 0;
const leaderSwap = (mint: string, side: 'buy' | 'sell', sol: number, tokens: number) => {
  const s = { signature: `s${++sig}`, slot: sig, time: Math.floor(Date.now() / 1000), wallet: LEADER, mint, side, tokenAmount: tokens, solAmount: sol };
  db.prepare('INSERT INTO leader_swaps (signature, wallet, mint, side, token_amount, sol_amount, slot, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    s.signature, s.wallet, s.mint, s.side, s.tokenAmount, s.solAmount, s.slot, s.time,
  );
  return engine.onLeaderSwap(s);
};
const priceTo = async (mint: string, price: number, extra = {}) => {
  market[mint] = { ...market[mint], price, ...extra };
  await engine.monitorPositions();
};
const open = () => engine.openPositions();
const closed = () => db.prepare('SELECT * FROM positions WHERE closed_at IS NOT NULL ORDER BY id').all() as any[];

test('copies a buy, protects it, banks half, trails out of the rest', async () => {
  await engine.resetPaper(50);
  const MINT = 'MoonCoin11111111111111111111111111111111111';
  market[MINT] = { price: 0.155, liq: 200_000 };
  await leaderSwap(MINT, 'buy', 2, 2000); // leader paid 2 SOL × $150 / 2000 = $0.15

  assert.equal(open().length, 1, 'should have entered');
  assert.equal(getCash(), 0, 'all-in compounding');
  const entry = open()[0].entry_price;
  assert.ok(entry > 0.155 && entry < 0.16, `entry ${entry}`);

  await priceTo(MINT, 0.2); // ~+27%
  assert.ok(open()[0].stop_price > entry, 'stop moved above entry: trade can no longer lose');

  await priceTo(MINT, 0.29); // > +80% target
  assert.equal(open()[0].partial_taken, 1, 'banked half');
  assert.ok(getCash() > 35, `cash after banking half: ${getCash()}`);

  await priceTo(MINT, 0.33);
  assert.equal(open().length, 1, 'still riding');
  await priceTo(MINT, 0.27); // ~18% off the high
  assert.equal(open().length, 0, 'trailing stop sold the rest');

  const t = closed()[0];
  assert.match(t.exit_reason, /trailing/);
  assert.ok(t.pnl_usd > 25, `profit ${t.pnl_usd}`);
  assert.ok(getCash() > 75);
});

test('skips a signal when the price already ran away from the leader', async () => {
  const MINT = 'LateCoin11111111111111111111111111111111111';
  market[MINT] = { price: 0.2, liq: 200_000 };
  await leaderSwap(MINT, 'buy', 2, 2000); // leader paid $0.15, now $0.20 = +33%
  assert.equal(open().length, 0);
  const s = db.prepare('SELECT action FROM leader_swaps WHERE mint = ?').get(MINT) as { action: string };
  assert.match(s.action, /above the leader/);
});

test('sells when the copied wallet sells', async () => {
  const MINT = 'FollowCoin111111111111111111111111111111111';
  market[MINT] = { price: 0.15, liq: 300_000 };
  await leaderSwap(MINT, 'buy', 2, 2000);
  assert.equal(open().length, 1);
  await priceTo(MINT, 0.16);
  await leaderSwap(MINT, 'sell', 2.1, 2000);
  assert.equal(open().length, 0);
  assert.match(closed().at(-1).exit_reason, /wallet we copied sold/);
});

test('pulled liquidity gets us out immediately', async () => {
  const MINT = 'RugCoin111111111111111111111111111111111111';
  market[MINT] = { price: 0.15, liq: 300_000 };
  await leaderSwap(MINT, 'buy', 2, 2000);
  await priceTo(MINT, 0.14, { liq: 90_000 });
  assert.equal(open().length, 0);
  assert.match(closed().at(-1).exit_reason, /liquidity dropped/);
});

test('three losses in a row pause new trades', async () => {
  saveSettings({ killSwitchDrawdownPct: 90 }); // test the pause on its own
  for (const name of ['LossA', 'LossB']) {
    const MINT = `${name}111111111111111111111111111111111111`;
    market[MINT] = { price: 0.15, liq: 300_000 };
    await leaderSwap(MINT, 'buy', 2, 2000);
    await priceTo(MINT, 0.11); // stop loss
  }
  assert.ok(getKv('pausedUntil', 0) > Date.now() / 1000, 'cooling off');
  const MINT = 'NextCoin11111111111111111111111111111111111';
  market[MINT] = { price: 0.15, liq: 300_000 };
  await leaderSwap(MINT, 'buy', 2, 2000);
  assert.equal(open().length, 0);
  assert.match((db.prepare('SELECT action FROM leader_swaps WHERE mint = ?').get(MINT) as any).action, /Cooling off/);
});

test('a leader whose copies lost three in a row and are net negative is dropped', () => {
  // +37.73 +3.24 -8.54 -23.67 -16.89: all-in sizing made the later losses bigger than the early win.
  const w = db.prepare('SELECT followed, note FROM wallets WHERE address = ?').get(LEADER) as any;
  assert.equal(w.followed, 0);
  assert.match(w.note, /Dropped: last 3 copies lost/);
});

test('kill switch turns the bot off after a deep drawdown', async () => {
  await engine.resetPaper(50);
  saveSettings({ killSwitchDrawdownPct: 50, lossStreakPause: 0, dailyLossLimitPct: 0 });
  db.prepare('UPDATE wallets SET followed = 1 WHERE address = ?').run(LEADER);
  for (const name of ['KillA', 'KillB', 'KillC']) {
    const MINT = `${name}111111111111111111111111111111111111`;
    market[MINT] = { price: 0.15, liq: 300_000 };
    await leaderSwap(MINT, 'buy', 2, 2000);
    await priceTo(MINT, 0.09); // price gaps through the stop: -40%
  }
  assert.ok(engine.equityUsd() < 25);
  const MINT = 'KillD111111111111111111111111111111111111111';
  market[MINT] = { price: 0.15, liq: 300_000 };
  await leaderSwap(MINT, 'buy', 2, 2000);
  assert.equal(open().length, 0);
  assert.equal(getSettings().botEnabled, false);
});
