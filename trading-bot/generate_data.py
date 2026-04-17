"""
Generates synthetic POPCAT-like OHLCV data for offline backtesting.
Produces clear momentum cycles on 15m — pump/dump regime changes with
RSI divergences and volume surges, matching real meme coin behaviour.
"""
import numpy as np
import pandas as pd
from datetime import datetime, timezone, timedelta

SEED = 42
BARS = 672         # 7 days × 96 bars/day (15m)
START_PRICE = 0.55
INTERVAL_MIN = 15


def generate_popcat_ohlcv(bars: int = BARS, seed: int = SEED) -> pd.DataFrame:
    rng = np.random.default_rng(seed)

    # Regime engine — longer, more defined cycles for 15m
    # Each cycle: accumulation → pump → distribution → dump
    regimes = []
    i = 0
    cycle = 0
    cycle_order = ["accumulation", "pump", "distribution", "dump"]
    cycle_lengths = {
        "accumulation": (20, 50),
        "pump":         (8,  25),
        "distribution": (10, 30),
        "dump":         (8,  22),
    }
    cycle_drifts = {
        "accumulation": 0.0002,
        "pump":         0.006,
        "distribution": -0.0001,
        "dump":         -0.007,
    }
    cycle_vols = {
        "accumulation": 0.004,
        "pump":         0.012,
        "distribution": 0.006,
        "dump":         0.014,
    }

    while i < bars:
        r = cycle_order[cycle % 4]
        lo, hi = cycle_lengths[r]
        dur = int(rng.integers(lo, hi))
        regimes.extend([r] * min(dur, bars - i))
        i += dur
        cycle += 1
    regimes = regimes[:bars]

    closes = np.zeros(bars)
    closes[0] = START_PRICE

    for k in range(1, bars):
        r = regimes[k]
        drift = cycle_drifts[r]
        vol = cycle_vols[r]
        # Add a mean-reversion component during distribution/accumulation
        if r in ("accumulation", "distribution"):
            mean_rev = -0.1 * (closes[k - 1] - START_PRICE) / START_PRICE
            drift += mean_rev * 0.003
        shock = rng.normal(drift, vol)
        closes[k] = max(closes[k - 1] * (1 + shock), 0.001)

    opens  = np.zeros(bars)
    highs  = np.zeros(bars)
    lows   = np.zeros(bars)
    vols   = np.zeros(bars)
    opens[0] = START_PRICE

    for k in range(bars):
        r = regimes[k]
        bar_range = closes[k] * cycle_vols[r] * rng.uniform(0.4, 2.0)
        highs[k] = closes[k] + bar_range * rng.uniform(0.2, 0.8)
        lows[k]  = max(closes[k] - bar_range * rng.uniform(0.2, 0.8), 0.001)
        if k < bars - 1:
            opens[k + 1] = closes[k] * (1 + rng.normal(0, 0.001))

        base_vol = {"accumulation": 80_000, "pump": 600_000,
                    "distribution": 120_000, "dump": 500_000}[r]
        price_move = abs(closes[k] - opens[k]) / (opens[k] + 1e-9)
        vols[k] = base_vol * (1 + price_move * 15) * rng.lognormal(0, 0.4)

    start = datetime(2024, 9, 1, tzinfo=timezone.utc)
    timestamps = [start + timedelta(minutes=INTERVAL_MIN * k) for k in range(bars)]

    df = pd.DataFrame({
        "timestamp": timestamps,
        "open": opens,
        "high": highs,
        "low": lows,
        "close": closes,
        "volume": vols,
    })
    df.set_index("timestamp", inplace=True)
    return df


if __name__ == "__main__":
    df = generate_popcat_ohlcv()
    df.to_csv("popcat_synthetic.csv")
    print(f"Generated {len(df)} bars  |  price range: ${df['close'].min():.4f} – ${df['close'].max():.4f}")
    print(f"Period: {df.index[0]}  →  {df.index[-1]}")

    # Show regime stats
    pumps = sum(1 for i in range(1, len(df))
                if df['close'].iloc[i] > df['close'].iloc[i-1] * 1.005)
    print(f"Bars with >0.5% move: {pumps} ({pumps/len(df)*100:.1f}%)")
