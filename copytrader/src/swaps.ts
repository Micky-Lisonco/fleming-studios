import { STABLES, WSOL } from './config.ts';

// A swap between SOL and one token, seen from one wallet's point of view.
export type Swap = {
  signature: string;
  slot: number;
  time: number; // unix seconds
  wallet: string;
  mint: string;
  side: 'buy' | 'sell';
  tokenAmount: number; // always positive, UI units
  solAmount: number; // always positive, SOL spent (buy) or received (sell), fees included
};

const MIN_SOL_LEG = 0.005; // below this it is a transfer or dust, not a trade

type TokenBalance = {
  accountIndex: number;
  mint: string;
  owner?: string;
  uiTokenAmount: { uiAmount: number | null; uiAmountString?: string };
};

function uiAmount(b: TokenBalance | undefined): number {
  if (!b) return 0;
  const a = b.uiTokenAmount;
  return a.uiAmount ?? Number(a.uiAmountString ?? 0);
}

function accountKey(k: unknown): string {
  return typeof k === 'string' ? k : (k as { pubkey: string }).pubkey;
}

// Turns a `getTransaction` (jsonParsed) result into a Swap for `wallet`, or null when the
// transaction is not a plain SOL <-> token swap made by that wallet.
export function parseSwap(tx: any, wallet: string): Swap | null {
  if (!tx?.meta || tx.meta.err) return null;
  const keys: string[] = (tx.transaction?.message?.accountKeys ?? []).map(accountKey);
  const loaded = tx.meta.loadedAddresses;
  if (loaded) keys.push(...(loaded.writable ?? []), ...(loaded.readonly ?? []));

  const idx = keys.indexOf(wallet);
  if (idx < 0) return null;
  let sol = ((tx.meta.postBalances[idx] ?? 0) - (tx.meta.preBalances[idx] ?? 0)) / 1e9;

  // Net token change per mint for accounts owned by the wallet. Closed accounts only show
  // up in preTokenBalances, so pair pre and post by account index.
  const pre = new Map<number, TokenBalance>();
  const post = new Map<number, TokenBalance>();
  for (const b of (tx.meta.preTokenBalances ?? []) as TokenBalance[]) pre.set(b.accountIndex, b);
  for (const b of (tx.meta.postTokenBalances ?? []) as TokenBalance[]) post.set(b.accountIndex, b);
  const deltas = new Map<string, number>();
  for (const i of new Set([...pre.keys(), ...post.keys()])) {
    const b = post.get(i) ?? pre.get(i)!;
    if (b.owner !== wallet) continue;
    const d = uiAmount(post.get(i)) - uiAmount(pre.get(i));
    deltas.set(b.mint, (deltas.get(b.mint) ?? 0) + d);
  }

  sol += deltas.get(WSOL) ?? 0;
  deltas.delete(WSOL);

  const changed = [...deltas].filter(([, d]) => Math.abs(d) > 0);
  if (changed.length !== 1) return null;
  const [mint, tokenDelta] = changed[0];
  if (STABLES.has(mint)) return null;
  if (Math.abs(sol) < MIN_SOL_LEG) return null;
  if (Math.sign(sol) === Math.sign(tokenDelta)) return null;

  return {
    signature: tx.transaction.signatures[0],
    slot: tx.slot,
    time: tx.blockTime ?? 0,
    wallet,
    mint,
    side: tokenDelta > 0 ? 'buy' : 'sell',
    tokenAmount: Math.abs(tokenDelta),
    solAmount: Math.abs(sol),
  };
}
