"""
Entry point:
  python main.py backtest [--strategy rsi_macd|breakout] [--days 90] [--leverage 10]
  python main.py live
"""
import argparse
import sys

import config
from data_fetcher import fetch_ohlcv
from backtester import Backtester
from bot import LiveBot
from strategies import STRATEGIES


def run_backtest(strategy_name: str, days: int, leverage: int) -> None:
    config.LEVERAGE = leverage

    strategy_cls = STRATEGIES.get(strategy_name)
    if strategy_cls is None:
        print(f"Unknown strategy '{strategy_name}'. Available: {list(STRATEGIES)}")
        sys.exit(1)

    strategy = strategy_cls({})
    print(f"\nFetching {days} days of {config.SYMBOL} ({config.TIMEFRAME}) candles ...")
    df = fetch_ohlcv(days=days)
    print(f"Loaded {len(df)} bars from {df.index[0]} to {df.index[-1]}")

    bt = Backtester(strategy, initial_balance=config.INITIAL_BALANCE)
    result = bt.run(df)
    Backtester.print_report(result, strategy.name)


def run_live() -> None:
    confirm = input(
        "\nWARNING: You are about to run a LIVE trading bot with real funds.\n"
        "High leverage can cause rapid total loss of capital.\n"
        "Are you sure? Type 'YES I UNDERSTAND THE RISK' to continue: "
    )
    if confirm.strip() != "YES I UNDERSTAND THE RISK":
        print("Aborted.")
        sys.exit(0)

    bot = LiveBot()
    bot.run()


def main() -> None:
    parser = argparse.ArgumentParser(description="POPCAT Trading Bot")
    sub = parser.add_subparsers(dest="command")

    bt_p = sub.add_parser("backtest", help="Run backtesting on historical data")
    bt_p.add_argument("--strategy", default=config.STRATEGY, choices=list(STRATEGIES))
    bt_p.add_argument("--days", type=int, default=config.BACKTEST_DAYS)
    bt_p.add_argument("--leverage", type=int, default=config.LEVERAGE)

    sub.add_parser("live", help="Run live trading bot (requires API keys in .env)")

    args = parser.parse_args()

    if args.command == "backtest":
        run_backtest(args.strategy, args.days, args.leverage)
    elif args.command == "live":
        run_live()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
