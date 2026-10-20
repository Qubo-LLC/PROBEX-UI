// @vitest-environment node
//
// Dashboard login and engine-write signing (item 4c). Secrets and keys here are
// generated per test run and never written anywhere.

import { createHmac, randomBytes } from 'node:crypto'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import { checkPassword, hashPassword, loginBlocked, readSession, recordLoginFailure, signSession, SESSION_COOKIE } from './session'
import { mintEngineToken } from './engineToken'
import { allowedEnginePath } from './engineWrites'
import { isPublicPath, middleware } from '../middleware'
import { POST as engineWrite } from '../app/api/engine/[...path]/route'

const KEY = randomBytes(48).toString('base64url')
const b64json = (s: string) => JSON.parse(Buffer.from(s, 'base64url').toString('utf8'))

beforeEach(() => {
  process.env.DASHBOARD_SESSION_SECRET = randomBytes(48).toString('base64url')
  process.env.DASHBOARD_USERS = `operator:${hashPassword('correct horse battery', randomBytes(16), 1024)}`
  process.env.QUBO_JWT_KEYS = `kNEW:${KEY},kOLD:${randomBytes(48).toString('base64url')}`
  process.env.ENGINE_INTERNAL_URL = 'http://127.0.0.1:8000'
})
afterEach(() => { vi.unstubAllGlobals() })

describe('sessions', () => {
  it('hashes and checks passwords in constant time, never storing the password', () => {
    const spec = hashPassword('s3cret-pass-1234', randomBytes(16), 1024)
    expect(spec).not.toContain('s3cret')
    expect(checkPassword('s3cret-pass-1234', spec)).toBe(true)
    expect(checkPassword('wrong', spec)).toBe(false)
  })

  it('signs a session that cannot be forged, expires, and dies with its user', () => {
    const now = 1_800_000_000
    const c = signSession('operator', now, 60)
    expect(readSession(c, now + 10)).toBe('operator')
    expect(readSession(c, now + 61)).toBeNull()
    const [p] = c.split('.')
    const forged = `${Buffer.from(JSON.stringify({ u: 'operator', exp: now + 9999 })).toString('base64url')}.${c.split('.')[1]}`
    expect(readSession(forged, now)).toBeNull()
    expect(readSession(`${p}.AAAA`, now)).toBeNull()
    process.env.DASHBOARD_USERS = ''
    expect(readSession(c, now + 10)).toBeNull()
  })

  it('rate-limits failed logins per address', () => {
    const addr = `10.0.0.${Math.floor(Math.random() * 250)}`
    for (let i = 0; i < 10; i++) recordLoginFailure(addr)
    expect(loginBlocked(addr)).toBe(true)
    expect(loginBlocked('192.0.2.1')).toBe(false)
  })
})

describe('engine tokens', () => {
  it('signs a 5-minute HS256 token with the CURRENT key, verifiable exactly as the engine does', () => {
    const t = mintEngineToken('dashboard:operator', 1_800_000_000)
    const [h, c, s] = t.split('.') as [string, string, string]
    expect(b64json(h)).toEqual({ alg: 'HS256', typ: 'JWT', kid: 'kNEW' })
    const claims = b64json(c)
    expect(claims.sub).toBe('dashboard:operator')
    expect(claims.exp - claims.iat).toBe(300)
    expect(claims.jti.length).toBeGreaterThan(10)
    const expected = createHmac('sha256', Buffer.from(KEY, 'base64url')).update(`${h}.${c}`).digest('base64url')
    expect(s).toBe(expected)
  })

  it('refuses to sign without a configured key', () => {
    delete process.env.QUBO_JWT_KEYS
    expect(() => mintEngineToken('x')).toThrow(/not configured/)
  })
})

describe('the engine-write allowlist', () => {
  it.each(['execution/emergency-stop', 'execution/create', 'execution/close/0xabc', 'execution/cancel/o-1',
           'paper/start', 'paper/stop', 'paper/resolve', 'sleeves/global-halt/clear'])('allows %s', (p) => {
    expect(allowedEnginePath(p)).toBe(true)
  })
  it.each(['paper/reset', 'config', 'execution/close/../../x', 'sleeves/global-halt', ''])('refuses %s', (p) => {
    expect(allowedEnginePath(p)).toBe(false)
  })
})

