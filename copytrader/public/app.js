'use strict';

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const usd = (n) => (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const signedUsd = (n) => (n >= 0 ? '+' : '') + usd(n);
const pct = (n, d = 1) => (n >= 0 ? '+' : '') + n.toFixed(d) + '%';
const cls = (n) => (n > 0 ? 'up' : n < 0 ? 'down' : '');
const short = (a) => a.slice(0, 4) + '…' + a.slice(-4);
const ago = (t) => {
  const s = Math.max(0, Date.now() / 1000 - t);
  if (s < 60) return Math.floor(s) + 's ago';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
};
const clock = (t) => new Date(t * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

async function api(path, body) {
  const res = await fetch(path, body === undefined ? {} : {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 401 && path !== '/api/login') {
    showLogin();
    throw new Error('login required');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'request failed');
  return data;
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.hidden = true), 3000);
}

// ---------- Login ----------

function showLogin() {
  $('#app').hidden = true;
  $('#login').hidden = false;
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#login-error').textContent = '';
  try {
    await api('/api/login', { password: $('#password').value });
    $('#password').value = '';
    start();
  } catch (err) {
    $('#login-error').textContent = err.message;
  }
});

// ---------- Tabs ----------

let tab = 'home';
document.querySelectorAll('.tabs button').forEach((b) =>
  b.addEventListener('click', () => {
    tab = b.dataset.tab;
    document.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('active', x === b));
    document.querySelectorAll('.tab').forEach((s) => (s.hidden = s.id !== 'tab-' + tab));
    refresh(true);
  }),
);

// ---------- Home ----------

