// POST /dashboard/api/auth/logout/ — clear the session cookie.

import { NextResponse } from 'next/server'
import { SESSION_COOKIE } from '@/server/session'
import { BASE_PATH } from '@/config/constants'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, secure: true, sameSite: 'strict', path: BASE_PATH, maxAge: 0 })
  return res
}
