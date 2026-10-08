import { fetchJson } from './http.ts';
import type { Candle } from '../indicators.ts';

// GeckoTerminal's free API allows ~30 calls a minute.
const BASE = 'https://api.geckoterminal.com/api/v2/networks/solana';
const opts = { minIntervalMs: 2200, init: { headers: { accept: 'application/json' } } };

export type Pool = { address: string; name: string; baseMint: string; liquidityUsd: number; createdAt: number };

export async function getTrendingPools(): Promise<Pool[]> {
  const res = await fetchJson<any>(`${BASE}/trending_pools?page=1`, opts);
  return (res.data ?? []).map((p: any) => ({
    address: p.attributes.address,
    name: p.attributes.name,
    baseMint: String(p.relationships?.base_token?.data?.id ?? '').replace(/^solana_/, ''),
    liquidityUsd: Number(p.attributes.reserve_in_usd ?? 0),
    createdAt: Math.floor(Date.parse(p.attributes.pool_created_at ?? '') / 1000) || 0,
  }));
}

export type PoolTrade = { wallet: string; side: 'buy' | 'sell'; usd: number; time: number; tx: string };

// The latest ~300 trades in a pool.
export async function getPoolTrades(pool: string): Promise<PoolTrade[]> {
  const res = await fetchJson<any>(`${BASE}/pools/${pool}/trades`, opts);
  return (res.data ?? []).map((t: any) => ({
    wallet: t.attributes.tx_from_address,
    side: t.attributes.kind === 'sell' ? 'sell' : 'buy',
    usd: Number(t.attributes.volume_in_usd ?? 0),
    time: Math.floor(Date.parse(t.attributes.block_timestamp) / 1000),
    tx: t.attributes.tx_hash,
  }));
}

// 1-minute candles, oldest first.
export async function getCandles(pool: string, limit = 60): Promise<Candle[]> {
  const res = await fetchJson<any>(`${BASE}/pools/${pool}/ohlcv/minute?aggregate=1&limit=${limit}&currency=usd`, opts);
  const list: number[][] = res.data?.attributes?.ohlcv_list ?? [];
  return list.map(([t, o, h, l, c, v]) => ({ t, o, h, l, c, v })).sort((a, b) => a.t - b.t);
}
