import pandas as pd
import numpy as np
from .base_strategy import BaseStrategy
import config


class RsiMacdStrategy(BaseStrategy):
    """
    RSI + MACD Momentum Strategy optimised for volatile meme coins.

    Long entry:  RSI crosses above RSI_LONG_THRESHOLD AND MACD histogram
                 turns positive AND price is above EMA(50).
    Short entry: RSI crosses below RSI_SHORT_THRESHOLD AND MACD histogram
                 turns negative AND price is below EMA(50).
    Exit:        Opposite signal, stop-loss, or take-profit hit.
    """

    @property
    def name(self) -> str:
        return "RSI+MACD Momentum"

    def generate_signals(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        close = df["close"]

        # RSI
        df["rsi"] = self._rsi(close, config.RSI_PERIOD)

        # MACD
        ema_fast = close.ewm(span=config.MACD_FAST, adjust=False).mean()
        ema_slow = close.ewm(span=config.MACD_SLOW, adjust=False).mean()
        macd_line = ema_fast - ema_slow
        signal_line = macd_line.ewm(span=config.MACD_SIGNAL, adjust=False).mean()
        df["macd_hist"] = macd_line - signal_line

        # Trend filter
        df["ema50"] = close.ewm(span=config.EMA_TREND_PERIOD, adjust=False).mean()

        # Conditions
        rsi = df["rsi"]
        hist = df["macd_hist"]
        price = df["close"]
        ema50 = df["ema50"]

        long_cond = (
            (rsi > config.RSI_LONG_THRESHOLD)
            & (rsi.shift(1) <= config.RSI_LONG_THRESHOLD)
            & (hist > 0)
            & (hist.shift(1) <= 0)
            & (price > ema50)
        )
        short_cond = (
            (rsi < config.RSI_SHORT_THRESHOLD)
            & (rsi.shift(1) >= config.RSI_SHORT_THRESHOLD)
            & (hist < 0)
            & (hist.shift(1) >= 0)
            & (price < ema50)
        )

        df["signal"] = 0
        df.loc[long_cond, "signal"] = 1
        df.loc[short_cond, "signal"] = -1

        # Stop-loss and take-profit prices
        sl = config.STOP_LOSS_PCT
        tp = config.TAKE_PROFIT_PCT
        df["sl_price"] = np.where(df["signal"] == 1, price * (1 - sl),
                          np.where(df["signal"] == -1, price * (1 + sl), np.nan))
        df["tp_price"] = np.where(df["signal"] == 1, price * (1 + tp),
                          np.where(df["signal"] == -1, price * (1 - tp), np.nan))

        return df

    @staticmethod
    def _rsi(series: pd.Series, period: int) -> pd.Series:
        delta = series.diff()
        gain = delta.clip(lower=0)
        loss = -delta.clip(upper=0)
        avg_gain = gain.ewm(alpha=1 / period, adjust=False).mean()
        avg_loss = loss.ewm(alpha=1 / period, adjust=False).mean()
        rs = avg_gain / avg_loss.replace(0, np.nan)
        return 100 - (100 / (1 + rs))