function chart(points) {
  if (points.length < 2) return '';
  const w = 600, h = 90, pad = 4;
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const y0 = Math.min(...ys), y1 = Math.max(...ys);
  const X = (x) => ((x - x0) / Math.max(x1 - x0, 1)) * w;
  const Y = (y) => h - pad - ((y - y0) / Math.max(y1 - y0, 1e-9)) * (h - pad * 2);
  const d = points.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' ');
  const color = ys[ys.length - 1] >= ys[0] ? 'var(--up)' : 'var(--down)';
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-label="Balance over time">
    <path d="${d} L${w} ${h} L0 ${h} Z" fill="${color}" opacity="0.10"/>
    <path d="${d}" fill="none" stroke="${color}" stroke-width="2.5" vector-effect="non-scaling-stroke"/>
  </svg>`;
}

function openTrade(p, rules) {
  const target = rules.takeProfitPct;
  const span = Math.max(target - p.stopPct, 1);
  const fill = Math.min(Math.max((p.pnlPct - p.stopPct) / span, 0), 1) * 100;
  const locked = p.stopPct >= 0;
  return `<div class="card">
    <div class="trade-head">
      <div><div class="trade-sym">${esc(p.symbol || short(p.mint))}</div>
        <div class="muted small">Copying ${short(p.leader)} · ${ago(p.openedAt)}</div></div>
      <div class="trade-pnl ${cls(p.pnlUsd)}">${pct(p.pnlPct)}</div>
    </div>
    <div class="bar"><i style="left:0;width:${fill}%;background:${locked ? 'var(--up)' : 'var(--warn)'}"></i></div>
    <div class="row small muted"><span>Sells at ${pct(p.stopPct, 0)}</span><span>${p.partialTaken ? 'Half banked, rest trailing' : 'Target ' + pct(target, 0)}</span></div>
    <div class="kv">
      <span>Put in</span><b>${usd(p.costUsd)}</b>
      <span>Worth now</span><b>${usd(p.valueUsd)}</b>
      <span>Profit</span><b class="${cls(p.pnlUsd)}">${signedUsd(p.pnlUsd)}</b>
      <span>Best so far</span><b>${pct(p.highPct)}</b>
      <span>Protection</span><b class="${locked ? 'up' : ''}">${locked ? 'Profit locked ' + pct(p.stopPct, 0) : 'Stop loss ' + pct(p.stopPct, 0)}</b>
    </div>
    <ul class="timeline">${p.notes.slice().reverse().map((n) => `<li><time>${clock(n.t)}</time>${esc(n.text)}</li>`).join('')}</ul>
    <div style="display:flex;gap:8px;margin-top:12px">
      <a class="btn" style="flex:1;text-align:center;text-decoration:none" href="https://dexscreener.com/solana/${esc(p.pair || p.mint)}" target="_blank" rel="noopener">Chart</a>
      <button class="btn danger" style="flex:1" data-sell="${p.id}">Sell now</button>
    </div>
  </div>`;
}

function renderHome(s) {
  const b = s.balance;
  const st = s.stats;
  $('#tab-home').innerHTML = `
    <div class="card">
      <div class="muted small">Paper balance</div>
      <div class="balance">${usd(b.equity)}</div>
      <div class="change ${cls(b.pnlUsd)}">${signedUsd(b.pnlUsd)} (${pct(b.pnlPct)}) since ${usd(b.start)}</div>
      ${chart(s.equity)}
    </div>
    ${s.open.length ? s.open.map((p) => openTrade(p, s.rules)).join('') : `<div class="card empty">
      ${s.status.running ? 'No open trade. Waiting for a smart wallet to buy something safe.' : esc(s.status.reason)}</div>`}
    <div class="card"><div class="stats">
      <div class="stat"><b>${st.trades}</b><span>Trades</span></div>
      <div class="stat"><b>${(st.winRate * 100).toFixed(0)}%</b><span>Won</span></div>
      <div class="stat"><b class="up">${pct(st.avgWinPct, 0)}</b><span>Avg win</span></div>
      <div class="stat"><b class="down">${pct(st.avgLossPct, 0)}</b><span>Avg loss</span></div>
    </div></div>
    <div class="card"><h2>Recent trades</h2>
      ${s.trades.length ? `<ul class="list">${s.trades.slice(0, 15).map((t) => `<li>
        <div class="row"><b>${esc(t.symbol || short(t.mint))}</b><b class="${cls(t.pnlUsd)}">${signedUsd(t.pnlUsd)} · ${pct(t.pnlPct, 0)}</b></div>
        <div class="row small muted"><span>${esc(t.exitReason)}</span><span>${ago(t.closedAt)}</span></div></li>`).join('')}</ul>`
        : '<div class="empty small">Nothing yet.</div>'}
    </div>`;
}

document.addEventListener('click', async (e) => {
  const sellBtn = e.target.closest('[data-sell]');
  if (sellBtn) {
    if (!confirm('Sell this position now?')) return;
    sellBtn.disabled = true;
    try {
      await api('/api/positions/sell', { id: Number(sellBtn.dataset.sell) });
      toast('Sold');
    } catch (err) { toast(err.message); }
    refresh();
  }
});

// ---------- Wallets ----------

let walletFilter = 'following';

function walletCard(w) {
  const s = w.stats;
  const good = w.score > 0;
  const metrics = s ? `<div class="metrics">
      <div><b class="${cls(s.totalPnlSol)}">${s.totalPnlSol >= 0 ? '+' : ''}${s.totalPnlSol.toFixed(1)} SOL</b><span>Profit</span></div>
      <div><b>${s.profitFactor >= 99 ? '∞' : s.profitFactor.toFixed(1)}×</b><span>Won per $ lost</span></div>
      <div><b class="down">-${s.avgLossPct.toFixed(0)}%</b><span>Avg loss</span></div>
      <div><b>${s.closedTrades}</b><span>Trades</span></div>
      <div><b>${s.medianHoldMinutes < 60 ? s.medianHoldMinutes.toFixed(0) + 'm' : (s.medianHoldMinutes / 60).toFixed(1) + 'h'}</b><span>Typical hold</span></div>
      <div><b class="down">-${s.worstLossPct.toFixed(0)}%</b><span>Worst loss</span></div>
    </div>` : `<div class="small muted" style="margin-top:8px">${w.profiledAt ? 'No trades found' : 'Waiting to be analysed…'}</div>`;
  const copy = w.copy.trades ? `<span class="tag">We copied ${w.copy.trades}× → <b class="${cls(w.copy.pnlUsd)}">${signedUsd(w.copy.pnlUsd)}</b></span>` : '';
  return `<div class="card wallet">
    <div class="row">
      <div><a class="addr mono" href="https://solscan.io/account/${esc(w.address)}" target="_blank" rel="noopener">${short(w.address)}</a>
        <div class="small muted">${w.source === 'manual' ? 'Added by you' : `Spotted ${w.hits}× in hot coins`}${w.profiledAt ? ' · checked ' + ago(w.profiledAt) : ''}</div></div>
      <div class="row" style="gap:10px"><span class="score ${good ? 'good' : ''}">${good ? w.score.toFixed(0) : '–'}</span>
        <label class="switch" title="Follow"><input type="checkbox" data-follow="${esc(w.address)}" ${w.followed ? 'checked' : ''}><span></span></label></div>
    </div>
    ${metrics}
    ${copy}${w.note ? `<span class="tag">${esc(w.note)}</span>` : ''}
    ${!good && w.reasons.length ? `<div class="small muted" style="margin-top:8px">Not followed: ${esc(w.reasons.join(' · '))}</div>` : ''}
  </div>`;
}

function renderWallets(list) {
  const groups = {
    following: list.filter((w) => w.followed),
    smart: list.filter((w) => w.score > 0),
    all: list,
  };
  const shown = groups[walletFilter];
  $('#tab-wallets').innerHTML = `
    <div class="card">
      <h2>Add a wallet</h2>
      <form id="add-wallet" class="inline"><input type="text" id="add-address" placeholder="Solana wallet address" autocomplete="off"><button class="btn primary">Follow</button></form>
      <p class="small muted" style="margin:10px 0 0">The bot also finds wallets on its own: it spots traders making money in trending coins, then checks their whole recent history. A wallet only gets a score if it makes money <i>and</i> keeps its losses small.</p>
    </div>
    <div class="filters">
      <button data-filter="following" class="${walletFilter === 'following' ? 'on' : ''}">Following (${groups.following.length})</button>
      <button data-filter="smart" class="${walletFilter === 'smart' ? 'on' : ''}">Smart (${groups.smart.length})</button>
      <button data-filter="all" class="${walletFilter === 'all' ? 'on' : ''}">All found (${groups.all.length})</button>
    </div>
    ${shown.length ? shown.map(walletCard).join('') : `<div class="card empty">${walletFilter === 'following' ? 'Not following anyone yet. The finder is still analysing wallets; good ones get followed automatically.' : 'Nothing here yet.'}</div>`}`;
}

document.addEventListener('submit', async (e) => {
  if (e.target.id !== 'add-wallet') return;
  e.preventDefault();
  try {
    await api('/api/wallets/add', { address: $('#add-address').value, follow: true });
    toast('Following. It will be analysed shortly.');
    walletFilter = 'following';
    refresh();
  } catch (err) { toast(err.message); }
});

document.addEventListener('change', async (e) => {
  const f = e.target.closest('[data-follow]');
  if (!f) return;
  try {
    await api('/api/wallets/follow', { address: f.dataset.follow, follow: f.checked });
    toast(f.checked ? 'Following' : 'Unfollowed');
  } catch (err) { toast(err.message); }
});

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-filter]');
  if (!b) return;
  walletFilter = b.dataset.filter;
  refresh();
});

// ---------- Activity ----------

function renderActivity(a) {
  $('#tab-activity').innerHTML = `
    <div class="card"><h2>What smart wallets did</h2>
      ${a.signals.length ? `<ul class="list">${a.signals.map((s) => `<li>
        <div class="row"><span><b class="${s.side === 'buy' ? 'up' : 'down'}">${s.side === 'buy' ? 'Bought' : 'Sold'}</b> <span class="mono">${short(s.mint)}</span> · ${s.sol_amount.toFixed(2)} SOL</span><span class="small muted">${ago(s.time)}</span></div>
        <div class="small muted">${short(s.wallet)}${s.action ? ' → ' + esc(s.action) : ''}</div></li>`).join('')}</ul>`
        : '<div class="empty small">No trades from followed wallets yet.</div>'}
    </div>
    <div class="card"><h2>Bot log</h2>
      <ul class="list">${a.logs.map((l) => `<li class="small"><span class="muted">${clock(l.time)}</span> <span class="log-${l.level}">${esc(l.message)}</span></li>`).join('')}</ul>
    </div>`;
}

// ---------- Settings ----------

const PROFILES = {
  careful: 'Small stops, takes profit early, only big safe coins.',
  balanced: 'Middle ground. Good place to start.',
  aggressive: 'Wider stops, lets winners run for big multiples, newer coins.',
};

const ADVANCED = [
  ['When to sell', [
    ['stopLossPct', 'Stop loss (% below entry)'],
    ['breakEvenAtPct', 'Move stop to break-even at +%'],
    ['trailActivatePct', 'Start trailing stop at +%'],
    ['trailPct', 'Trailing distance (%)'],
    ['takeProfitPct', 'Take profit at +%'],
    ['securePct', '% to sell at take profit'],
    ['momentumMinProfitPct', 'Indicator exits from +%'],
    ['liquidityDropPct', 'Exit if liquidity drops (%)'],
    ['stallMinutes', 'Exit if flat after (min)'],
    ['maxHoldMinutes', 'Max hold (min)'],
  ]],
  ['When to buy', [
    ['maxChasePct', 'Max % above the wallet\'s price'],
    ['minLiquidityUsd', 'Min liquidity ($)'],
    ['minPairAgeMinutes', 'Min coin age (min)'],
    ['maxPump5mPct', 'Skip if up more than % in 5 min'],
    ['maxEntryRsi', 'Skip if RSI above'],
    ['minConviction', 'Min buy size vs wallet\'s usual (×)'],
    ['minLeaderBuySol', 'Min wallet buy (SOL)'],
    ['maxSignalAgeSeconds', 'Ignore signals older than (s)'],
    ['maxTradePctOfLiquidity', 'Max trade size (% of liquidity)'],
    ['requireMintRevoked', 'Require mint authority revoked'],
    ['requireFreezeRevoked', 'Require freeze authority revoked'],
  ]],
  ['Protect the account', [
    ['killSwitchDrawdownPct', 'Switch off if down from high (%)'],
    ['dailyLossLimitPct', 'Daily loss limit (%)'],
    ['lossStreakPause', 'Pause after this many losses'],
    ['lossStreakPauseMinutes', 'Pause length (min)'],
    ['maxOpenPositions', 'Max trades at once'],
  ]],
  ['Wallet finder', [
    ['discoveryEnabled', 'Find wallets automatically'],
    ['minClosedTrades', 'Min finished trades'],
    ['minProfitFactor', 'Min $ won per $ lost'],
    ['maxAvgLossPct', 'Max average loss (%)'],
    ['maxWorstLossPct', 'Max worst loss (%)'],
    ['minMedianHoldMinutes', 'Min typical hold (min)'],
    ['maxSwapsPerHour', 'Max trades per hour (bot filter)'],
    ['maxInactiveDays', 'Max days inactive'],
  ]],
  ['Paper trading costs', [
    ['swapFeePct', 'Swap fee (%)'],
    ['networkFeeUsd', 'Network + priority fee per swap ($)'],
    ['baseSlippagePct', 'Extra slippage for being late (%)'],
  ]],
];

function field(key, label, v) {
  const input = typeof v === 'boolean'
    ? `<label class="switch"><input type="checkbox" data-setting="${key}" ${v ? 'checked' : ''}><span></span></label>`
    : `<input type="number" step="any" min="0" data-setting="${key}" value="${v}">`;
  return `<div class="field"><label>${esc(label)}</label>${input}</div>`;
}

function renderSettings(s) {
  $('#tab-settings').innerHTML = `
    <div class="card">
      <div class="row"><div><b>Bot trading</b><div class="small muted">Paper money only. Nothing real is spent.</div></div>
        <label class="switch"><input type="checkbox" data-setting="botEnabled" ${s.botEnabled ? 'checked' : ''}><span></span></label></div>
    </div>
    <div class="card">
      <h2>Risk style</h2>
      <div class="seg">${Object.keys(PROFILES).map((p) => `<button data-profile="${p}" class="${s.riskProfile === p ? 'on' : ''}">${p[0].toUpperCase() + p.slice(1)}</button>`).join('')}</div>
      <p class="small muted" style="margin:10px 0 0">${PROFILES[s.riskProfile]}</p>
    </div>
    <div class="card">
      <h2>Trading</h2>
      ${field('positionSizePct', 'Trade size (% of balance)', s.positionSizePct)}
      <p class="small muted" style="margin:6px 0 8px">100% = all-in on one trade, rolling the result into the next (compounding).</p>
      ${field('exitWhenLeaderSells', 'Sell when the wallet sells', s.exitWhenLeaderSells)}
      ${field('autoFollowTopN', 'Auto-follow the best N wallets', s.autoFollowTopN)}
    </div>
    <div class="card">
      <h2>Paper balance</h2>
      <form id="reset" class="inline"><input type="number" id="reset-amount" min="1" step="any" value="${s.startingBankrollUsd}"><button class="btn">Start over</button></form>
      <p class="small muted" style="margin:8px 0 0">Clears all paper trades and starts again with this amount.</p>
    </div>
    <div class="card">
      <details><summary>Advanced</summary>
        ${ADVANCED.map(([title, fields]) => `<div class="group-title">${title}</div>${fields.map(([k, l]) => field(k, l, s[k])).join('')}`).join('')}
      </details>
    </div>
    <button class="btn block" id="logout">Log out</button>`;
}

document.addEventListener('change', async (e) => {
  const el = e.target.closest('[data-setting]');
  if (!el) return;
  const value = el.type === 'checkbox' ? el.checked : Number(el.value);
  try {
    await api('/api/settings', { [el.dataset.setting]: value });
    toast('Saved');
  } catch (err) { toast(err.message); }
});

document.addEventListener('click', async (e) => {
  const p = e.target.closest('[data-profile]');
  if (p) {
    await api('/api/settings', { riskProfile: p.dataset.profile });
    toast('Risk style: ' + p.dataset.profile);
    refresh(true);
  }
  if (e.target.id === 'logout') {
    await fetch('/api/logout');
    showLogin();
  }
});

document.addEventListener('submit', async (e) => {
  if (e.target.id !== 'reset') return;
  e.preventDefault();
  const amount = Number($('#reset-amount').value);
  if (!confirm(`Delete all paper trades and start over with ${usd(amount)}?`)) return;
  try {
    await api('/api/reset', { startUsd: amount });
    toast('Started over');
  } catch (err) { toast(err.message); }
});

// ---------- Refresh loop ----------

function renderStatus(s) {
  const el = $('#status');
  el.className = 'pill ' + (s.status.running ? 'on' : 'off');
  el.textContent = s.status.running ? (s.status.watcher === 'live' ? 'Live' : 'Running') + ' · ' + s.status.reason : s.status.reason;
}

// `full` = the user just opened this screen. Settings only render then, so an open
// "Advanced" section or a half-typed number isn't wiped by the 5-second refresh.
async function refresh(full = false) {
  try {
    if (tab === 'settings') {
      if (full) renderSettings(await api('/api/settings'));
      return;
    }
    const s = await api('/api/state');
    renderStatus(s);
    if (tab === 'home') renderHome(s);
    if (tab === 'wallets' && !document.activeElement?.matches('#add-address')) renderWallets(await api('/api/wallets'));
    if (tab === 'activity') renderActivity(await api('/api/activity'));
  } catch (err) {
    if (err.message !== 'login required') console.error(err);
  }
}

let timer;
function start() {
  $('#login').hidden = true;
  $('#app').hidden = false;
  refresh(true);
  clearInterval(timer);
  timer = setInterval(() => { if (!document.hidden) refresh(); }, 5000);
}

api('/api/state').then(start, () => {});
