import { db, getCash, getKv, getSettings, log, now, saveSettings, setCash, setKv } from './db.ts';
import { momentum, type Momentum } from './indicators.ts';
import { getMarkets, getSolUsd, type Market } from './sources/dexscreener.ts';
import { getCandles } from './sources/gecko.ts';
import { getMintInfo } from './sources/solana.ts';
import {
  decideExit,
  entryProblems,
  initialStop,
  positionSizeUsd,
  roundTripCostPct,
  simulateBuy,
  simulateSell,
} from './strategy.ts';
import type { Swap } from './swaps.ts';
import { getWallet, refreshFollowList, short, walletStats } from './wallets.ts';

export type Position = {
  id: number;
  mint: string;
  symbol: string | null;
  pair: string | null;
  leader: string;
  leader_sig: string;
  qty: number;
  cost_usd: number;
  entry_price: number;
  leader_price: number;
  entry_liquidity: number;
  cost_buffer_pct: number;
  high_price: number;
  stop_price: number;
  last_price: number;
  partial_taken: number;
  proceeds_usd: number;
  opened_at: number;
  closed_at: number | null;
  pnl_usd: number | null;
  exit_reason: string | null;
  notes: string;
};

// All trading decisions run one at a time so two signals can't spend the same money.
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

export const openPositions = () =>
  db.prepare('SELECT * FROM positions WHERE closed_at IS NULL ORDER BY opened_at').all() as Position[];

let solCache = { usd: 0, at: 0 };
async function solUsd() {
  if (Date.now() - solCache.at > 60_000) solCache = { usd: await getSolUsd(), at: Date.now() };
  return solCache.usd;
}

const candleCache = new Map<string, { at: number; mo: Momentum | null }>();
async function momentumFor(pair: string | null, maxAgeMs = 30_000): Promise<Momentum | null> {
  if (!pair) return null;
  const hit = candleCache.get(pair);
  if (hit && Date.now() - hit.at < maxAgeMs) return hit.mo;
  let mo: Momentum | null = null;
  try {
    mo = momentum(await getCandles(pair, 60));
  } catch {
    mo = hit?.mo ?? null;
  }
  candleCache.set(pair, { at: Date.now(), mo });
  return mo;
}

function note(p: Position, text: string) {
  const notes = JSON.parse(p.notes) as { t: number; text: string }[];
  notes.push({ t: now(), text });
  db.prepare('UPDATE positions SET notes = ? WHERE id = ?').run(JSON.stringify(notes), p.id);
}

function markSwap(swap: Swap, action: string) {
  db.prepare('UPDATE leader_swaps SET action = ? WHERE signature = ? AND wallet = ?').run(action, swap.signature, swap.wallet);
}

// ---------- Account protection ----------

export function equityUsd(): number {
  return getCash() + openPositions().reduce((a, p) => a + p.qty * p.last_price, 0);
}

export function recordEquity() {
  const e = equityUsd();
  db.prepare('INSERT INTO equity (time, value_usd) VALUES (?, ?)').run(now(), e);
  if (e > getKv('peakEquity', 0)) setKv('peakEquity', e);
  const today = new Date().toISOString().slice(0, 10);
  if (getKv<{ date: string }>('dayStart', { date: '' }).date !== today) setKv('dayStart', { date: today, value: e });
}

// Why new trades are blocked right now, or null when the bot may trade.
export function entryBlock(): string | null {
  const s = getSettings();
  if (!s.botEnabled) return 'Bot is switched off';
  const e = equityUsd();
  const peak = getKv('peakEquity', s.startingBankrollUsd);
  if (s.killSwitchDrawdownPct > 0 && e < peak * (1 - s.killSwitchDrawdownPct / 100)) {
    saveSettings({ botEnabled: false });
    setKv('peakEquity', e); // turning it back on starts a fresh drawdown count
    log('error', `Kill switch: balance $${e.toFixed(2)} is ${s.killSwitchDrawdownPct}% below its high. Bot switched off.`);
    return 'Kill switch tripped';
  }
  const day = getKv('dayStart', { date: '', value: 0 });
  if (s.dailyLossLimitPct > 0 && day.value > 0 && e < day.value * (1 - s.dailyLossLimitPct / 100)) {
    return `Daily loss limit hit (${s.dailyLossLimitPct}%), back tomorrow`;
  }
  const until = getKv('pausedUntil', 0);
  if (until > now()) return `Cooling off after ${s.lossStreakPause} losses until ${new Date(until * 1000).toLocaleTimeString()}`;
  return null;
}

