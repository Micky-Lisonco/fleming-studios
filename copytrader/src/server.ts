import { readFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { extname, join } from 'node:path';
import { checkPassword, clearCookie, isLoggedIn, loginAllowed, loginFailed, sessionCookie } from './auth.ts';
import { env } from './config.ts';
import { db, getCash, getKv, getSettings, log, now, saveSettings } from './db.ts';
import { entryBlock, equityUsd, monitorPositions, openPositions, recordEquity, resetPaper, sellNow, type Position } from './engine.ts';
import { pollOnce, syncSubscriptions, watcherStatus } from './watcher.ts';
import {
  addWallet,
  copyRecord,
  discoverOnce,
  nextWalletToProfile,
  profileWallet,
  refreshFollowList,
  setFollow,
  short,
  type WalletRow,
} from './wallets.ts';

if (!env.appPassword) {
  console.error('Set APP_PASSWORD before starting (see .env.example).');
  process.exit(1);
}

// ---------- API ----------

function view(p: Position) {
  const value = p.qty * p.last_price;
  const pnl = p.closed_at ? (p.pnl_usd ?? 0) : value + p.proceeds_usd - p.cost_usd;
  return {
    id: p.id,
    mint: p.mint,
    symbol: p.symbol,
    pair: p.pair,
    leader: p.leader,
    costUsd: p.cost_usd,
    valueUsd: value,
    pnlUsd: pnl,
    pnlPct: (pnl / p.cost_usd) * 100,
    entryPrice: p.entry_price,
    lastPrice: p.last_price,
    stopPrice: p.stop_price,
    stopPct: (p.stop_price / p.entry_price - 1) * 100,
    highPct: (p.high_price / p.entry_price - 1) * 100,
    partialTaken: !!p.partial_taken,
    openedAt: p.opened_at,
    closedAt: p.closed_at,
    exitReason: p.exit_reason,
    notes: JSON.parse(p.notes),
  };
}

function state() {
  const s = getSettings();
  const equity = equityUsd();
  const block = entryBlock();
  const closed = db.prepare('SELECT * FROM positions WHERE closed_at IS NOT NULL ORDER BY closed_at DESC').all() as Position[];
  const wins = closed.filter((p) => (p.pnl_usd ?? 0) > 0);
  const losses = closed.filter((p) => (p.pnl_usd ?? 0) <= 0);
  const series = db.prepare('SELECT time, value_usd FROM equity ORDER BY time').all() as { time: number; value_usd: number }[];
  const step = Math.max(1, Math.ceil(series.length / 300));
  const followed = (db.prepare('SELECT COUNT(*) AS n FROM wallets WHERE followed = 1').get() as { n: number }).n;
  const tracked = (db.prepare('SELECT COUNT(*) AS n FROM wallets').get() as { n: number }).n;
  return {
    status: {
      running: !block,
      reason: block ?? (followed ? `Watching ${followed} smart wallets` : 'Finding wallets to follow…'),
      watcher: watcherStatus(),
      followed,
      tracked,
      riskProfile: s.riskProfile,
    },
    rules: { takeProfitPct: s.takeProfitPct, stopLossPct: s.stopLossPct },
    balance: {
      equity,
      cash: getCash(),
      start: s.startingBankrollUsd,
      pnlUsd: equity - s.startingBankrollUsd,
      pnlPct: (equity / s.startingBankrollUsd - 1) * 100,
      peak: getKv('peakEquity', s.startingBankrollUsd),
    },
    equity: [...series.filter((_, i) => i % step === 0), series[series.length - 1]].filter(Boolean).map((r) => [r.time, r.value_usd]),
    open: openPositions().map(view),
    trades: closed.slice(0, 50).map(view),
    stats: {
      trades: closed.length,
      wins: wins.length,
      winRate: closed.length ? wins.length / closed.length : 0,
      avgWinPct: wins.length ? wins.reduce((a, p) => a + (p.pnl_usd! / p.cost_usd) * 100, 0) / wins.length : 0,
      avgLossPct: losses.length ? losses.reduce((a, p) => a + (p.pnl_usd! / p.cost_usd) * 100, 0) / losses.length : 0,
    },
  };
}

function wallets() {
  const rows = db
    .prepare('SELECT * FROM wallets ORDER BY followed DESC, score DESC, profiled_at IS NULL, hits DESC LIMIT 150')
    .all() as WalletRow[];
  return rows.map((w) => ({
    address: w.address,
    source: w.source,
    followed: !!w.followed,
    pinned: !!w.pinned,
    hits: w.hits,
    score: w.score,
    reasons: JSON.parse(w.reasons),
    stats: w.stats ? JSON.parse(w.stats) : null,
    profiledAt: w.profiled_at,
    note: w.note,
    copy: copyRecord(w.address),
  }));
}

function activity() {
  return {
    logs: db.prepare('SELECT time, level, message FROM logs ORDER BY id DESC LIMIT 200').all(),
    signals: db.prepare('SELECT * FROM leader_swaps ORDER BY time DESC LIMIT 50').all(),
  };
}

type Handler = (body: any, req: IncomingMessage, res: ServerResponse) => unknown | Promise<unknown>;

const routes: Record<string, Handler> = {
  'GET /api/state': () => state(),
  'GET /api/wallets': () => wallets(),
  'GET /api/activity': () => activity(),
  'GET /api/settings': () => getSettings(),
  'POST /api/settings': (b) => saveSettings(b ?? {}),
  'POST /api/wallets/add': (b) => {
    addWallet(String(b.address ?? '').trim(), b.follow !== false);
    return { ok: true };
  },
  'POST /api/wallets/follow': (b) => {
    setFollow(String(b.address), !!b.follow);
    return { ok: true };
  },
  'POST /api/positions/sell': async (b) => {
    await sellNow(Number(b.id));
    return { ok: true };
  },
  'POST /api/reset': async (b) => {
    const start = Number(b.startUsd);
    if (!(start > 0)) throw new Error('enter a starting balance above 0');
    await resetPaper(start);
    return { ok: true };
  },
};

// ---------- HTTP ----------

const PUBLIC = join(import.meta.dirname, '..', 'public');
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

function send(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers });
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 100_000) throw new Error('body too large');
  }
  return raw ? JSON.parse(raw) : {};
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '').split(',')[0].trim();
  try {
    if (url.pathname === '/healthz') return send(res, 200, { ok: true });

    if (url.pathname === '/api/login' && req.method === 'POST') {
      if (!loginAllowed(ip)) return send(res, 429, { error: 'Too many attempts. Try again in 15 minutes.' });
      const { password } = await readBody(req);
      if (!checkPassword(String(password ?? ''))) {
        loginFailed(ip);
        return send(res, 401, { error: 'Wrong password' });
      }
      return send(res, 200, { ok: true }, { 'set-cookie': sessionCookie(req) });
    }
    if (url.pathname === '/api/logout') return send(res, 200, { ok: true }, { 'set-cookie': clearCookie });

    if (url.pathname.startsWith('/api/')) {
      if (!isLoggedIn(req)) return send(res, 401, { error: 'login required' });
      const handler = routes[`${req.method} ${url.pathname}`];
      if (!handler) return send(res, 404, { error: 'not found' });
      const body = req.method === 'POST' ? await readBody(req) : null;
      return send(res, 200, await handler(body, req, res));
    }

    // Static files: the dashboard page decides whether to show the login form.
    const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    if (file.includes('..') || !TYPES[extname(file)]) return send(res, 404, { error: 'not found' });
    const data = await readFile(join(PUBLIC, file)).catch(() => null);
    if (!data) return send(res, 404, { error: 'not found' });
    res.writeHead(200, { 'content-type': TYPES[extname(file)], 'cache-control': 'no-cache' });
    res.end(data);
  } catch (e) {
    send(res, 400, { error: (e as Error).message });
  }
});

