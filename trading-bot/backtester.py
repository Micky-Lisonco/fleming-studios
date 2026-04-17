import pandas as pd
import numpy as np
from dataclasses import dataclass, field
from tabulate import tabulate
import config
from risk_manager import RiskManager
from strategies.base_strategy import BaseStrategy


@dataclass
class Trade:
    entry_time: pd.Timestamp
    exit_time: pd.Timestamp
    direction: int  # 1 long, -1 short
    entry_price: float
    exit_price: float
    qty: float
    pnl: float
    exit_reason: str


@dataclass
class BacktestResult:
    trades: list[Trade] = field(default_factory=list)
    equity_curve: list[float] = field(default_factory=list)
    initial_balance: float = config.INITIAL_BALANCE


class Backtester:
    def __init__(self, strategy: BaseStrategy, initial_balance: float = config.INITIAL_BALANCE):
        self.strategy = strategy
        self.initial_balance = initial_balance

    def run(self, df: pd.DataFrame) -> BacktestResult:
        df = self.strategy.generate_signals(df).dropna(subset=["rsi"] if "rsi" in df.columns else ["signal"])
        result = BacktestResult(initial_balance=self.initial_balance)
        rm = RiskManager(self.initial_balance)

        balance = self.initial_balance
        position: dict | None = None

        result.equity_curve.append(balance)

        for i in range(1, len(df)):
            row = df.iloc[i]
            prev = df.iloc[i - 1]

            # ── Manage open position ──────────────────────────────────────────
            if position is not None:
                direction = position["direction"]
                entry = position["entry_price"]
                qty = position["qty"]
                entry_time = position["entry_time"]

                # Update the best price seen since entry
                if direction == 1:
                    position["best_price"] = max(position["best_price"], row["high"])
                else:
                    position["best_price"] = min(position["best_price"], row["low"])

                best = position["best_price"]

                # Determine current stop: trailing or initial SL
                if direction == 1:
                    unrealised_pct = (best - entry) / entry
                    if unrealised_pct >= config.TRAIL_ACTIVATION_PCT:
                        current_sl = best * (1 - config.TRAIL_DISTANCE_PCT)
                        position["sl_price"] = max(position["sl_price"], current_sl)
                    sl = position["sl_price"]
                    sl_hit = row["low"] <= sl
                else:
                    unrealised_pct = (entry - best) / entry
                    if unrealised_pct >= config.TRAIL_ACTIVATION_PCT:
                        current_sl = best * (1 + config.TRAIL_DISTANCE_PCT)
                        position["sl_price"] = min(position["sl_price"], current_sl)
                    sl = position["sl_price"]
                    sl_hit = row["high"] >= sl

                exit_price = None
                reason = None

                if sl_hit:
                    exit_price = sl
                    reason = "Trail-SL" if unrealised_pct >= config.TRAIL_ACTIVATION_PCT else "SL"
                elif prev["signal"] != 0 and prev["signal"] != direction:
                    exit_price = row["open"]
                    reason = "Flip"

                if exit_price is not None:
                    raw_pnl = direction * (exit_price - entry) * qty
                    fee = (entry + exit_price) * qty * 0.00075 * 2
                    pnl = raw_pnl - fee
                    balance += pnl
                    rm.update_peak(balance)
                    result.trades.append(Trade(
                        entry_time=entry_time,
                        exit_time=row.name,
                        direction=direction,
                        entry_price=entry,
                        exit_price=exit_price,
                        qty=qty,
                        pnl=pnl,
                        exit_reason=reason,
                    ))
                    position = None

            # ── Open new position ─────────────────────────────────────────────
            if position is None and prev["signal"] != 0:
                if rm.max_drawdown_hit(balance):
                    result.equity_curve.append(balance)
                    continue  # circuit breaker

                sig = prev["signal"]
                entry_price = row["open"]
                sl_price = prev["sl_price"]
                qty = rm.position_size(balance, entry_price, sl_price)

                if qty > 0:
                    position = {
                        "direction": sig,
                        "entry_price": entry_price,
                        "sl_price": sl_price,
                        "best_price": entry_price,  # tracks highest (long) or lowest (short) since entry
                        "qty": qty,
                        "entry_time": row.name,
                    }

            result.equity_curve.append(balance)

        # Close any open position at end
        if position is not None:
            exit_price = df.iloc[-1]["close"]
            direction = position["direction"]
            entry = position["entry_price"]
            qty = position["qty"]
            raw_pnl = direction * (exit_price - entry) * qty
            fee = (entry + exit_price) * qty * 0.00075 * 2
            pnl = raw_pnl - fee
            balance += pnl
            result.trades.append(Trade(
                entry_time=position["entry_time"],
                exit_time=df.index[-1],
                direction=direction,
                entry_price=entry,
                exit_price=exit_price,
                qty=qty,
                pnl=pnl,
                exit_reason="EOD",
            ))
            result.equity_curve.append(balance)

        return result

    @staticmethod
    def print_report(result: BacktestResult, strategy_name: str = "Strategy") -> None:
        trades = result.trades
        equity = np.array(result.equity_curve)
        initial = result.initial_balance

        if not trades:
            print("No trades executed.")
            return

        final_balance = equity[-1]
        total_return = (final_balance - initial) / initial * 100
        winners = [t for t in trades if t.pnl > 0]
        losers = [t for t in trades if t.pnl <= 0]
        win_rate = len(winners) / len(trades) * 100
        avg_win = np.mean([t.pnl for t in winners]) if winners else 0
        avg_loss = np.mean([t.pnl for t in losers]) if losers else 0
        profit_factor = (sum(t.pnl for t in winners) / abs(sum(t.pnl for t in losers))
                         if losers and abs(sum(t.pnl for t in losers)) > 0 else float("inf"))

        # Max drawdown
        peak = np.maximum.accumulate(equity)
        drawdown = (peak - equity) / peak * 100
        max_dd = drawdown.max()

        # Sharpe (daily returns approx)
        pnls = np.array([t.pnl for t in trades])
        sharpe = (pnls.mean() / pnls.std() * np.sqrt(252)) if pnls.std() > 0 else 0

        rows = [
            ["Strategy", strategy_name],
            ["Initial Balance", f"${initial:,.2f}"],
            ["Final Balance", f"${final_balance:,.2f}"],
            ["Total Return", f"{total_return:+.2f}%"],
            ["Total Trades", len(trades)],
            ["Win Rate", f"{win_rate:.1f}%"],
            ["Avg Win", f"${avg_win:.2f}"],
            ["Avg Loss", f"${avg_loss:.2f}"],
            ["Profit Factor", f"{profit_factor:.2f}"],
            ["Max Drawdown", f"{max_dd:.2f}%"],
            ["Sharpe Ratio", f"{sharpe:.2f}"],
        ]
        print("\n" + tabulate(rows, tablefmt="rounded_outline"))

        # Recent trades
        recent = trades[-10:]
        trade_rows = [
            [
                t.entry_time.strftime("%Y-%m-%d %H:%M"),
                "LONG" if t.direction == 1 else "SHORT",
                f"{t.entry_price:.6f}",
                f"{t.exit_price:.6f}",
                f"${t.pnl:+.2f}",
                t.exit_reason,
            ]
            for t in recent
        ]
        print("\nLast 10 Trades:")
        print(tabulate(trade_rows, headers=["Entry", "Dir", "Entry$", "Exit$", "PnL", "Reason"], tablefmt="simple"))
