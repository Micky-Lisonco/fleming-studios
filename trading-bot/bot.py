"""
Live trading bot — runs on a schedule, checks for signals every closed candle.
USE TESTNET FIRST. Set USE_TESTNET=true in .env until you are confident.
"""
import time
import schedule
from datetime import datetime, timezone
from colorama import Fore, Style, init as colorama_init
import ccxt

import config
from data_fetcher import fetch_ohlcv, get_exchange
from risk_manager import RiskManager
from strategies import STRATEGIES

colorama_init(autoreset=True)

TIMEFRAME_SECONDS = {
    "1m": 60, "3m": 180, "5m": 300, "15m": 900,
    "30m": 1800, "1h": 3600, "4h": 14400, "1d": 86400,
}


class LiveBot:
    def __init__(self):
        self.exchange: ccxt.Exchange = get_exchange(live=True)
        strategy_cls = STRATEGIES.get(config.STRATEGY)
        if strategy_cls is None:
            raise ValueError(f"Unknown strategy: {config.STRATEGY}. Choose from {list(STRATEGIES)}")
        self.strategy = strategy_cls({})
        self.rm = RiskManager()
        self.position: dict | None = None
        self._set_leverage()

    # ── Exchange helpers ──────────────────────────────────────────────────────

    def _set_leverage(self) -> None:
        try:
            self.exchange.set_leverage(config.LEVERAGE, config.SYMBOL)
            self._log(f"Leverage set to {config.LEVERAGE}x on {config.SYMBOL}", Fore.CYAN)
        except Exception as e:
            self._log(f"Could not set leverage: {e}", Fore.YELLOW)

    def _get_balance(self) -> float:
        bal = self.exchange.fetch_balance()
        return float(bal["USDT"]["free"])

    def _get_position(self) -> dict | None:
        positions = self.exchange.fetch_positions([config.SYMBOL])
        for p in positions:
            if float(p.get("contracts", 0)) != 0:
                return p
        return None

    def _place_order(self, side: str, qty: float, sl: float, tp: float) -> None:
        params = {
            "stopLoss": {"type": "market", "triggerPrice": sl},
            "takeProfit": {"type": "market", "triggerPrice": tp},
        }
        order = self.exchange.create_order(
            symbol=config.SYMBOL,
            type="market",
            side=side,
            amount=qty,
            params=params,
        )
        self._log(f"Order placed: {side.upper()} {qty} @ market | SL={sl:.6f} TP={tp:.6f}", Fore.GREEN)
        return order

    def _close_position(self, side: str, qty: float) -> None:
        close_side = "sell" if side == "buy" else "buy"
        self.exchange.create_order(
            symbol=config.SYMBOL,
            type="market",
            side=close_side,
            amount=qty,
            params={"reduceOnly": True},
        )
        self._log("Position closed (reduceOnly).", Fore.YELLOW)

    # ── Main loop ─────────────────────────────────────────────────────────────

    def tick(self) -> None:
        try:
            df = fetch_ohlcv(days=7, exchange=self.exchange)
            # Drop the last (incomplete) candle
            df = df.iloc[:-1]
            df = self.strategy.generate_signals(df)

            last = df.iloc[-1]
            signal = int(last["signal"])
            balance = self._get_balance()
            self.rm.update_peak(balance)

            if self.rm.max_drawdown_hit(balance):
                self._log("MAX DRAWDOWN CIRCUIT BREAKER — no new trades.", Fore.RED)
                return

            live_pos = self._get_position()

            if live_pos is not None:
                pos_side = 1 if float(live_pos["contracts"]) > 0 else -1
                # Flip on opposite signal
                if signal != 0 and signal != pos_side:
                    qty = abs(float(live_pos["contracts"]))
                    close_side = "sell" if pos_side == 1 else "buy"
                    self._close_position(close_side, qty)
                    live_pos = None

            if live_pos is None and signal != 0:
                entry_price = df.iloc[-1]["close"]
                sl_price = float(last["sl_price"])
                tp_price = float(last["tp_price"])
                qty = self.rm.position_size(balance, entry_price, sl_price)

                if qty > 0:
                    order_side = "buy" if signal == 1 else "sell"
                    self._place_order(order_side, qty, sl_price, tp_price)
                else:
                    self._log("Qty too small — skipping.", Fore.YELLOW)
            else:
                self._log(f"Signal: {signal} | Balance: ${balance:.2f} | No action.", Fore.WHITE)

        except Exception as e:
            self._log(f"Error in tick: {e}", Fore.RED)

    # ── Utilities ─────────────────────────────────────────────────────────────

    @staticmethod
    def _log(msg: str, color: str = Fore.WHITE) -> None:
        ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        print(f"{color}[{ts}] {msg}{Style.RESET_ALL}")

    def run(self) -> None:
        tf_secs = TIMEFRAME_SECONDS.get(config.TIMEFRAME, 900)
        self._log(f"Bot started | Symbol={config.SYMBOL} | TF={config.TIMEFRAME} "
                  f"| Strategy={self.strategy.name} | Leverage={config.LEVERAGE}x", Fore.CYAN)
        self._log("WARNING: High leverage trading carries extreme risk.", Fore.RED)

        self.tick()  # immediate first tick
        schedule.every(tf_secs).seconds.do(self.tick)

        while True:
            schedule.run_pending()
            time.sleep(1)
