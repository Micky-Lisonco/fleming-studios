import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_SETTINGS as S, WSOL } from '../src/config.ts';
import { ema, momentum, rsi, type Candle } from '../src/indicators.ts';
import { buildRoundTrips, computeStats, scoreWallet } from '../src/stats.ts';
import { decideExit, entryProblems, initialStop, simulateBuy, simulateSell, type MarketSnapshot, type PositionState } from '../src/strategy.ts';
import { parseSwap, type Swap } from '../src/swaps.ts';

const W = 'Wa11et1111111111111111111111111111111111111';
const MINT = 'Mint111111111111111111111111111111111111111';

function tx(opts: { solPre: number; solPost: number; pre?: any[]; post?: any[]; err?: unknown }) {
  return {
    slot: 100,
    blockTime: 1_700_000_000,
    transaction: { signatures: ['sig1'], message: { accountKeys: [{ pubkey: W }, { pubkey: 'Pool' }] } },
    meta: {
      err: opts.err ?? null,
      preBalances: [opts.solPre * 1e9, 0],
      postBalances: [opts.solPost * 1e9, 0],
      preTokenBalances: opts.pre ?? [],
      postTokenBalances: opts.post ?? [],
    },
  };
}
const bal = (i: number, mint: string, amt: number, owner = W) => ({ accountIndex: i, mint, owner, uiTokenAmount: { uiAmount: amt } });

test('parseSwap reads a buy', () => {
  const s = parseSwap(tx({ solPre: 10, solPost: 9, post: [bal(2, MINT, 5000)] }), W)!;
  assert.equal(s.side, 'buy');
  assert.equal(s.mint, MINT);
  assert.equal(s.tokenAmount, 5000);
  assert.ok(Math.abs(s.solAmount - 1) < 1e-9);
});

test('parseSwap reads a sell that closes the token account, paid in wrapped SOL', () => {
  const s = parseSwap(
    tx({ solPre: 1, solPost: 1.002, pre: [bal(2, MINT, 5000), bal(3, WSOL, 0)], post: [bal(3, WSOL, 2)] }),
    W,
  )!;
  assert.equal(s.side, 'sell');
  assert.equal(s.tokenAmount, 5000);
  assert.ok(Math.abs(s.solAmount - 2.002) < 1e-9);
});

test('parseSwap ignores transfers, failed txs, other owners and multi-token moves', () => {
  assert.equal(parseSwap(tx({ solPre: 1, solPost: 0.99999, post: [bal(2, MINT, 10)] }), W), null); // airdrop
  assert.equal(parseSwap(tx({ solPre: 10, solPost: 9, post: [bal(2, MINT, 5)], err: { x: 1 } }), W), null);
  assert.equal(parseSwap(tx({ solPre: 10, solPost: 9, post: [bal(2, MINT, 5, 'Other')] }), W), null);
  assert.equal(parseSwap(tx({ solPre: 10, solPost: 9, post: [bal(2, MINT, 5), bal(3, 'Mint2', 5)] }), W), null);
  assert.equal(parseSwap(tx({ solPre: 10, solPost: 9, post: [bal(2, MINT, 5)] }), 'NotInTx'), null);
});

const swap = (time: number, mint: string, side: 'buy' | 'sell', sol: number, tokens = 100): Swap => ({
  signature: `${mint}${time}`, slot: time, time, wallet: W, mint, side, tokenAmount: tokens, solAmount: sol,
});

test('round trips count unsold dead bags as total losses', () => {
  const swaps = [
    swap(0, 'A', 'buy', 1), swap(600, 'A', 'sell', 2), // +100%
    swap(1000, 'B', 'buy', 1), // still held, token is dead
  ];
  const trips = buildRoundTrips(swaps, () => null);
  const a = trips.find((t) => t.mint === 'A')!;
  const b = trips.find((t) => t.mint === 'B')!;
  assert.equal(a.pnlPct, 100);
  assert.equal(b.closedAt, null);
  assert.equal(b.pnlPct, -100);
  const st = computeStats(swaps, trips, 2000);
  assert.equal(st.losses, 1);
  assert.equal(st.worstLossPct, 100);
  assert.equal(st.profitFactor, 1);
});

test('a wallet that wins often but takes huge losses is rejected', () => {
  const swaps: Swap[] = [];
  let t = 0;
  for (let i = 0; i < 9; i++) swaps.push(swap(t, `W${i}`, 'buy', 1), swap((t += 1800), `W${i}`, 'sell', 1.1)), (t += 600);
  swaps.push(swap(t, 'L', 'buy', 1), swap((t += 1800), 'L', 'sell', 0.05)); // one -95%
  const st = computeStats(swaps, buildRoundTrips(swaps, () => null), t);
  assert.equal(st.winRate, 0.9);
  const { score, reasons } = scoreWallet(st, S, t);
  assert.equal(score, 0);
  assert.ok(reasons.some((r) => r.includes('worst loss')));
  assert.ok(reasons.some((r) => r.includes('not profitable') || r.includes('profit factor')));
});

