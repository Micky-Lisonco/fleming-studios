# Copytrader

Finds Solana wallets that trade well, copies their buys with **paper money**, and
manages every trade with layered protection. One password-protected dashboard you can
open on your phone.

No real money is spent. Live trading is a later step, once the paper results prove the
strategy works after fees and delay.

## How it works

**1. Find smart wallets.** Every 5 minutes the bot looks at trending Solana coins and
notes wallets that sold for more than they bought. Each one then gets a full check of
its last ~150 transactions:

- Every trade is matched buy → sell. Coins it **still holds are valued at today's price**,
  and dead coins count as total losses, so a wallet can't hide its losses by never selling.
- A wallet only gets a score if it:
  - is profitable overall
  - wins at least $2 for every $1 it loses
  - keeps its **average loss under 25%** and its worst loss under 60%
  - holds long enough to copy (not a bot, not a 1-block flipper)
  - has traded in the last few days
- The top 10 are followed automatically. You can add or remove wallets yourself.
- If copying a wallet loses us money (last 3 copies lost, net negative), it is dropped.

**2. Copy the buy, but only if it's safe.** When a followed wallet buys, the bot sees it
within seconds (live websocket, with polling as a backup) and checks:

- whether the price has already run more than 15% past what the wallet paid (too late = skip)
- whether the creator can still mint more tokens or freeze wallets, or whether the token
  has risky features
- liquidity, coin age, whether it already pumped in the last 5 minutes, and RSI
  (overheated = skip)
- whether this is a small "test buy" compared with the wallet's usual size (skip)

**3. Manage the trade.** Checked every 5 seconds, in this order:

| Protection | What it does |
|---|---|
| Liquidity pulled | Pool liquidity drops 30% → sell immediately (rug in progress) |
| Stop loss | Hard floor, default -20% |
| Break-even stop | Once up 20%, the stop moves above entry + fees: **a winner can't turn into a loser** |
| Trailing stop | From +35%, follows the high. The gap tightens as profit grows (18% → 9%) |
| Heavy selling | Sells outnumber buys 2:1 and price is sliding → out |
| Bank profit | At +80%, sell half. The rest rides with the trailing stop |
| Momentum | In profit and indicators turn (EMA cross, RSI rolling over from overbought, lower closes with sell pressure) → sell before the stop has to |
| Wallet sells | The wallet we copied sells → we sell |
| Dead money | Flat after 45 minutes → free the money for the next trade |

**4. Protect the account.**

- 3 losses in a row → pause for 2 hours.
- Daily loss limit of 30%.
- Kill switch: balance 50% below its high → bot switches itself off.

**Compounding test.** By default each trade uses 100% of the balance and rolls the result
into the next one. You can change this under Settings → Trade size.

Three **risk styles** (Careful / Balanced / Aggressive) set all the numbers at once.
Everything is adjustable under Settings → Advanced.

## Run it

You need Node.js 22.18 or newer. There are no packages to install.

```sh
cd copytrader
cp .env.example .env    # set APP_PASSWORD
export $(cat .env | xargs) && npm start
```

Open http://localhost:8080 and log in. To run the tests: `npm test`.

## Put it online (so you can open it on your phone)

It needs a server that is always on, with a small persistent disk for its database.
Vercel won't work: the bot has to keep running in the background. Easy options:

- **Railway** or **Render**: new service from this repo, root directory `copytrader`,
  start command `npm start`. Add a volume mounted at `/data`, set `DATA_DIR=/data`
  and `APP_PASSWORD`.
- **Fly.io** or any VPS: `docker build -t copytrader copytrader && docker run -d -p 8080:8080 -v ct:/data -e APP_PASSWORD=... copytrader`

Always serve it over HTTPS (all the platforms above do).

## Data sources (all free)

- **Solana public RPC**: wallet transactions and token safety checks. Slow and rate
  limited. A free key from Helius, QuickNode or Alchemy (`SOLANA_RPC_URL`) makes wallet
  checks about 10× faster and makes the live feed more reliable.
- **DexScreener**: prices, liquidity, 5-minute buy/sell counts.
- **GeckoTerminal**: trending pools, recent trades, 1-minute candles for indicators.

## Honest limits

- We always buy **after** the wallet we copy, so the bot can't get the same price. The
  chase guard and the paper slippage model account for that. The paper results include
  fees, slippage and price impact so they aren't flattering.
- Indicators react to a move; they don't predict it. The protections make sure losses
  stay small and profits get locked in. They can't guarantee every trade wins.
- A price can gap through a stop between checks (a -20% stop can fill at -27%).

## Next steps

1. Run on paper for 2–4 weeks and look at the results per wallet.
2. If it holds up: live trading through Jupiter, with a separate hot wallet holding only
   what you're willing to lose.
3. Robinhood Chain support (an EVM chain, so it needs its own watcher and execution).
