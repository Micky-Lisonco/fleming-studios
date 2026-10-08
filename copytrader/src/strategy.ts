import type { Settings } from './config.ts';
import type { Momentum } from './indicators.ts';

type Costs = Pick<Settings, 'swapFeePct' | 'networkFeeUsd' | 'baseSlippagePct'>;

// ---------- Paper fills ----------

// Price impact on a constant-product pool is roughly trade size / half the pool's liquidity.
export function slippagePct(tradeUsd: number, liquidityUsd: number, c: Costs): number {
  const impact = liquidityUsd > 0 ? (tradeUsd / (liquidityUsd / 2)) * 100 : 100;
  return c.baseSlippagePct + impact;
}

// Simulated buy: spend `usd`, get tokens at a worse price than the screen shows.
export function simulateBuy(usd: number, priceUsd: number, liquidityUsd: number, c: Costs) {
  const spend = usd - c.networkFeeUsd;
  if (spend <= 0 || priceUsd <= 0) return null;
  const afterFee = spend * (1 - c.swapFeePct / 100);
  const slip = slippagePct(afterFee, liquidityUsd, c);
  const fillPrice = priceUsd * (1 + slip / 100);
  return { qty: afterFee / fillPrice, fillPrice, slippagePct: slip };
}

// Simulated sell of `qty` tokens.
export function simulateSell(qty: number, priceUsd: number, liquidityUsd: number, c: Costs) {
  const gross = qty * priceUsd;
  const slip = Math.min(slippagePct(gross, liquidityUsd, c), 100);
  const fillPrice = priceUsd * (1 - slip / 100);
  const proceeds = Math.max(0, qty * fillPrice * (1 - c.swapFeePct / 100) - c.networkFeeUsd);
  return { proceedsUsd: proceeds, fillPrice, slippagePct: slip };
}

// Rough cost of getting in and out again, as % of the trade. The break-even stop sits this
// far above entry so "break even" really means not losing money.
export function roundTripCostPct(tradeUsd: number, liquidityUsd: number, c: Costs): number {
  const fixed = tradeUsd > 0 ? ((2 * c.networkFeeUsd) / tradeUsd) * 100 : 0;
  return 2 * c.swapFeePct + 2 * slippagePct(tradeUsd, liquidityUsd, c) + fixed;
}

// How much of the bankroll the next trade uses, never more than the pool can take without
// moving the price too much.
export function positionSizeUsd(cashUsd: number, liquidityUsd: number, s: Pick<Settings, 'positionSizePct' | 'maxTradePctOfLiquidity'>) {
  const wanted = (cashUsd * Math.min(s.positionSizePct, 100)) / 100;
  return Math.max(0, Math.min(wanted, (liquidityUsd * s.maxTradePctOfLiquidity) / 100));
}

// ---------- Exits ----------

export type PositionState = {
  entryPrice: number; // fill price we paid
  highPrice: number; // highest market price since entry
  stopPrice: number; // only ever moves up
  costBufferPct: number; // round-trip cost, used for the break-even stop
  partialTaken: boolean;
  entryLiquidityUsd: number;
  openedAt: number; // unix seconds
};

export type MarketSnapshot = {
  priceUsd: number;
  liquidityUsd: number;
  buys5m: number;
  sells5m: number;
  change5mPct: number;
};

type ExitRules = Pick<
  Settings,
  | 'stopLossPct'
  | 'breakEvenAtPct'
  | 'trailActivatePct'
  | 'trailPct'
  | 'takeProfitPct'
  | 'securePct'
  | 'momentumMinProfitPct'
  | 'liquidityDropPct'
  | 'stallMinutes'
  | 'maxHoldMinutes'
>;

export type ExitDecision = {
  highPrice: number;
  stopPrice: number;
  sellFraction: number; // 0 = hold, 1 = sell everything
  reason: string;
};

export function initialStop(entryPrice: number, r: Pick<Settings, 'stopLossPct'>) {
  return entryPrice * (1 - r.stopLossPct / 100);
}

// The trailing gap shrinks as profit grows: let a young winner breathe, protect a big one hard.
export function trailGapPct(peakGainPct: number, r: Pick<Settings, 'trailPct'>) {
  return r.trailPct * Math.max(0.5, 1 - peakGainPct / 600);
}

