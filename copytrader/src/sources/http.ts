// Small fetch wrapper: spaces requests per host so free APIs don't ban us, and retries
// rate-limit and server errors with backoff.

const nextSlot = new Map<string, number>();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitTurn(host: string, minIntervalMs: number) {
  const t = Date.now();
  const slot = Math.max(t, nextSlot.get(host) ?? 0);
  nextSlot.set(host, slot + minIntervalMs);
  if (slot > t) await sleep(slot - t);
}

export async function fetchJson<T = any>(
  url: string,
  opts: { minIntervalMs: number; init?: RequestInit; retries?: number },
): Promise<T> {
  const host = new URL(url).host;
  const retries = opts.retries ?? 3;
  for (let attempt = 0; ; attempt++) {
    await waitTurn(host, opts.minIntervalMs);
    let res: Response;
    try {
      res = await fetch(url, { ...opts.init, signal: AbortSignal.timeout(20_000) });
    } catch (e) {
      if (attempt >= retries) throw e;
      await sleep(1000 * 2 ** attempt);
      continue;
    }
    if (res.ok) return (await res.json()) as T;
    if ((res.status === 429 || res.status >= 500) && attempt < retries) {
      await sleep(2000 * 2 ** attempt);
      continue;
    }
    throw new Error(`${host} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}
