import os
from dotenv import load_dotenv

load_dotenv()

EXCHANGE = os.getenv("EXCHANGE", "bybit")
API_KEY = os.getenv("API_KEY", "")
API_SECRET = os.getenv("API_SECRET", "")
USE_TESTNET = os.getenv("USE_TESTNET", "true").lower() == "true"

SYMBOL = os.getenv("SYMBOL", "POPCAT/USDT:USDT")
LEVERAGE = int(os.getenv("LEVERAGE", "25"))
TIMEFRAME = os.getenv("TIMEFRAME", "15m")
RISK_PERCENT = float(os.getenv("RISK_PERCENT", "2.0"))  # 2% risk per trade
STRATEGY = os.getenv("STRATEGY", "macd_scalper")

# MACD Scalper parameters
RSI_PERIOD = 14
RSI_MAX_LONG = 68    # don't buy if already overbought
RSI_MIN_SHORT = 32   # don't sell if already oversold

MACD_FAST = 12
MACD_SLOW = 26
MACD_SIGNAL = 9

# Histogram must be in its zone for this many bars before a valid crossover
MACD_CONFIRM_BARS = 3

STOP_LOSS_PCT = 0.008           # 0.8% initial stop — tight, limits losses on bad entries
TRAIL_ACTIVATION_PCT = 0.02    # start trailing at +2% profit
TRAIL_DISTANCE_PCT = 0.06      # trail 6% below peak — lets the pump run, exits on real reversal

# Backtesting defaults
BACKTEST_DAYS = 7               # 1 week of 5m data — shows daily trade frequency
INITIAL_BALANCE = 1000.0        # USDT
