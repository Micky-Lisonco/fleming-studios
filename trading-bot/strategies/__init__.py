from .rsi_macd_momentum import RsiMacdStrategy
from .breakout import BreakoutStrategy

STRATEGIES = {
    "rsi_macd": RsiMacdStrategy,
    "breakout": BreakoutStrategy,
}