test('a wallet with big wins and small, cut losses scores well', () => {
  const swaps: Swap[] = [];
  let t = 0;
  for (let i = 0; i < 12; i++) {
    const win = i % 3 !== 0;
    swaps.push(swap(t, `T${i}`, 'buy', 1), swap((t += 1200), `T${i}`, 'sell', win ? 1.8 : 0.88));
    t += 3600;
  }
  const st = computeStats(swaps, buildRoundTrips(swaps, () => null), t);
  const { score, reasons } = scoreWallet(st, S, t);
  assert.deepEqual(reasons, []);
  assert.ok(score > 50, `score ${score}`);
  assert.ok(st.avgLossPct > 11 && st.avgLossPct < 13);
});

test('bots and flippers are filtered out', () => {
  const swaps: Swap[] = [];
  for (let i = 0; i < 20; i++) swaps.push(swap(i * 20, `F${i}`, 'buy', 1), swap(i * 20 + 4, `F${i}`, 'sell', 1.2));
  const { reasons } = scoreWallet(computeStats(swaps, buildRoundTrips(swaps, () => null), 500), S, 500);
  assert.ok(reasons.some((r) => r.includes('flipper')));
  assert.ok(reasons.some((r) => r.includes('swaps/hour')));
});

test('indicators: EMA and RSI behave', () => {
  assert.deepEqual(ema([1, 1, 1], 3), [1, 1, 1]);
  const up = Array.from({ length: 30 }, (_, i) => 100 + i);
  assert.equal(rsi(up, 14).at(-1), 100);
  const mixed = Array.from({ length: 30 }, (_, i) => 100 + (i % 2 ? 1 : -1));
  const r = rsi(mixed, 14).at(-1)!;
  assert.ok(r > 40 && r < 60);
});

const candles = (closes: number[]): Candle[] => closes.map((c, i) => ({ t: i * 60, o: c, h: c, l: c, c, v: 1 }));

test('momentum spots a rollover after a run-up', () => {
  const closes = [...Array.from({ length: 20 }, (_, i) => 1 + i * 0.05), 1.9, 1.8, 1.7, 1.6];
  const mo = momentum(candles(closes))!;
  assert.equal(mo.belowFastEma, true);
  assert.ok(mo.fallingCloses >= 3);
  assert.ok(mo.rsiPeak > 80 && mo.rsi < 65);
});

// ---------- Exits ----------

const pos = (over: Partial<PositionState> = {}): PositionState => ({
  entryPrice: 1, highPrice: 1, stopPrice: initialStop(1, S), costBufferPct: 3, partialTaken: false,
  entryLiquidityUsd: 100_000, openedAt: 0, ...over,
});
const mkt = (price: number, over: Partial<MarketSnapshot> = {}): MarketSnapshot => ({
  priceUsd: price, liquidityUsd: 100_000, buys5m: 30, sells5m: 20, change5mPct: 2, ...over,
});

test('hard stop loss', () => {
  const d = decideExit(pos(), mkt(0.79), null, 60, S);
  assert.equal(d.sellFraction, 1);
  assert.match(d.reason, /stop loss/);
});

test('a winner can not turn into a loser: break-even stop', () => {
  const d1 = decideExit(pos(), mkt(1.25), null, 60, S); // +25% → stop to entry + costs
  assert.equal(d1.sellFraction, 0);
  assert.ok(d1.stopPrice >= 1.03);
  const d2 = decideExit(pos({ highPrice: d1.highPrice, stopPrice: d1.stopPrice }), mkt(1.02), null, 120, S);
  assert.equal(d2.sellFraction, 1);
  assert.match(d2.reason, /break-even/);
});

test('trailing stop locks in most of a big move ($50 → $90 then turning down)', () => {
  let p = pos();
  for (const price of [1.2, 1.5, 1.8]) {
    const d = decideExit(p, mkt(price), null, 60, { ...S, takeProfitPct: 500 });
    assert.equal(d.sellFraction, 0);
    p = { ...p, highPrice: d.highPrice, stopPrice: d.stopPrice };
  }
  assert.ok(p.stopPrice > 1.45, `stop ${p.stopPrice}`); // locked in +45% or more
  const d = decideExit(p, mkt(1.5), null, 120, { ...S, takeProfitPct: 500 });
  assert.equal(d.sellFraction, 1);
  assert.match(d.reason, /trailing/);
});

test('trailing gap tightens as the gain grows', () => {
  const small = decideExit(pos(), mkt(1.5), null, 60, { ...S, takeProfitPct: 1000 });
  const big = decideExit(pos(), mkt(4), null, 60, { ...S, takeProfitPct: 1000 });
  assert.ok(1 - small.stopPrice / 1.5 > 1 - big.stopPrice / 4);
});

