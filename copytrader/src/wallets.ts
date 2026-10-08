import { env, STABLES, WSOL } from './config.ts';
import { db, getSettings, log, now } from './db.ts';
import { getMarkets, getSolUsd } from './sources/dexscreener.ts';
import { getPoolTrades, getTrendingPools } from './sources/gecko.ts';
import { getSignatures, getTransaction, type SigInfo } from './sources/solana.ts';
import { buildRoundTrips, computeStats, scoreWallet, type WalletStats } from './stats.ts';
import { parseSwap, type Swap } from './swaps.ts';

export type WalletRow = {
  address: string;
  source: string;
  followed: number;
  pinned: number;
  hits: number;
  score: number;
  reasons: string;
  stats: string | null;
  profiled_at: number | null;
  last_sig: string | null;
  note: string | null;
  created_at: number;
};

export function getWallet(address: string) {
  return db.prepare('SELECT * FROM wallets WHERE address = ?').get(address) as WalletRow | undefined;
}

export function walletStats(w: WalletRow | undefined): WalletStats | null {
  return w?.stats ? (JSON.parse(w.stats) as WalletStats) : null;
}

const isAddress = (a: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a);

export function addWallet(address: string, follow: boolean) {
  if (!isAddress(address)) throw new Error('not a valid Solana address');
  db.prepare(
    `INSERT INTO wallets (address, source, followed, pinned, created_at) VALUES (?, 'manual', ?, 1, ?)
     ON CONFLICT(address) DO UPDATE SET followed = excluded.followed, pinned = 1`,
  ).run(address, follow ? 1 : 0, now());
}

export function setFollow(address: string, follow: boolean) {
  db.prepare('UPDATE wallets SET followed = ?, pinned = 1, note = NULL WHERE address = ?').run(follow ? 1 : 0, address);
}

// ---------- Discovery: who is making money in today's hot coins? ----------

// Looks at the latest trades in trending pools and remembers wallets that sold for more
// than they bought. Being seen like this only earns a wallet a full profile; the profile decides.
export async function discoverOnce() {
  const s = getSettings();
  if (!s.discoveryEnabled) return;
  const pools = (await getTrendingPools())
    .filter((p) => p.baseMint && p.baseMint !== WSOL && !STABLES.has(p.baseMint))
    .filter((p) => p.liquidityUsd >= s.minLiquidityUsd)
    .slice(0, 8);

  const bump = db.prepare(
    `INSERT INTO wallets (address, source, hits, created_at) VALUES (?, 'discovery', 1, ?)
     ON CONFLICT(address) DO UPDATE SET hits = hits + 1`,
  );
  let found = 0;
  for (const pool of pools) {
    const per = new Map<string, { buy: number; sell: number; n: number }>();
    for (const t of await getPoolTrades(pool.address)) {
      if (!t.wallet) continue;
      const w = per.get(t.wallet) ?? { buy: 0, sell: 0, n: 0 };
      w[t.side] += t.usd;
      w.n++;
      per.set(t.wallet, w);
    }
    for (const [wallet, w] of per) {
      if (w.n > 25) continue; // hammering one pool = bot
      if (w.buy >= 50 && w.sell >= w.buy * 1.2) {
        bump.run(wallet, now());
        found++;
      }
    }
  }
  if (found) log('info', `Wallet finder: ${found} profitable traders spotted in ${pools.length} trending pools`);
}

// ---------- Profiling: the full trading record of one wallet ----------

