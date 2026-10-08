import { createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { env } from './config.ts';

// One password, one signed cookie. No user accounts to manage.

const COOKIE = 'ct_session';
const DAYS = 30;

const sign = (payload: string) => createHmac('sha256', env.sessionSecret).update(payload).digest('base64url');

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function checkPassword(given: string) {
  return env.appPassword.length > 0 && same(sign(`pw:${given}`), sign(`pw:${env.appPassword}`));
}

export function sessionCookie(req: IncomingMessage) {
  const exp = String(Date.now() + DAYS * 86400_000);
  const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  return `${COOKIE}=${exp}.${sign(exp)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${DAYS * 86400}${secure}`;
}

export const clearCookie = `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;

export function isLoggedIn(req: IncomingMessage) {
  const raw = (req.headers.cookie ?? '').split(';').map((c) => c.trim()).find((c) => c.startsWith(`${COOKIE}=`));
  if (!raw) return false;
  const [exp, sig] = raw.slice(COOKIE.length + 1).split('.');
  return !!exp && !!sig && same(sig, sign(exp)) && Number(exp) > Date.now();
}

// Slows down password guessing: 10 failures per IP locks login for 15 minutes.
const failures = new Map<string, { n: number; until: number }>();

export function loginAllowed(ip: string) {
  const f = failures.get(ip);
  return !f || f.n < 10 || f.until < Date.now();
}

export function loginFailed(ip: string) {
  const f = failures.get(ip);
  const n = f && f.until > Date.now() ? f.n + 1 : 1;
  failures.set(ip, { n, until: Date.now() + 15 * 60_000 });
}
