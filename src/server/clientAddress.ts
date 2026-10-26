// The client address used to rate-limit failed logins (server only).

import type { NextRequest } from 'next/server'

/** The rate-limit key. nginx appends the connecting address to X-Forwarded-For, so the LAST hop is the
 *  one the client cannot choose; the first hop is whatever the client sent (keying on it let a client
 *  rotate a fake header and bypass the failed-login limit). */
export function clientAddress(req: NextRequest): string {
  const hops = (req.headers.get('x-forwarded-for') ?? '').split(',').map((h) => h.trim()).filter(Boolean)
  return hops[hops.length - 1] || req.headers.get('x-real-ip') || 'unknown'
}