function afterClose() {
  recordEquity();
  const s = getSettings();
  if (s.lossStreakPause > 0) {
    const last = db
      .prepare('SELECT pnl_usd FROM positions WHERE closed_at IS NOT NULL ORDER BY closed_at DESC LIMIT ?')
      .all(s.lossStreakPause) as { pnl_usd: number }[];
    if (last.length === s.lossStreakPause && last.every((r) => r.pnl_usd < 0)) {
      setKv('pausedUntil', now() + s.lossStreakPauseMinutes * 60);
      log('warn', `${s.lossStreakPause} losses in a row: pausing new trades for ${s.lossStreakPauseMinutes} min`);
    }
  }
  refreshFollowList();
}

// ---------- Signals from followed wallets ----------

export function onLeaderSwap(swap: Swap) {
  return serial(async () => {
    if (swap.side === 'sell') return leaderSold(swap);
    return tryEnter(swap);
  });
}

async function leaderSold(swap: Swap) {
  const s = getSettings();
  const mine = openPositions().filter((p) => p.mint === swap.mint);
  if (!mine.length) return;
  if (!s.exitWhenLeaderSells) return markSwap(swap, 'leader sold; auto-exit is off');
  const markets = await getMarkets([swap.mint]);
  for (const p of mine) {
    const m = markets.get(p.mint);
    if (!m) continue;
    const who = p.leader === swap.wallet ? 'the wallet we copied' : `followed wallet ${short(swap.wallet)}`;
    sell(p, 1, `${who} sold (${pct(m.priceUsd / p.entry_price - 1)})`, m);
  }
  markSwap(swap, 'we sold too');
}

