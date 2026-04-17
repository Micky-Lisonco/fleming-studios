import pandas as pd
import numpy as np
from .base_strategy import BaseStrategy
import config


class MacdScalperStrategy(BaseStrategy):
    """
    MACD Crossover Scalper with Trend Filter — 15m/5m/30m, 20-30x leverage.

    Core logic:
      LONG:  Entry MACD histogram crosses negative→positive AND RSI < RSI_MAX_LONG
             AND macro trend MACD histogram is bullish (or bullish divergence present).
      SHORT: Entry MACD histogram crosses positive→negative AND RSI > RSI_MIN_SHORT
             AND macro trend MACD histogram is bearish (or bearish divergence present).

    Divergence entries bypass the trend filter — RSI divergence IS the signal.
    Trailing stop rides the full pump; initial 0.8% SL caps losses on bad entries.
    """

    @property
    def name(self) -> str:
        return "MACD Scalper (15m)"

    def generate_signals(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        close = df["close"]

        # ── RSI ───────────────────────────────────────────────────────────────
        df["rsi"] = self._rsi(close, config.RSI_PERIOD)

        # ── Entry MACD (12/26/9) ──────────────────────────────────────────────
        ema_f = close.ewm(span=config.MACD_FAST, adjust=False).mean()
        ema_s = close.ewm(span=config.MACD_SLOW, adjust=False).mean()
        macd  = ema_f - ema_s
        sig   = macd.ewm(span=config.MACD_SIGNAL, adjust=False).mean()
        hist  = macd - sig
        df["macd_hist"] = hist

        # ── Trend MACD (2× periods = 24/52/18) ───────────────────────────────
        t_ema_f = close.ewm(span=config.MACD_FAST * 2, adjust=False).mean()
        t_ema_s = close.ewm(span=config.MACD_SLOW * 2, adjust=False).mean()
        t_macd  = t_ema_f - t_ema_s
        t_sig   = t_macd.ewm(span=config.MACD_SIGNAL * 2, adjust=False).mean()
        trend_hist = t_macd - t_sig
        df["trend_hist"] = trend_hist

        rsi = df["rsi"]

        # ── MACD crossovers ───────────────────────────────────────────────────
        bull_cross = (hist > 0) & (hist.shift(1) <= 0)
        bear_cross = (hist < 0) & (hist.shift(1) >= 0)

        # Trend direction
        trend_up   = trend_hist > 0
        trend_down = trend_hist < 0

        # ── RSI Divergence (12-bar lookback) ──────────────────────────────────
        lb = 12
        price_low  = close == close.rolling(lb).min()
        price_high = close == close.rolling(lb).max()
        rsi_low    = rsi == rsi.rolling(lb).min()
        rsi_high   = rsi == rsi.rolling(lb).max()

        # Bullish divergence: price at new low but RSI NOT at new low (higher low)
        bull_div = price_low & ~rsi_low & bull_cross
        # Bearish divergence: price at new high but RSI NOT at new high (lower high)
        bear_div = price_high & ~rsi_high & bear_cross

        # ── Signals ───────────────────────────────────────────────────────────
        long_cond = bull_cross & trend_up   & (rsi < config.RSI_MAX_LONG)
        long_div  = bull_div                & (rsi < config.RSI_MAX_LONG)   # no trend filter

        short_cond = bear_cross & trend_down & (rsi > config.RSI_MIN_SHORT)
        short_div  = bear_div               & (rsi > config.RSI_MIN_SHORT)

        df["signal"] = 0
        df.loc[long_cond | long_div,   "signal"] = 1
        df.loc[short_cond | short_div, "signal"] = -1

        # ── Initial stop-loss ─────────────────────────────────────────────────
        sl    = config.STOP_LOSS_PCT
        price = df["close"]
        df["sl_price"] = np.where(
            df["signal"] == 1,  price * (1 - sl),
            np.where(df["signal"] == -1, price * (1 + sl), np.nan)
        )

        return df

    @staticmethod
    def _rsi(series: pd.Series, period: int) -> pd.Series:
        delta = series.diff()
        gain  = delta.clip(lower=0)
        loss  = -delta.clip(upper=0)
        ag = gain.ewm(alpha=1 / period, adjust=False).mean()
        al = loss.ewm(alpha=1 / period, adjust=False).mean()
        rs = ag / al.replace(0, np.nan)
        return 100 - (100 / (1 + rs))
