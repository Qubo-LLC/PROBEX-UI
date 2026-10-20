// POST /dashboard/api/auth/login/ — check the operator's credentials (server env only)
// and set the httpOnly session cookie. Failed attempts are rate-limited per address.

import { NextResponse, type NextRequest } from 'next/server'
import { loginBlocked, recordLoginFailure, SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifyLogin } from '@/server/session'
import { BASE_PATH } from '@/config/constants'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function clientAddress(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
}

export async function POST(req: NextRequest) {
  const addr = clientAddress(req)
  if (loginBlocked(addr)) return NextResponse.json({ error: 'too many failed attempts' }, { status: 429 })
  let user = '', password = ''
  const type = req.headers.get('content-type') ?? ''
  if (type.includes('application/json')) {
    const body = (await req.json().catch(() => ({}))) as { username?: string; password?: string }
    user = body.username ?? ''; password = body.password ?? ''
  } else {
    const form = await req.formData()
    user = String(form.get('username') ?? ''); password = String(form.get('password') ?? '')
  }
  let ok = false
  try {
    ok = Boolean(user && password && verifyLogin(user, password))
  } catch {
    return NextResponse.json({ error: 'login is not configured on this server' }, { status: 503 })
  }
  if (!ok) {
    recordLoginFailure(addr)
    console.warn(JSON.stringify({ event: 'dashboard_login_failed', client: addr, user: user.slice(0, 64) }))
    return NextResponse.json({ error: 'invalid credentials' }, { status: 401 })
  }
  console.warn(JSON.stringify({ event: 'dashboard_login', client: addr, user }))
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, signSession(user), {
    httpOnly: true, secure: true, sameSite: 'strict', path: BASE_PATH, maxAge: SESSION_TTL_SECONDS,
  })
  return res
}