// Decides what to do with an open position given the latest market data. Checks run from
// "protect the money" to "take the money".
export function decideExit(
  p: PositionState,
  m: MarketSnapshot,
  mo: Momentum | null,
  now: number,
  r: ExitRules,
): ExitDecision {
  const price = m.priceUsd;
  const high = Math.max(p.highPrice, price);
  const gain = (price / p.entryPrice - 1) * 100;
  const peakGain = (high / p.entryPrice - 1) * 100;

  let stop = Math.max(p.stopPrice, initialStop(p.entryPrice, r));
  if (peakGain >= r.breakEvenAtPct) stop = Math.max(stop, p.entryPrice * (1 + p.costBufferPct / 100));
  if (peakGain >= r.trailActivatePct) stop = Math.max(stop, high * (1 - trailGapPct(peakGain, r) / 100));

  const out = (sellFraction: number, reason: string): ExitDecision => ({ highPrice: high, stopPrice: stop, sellFraction, reason });
  const g = `${gain >= 0 ? '+' : ''}${gain.toFixed(1)}%`;

  // 1. Danger: liquidity being pulled usually means a rug is in progress.
  if (p.entryLiquidityUsd > 0 && m.liquidityUsd < p.entryLiquidityUsd * (1 - r.liquidityDropPct / 100)) {
    return out(1, `liquidity dropped ${((1 - m.liquidityUsd / p.entryLiquidityUsd) * 100).toFixed(0)}% since entry (${g})`);
  }

  // 2. Stops.
  if (price <= stop) {
    if (stop < p.entryPrice) return out(1, `stop loss (${g})`);
    if (peakGain < r.trailActivatePct) return out(1, `break-even stop, was up ${peakGain.toFixed(0)}% (${g})`);
    return out(1, `trailing stop, ${((1 - price / high) * 100).toFixed(0)}% off the high (${g})`);
  }

  // 3. Heavy selling with the price sliding: leave whatever the P&L.
  if (m.sells5m >= 20 && m.sells5m >= 2 * m.buys5m && m.change5mPct <= -10) {
    return out(1, `heavy selling: ${m.sells5m} sells vs ${m.buys5m} buys in 5 min (${g})`);
  }

  // 4. Bank profit at the target; the rest rides with the trailing stop.
  if (!p.partialTaken && r.takeProfitPct > 0 && gain >= r.takeProfitPct) {
    const f = Math.min(Math.max(r.securePct, 0), 100) / 100;
    if (f > 0) return out(f, f < 1 ? `banked ${Math.round(f * 100)}% at the profit target (${g})` : `take profit (${g})`);
  }

  // 5. Momentum turning while we're in profit: sell before the stop has to catch it.
  if (mo && gain >= r.momentumMinProfitPct) {
    const pressure = m.sells5m > m.buys5m || m.change5mPct < 0;
    const pullback = (1 - price / high) * 100;
    if (mo.bearishCross && pressure) return out(1, `momentum turned down: EMA cross with selling (${g})`);
    if (mo.rsiPeak >= 80 && mo.rsi < 65 && mo.fallingCloses >= 2) {
      return out(1, `overbought reversal: RSI ${mo.rsiPeak.toFixed(0)} → ${mo.rsi.toFixed(0)} (${g})`);
    }
    // Indicators confirm the pullback, so don't wait for the full trailing distance.
    if (mo.belowFastEma && mo.fallingCloses >= 2 && pressure && pullback >= trailGapPct(peakGain, r) / 2) {
      return out(1, `turning down: ${pullback.toFixed(0)}% off the high with lower closes and selling (${g})`);
    }
  }

  // 6. Dead money.
  const minutes = (now - p.openedAt) / 60;
  if (r.stallMinutes > 0 && minutes >= r.stallMinutes && peakGain < r.breakEvenAtPct && !(mo?.trendUp ?? false)) {
    return out(1, `no momentum after ${Math.round(minutes)} min (${g})`);
  }
  if (r.maxHoldMinutes > 0 && minutes >= r.maxHoldMinutes) return out(1, `time limit (${g})`);

  return out(0, '');
}

// ---------- Entries ----------

export type EntryContext = {
  marketPriceUsd: number;
  leaderPriceUsd: number; // what the leader paid per token
  liquidityUsd: number;
  pairAgeMinutes: number;
  change5mPct: number;
  buys5m: number;
  sells5m: number;
  rsi: number | null;
  signalAgeSeconds: number;
  leaderSol: number;
  leaderAvgSol: number;
  mintAuthority: string | null;
  freezeAuthority: string | null;
  riskyExtensions: string[];
  recentlyLostOnMint: boolean;
};

type EntryRules = Pick<
  Settings,
  | 'maxChasePct'
  | 'minLiquidityUsd'
  | 'minPairAgeMinutes'
  | 'maxPump5mPct'
  | 'maxEntryRsi'
  | 'minConviction'
  | 'minLeaderBuySol'
  | 'maxSignalAgeSeconds'
  | 'requireMintRevoked'
  | 'requireFreezeRevoked'
>;

// Every reason not to take the trade. Empty = go.
export function entryProblems(c: EntryContext, r: EntryRules): string[] {
  const out: string[] = [];
  if (c.signalAgeSeconds > r.maxSignalAgeSeconds) out.push(`signal is ${Math.round(c.signalAgeSeconds)}s old`);
  if (c.leaderSol < r.minLeaderBuySol) out.push(`leader only bought ${c.leaderSol.toFixed(2)} SOL`);
  if (c.leaderAvgSol > 0 && c.leaderSol < c.leaderAvgSol * r.minConviction) {
    out.push(`small test buy (${c.leaderSol.toFixed(2)} SOL vs their usual ${c.leaderAvgSol.toFixed(2)})`);
  }
  if (c.leaderPriceUsd > 0) {
    const chase = (c.marketPriceUsd / c.leaderPriceUsd - 1) * 100;
    if (chase > r.maxChasePct) out.push(`price already ${chase.toFixed(0)}% above the leader's buy`);
  }
  if (c.liquidityUsd < r.minLiquidityUsd) out.push(`liquidity $${Math.round(c.liquidityUsd)} too low`);
  if (c.pairAgeMinutes < r.minPairAgeMinutes) out.push(`pool only ${Math.round(c.pairAgeMinutes)} min old`);
  if (c.change5mPct > r.maxPump5mPct) out.push(`already pumped ${c.change5mPct.toFixed(0)}% in 5 min`);
  if (c.rsi !== null && c.rsi > r.maxEntryRsi) out.push(`overheated (RSI ${c.rsi.toFixed(0)})`);
  if (c.sells5m >= 20 && c.sells5m >= 2 * c.buys5m) out.push('heavy selling right now');
  if (r.requireMintRevoked && c.mintAuthority) out.push('creator can still mint more tokens');
  if (r.requireFreezeRevoked && c.freezeAuthority) out.push('creator can freeze wallets');
  if (c.riskyExtensions.length) out.push(`risky token features: ${c.riskyExtensions.join(', ')}`);
  if (c.recentlyLostOnMint) out.push('we lost on this token recently');
  return out;
}
