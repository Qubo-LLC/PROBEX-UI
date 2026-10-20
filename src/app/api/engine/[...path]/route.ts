// POST /dashboard/api/engine/<engine write path>/ — the ONLY way the dashboard
// writes to the engine. Checks the login session (again, server-side), allows
// only the listed engine write routes, signs a 5-minute single-use operator token
// with the current key, and calls the engine on the VM's loopback. The browser
// never sees the key or the token.

import { NextResponse, type NextRequest } from 'next/server'
import { readSession, SESSION_COOKIE } from '@/server/session'
import { mintEngineToken } from '@/server/engineToken'
import { allowedEnginePath } from '@/server/engineWrites'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function engineBase(): string {
  return (process.env.ENGINE_INTERNAL_URL ?? 'http://127.0.0.1:8000').replace(/\/+$/, '')
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const user = readSession(req.cookies.get(SESSION_COOKIE)?.value)
  if (!user) return NextResponse.json({ error: 'login required' }, { status: 401 })
  const { path } = await ctx.params
  const target = (path ?? []).join('/')
  if (!allowedEnginePath(target)) return NextResponse.json({ error: 'not an allowed engine write' }, { status: 403 })
  let token: string
  try {
    token = mintEngineToken(`dashboard:${user}`)
  } catch {
    return NextResponse.json({ error: 'engine signing is not configured on this server' }, { status: 503 })
  }
  const body = await req.text()
  const res = await fetch(`${engineBase()}/api/${target}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body } : {}),
    cache: 'no-store',
  }).catch(() => null)
  if (res === null) return NextResponse.json({ error: 'engine unreachable' }, { status: 502 })
  const text = await res.text()
  console.warn(JSON.stringify({ event: 'dashboard_engine_write', user, route: target, status: res.status }))
  return new NextResponse(text, { status: res.status, headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' } })
}
