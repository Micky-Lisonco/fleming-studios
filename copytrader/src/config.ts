import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const password = process.env.APP_PASSWORD ?? '';

export const env = {
  port: Number(process.env.PORT ?? 8080),
  dataDir: resolve(process.env.DATA_DIR ?? './data'),
  appPassword: password,
  sessionSecret:
    process.env.SESSION_SECRET || createHash('sha256').update(`copytrader:${password}`).digest('hex'),
  rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  wsUrl: process.env.SOLANA_WS_URL || '',
  rpcRps: Number(process.env.SOLANA_RPC_RPS ?? 3),
  profileTxLimit: Number(process.env.PROFILE_TX_LIMIT ?? 150),
};

export const WSOL = 'So11111111111111111111111111111111111111112';
export const STABLES = new Set([
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
]);

export type RiskProfile = 'careful' | 'balanced' | 'aggressive';

// Everything the dashboard can change. Stored in the database; these are the defaults.
export type Settings = {
  botEnabled: boolean;
  startingBankrollUsd: number;
  positionSizePct: number; // 100 = all-in compounding, one trade at a time
  maxOpenPositions: number;
  riskProfile: RiskProfile;

  // Exits
  stopLossPct: number; // hard floor below entry
  breakEvenAtPct: number; // once up this much, the stop moves to entry + costs
  trailActivatePct: number; // trailing stop arms at this gain...
  trailPct: number; // ...this far below the high, tightening as gains grow
  takeProfitPct: number; // bank part of the position here
  securePct: number; // how much to sell at the take-profit (100 = all)
  momentumMinProfitPct: number; // indicator exits only fire when at least this far in profit
  liquidityDropPct: number; // pool liquidity falls this much since entry = get out
  stallMinutes: number; // still flat after this long = free the money
  maxHoldMinutes: number;
  exitWhenLeaderSells: boolean;

  // Entries
  maxChasePct: number; // skip if price already ran this far past the leader's buy
  minLiquidityUsd: number;
  maxTradePctOfLiquidity: number;
  minPairAgeMinutes: number;
  maxPump5mPct: number; // skip coins that already went vertical in the last 5 minutes
  maxEntryRsi: number;
  minConviction: number; // leader's buy vs their average size (skips small test buys)
  minLeaderBuySol: number;
  maxSignalAgeSeconds: number;
  requireMintRevoked: boolean;
  requireFreezeRevoked: boolean;

  // Account protection
  killSwitchDrawdownPct: number; // stop trading when balance is this far below its high
  dailyLossLimitPct: number;
  lossStreakPause: number; // this many losses in a row...
  lossStreakPauseMinutes: number; // ...pauses new entries this long

  // Paper-trading costs
  swapFeePct: number;
  networkFeeUsd: number;
  baseSlippagePct: number;

  // Wallet finder
  discoveryEnabled: boolean;
  autoFollowTopN: number; // 0 = only follow wallets you pick yourself
  minClosedTrades: number;
  minProfitFactor: number;
  maxAvgLossPct: number;
  maxWorstLossPct: number;
  minMedianHoldMinutes: number;
  maxSwapsPerHour: number;
  maxInactiveDays: number;
};

const PRESETS: Record<RiskProfile, Partial<Settings>> = {
  careful: {
    stopLossPct: 12, breakEvenAtPct: 10, trailActivatePct: 20, trailPct: 12, takeProfitPct: 40, securePct: 50,
    momentumMinProfitPct: 5, stallMinutes: 30, maxChasePct: 8, minLiquidityUsd: 50_000, minPairAgeMinutes: 30,
    maxPump5mPct: 30, maxEntryRsi: 75,
  },
  balanced: {
    stopLossPct: 20, breakEvenAtPct: 20, trailActivatePct: 35, trailPct: 18, takeProfitPct: 80, securePct: 50,
    momentumMinProfitPct: 10, stallMinutes: 45, maxChasePct: 15, minLiquidityUsd: 25_000, minPairAgeMinutes: 10,
    maxPump5mPct: 50, maxEntryRsi: 82,
  },
  aggressive: {
    stopLossPct: 30, breakEvenAtPct: 35, trailActivatePct: 60, trailPct: 25, takeProfitPct: 200, securePct: 50,
    momentumMinProfitPct: 20, stallMinutes: 90, maxChasePct: 25, minLiquidityUsd: 10_000, minPairAgeMinutes: 3,
    maxPump5mPct: 100, maxEntryRsi: 90,
  },
};

export function presetFor(p: RiskProfile): Partial<Settings> {
  return { riskProfile: p, ...PRESETS[p] };
}

export const DEFAULT_SETTINGS: Settings = {
  botEnabled: true,
  startingBankrollUsd: 50,
  positionSizePct: 100,
  maxOpenPositions: 1,
  riskProfile: 'balanced',

  stopLossPct: 20,
  breakEvenAtPct: 20,
  trailActivatePct: 35,
  trailPct: 18,
  takeProfitPct: 80,
  securePct: 50,
  momentumMinProfitPct: 10,
  liquidityDropPct: 30,
  stallMinutes: 45,
  maxHoldMinutes: 24 * 60,
  exitWhenLeaderSells: true,

  maxChasePct: 15,
  minLiquidityUsd: 25_000,
  maxTradePctOfLiquidity: 2,
  minPairAgeMinutes: 10,
  maxPump5mPct: 50,
  maxEntryRsi: 82,
  minConviction: 0.5,
  minLeaderBuySol: 0.3,
  maxSignalAgeSeconds: 90,
  requireMintRevoked: true,
  requireFreezeRevoked: true,

  killSwitchDrawdownPct: 50,
  dailyLossLimitPct: 30,
  lossStreakPause: 3,
  lossStreakPauseMinutes: 120,

  swapFeePct: 0.3,
  networkFeeUsd: 0.05,
  baseSlippagePct: 1,

  discoveryEnabled: true,
  autoFollowTopN: 10,
  minClosedTrades: 8,
  minProfitFactor: 2,
  maxAvgLossPct: 25,
  maxWorstLossPct: 60,
  minMedianHoldMinutes: 5,
  maxSwapsPerHour: 15,
  maxInactiveDays: 5,
};
