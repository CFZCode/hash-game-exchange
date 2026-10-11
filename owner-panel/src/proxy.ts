import { NextResponse, type NextRequest } from 'next/server'

import { SESSION_COOKIE, tokenValid } from '@/lib/auth/token'

const PUBLIC = ['/login', '/api/auth/login', '/api/auth/logout']

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // The backend's pull: authenticated by x-owner-key inside the route, not by a session.
  if (pathname === '/api/entitlements' && req.method === 'GET') return NextResponse.next()

  const signedIn = tokenValid(req.cookies.get(SESSION_COOKIE)?.value)

  if (PUBLIC.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    if (signedIn && pathname === '/login') return NextResponse.redirect(new URL('/overview', req.url))

    return NextResponse.next()
  }

  if (!signedIn) {
    if (pathname.startsWith('/api/')) return NextResponse.json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } }, { status: 401 })
    const url = new URL('/login', req.url)

    if (pathname !== '/') url.searchParams.set('next', pathname)

    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|images).*)'] }
