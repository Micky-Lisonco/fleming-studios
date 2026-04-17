"""
Generates synthetic POPCAT-like OHLCV data for offline backtesting.
Mimics meme coin behaviour: trending regimes, pump-and-dump cycles,
volume spikes on big moves, and high baseline volatility.
"""
import numpy as np
import pandas as pd
from datetime import datetime, timezone, timedelta

SEED = 42
BARS = 8640        # 90 days × 96 bars/day (15m)
START_PRICE = 0.55
INTERVAL_MIN = 15


def generate_popcat_ohlcv(bars: int = BARS, seed: int = SEED) -> pd.DataFrame:
    rng = np.random.default_rng(seed)

    # ── Regime engine ─────────────────────────────────────────────────────────
    # Each bar belongs to a regime that drives drift and volatility
    # Regimes: "grind_up", "pump", "dump", "crab"
    regime_durations = {"crab": (200, 600), "grind_up": (150, 400),
                        "pump": (40, 120), "dump": (60, 200)}
    regime_drifts    = {"crab": 0.0001, "grind_up": 0.0008,
                        "pump": 0.004,  "dump": -0.005}
    regime_vols      = {"crab": 0.006,  "grind_up": 0.010,
                        "pump": 0.018,  "dump": 0.022}
    regime_sequence  = ["crab", "grind_up", "pump", "dump"]  # cycle

    regimes = []
    idx = 0
    cycle_pos = 0
    while idx < bars:
        r = regime_sequence[cycle_pos % len(regime_sequence)]
        lo, hi = regime_durations[r]
        dur = int(rng.integers(lo, hi))
        regimes.extend([r] * min(dur, bars - idx))
        idx += dur
        cycle_pos += 1
    regimes = regimes[:bars]

    # ── Price simulation ──────────────────────────────────────────────────────
    closes = np.zeros(bars)
    closes[0] = START_PRICE

    for i in range(1, bars):
        r = regimes[i]
        drift = regime_drifts[r]
        vol = regime_vols[r]
        shock = rng.normal(drift, vol)
        closes[i] = max(closes[i - 1] * (1 + shock), 0.001)

    # ── Build OHLCV ───────────────────────────────────────────────────────────
    opens  = np.zeros(bars)
    highs  = np.zeros(bars)
    lows   = np.zeros(bars)
    vols   = np.zeros(bars)

    opens[0] = START_PRICE

    for i in range(bars):
        r = regimes[i]
        bar_range = closes[i] * regime_vols[r] * rng.uniform(0.5, 2.5)
        highs[i] = closes[i] + bar_range * rng.uniform(0.3, 1.0)
        lows[i]  = closes[i] - bar_range * rng.uniform(0.3, 1.0)
        lows[i]  = max(lows[i], 0.001)

        if i < bars - 1:
            opens[i + 1] = closes[i] * (1 + rng.normal(0, 0.002))  # slight gap

        # Volume: higher during pumps/dumps, spikes on big moves
        base_vol = 500_000 if r in ("pump", "dump") else 150_000
        price_move = abs(closes[i] - opens[i]) / opens[i] if opens[i] > 0 else 0
        vols[i] = base_vol * (1 + price_move * 20) * rng.lognormal(0, 0.5)

    start = datetime(2024, 9, 1, tzinfo=timezone.utc)
    timestamps = [start + timedelta(minutes=INTERVAL_MIN * i) for i in range(bars)]

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
