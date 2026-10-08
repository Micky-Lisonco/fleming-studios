export type Candle = { t: number; o: number; h: number; l: number; c: number; v: number }; // oldest first

// Exponential moving average of each point (same length as input).
export function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  values.forEach((v, i) => out.push(i === 0 ? v : v * k + out[i - 1] * (1 - k)));
  return out;
}

// Wilder's RSI for each point; NaN until there is enough data.
export function rsi(values: number[], period = 14): number[] {
  const out: number[] = values.map(() => NaN);
  if (values.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1];
    if (d > 0) gain += d;
    else loss -= d;
  }
  gain /= period;
  loss /= period;
  out[period] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    gain = (gain * (period - 1) + Math.max(d, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-d, 0)) / period;
    out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }
  return out;
}

export type Momentum = {
  rsi: number; // latest RSI(14), NaN when not enough candles
  rsiPeak: number; // highest RSI in the last 6 candles
  trendUp: boolean; // fast EMA above slow EMA
  belowFastEma: boolean; // last close under the fast EMA: short-term momentum lost
  bearishCross: boolean; // fast EMA dropped below slow EMA in the last 2 candles
  fallingCloses: number; // how many of the last candles closed lower than the one before
};

export function momentum(candles: Candle[]): Momentum | null {
  if (candles.length < 15) return null;
  const closes = candles.map((c) => c.c);
  const fast = ema(closes, 5);
  const slow = ema(closes, 13);
  const r = rsi(closes, 14);
  const n = closes.length - 1;
  const crossedAt = (i: number) => fast[i] < slow[i] && fast[i - 1] >= slow[i - 1];
  let falling = 0;
  for (let i = n; i > 0 && closes[i] < closes[i - 1]; i--) falling++;
  return {
    rsi: r[n],
    rsiPeak: Math.max(...r.slice(-6).filter((x) => !Number.isNaN(x)), 0),
    trendUp: fast[n] > slow[n],
    belowFastEma: closes[n] < fast[n],
    bearishCross: crossedAt(n) || crossedAt(n - 1),
    fallingCloses: falling,
  };
}
