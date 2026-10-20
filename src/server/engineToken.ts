// Engine operator tokens — SERVER ONLY. Signs a 5-minute, single-use HS256 JWT with
// the CURRENT key from QUBO_JWT_KEYS (the engine accepts current and previous; see
// the engine's docs/security/api_auth.md). The key and the token never reach the
// browser: only the engine-write route handler imports this module, and
// scripts/check-client-bundle.mjs fails the build if this code or the key name
// appears in a client chunk.

import { createHmac, randomBytes } from 'node:crypto'

if (typeof window !== 'undefined') throw new Error('qubo-engine-signing-v1: server-only module')

export const SIGNING_MARKER = 'qubo-engine-signing-v1'
const TTL_SECONDS = 300

const b64 = (buf: Buffer) => buf.toString('base64url')

function currentKey(raw = process.env.QUBO_JWT_KEYS ?? ''): { kid: string; key: Buffer } {
  const first = raw.split(',').map((s) => s.trim()).find(Boolean)
  const i = first ? first.indexOf(':') : -1
  if (!first || i <= 0) throw new Error(`${SIGNING_MARKER}: QUBO_JWT_KEYS is not configured`)
  const key = Buffer.from(first.slice(i + 1), 'base64url')
  if (key.length < 32) throw new Error(`${SIGNING_MARKER}: the current key is too short`)
  return { kid: first.slice(0, i), key }
}

export function mintEngineToken(sub: string, now = Math.floor(Date.now() / 1000), raw?: string): string {
  const { kid, key } = currentKey(raw)
  const header = b64(Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT', kid })))
  const claims = b64(Buffer.from(JSON.stringify({ sub, iat: now, exp: now + TTL_SECONDS, jti: b64(randomBytes(16)) })))
  const sig = b64(createHmac('sha256', key).update(`${header}.${claims}`).digest())
  return `${header}.${claims}.${sig}`
}
