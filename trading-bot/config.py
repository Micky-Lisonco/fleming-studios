import os
from dotenv import load_dotenv

load_dotenv()

EXCHANGE = os.getenv("EXCHANGE", "bybit")
API_KEY = os.getenv("API_KEY", "")
API_SECRET = os.getenv("API_SECRET", "")
USE_TESTNET = os.getenv("USE_TESTNET", "true").lower() == "true"

SYMBOL = os.getenv("SYMBOL", "POPCAT/USDT:USDT")
LEVERAGE = int(os.getenv("LEVERAGE", "10"))
TIMEFRAME = os.getenv("TIMEFRAME", "15m")
RISK_PERCENT = float(os.getenv("RISK_PERCENT", "1.0"))
STRATEGY = os.getenv("STRATEGY", "rsi_macd")

# Strategy parameters - RSI + MACD Momentum
RSI_PERIOD = 14
RSI_LONG_THRESHOLD = 55
RSI_SHORT_THRESHOLD = 45
RSI_EXIT_LONG = 70
RSI_EXIT_SHORT = 30

MACD_FAST = 12
MACD_SLOW = 26
MACD_SIGNAL = 9

EMA_TREND_PERIOD = 50

STOP_LOSS_PCT = 0.015           # 1.5% initial stop — minimal loss on bad entries

# Trailing stop (replaces fixed TP so you ride the full pump)
TRAIL_ACTIVATION_PCT = 0.05    # start trailing once trade is +5% in profit
TRAIL_DISTANCE_PCT = 0.15      # trail 15% below the highest price reached
# e.g. on a +50% pump: trail triggers at 50% * 0.85 = +42.5% gain
# e.g. on a +100% pump: trail triggers at 100% * 0.85 = +85% gain

# Breakout strategy parameters
BREAKOUT_LOOKBACK = 20  # bars for high/low detection
BREAKOUT_VOLUME_MULTIPLIER = 1.5  # require 1.5x average volume

# Backtesting defaults
BACKTEST_DAYS = 90
INITIAL_BALANCE = 1000.0  # USDT