// ---------- Background jobs ----------

const lastError = new Map<string, number>();

function every(name: string, ms: number, fn: () => Promise<unknown> | unknown) {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await fn();
    } catch (e) {
      // Same failure over and over (e.g. an API down) is logged once a minute, not every tick.
      if (Date.now() - (lastError.get(name) ?? 0) > 60_000) {
        lastError.set(name, Date.now());
        log('error', `${name}: ${(e as Error).message}`);
      }
    } finally {
      running = false;
    }
  };
  setTimeout(tick, 1000);
  setInterval(tick, ms);
}

async function profileLoop() {
  for (;;) {
    const address = nextWalletToProfile();
    if (!address) {
      await new Promise((r) => setTimeout(r, 60_000));
      continue;
    }
    try {
      const r = await profileWallet(address);
      if (r.score > 0) log('info', `Wallet ${short(address)} passed: score ${r.score}, profit factor ${r.stats.profitFactor.toFixed(1)}, avg loss ${r.stats.avgLossPct.toFixed(0)}%`);
      refreshFollowList();
    } catch (e) {
      // Mark it checked so one broken wallet can't block the queue.
      db.prepare('UPDATE wallets SET profiled_at = ? WHERE address = ?').run(now(), address);
      log('warn', `Could not profile ${short(address)}: ${(e as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}

// A trading bot must keep running (and keep watching open trades) through a surprise error.
process.on('uncaughtException', (e) => log('error', `Unexpected: ${e.message}`));
process.on('unhandledRejection', (e) => log('error', `Unexpected: ${(e as Error)?.message ?? e}`));

if (!db.prepare('SELECT 1 FROM equity LIMIT 1').get()) recordEquity();

every('Price check', 5_000, monitorPositions);
every('Wallet watcher', 10_000, pollOnce);
every('Live feed', 15_000, syncSubscriptions);
every('Wallet finder', 5 * 60_000, discoverOnce);
every('Balance snapshot', 5 * 60_000, recordEquity);
profileLoop();

server.listen(env.port, () => log('info', `Dashboard running on port ${env.port}`));
