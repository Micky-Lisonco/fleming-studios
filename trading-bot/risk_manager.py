import config


class RiskManager:
    """
    Calculates position size based on fixed fractional risk.
    Enforces max drawdown circuit breaker.
    """

    def __init__(self, initial_balance: float = config.INITIAL_BALANCE):
        self.initial_balance = initial_balance
        self.peak_balance = initial_balance

    def position_size(
        self, balance: float, entry_price: float, sl_price: float
    ) -> float:
        """
        Returns contract quantity such that if stop-loss is hit the loss
        equals RISK_PERCENT% of current balance.
        """
        if entry_price <= 0 or sl_price <= 0:
            return 0.0

        risk_amount = balance * (config.RISK_PERCENT / 100)
        price_risk = abs(entry_price - sl_price)
        if price_risk == 0:
            return 0.0

        # Leveraged contracts: each contract = 1 unit of base asset
        # Loss per contract = price_risk (without leverage — exchange handles margin)
        qty = risk_amount / price_risk
        return round(qty, 4)

    def update_peak(self, balance: float) -> None:
        if balance > self.peak_balance:
            self.peak_balance = balance

    def max_drawdown_hit(self, balance: float, limit_pct: float = 20.0) -> bool:
        """Pause trading if drawdown from peak exceeds limit_pct%."""
        drawdown = (self.peak_balance - balance) / self.peak_balance * 100
        return drawdown >= limit_pct
