import pandas as pd
import numpy as np
from .base_strategy import BaseStrategy
import config


class BreakoutStrategy(BaseStrategy):
    """
    N-bar Breakout + Volume Confirmation Strategy.

    Long entry:  Close breaks above the highest high of last N bars
                 with volume > BREAKOUT_VOLUME_MULTIPLIER * avg volume.
    Short entry: Close breaks below the lowest low of last N bars
                 with volume > BREAKOUT_VOLUME_MULTIPLIER * avg volume.
    """

    @property
    def name(self) -> str:
        return "Volume Breakout"

    def generate_signals(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        n = config.BREAKOUT_LOOKBACK
        vol_mult = config.BREAKOUT_VOLUME_MULTIPLIER

        # Rolling high/low — shift by 1 so current bar not included
        df["roll_high"] = df["high"].shift(1).rolling(n).max()
        df["roll_low"] = df["low"].shift(1).rolling(n).min()

        # Volume filter
        df["avg_vol"] = df["volume"].rolling(n).mean()
        vol_ok = df["volume"] > vol_mult * df["avg_vol"]

        long_cond = (df["close"] > df["roll_high"]) & vol_ok
        short_cond = (df["close"] < df["roll_low"]) & vol_ok

        df["signal"] = 0
        df.loc[long_cond, "signal"] = 1
        df.loc[short_cond, "signal"] = -1

        sl = config.STOP_LOSS_PCT
        tp = config.TAKE_PROFIT_PCT
        price = df["close"]
        df["sl_price"] = np.where(df["signal"] == 1, price * (1 - sl),
                          np.where(df["signal"] == -1, price * (1 + sl), np.nan))
        df["tp_price"] = np.where(df["signal"] == 1, price * (1 + tp),
                          np.where(df["signal"] == -1, price * (1 - tp), np.nan))

        return df
