from abc import ABC, abstractmethod
import pandas as pd


class BaseStrategy(ABC):
    """All strategies return signal dicts with keys: signal, sl_price, tp_price"""

    def __init__(self, config: dict):
        self.config = config

    @abstractmethod
    def generate_signals(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Receives OHLCV DataFrame, returns same df with added columns:
          signal: 1 (long), -1 (short), 0 (flat)
          sl_price: stop-loss price for the signal bar
          tp_price: take-profit price for the signal bar
        """
        raise NotImplementedError

    @property
    @abstractmethod
    def name(self) -> str:
        raise NotImplementedError
