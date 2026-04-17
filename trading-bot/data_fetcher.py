import os
import ccxt
import pandas as pd
from datetime import datetime, timedelta, timezone
import config

SYNTHETIC_CSV = os.path.join(os.path.dirname(__file__), "popcat_synthetic.csv")


def get_exchange(live: bool = False) -> ccxt.Exchange:
    exchange_class = getattr(ccxt, config.EXCHANGE)
    params = {
        "apiKey": config.API_KEY,
        "secret": config.API_SECRET,
        "enableRateLimit": True,
        "options": {"defaultType": "future"},
    }
    ex: ccxt.Exchange = exchange_class(params)
    # Only use testnet for live trading, never for public data fetches
    if config.USE_TESTNET and live:
        ex.set_sandbox_mode(True)
    return ex


def fetch_ohlcv(
    symbol: str = config.SYMBOL,
    timeframe: str = config.TIMEFRAME,
    days: int = config.BACKTEST_DAYS,
    exchange: ccxt.Exchange | None = None,
) -> pd.DataFrame:
    # Use cached synthetic data when available (offline/backtest environments)
    if os.path.exists(SYNTHETIC_CSV):
        df = pd.read_csv(SYNTHETIC_CSV, index_col="timestamp", parse_dates=True)
        if df.index.tz is None:
            df.index = df.index.tz_localize("UTC")
        cutoff = df.index[-1] - timedelta(days=days)
        return df[df.index >= cutoff]

    if exchange is None:
        exchange = get_exchange(live=False)

    since_ms = int(
        (datetime.now(timezone.utc) - timedelta(days=days)).timestamp() * 1000
    )
    all_bars: list = []
    limit = 1000

    while True:
        bars = exchange.fetch_ohlcv(symbol, timeframe, since=since_ms, limit=limit)
        if not bars:
            break
        all_bars.extend(bars)
        if len(bars) < limit:
            break
        since_ms = bars[-1][0] + 1

    df = pd.DataFrame(all_bars, columns=["timestamp", "open", "high", "low", "close", "volume"])
    df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms", utc=True)
    df.set_index("timestamp", inplace=True)
    df = df[~df.index.duplicated(keep="last")]
    df.sort_index(inplace=True)
    return df
