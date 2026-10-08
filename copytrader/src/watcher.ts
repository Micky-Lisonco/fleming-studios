import { env } from './config.ts';
import { db, log, now } from './db.ts';
import { onLeaderSwap } from './engine.ts';
import { getSignatures, getTransaction } from './sources/solana.ts';
import { parseSwap } from './swaps.ts';
import { short } from './wallets.ts';

// Followed wallets are watched two ways: a websocket push the moment their transaction is
// confirmed (fast), and a poll every few seconds that catches anything the socket missed.

const seen = new Set<string>();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const followed = () =>
  (db.prepare('SELECT address, last_sig FROM wallets WHERE followed = 1').all() as { address: string; last_sig: string | null }[]);

async function handle(wallet: string, signature: string) {
  const key = `${wallet}:${signature}`;
  if (seen.has(key)) return;
  seen.add(key);
  if (seen.size > 20_000) seen.clear();
  if (db.prepare('SELECT 1 FROM leader_swaps WHERE signature = ? AND wallet = ?').get(signature, wallet)) return;

  // Right after confirmation the RPC may not serve the transaction yet.
  let tx = null;
  for (let i = 0; i < 6 && !tx; i++) {
    tx = await getTransaction(signature);
    if (!tx) await sleep(1000);
  }
  const swap = parseSwap(tx, wallet);
  if (!swap) return;
  db.prepare(
    `INSERT OR IGNORE INTO leader_swaps (signature, wallet, mint, side, token_amount, sol_amount, slot, time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(swap.signature, wallet, swap.mint, swap.side, swap.tokenAmount, swap.solAmount, swap.slot, swap.time || now());
  log('info', `${short(wallet)} ${swap.side === 'buy' ? 'bought' : 'sold'} ${short(swap.mint)} for ${swap.solAmount.toFixed(2)} SOL`);
  await onLeaderSwap({ ...swap, time: swap.time || now() });
}

function safeHandle(wallet: string, signature: string) {
  handle(wallet, signature).catch((e) => log('error', `Handling ${short(wallet)} trade: ${e.message}`));
}

// ---------- Polling ----------

export async function pollOnce() {
  for (const w of followed()) {
    if (!w.last_sig) {
      // First look at this wallet: remember where it is now, don't act on its history.
      const [latest] = await getSignatures(w.address, { limit: 1 });
      db.prepare('UPDATE wallets SET last_sig = ? WHERE address = ?').run(latest?.signature ?? '', w.address);
      continue;
    }
    const sigs = await getSignatures(w.address, { limit: 20, until: w.last_sig });
    if (!sigs.length) continue;
    db.prepare('UPDATE wallets SET last_sig = ? WHERE address = ?').run(sigs[0].signature, w.address);
    for (const s of sigs.reverse()) if (!s.err) safeHandle(w.address, s.signature);
  }
}

// ---------- Websocket ----------

let ws: WebSocket | null = null;
let subscribed = '';

function wsUrl() {
  return env.wsUrl || env.rpcUrl.replace(/^http/, 'ws');
}

// Called periodically; (re)connects and resubscribes when the follow list changes.
export function syncSubscriptions() {
  const addrs = followed().map((w) => w.address).sort();
  const key = addrs.join(',');
  if (ws && ws.readyState === WebSocket.OPEN && key === subscribed) return;
  if (ws && ws.readyState === WebSocket.CONNECTING) return;
  ws?.close();
  ws = null;
  subscribed = '';
  if (!addrs.length || typeof WebSocket === 'undefined') return;

  const sock = new WebSocket(wsUrl());
  ws = sock;
  const bySub = new Map<number, string>();
  const byReq = new Map<number, string>();
  sock.onopen = () => {
    addrs.forEach((a, i) => {
      byReq.set(i + 1, a);
      sock.send(
        JSON.stringify({
          jsonrpc: '2.0',
          id: i + 1,
          method: 'logsSubscribe',
          params: [{ mentions: [a] }, { commitment: 'confirmed' }],
        }),
      );
    });
    subscribed = key;
  };
  sock.onmessage = (ev) => {
    const msg = JSON.parse(String(ev.data));
    if (msg.id && typeof msg.result === 'number') bySub.set(msg.result, byReq.get(msg.id)!);
    if (msg.method !== 'logsNotification') return;
    const wallet = bySub.get(msg.params.subscription);
    const v = msg.params.result?.value;
    if (wallet && v?.signature && !v.err) safeHandle(wallet, v.signature);
  };
  sock.onclose = () => {
    if (ws === sock) {
      ws = null;
      subscribed = '';
    }
  };
  // A failed socket fires 'close' by itself; the next sync reconnects. Calling close() here
  // would re-fire 'error' forever.
  sock.onerror = () => {};
}

export const watcherStatus = () => (ws && ws.readyState === WebSocket.OPEN ? 'live' : 'polling');
