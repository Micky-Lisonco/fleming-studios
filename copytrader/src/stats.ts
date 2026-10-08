import type { Settings } from './config.ts';
import type { Swap } from './swaps.ts';

// One complete trade by a wallet in one token: first buy until the bag is (nearly) sold.
export type RoundTrip = {
  mint: string;
  openedAt: number;
  closedAt: number | null; // null = still holding
  costSol: number;
  proceedsSol: number; // sells so far, plus current value of what is still held
  pnlSol: number;
  pnlPct: number;
};

export type WalletStats = {
  swaps: number;
  closedTrades: number;
  openTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  realizedPnlSol: number;
  unrealizedPnlSol: number;
  totalPnlSol: number;
  grossProfitSol: number;
  grossLossSol: number;
  profitFactor: number;
  avgLossPct: number;
  worstLossPct: number;
  avgWinPct: number;
  medianHoldMinutes: number;
  maxDrawdownSol: number;
  avgPositionSol: number;
  swapsPerHour: number;
  firstSeen: number;
  lastSeen: number;
};

const DUST = 0.01; // bag counts as sold when below 1% of the most it held

// `priceSol(mint)` gives the token's current price in SOL, or null when it has no market
// (treated as worth zero: unsold rugs are the losses win-rate stats usually hide).
export function buildRoundTrips(swaps: Swap[], priceSol: (mint: string) => number | null): RoundTrip[] {
  const sorted = [...swaps].sort((a, b) => a.time - b.time || a.slot - b.slot);
  const open = new Map<string, { qty: number; peak: number; cost: number; proceeds: number; openedAt: number }>();
  const trips: RoundTrip[] = [];

  for (const s of sorted) {
    let p = open.get(s.mint);
    if (s.side === 'buy') {
      if (!p) {
        p = { qty: 0, peak: 0, cost: 0, proceeds: 0, openedAt: s.time };
        open.set(s.mint, p);
      }
      p.qty += s.tokenAmount;
      p.peak = Math.max(p.peak, p.qty);
      p.cost += s.solAmount;
      continue;
    }
    if (!p) continue; // sold something bought before our history window: no cost basis
    p.qty = Math.max(0, p.qty - s.tokenAmount);
    p.proceeds += s.solAmount;
    if (p.qty <= p.peak * DUST) {
      trips.push(trip(s.mint, p.openedAt, s.time, p.cost, p.proceeds));
      open.delete(s.mint);
    }
  }

  for (const [mint, p] of open) {
    const price = priceSol(mint);
    const value = price && price > 0 ? p.qty * price : 0;
    trips.push(trip(mint, p.openedAt, null, p.cost, p.proceeds + value));
  }
  return trips;
}