function req(path: string, cookie?: string, method = 'GET') {
  const r = new NextRequest(new URL(`https://qubo-synatra.duckdns.org/dashboard${path}`), {
    method, headers: cookie ? { cookie: `${SESSION_COOKIE}=${cookie}` } : {},
  })
  return r
}

describe('middleware protects the whole /dashboard/', () => {
  it('lets the login page and assets through', () => {
    expect(isPublicPath('/login/')).toBe(true)
    expect(isPublicPath('/api/auth/login/')).toBe(true)
    expect(isPublicPath('/')).toBe(false)
    expect(isPublicPath('/api/engine/execution/emergency-stop/')).toBe(false)
  })

  it('redirects a page without a session to the login, and answers 401 on route handlers', () => {
    const page = middleware(req('/portfolio/'))
    expect(page.status).toBe(307)
    expect(page.headers.get('location')).toContain('/dashboard/login/')
    const api = middleware(req('/api/engine/execution/emergency-stop/', undefined, 'POST'))
    expect(api.status).toBe(401)
  })

  it('passes a valid session', () => {
    const res = middleware(req('/portfolio/', signSession('operator')))
    expect(res.headers.get('x-middleware-next')).toBe('1')
  })
})

describe('the engine-write route handler', () => {
  const ctx = (path: string[]) => ({ params: Promise.resolve({ path }) })

  it('refuses without a session and refuses paths outside the allowlist', async () => {
    expect((await engineWrite(req('/api/engine/execution/emergency-stop/', undefined, 'POST'), ctx(['execution', 'emergency-stop']))).status).toBe(401)
    expect((await engineWrite(req('/api/engine/paper/reset/', signSession('operator'), 'POST'), ctx(['paper', 'reset']))).status).toBe(403)
  })

  it('signs server-side, calls the engine on loopback, and never returns the token', async () => {
    const calls: Array<{ url: string; auth: string | null }> = []
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, auth: new Headers(init.headers).get('authorization') })
      return new Response(JSON.stringify({ status: 'stopped' }), { status: 200, headers: { 'content-type': 'application/json' } })
    }))
    const res = await engineWrite(req('/api/engine/execution/emergency-stop/', signSession('operator'), 'POST'),
                                  ctx(['execution', 'emergency-stop']))
    expect(res.status).toBe(200)
    expect(calls[0]!.url).toBe('http://127.0.0.1:8000/api/execution/emergency-stop')
    const token = calls[0]!.auth!.replace('Bearer ', '')
    expect(b64json(token.split('.')[1]!).sub).toBe('dashboard:operator')
    const body = await res.text()
    expect(body).not.toContain(token)
    expect(body).not.toContain(KEY)
  })
})

// ─── Client code can never reach the signing code or the session secret ─────

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? sources(p) : /\.(ts|tsx)$/.test(n) && !/\.test\.tsx?$/.test(n) ? [p] : []
  })
}

describe('server-only modules stay server-only', () => {
  it('only route handlers and the middleware import src/server', () => {
    const src = join(__dirname, '..')
    const offenders = sources(src).filter((f) => {
      const rel = f.slice(src.length + 1)
      if (rel.startsWith('server/') || rel.startsWith('app/api/') || rel === 'middleware.ts') return false
      return /from ['"](@\/server\/|\.\.?\/.*server\/)/.test(readFileSync(f, 'utf8'))
    })
    expect(offenders).toEqual([])
  })

  it('no client file mentions the key or session variables', () => {
    const src = join(__dirname, '..')
    const offenders = sources(src).filter((f) => {
      const rel = f.slice(src.length + 1)
      if (rel.startsWith('server/') || rel.startsWith('app/api/') || rel === 'middleware.ts') return false
      return /QUBO_JWT_KEYS|DASHBOARD_SESSION_SECRET|DASHBOARD_USERS/.test(readFileSync(f, 'utf8'))
    })
    expect(offenders).toEqual([])
  })
})