test('takes half at the profit target, then lets the rest ride', () => {
  const d = decideExit(pos(), mkt(1.85), null, 60, S);
  assert.equal(d.sellFraction, 0.5);
  const d2 = decideExit(pos({ partialTaken: true, highPrice: 1.85, stopPrice: d.stopPrice }), mkt(1.9), null, 90, S);
  assert.equal(d2.sellFraction, 0);
});

test('sells on liquidity being pulled, even at a loss', () => {
  const d = decideExit(pos(), mkt(0.95, { liquidityUsd: 50_000 }), null, 60, S);
  assert.equal(d.sellFraction, 1);
  assert.match(d.reason, /liquidity/);
});

test('sells when momentum rolls over while in profit, holds through it when not', () => {
  const closes = [...Array.from({ length: 20 }, (_, i) => 1 + i * 0.05), 1.9, 1.8, 1.7, 1.6];
  const mo = momentum(candles(closes));
  const rules = { ...S, takeProfitPct: 500, trailActivatePct: 500, breakEvenAtPct: 500 };
  const inProfit = decideExit(pos(), mkt(1.15, { sells5m: 40, buys5m: 25, change5mPct: -3 }), mo, 60, rules);
  assert.equal(inProfit.sellFraction, 1);
  const flat = decideExit(pos(), mkt(1.02, { sells5m: 40, buys5m: 25, change5mPct: -3 }), mo, 60, rules);
  assert.equal(flat.sellFraction, 0);
});

test('a confirmed pullback sells at half the trailing distance', () => {
  const mo = { rsi: 55, rsiPeak: 70, trendUp: true, belowFastEma: true, bearishCross: false, fallingCloses: 2 };
  const rules = { ...S, takeProfitPct: 500 };
  const p = pos({ highPrice: 1.6, stopPrice: 1.35 });
  const selling = mkt(1.45, { sells5m: 40, buys5m: 30, change5mPct: -4 }); // 9% off the high, trail would wait for 16%
  assert.equal(decideExit(p, selling, mo, 60, rules).sellFraction, 1);
  // Same pullback but buyers still in control: hold.
  assert.equal(decideExit(p, mkt(1.45, { sells5m: 20, buys5m: 40, change5mPct: 1 }), mo, 60, rules).sellFraction, 0);
  // Small dip: hold.
  assert.equal(decideExit(p, mkt(1.57, { sells5m: 40, buys5m: 30, change5mPct: -1 }), mo, 60, rules).sellFraction, 0);
});

test('heavy selling dump exits whatever the P&L', () => {
  const d = decideExit(pos(), mkt(0.9, { sells5m: 80, buys5m: 20, change5mPct: -15 }), null, 60, S);
  assert.equal(d.sellFraction, 1);
  assert.match(d.reason, /heavy selling/);
});

test('dead money gets freed after the stall time', () => {
  const d = decideExit(pos(), mkt(1.01), null, S.stallMinutes * 60 + 1, S);
  assert.equal(d.sellFraction, 1);
  assert.match(d.reason, /no momentum/);
});

// ---------- Entries ----------

const ctx = {
  marketPriceUsd: 1.05, leaderPriceUsd: 1, liquidityUsd: 80_000, pairAgeMinutes: 60, change5mPct: 10,
  buys5m: 40, sells5m: 20, rsi: 60, signalAgeSeconds: 5, leaderSol: 2, leaderAvgSol: 2,
  mintAuthority: null, freezeAuthority: null, riskyExtensions: [], recentlyLostOnMint: false,
};

test('a clean signal passes', () => assert.deepEqual(entryProblems(ctx, S), []));

test('entry guards', () => {
  const has = (over: object, text: RegExp) => assert.ok(entryProblems({ ...ctx, ...over }, S).some((p) => text.test(p)), String(text));
  has({ marketPriceUsd: 1.3 }, /above the leader/);
  has({ mintAuthority: 'X' }, /mint/);
  has({ freezeAuthority: 'X' }, /freeze/);
  has({ liquidityUsd: 5000 }, /liquidity/);
  has({ leaderSol: 0.5, leaderAvgSol: 3 }, /test buy/);
  has({ rsi: 95 }, /overheated/);
  has({ change5mPct: 200 }, /pumped/);
  has({ signalAgeSeconds: 600 }, /old/);
  has({ riskyExtensions: ['transferHook'] }, /risky/);
});

test('paper fills include fees and slippage both ways', () => {
  const buy = simulateBuy(100, 1, 100_000, S)!;
  assert.ok(buy.fillPrice > 1);
  const sell = simulateSell(buy.qty, 1, 100_000, S);
  assert.ok(sell.proceedsUsd < 100 && sell.proceedsUsd > 95, `round trip ${sell.proceedsUsd}`);
});
