// Dashboard login sessions — SERVER ONLY (route handlers and middleware).
//
// Credentials come from the server environment (.env.local on the VM, written by
// scripts/set-dashboard-login.mjs, mode 600): never from the repository, never
// from a NEXT_PUBLIC_* variable, never sent to the browser.
//
//   DASHBOARD_USERS           "<user>:scrypt:<N>:<r>:<p>:<salt b64url>:<hash b64url>", comma-separated
//   DASHBOARD_SESSION_SECRET  random, base64url, signs the session cookie
//
// The session cookie is "<payload b64url>.<HMAC-SHA256 b64url>", payload
// {u: user, exp: epoch seconds}; httpOnly, Secure, SameSite=Strict, Path=/dashboard.

import { createHmac, scryptSync, timingSafeEqual } from 'node:crypto'

if (typeof window !== 'undefined') throw new Error('src/server/session is server-only')

export const SESSION_COOKIE = 'synatra_session'
export const SESSION_TTL_SECONDS = 12 * 3600

const b64 = (buf: Buffer) => buf.toString('base64url')

function secret(): Buffer {
  const s = process.env.DASHBOARD_SESSION_SECRET
  if (!s || s.length < 32) throw new Error('DASHBOARD_SESSION_SECRET is not configured')
  return Buffer.from(s, 'utf8')
}

/** Parse DASHBOARD_USERS into user → hash spec. */
export function users(raw = process.env.DASHBOARD_USERS ?? ''): Map<string, string> {
  const out = new Map<string, string>()
  for (const entry of raw.split(',').map((e) => e.trim()).filter(Boolean)) {
    const i = entry.indexOf(':')
    if (i > 0) out.set(entry.slice(0, i), entry.slice(i + 1))
  }
  return out
}

export function hashPassword(password: string, salt: Buffer, N = 16384, r = 8, p = 1): string {
  const hash = scryptSync(password, salt, 32, { N, r, p, maxmem: 64 * 1024 * 1024 })
  return `scrypt:${N}:${r}:${p}:${b64(salt)}:${b64(hash)}`
}

/** Constant-time check of a password against a stored "scrypt:N:r:p:salt:hash" spec. */
export function checkPassword(password: string, spec: string): boolean {
  const parts = spec.split(':')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const [, N, r, p, salt, hash] = parts as [string, string, string, string, string, string]
  const expected = Buffer.from(hash, 'base64url')
  const got = scryptSync(password, Buffer.from(salt, 'base64url'), expected.length,
                         { N: Number(N), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024 })
  return got.length === expected.length && timingSafeEqual(got, expected)
}

export function verifyLogin(user: string, password: string): boolean {
  // The setup script trims the username before storing it as the map key
  // (scripts/set-dashboard-login.mjs), but a request's `user` comes straight
  // from the submitted JSON/form field with no trimming. Browser autofill,
  // a password manager, or a trailing newline from a paste can attach
  // incidental whitespace to that field; Map.get() is an exact match, so an
  // untrimmed lookup here silently falls through to "unknown user" — never
  // a password mismatch — and reports the identical 401 either way. Trimming
  // only the username (never the password, which is a secret verbatim value,
  // not an identifier) closes that gap without touching anything
  // security-relevant.
  const spec = users().get(user.trim())
  if (!spec) {
    // spend the same time on unknown users
    checkPassword(password, 'scrypt:16384:8:1:AAAAAAAAAAAAAAAAAAAAAA:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')
    return false
  }
  return checkPassword(password, spec)
}

export function signSession(user: string, now = Math.floor(Date.now() / 1000), ttl = SESSION_TTL_SECONDS): string {
  const payload = b64(Buffer.from(JSON.stringify({ u: user, exp: now + ttl })))
  const mac = b64(createHmac('sha256', secret()).update(payload).digest())
  return `${payload}.${mac}`
}

/** The session's user, or null when the cookie is missing, forged or expired. */
export function readSession(cookie: string | undefined | null, now = Math.floor(Date.now() / 1000)): string | null {
  if (!cookie) return null
  const [payload, mac] = cookie.split('.')
  if (!payload || !mac) return null
  let key: Buffer
  try { key = secret() } catch { return null }
  const expected = createHmac('sha256', key).update(payload).digest()
  const got = Buffer.from(mac, 'base64url')
  if (got.length !== expected.length || !timingSafeEqual(got, expected)) return null
  try {
    const { u, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { u?: string; exp?: number }
    if (!u || typeof exp !== 'number' || exp < now) return null
    return users().has(u) ? u : null  // a removed user loses access immediately
  } catch {
    return null
  }
}

// ─── Failed-login rate limit (per client address, in memory) ─────────────────
const FAIL_WINDOW_MS = 5 * 60_000
const FAIL_MAX = 10
const fails = new Map<string, number[]>()

export function loginBlocked(addr: string, now = Date.now()): boolean {
  const list = (fails.get(addr) ?? []).filter((t) => now - t < FAIL_WINDOW_MS)
  fails.set(addr, list)
  return list.length >= FAIL_MAX
}

export function recordLoginFailure(addr: string, now = Date.now()): void {
  fails.set(addr, [...(fails.get(addr) ?? []).filter((t) => now - t < FAIL_WINDOW_MS), now])
}
