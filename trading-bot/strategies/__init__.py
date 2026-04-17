from .rsi_macd_momentum import RsiMacdStrategy
from .breakout import BreakoutStrategy
from .macd_scalper import MacdScalperStrategy

STRATEGIES = {
    "rsi_macd": RsiMacdStrategy,
    "breakout": BreakoutStrategy,
    "macd_scalper": MacdScalperStrategy,
}
