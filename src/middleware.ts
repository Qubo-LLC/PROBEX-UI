// Login protection for the whole /dashboard/ (master scope v6.1 follow-up, item 4c).
//
// Every page and route handler requires a valid session cookie (src/server/session),
// except the login page, the login/logout endpoints and static assets. Pages
// redirect to the login page; route handlers answer 401. Runs in the Node.js
// runtime so the session secret is read from the server environment at runtime.

import { NextResponse, type NextRequest } from 'next/server'
import { readSession, SESSION_COOKIE } from '@/server/session'
import { BASE_PATH } from '@/config/constants'

const PUBLIC = [/^\/login\/?$/, /^\/api\/auth\/(login|logout)\/?$/, /^\/manifest\.webmanifest$/, /^\/favicon/, /^\/icon/,
                /^\/apple-icon/, /^\/robots\.txt$/]

export function isPublicPath(pathname: string): boolean {
  return PUBLIC.some((re) => re.test(pathname))
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  // Next strips the basePath from nextUrl.pathname; strip it here too in case it did not
  const path = pathname.startsWith(BASE_PATH) ? pathname.slice(BASE_PATH.length) || '/' : pathname
  if (isPublicPath(path)) return NextResponse.next()
  if (readSession(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next()
  if (path.startsWith('/api/')) {
    return NextResponse.json({ error: 'login required' }, { status: 401 })
  }
  return NextResponse.redirect(new URL(`${BASE_PATH}/login/?next=${encodeURIComponent(path)}`, request.url))
}

export const config = {
  runtime: 'nodejs',
  // everything except Next's own static files
  matcher: ['/((?!_next/static|_next/image).*)'],
}
