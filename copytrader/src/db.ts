import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { DEFAULT_SETTINGS, env, presetFor, type RiskProfile, type Settings } from './config.ts';

mkdirSync(env.dataDir, { recursive: true });
export const db = new DatabaseSync(process.env.DB_PATH ?? join(env.dataDir, 'copytrader.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');

db.exec(`
CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);

-- Wallets found by discovery or added by hand, with their latest profile.
CREATE TABLE IF NOT EXISTS wallets (
  address TEXT PRIMARY KEY,
  source TEXT NOT NULL,            -- 'discovery' | 'manual'
  followed INTEGER NOT NULL DEFAULT 0,
  pinned INTEGER NOT NULL DEFAULT 0, -- follow choice made by hand; auto-follow leaves it alone
  hits INTEGER NOT NULL DEFAULT 0, -- times seen trading profitably in trending pools
  score REAL NOT NULL DEFAULT 0,
  reasons TEXT NOT NULL DEFAULT '[]',
  stats TEXT,
  profiled_at INTEGER,
  last_sig TEXT,                   -- newest signature the watcher has seen
  note TEXT,                       -- why it was auto-followed / dropped
  created_at INTEGER NOT NULL
);

-- Swaps made by wallets we watch.
CREATE TABLE IF NOT EXISTS leader_swaps (
  signature TEXT NOT NULL,
  wallet TEXT NOT NULL,
  mint TEXT NOT NULL,
  side TEXT NOT NULL,
  token_amount REAL NOT NULL,
  sol_amount REAL NOT NULL,
  slot INTEGER NOT NULL,
  time INTEGER NOT NULL,
  action TEXT,                     -- what the bot did about it
  PRIMARY KEY (signature, wallet)
);

-- Paper positions, open and closed.
CREATE TABLE IF NOT EXISTS positions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mint TEXT NOT NULL,
  symbol TEXT,
  pair TEXT,
  leader TEXT NOT NULL,
  leader_sig TEXT NOT NULL,
  qty REAL NOT NULL,               -- tokens still held
  cost_usd REAL NOT NULL,
  entry_price REAL NOT NULL,       -- our fill price
  leader_price REAL NOT NULL,      -- what the leader paid
  entry_liquidity REAL NOT NULL,
  cost_buffer_pct REAL NOT NULL,
  high_price REAL NOT NULL,
  stop_price REAL NOT NULL,
  last_price REAL NOT NULL,
  partial_taken INTEGER NOT NULL DEFAULT 0,
  proceeds_usd REAL NOT NULL DEFAULT 0, -- from sells so far
  opened_at INTEGER NOT NULL,
  closed_at INTEGER,
  pnl_usd REAL,
  exit_reason TEXT,
  notes TEXT NOT NULL DEFAULT '[]' -- what the bot did and why, step by step
);

CREATE TABLE IF NOT EXISTS equity (time INTEGER NOT NULL, value_usd REAL NOT NULL);

CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  time INTEGER NOT NULL,
  level TEXT NOT NULL,
  message TEXT NOT NULL
);
`);

export const now = () => Math.floor(Date.now() / 1000);

export function getKv<T>(key: string, fallback: T): T {
  const row = db.prepare('SELECT value FROM kv WHERE key = ?').get(key) as { value: string } | undefined;
  return row ? (JSON.parse(row.value) as T) : fallback;
}

export function setKv(key: string, value: unknown) {
  db.prepare('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(
    key,
    JSON.stringify(value),
  );
}

export function getSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...getKv<Partial<Settings>>('settings', {}) };
}

const PROFILES = new Set(['careful', 'balanced', 'aggressive']);

// Only known keys, coerced to the default's type, are saved. Picking a risk profile first
// loads its preset, then any explicit values in the same patch win.
export function saveSettings(patch: Record<string, unknown>): Settings {
  const next: Record<string, unknown> = { ...getSettings() };
  if (typeof patch.riskProfile === 'string' && PROFILES.has(patch.riskProfile)) {
    Object.assign(next, presetFor(patch.riskProfile as RiskProfile));
  }
  for (const [k, v] of Object.entries(patch)) {
    const def = (DEFAULT_SETTINGS as Record<string, unknown>)[k];
    if (def === undefined || k === 'riskProfile') continue;
    if (typeof def === 'boolean') next[k] = v === true || v === 'true';
    else if (typeof def === 'number' && Number.isFinite(Number(v))) next[k] = Math.max(0, Number(v));
  }
  setKv('settings', next);
  return next as Settings;
}

export function getCash(): number {
  return getKv('cashUsd', getSettings().startingBankrollUsd);
}

export function setCash(v: number) {
  setKv('cashUsd', Math.max(0, v));
}

export function log(level: 'info' | 'trade' | 'warn' | 'error', message: string) {
  db.prepare('INSERT INTO logs (time, level, message) VALUES (?, ?, ?)').run(now(), level, message);
  db.prepare('DELETE FROM logs WHERE id < (SELECT MAX(id) - 2000 FROM logs)').run();
  console.log(`[${level}] ${message}`);
}
