import ccxt
import pandas as pd
from datetime import datetime, timedelta, timezone
import config


def get_exchange(live: bool = False) -> ccxt.Exchange:
    exchange_class = getattr(ccxt, config.EXCHANGE)
    params = {
        "apiKey": config.API_KEY,
        "secret": config.API_SECRET,
        "enableRateLimit": True,
        "options": {"defaultType": "future"},
    }
    ex: ccxt.Exchange = exchange_class(params)
    if config.USE_TESTNET and not live:
        ex.set_sandbox_mode(True)
    return ex


def fetch_ohlcv(
    symbol: str = config.SYMBOL,
    timeframe: str = config.TIMEFRAME,
    days: int = config.BACKTEST_DAYS,
    exchange: ccxt.Exchange | None = None,
) -> pd.DataFrame:
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
