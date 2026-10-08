import { env } from '../config.ts';
import { fetchJson } from './http.ts';

let id = 0;

async function rpc<T = any>(method: string, params: unknown[]): Promise<T> {
  const body = await fetchJson<{ result: T; error?: { message: string } }>(env.rpcUrl, {
    minIntervalMs: Math.ceil(1000 / Math.max(env.rpcRps, 0.1)),
    init: {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }),
    },
  });
  if (body.error) throw new Error(`RPC ${method}: ${body.error.message}`);
  return body.result;
}

export type SigInfo = { signature: string; slot: number; blockTime: number | null; err: unknown };

// Newest first.
export function getSignatures(address: string, opts: { limit?: number; until?: string; before?: string } = {}) {
  return rpc<SigInfo[]>('getSignaturesForAddress', [address, { limit: 100, ...opts }]);
}

export function getTransaction(signature: string) {
  return rpc<any>('getTransaction', [
    signature,
    { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0, commitment: 'confirmed' },
  ]);
}

const RISKY_EXTENSIONS = new Set([
  'transferFeeConfig',
  'transferHook',
  'permanentDelegate',
  'nonTransferable',
  'pausableConfig',
  'defaultAccountState',
]);

export type MintInfo = { mintAuthority: string | null; freezeAuthority: string | null; riskyExtensions: string[] };

export async function getMintInfo(mint: string): Promise<MintInfo | null> {
  const res = await rpc<any>('getAccountInfo', [mint, { encoding: 'jsonParsed' }]);
  const info = res?.value?.data?.parsed?.info;
  if (!info) return null;
  const exts: string[] = (info.extensions ?? []).map((e: { extension: string }) => e.extension);
  return {
    mintAuthority: info.mintAuthority ?? null,
    freezeAuthority: info.freezeAuthority ?? null,
    riskyExtensions: exts.filter((e) => RISKY_EXTENSIONS.has(e)),
  };
}