function trip(mint: string, openedAt: number, closedAt: number | null, cost: number, proceeds: number): RoundTrip {
  const pnlSol = proceeds - cost;
  return { mint, openedAt, closedAt, costSol: cost, proceedsSol: proceeds, pnlSol, pnlPct: cost > 0 ? (pnlSol / cost) * 100 : 0 };
}

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function computeStats(swaps: Swap[], trips: RoundTrip[], now = Date.now() / 1000): WalletStats {
  const closed = trips.filter((t) => t.closedAt !== null);
  const opened = trips.filter((t) => t.closedAt === null);
  // Open bags count as losses when they are under water, so holding a dead coin can't hide a loss.
  const judged = [...closed, ...opened.filter((t) => t.pnlSol < 0 || now - t.openedAt > 7 * 86400)];
  const wins = judged.filter((t) => t.pnlSol > 0);
  const losses = judged.filter((t) => t.pnlSol <= 0);

  const grossProfit = wins.reduce((a, t) => a + t.pnlSol, 0);
  const grossLoss = -losses.reduce((a, t) => a + t.pnlSol, 0);

  let equity = 0;
  let peak = 0;
  let maxDd = 0;
  for (const t of [...judged].sort((a, b) => (a.closedAt ?? now) - (b.closedAt ?? now))) {
    equity += t.pnlSol;
    peak = Math.max(peak, equity);
    maxDd = Math.max(maxDd, peak - equity);
  }

  const times = swaps.map((s) => s.time).filter(Boolean);
  const first = times.length ? Math.min(...times) : 0;
  const last = times.length ? Math.max(...times) : 0;
  const hours = Math.max((last - first) / 3600, 1);

  return {
    swaps: swaps.length,
    closedTrades: closed.length,
    openTrades: opened.length,
    wins: wins.length,
    losses: losses.length,
    winRate: judged.length ? wins.length / judged.length : 0,
    realizedPnlSol: closed.reduce((a, t) => a + t.pnlSol, 0),
    unrealizedPnlSol: opened.reduce((a, t) => a + t.pnlSol, 0),
    totalPnlSol: trips.reduce((a, t) => a + t.pnlSol, 0),
    grossProfitSol: grossProfit,
    grossLossSol: grossLoss,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99 : 0,
    avgLossPct: losses.length ? -mean(losses.map((t) => t.pnlPct)) : 0,
    worstLossPct: losses.length ? -Math.min(...losses.map((t) => t.pnlPct)) : 0,
    avgWinPct: mean(wins.map((t) => t.pnlPct)),
    medianHoldMinutes: median(closed.map((t) => (t.closedAt! - t.openedAt) / 60)),
    maxDrawdownSol: maxDd,
    avgPositionSol: mean(trips.map((t) => t.costSol)),
    swapsPerHour: swaps.length / hours,
    firstSeen: first,
    lastSeen: last,
  };
}

type ScoreRules = Pick<
  Settings,
  | 'minClosedTrades'
  | 'minProfitFactor'
  | 'maxAvgLossPct'
  | 'maxWorstLossPct'
  | 'minMedianHoldMinutes'
  | 'maxSwapsPerHour'
  | 'maxInactiveDays'
>;

// 0-100. A wallet only scores when it passes every rule; the reasons say what failed.
export function scoreWallet(s: WalletStats, r: ScoreRules, now = Date.now() / 1000): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  if (s.closedTrades < r.minClosedTrades) reasons.push(`only ${s.closedTrades} finished trades (need ${r.minClosedTrades})`);
  if (s.totalPnlSol <= 0) reasons.push('not profitable overall');
  if (s.profitFactor < r.minProfitFactor) reasons.push(`profit factor ${s.profitFactor.toFixed(2)} < ${r.minProfitFactor}`);
  if (s.avgLossPct > r.maxAvgLossPct) reasons.push(`average loss ${s.avgLossPct.toFixed(0)}% > ${r.maxAvgLossPct}%`);
  if (s.worstLossPct > r.maxWorstLossPct) reasons.push(`worst loss ${s.worstLossPct.toFixed(0)}% > ${r.maxWorstLossPct}%`);
  if (s.medianHoldMinutes < r.minMedianHoldMinutes) reasons.push(`holds only ${s.medianHoldMinutes.toFixed(1)} min (bot / flipper)`);
  if (s.swapsPerHour > r.maxSwapsPerHour) reasons.push(`${s.swapsPerHour.toFixed(0)} swaps/hour (bot)`);
  if (now - s.lastSeen > r.maxInactiveDays * 86400) reasons.push(`inactive for over ${r.maxInactiveDays} days`);
  if (reasons.length) return { score: 0, reasons };

  const pf = Math.min(s.profitFactor, 10) / 10; // big wins relative to losses
  const lossControl = 1 - Math.min(s.avgLossPct / Math.max(r.maxAvgLossPct, 1), 1); // small losses
  const dd = s.grossProfitSol > 0 ? 1 - Math.min(s.maxDrawdownSol / s.grossProfitSol, 1) : 0; // steady equity
  const sample = Math.min(s.closedTrades / 30, 1); // enough trades to trust it
  const score = 35 * pf + 30 * lossControl + 15 * dd + 10 * s.winRate + 10 * sample;
  return { score: Math.round(score * 10) / 10, reasons };
}