export async function profileWallet(address: string) {
  const s = getSettings();
  const sigs: SigInfo[] = [];
  let before: string | undefined;
  while (sigs.length < env.profileTxLimit) {
    const page = await getSignatures(address, { limit: 100, before });
    sigs.push(...page);
    if (page.length < 100) break;
    before = page[page.length - 1].signature;
  }

  const swaps: Swap[] = [];
  for (const sig of sigs.slice(0, env.profileTxLimit)) {
    if (sig.err) continue;
    const tx = await getTransaction(sig.signature);
    const swap = parseSwap(tx, address);
    if (swap) swaps.push(swap);
  }

  // Price whatever they still hold; no market (or almost no liquidity) means it's worth nothing.
  const mints = [...new Set(swaps.map((x) => x.mint))];
  const [markets, solUsd] = await Promise.all([getMarkets(mints), getSolUsd()]);
  const priceSol = (mint: string) => {
    const m = markets.get(mint);
    if (!m || m.liquidityUsd < 1000) return null;
    return m.priceSol ?? m.priceUsd / solUsd;
  };

  const trips = buildRoundTrips(swaps, priceSol);
  const stats = computeStats(swaps, trips);
  const { score, reasons } = scoreWallet(stats, s);
  db.prepare('UPDATE wallets SET score = ?, reasons = ?, stats = ?, profiled_at = ? WHERE address = ?').run(
    score,
    JSON.stringify(reasons),
    JSON.stringify(stats),
    now(),
    address,
  );
  return { stats, score, reasons };
}

// Followed wallets are re-checked every 6h, good ones daily, rejected ones that keep showing
// up every 3 days. New ones first.
export function nextWalletToProfile(): string | null {
  const t = now();
  const row = db
    .prepare(
      `SELECT address FROM wallets
       WHERE profiled_at IS NULL
          OR (followed = 1 AND profiled_at < ?)
          OR (score > 0 AND profiled_at < ?)
          OR (score = 0 AND hits >= 3 AND profiled_at < ?)
       ORDER BY profiled_at IS NOT NULL, followed DESC, source = 'manual' DESC, hits DESC
       LIMIT 1`,
    )
    .get(t - 6 * 3600, t - 86400, t - 3 * 86400) as { address: string } | undefined;
  return row?.address ?? null;
}

// ---------- Who to follow ----------

export type CopyRecord = { trades: number; pnlUsd: number; lastThreeLost: boolean };

export function copyRecord(address: string): CopyRecord {
  const rows = db
    .prepare('SELECT pnl_usd FROM positions WHERE leader = ? AND closed_at IS NOT NULL ORDER BY closed_at DESC')
    .all(address) as { pnl_usd: number }[];
  return {
    trades: rows.length,
    pnlUsd: rows.reduce((a, r) => a + r.pnl_usd, 0),
    lastThreeLost: rows.length >= 3 && rows.slice(0, 3).every((r) => r.pnl_usd < 0),
  };
}

// A wallet can look great on paper and still lose money for us (we're slower than it is).
// Drop those, then follow the best-scoring wallets the user hasn't decided about themselves.
export function refreshFollowList() {
  const s = getSettings();
  for (const w of db.prepare('SELECT * FROM wallets WHERE followed = 1').all() as WalletRow[]) {
    const rec = copyRecord(w.address);
    if (rec.lastThreeLost && rec.pnlUsd < 0) {
      const why = `last 3 copies lost, net -$${(-rec.pnlUsd).toFixed(2)} over ${rec.trades} trades`;
      db.prepare('UPDATE wallets SET followed = 0, pinned = 1, note = ? WHERE address = ?').run(`Dropped: ${why}`, w.address);
      log('warn', `Stopped following ${short(w.address)}: ${why}`);
    }
  }

  if (s.autoFollowTopN <= 0) return;
  const best = db
    .prepare('SELECT address, followed FROM wallets WHERE pinned = 0 AND score > 0 ORDER BY score DESC')
    .all() as { address: string; followed: number }[];
  const keep = new Set(best.slice(0, s.autoFollowTopN).map((w) => w.address));
  for (const w of best) {
    const want = keep.has(w.address) ? 1 : 0;
    if (want === w.followed) continue;
    db.prepare('UPDATE wallets SET followed = ?, note = ? WHERE address = ?').run(
      want,
      want ? 'Auto-followed: top score' : null,
      w.address,
    );
    log('info', `${want ? 'Now following' : 'Stopped following'} ${short(w.address)} (score ranking)`);
  }
  // Auto-followed wallets whose score fell to 0 on re-check.
  db.prepare("UPDATE wallets SET followed = 0, note = 'Score dropped' WHERE pinned = 0 AND followed = 1 AND score <= 0").run();
}

export const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;