async function tryEnter(swap: Swap) {
  const s = getSettings();
  const skip = (why: string) => {
    markSwap(swap, `skipped: ${why}`);
    log('info', `Skipped ${short(swap.mint)} bought by ${short(swap.wallet)}: ${why}`);
  };

  const block = entryBlock();
  if (block) return skip(block);
  const open = openPositions();
  if (open.some((p) => p.mint === swap.mint)) return markSwap(swap, 'already holding this token');
  if (open.length >= s.maxOpenPositions) return skip('already in a trade');

  const [markets, sol, mint] = await Promise.all([getMarkets([swap.mint]), solUsd(), getMintInfo(swap.mint)]);
  const m = markets.get(swap.mint);
  if (!m || m.priceUsd <= 0) return skip('no market found for this token');
  if (!mint) return skip('could not read the token');
  const mo = await momentumFor(m.pair, 0);

  const leader = getWallet(swap.wallet);
  const leaderPrice = (swap.solAmount * sol) / swap.tokenAmount;
  const lostRecently = db
    .prepare('SELECT 1 FROM positions WHERE mint = ? AND pnl_usd < 0 AND closed_at > ?')
    .get(swap.mint, now() - 6 * 3600);

  const problems = entryProblems(
    {
      marketPriceUsd: m.priceUsd,
      leaderPriceUsd: leaderPrice,
      liquidityUsd: m.liquidityUsd,
      pairAgeMinutes: m.pairCreatedAt ? (now() - m.pairCreatedAt) / 60 : 0,
      change5mPct: m.change5mPct,
      buys5m: m.buys5m,
      sells5m: m.sells5m,
      rsi: mo && !Number.isNaN(mo.rsi) ? mo.rsi : null,
      signalAgeSeconds: now() - swap.time,
      leaderSol: swap.solAmount,
      leaderAvgSol: walletStats(leader)?.avgPositionSol ?? 0,
      mintAuthority: mint.mintAuthority,
      freezeAuthority: mint.freezeAuthority,
      riskyExtensions: mint.riskyExtensions,
      recentlyLostOnMint: !!lostRecently,
    },
    s,
  );
  if (problems.length) return skip(problems.join('; '));

  const cash = getCash();
  const size = positionSizeUsd(cash, m.liquidityUsd, s);
  if (size < Math.max(1, s.networkFeeUsd * 5)) return skip(`balance too small ($${cash.toFixed(2)})`);

  // We can't get a better price than the wallet we're copying.
  const fill = simulateBuy(size, Math.max(m.priceUsd, leaderPrice), m.liquidityUsd, s);
  if (!fill) return skip('trade too small after fees');
  const buffer = roundTripCostPct(size, m.liquidityUsd, s);

  const res = db
    .prepare(
      `INSERT INTO positions (mint, symbol, pair, leader, leader_sig, qty, cost_usd, entry_price, leader_price,
        entry_liquidity, cost_buffer_pct, high_price, stop_price, last_price, opened_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      swap.mint, m.symbol, m.pair, swap.wallet, swap.signature, fill.qty, size, fill.fillPrice, leaderPrice,
      m.liquidityUsd, buffer, fill.fillPrice, initialStop(fill.fillPrice, s), m.priceUsd, now(),
    );
  setCash(cash - size);
  const p = db.prepare('SELECT * FROM positions WHERE id = ?').get(Number(res.lastInsertRowid)) as Position;
  const delay = now() - swap.time;
  note(p, `Bought $${size.toFixed(2)} of ${m.symbol} ${delay}s after ${short(swap.wallet)} (${swap.solAmount.toFixed(2)} SOL). Paid ${pct(fill.fillPrice / leaderPrice - 1)} vs their price. Stop at ${pct(-s.stopLossPct / 100)}.`);
  markSwap(swap, `copied: bought $${size.toFixed(2)}`);
  log('trade', `BUY ${m.symbol} $${size.toFixed(2)} copying ${short(swap.wallet)}`);
  recordEquity();
}

// ---------- Managing open trades ----------

function sell(p: Position, fraction: number, reason: string, m: Market) {
  const s = getSettings();
  const qty = fraction >= 1 ? p.qty : p.qty * fraction;
  const fill = simulateSell(qty, m.priceUsd, m.liquidityUsd, s);
  const left = p.qty - qty;
  const proceeds = p.proceeds_usd + fill.proceedsUsd;
  setCash(getCash() + fill.proceedsUsd);

  if (fraction >= 1 || left * m.priceUsd < 0.5) {
    const pnl = proceeds - p.cost_usd;
    db.prepare(
      'UPDATE positions SET qty = 0, proceeds_usd = ?, last_price = ?, closed_at = ?, pnl_usd = ?, exit_reason = ? WHERE id = ?',
    ).run(proceeds, m.priceUsd, now(), pnl, reason, p.id);
    note(p, `Sold everything: ${reason}. Result ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}.`);
    log('trade', `SELL ${p.symbol} ${reason} → ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`);
    afterClose();
    return;
  }
  db.prepare('UPDATE positions SET qty = ?, proceeds_usd = ?, last_price = ?, partial_taken = 1 WHERE id = ?').run(
    left,
    proceeds,
    m.priceUsd,
    p.id,
  );
  note(p, `Sold ${Math.round(fraction * 100)}%: ${reason}. Banked $${fill.proceedsUsd.toFixed(2)}.`);
  log('trade', `SELL ${Math.round(fraction * 100)}% ${p.symbol}: ${reason}`);
}

// Runs every few seconds: price check, stops, indicators, exits.
export function monitorPositions() {
  return serial(async () => {
    const open = openPositions();
    if (!open.length) return;
    const s = getSettings();
    const markets = await getMarkets([...new Set(open.map((p) => p.mint))]);
    for (const p of open) {
      const m = markets.get(p.mint);
      if (!m || m.priceUsd <= 0) continue;
      const mo = await momentumFor(p.pair);
      const d = decideExit(
        {
          entryPrice: p.entry_price,
          highPrice: p.high_price,
          stopPrice: p.stop_price,
          costBufferPct: p.cost_buffer_pct,
          partialTaken: !!p.partial_taken,
          entryLiquidityUsd: p.entry_liquidity,
          openedAt: p.opened_at,
        },
        m,
        mo,
        now(),
        s,
      );
      if (d.stopPrice > p.stop_price && d.stopPrice >= p.entry_price && p.stop_price < p.entry_price) {
        note(p, `Up ${pct(d.highPrice / p.entry_price - 1)}: stop moved to break-even. This trade can no longer lose.`);
      }
      db.prepare('UPDATE positions SET high_price = ?, stop_price = ?, last_price = ? WHERE id = ?').run(
        d.highPrice,
        d.stopPrice,
        m.priceUsd,
        p.id,
      );
      if (d.sellFraction > 0) {
        sell({ ...p, high_price: d.highPrice, stop_price: d.stopPrice }, d.sellFraction, d.reason, m);
      }
    }
  });
}

export function sellNow(id: number) {
  return serial(async () => {
    const p = db.prepare('SELECT * FROM positions WHERE id = ? AND closed_at IS NULL').get(id) as Position | undefined;
    if (!p) throw new Error('position not open');
    const m = (await getMarkets([p.mint])).get(p.mint);
    if (!m) throw new Error('no market price right now, try again');
    sell(p, 1, `sold by you (${pct(m.priceUsd / p.entry_price - 1)})`, m);
  });
}

// Start the paper test over with a fresh balance.
export function resetPaper(startUsd: number) {
  return serial(async () => {
    db.exec('DELETE FROM positions; DELETE FROM equity;');
    db.prepare("UPDATE leader_swaps SET action = NULL").run();
    saveSettings({ startingBankrollUsd: startUsd });
    setCash(startUsd);
    setKv('peakEquity', startUsd);
    setKv('dayStart', { date: '', value: 0 });
    setKv('pausedUntil', 0);
    recordEquity();
    log('info', `Paper account reset to $${startUsd.toFixed(2)}`);
  });
}

const pct = (x: number) => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)}%`;
