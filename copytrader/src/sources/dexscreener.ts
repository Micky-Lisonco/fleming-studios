import { WSOL } from '../config.ts';
import { fetchJson } from './http.ts';

const BASE = 'https://api.dexscreener.com';

export type Market = {
  mint: string;
  symbol: string;
  pair: string;
  priceUsd: number;
  priceSol: number | null;
  liquidityUsd: number;
  pairCreatedAt: number; // unix seconds
  buys5m: number;
  sells5m: number;
  change5mPct: number;
};

// Best (most liquid) Solana market per token. Tokens with no market are missing from the result.
export async function getMarkets(mints: string[]): Promise<Map<string, Market>> {
  const out = new Map<string, Market>();
  for (let i = 0; i < mints.length; i += 30) {
    const chunk = mints.slice(i, i + 30);
    const pairs = await fetchJson<any[]>(`${BASE}/tokens/v1/solana/${chunk.join(',')}`, { minIntervalMs: 250 });
    for (const p of pairs ?? []) {
      const mint = p.baseToken?.address;
      if (!mint || !chunk.includes(mint)) continue;
      const liq = Number(p.liquidity?.usd ?? 0);
      if ((out.get(mint)?.liquidityUsd ?? -1) >= liq) continue;
      out.set(mint, {
        mint,
        symbol: p.baseToken.symbol ?? '?',
        pair: p.pairAddress,
        priceUsd: Number(p.priceUsd ?? 0),
        priceSol: p.quoteToken?.address === WSOL ? Number(p.priceNative) : null,
        liquidityUsd: liq,
        pairCreatedAt: Math.floor(Number(p.pairCreatedAt ?? 0) / 1000),
        buys5m: Number(p.txns?.m5?.buys ?? 0),
        sells5m: Number(p.txns?.m5?.sells ?? 0),
        change5mPct: Number(p.priceChange?.m5 ?? 0),
      });
    }
  }
  return out;
}

export async function getSolUsd(): Promise<number> {
  const m = await getMarkets([WSOL]);
  const p = m.get(WSOL)?.priceUsd;
  if (!p) throw new Error('could not get SOL price');
  return p;
}
