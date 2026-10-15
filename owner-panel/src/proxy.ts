import { NextResponse, type NextRequest } from 'next/server'

import { SESSION_COOKIE, tokenValid } from '@/lib/auth/token'

const PUBLIC = ['/login', '/api/auth/login', '/api/auth/logout']

/** A redirect target inside this app: clone nextUrl so the basePath stays on it. */
function to(req: NextRequest, pathname: string) {
  const url = req.nextUrl.clone()

  url.pathname = pathname
  url.search = ''

  return url
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // The backend's pull: authenticated by x-owner-key inside the route, not by a session.
  if (pathname === '/api/entitlements' && req.method === 'GET') return NextResponse.next()

  // Its fetch of a branding image the signed document names: x-owner-key, checked in the route.
  if (/^\/api\/branding\/asset\/[0-9a-f]{64}\.(png|webp|svg)$/.test(pathname) && req.method === 'GET') return NextResponse.next()

  const signedIn = tokenValid(req.cookies.get(SESSION_COOKIE)?.value)

  if (PUBLIC.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    if (signedIn && pathname === '/login') return NextResponse.redirect(to(req, '/overview'))

    return NextResponse.next()
  }

  if (!signedIn) {
    if (pathname.startsWith('/api/')) return NextResponse.json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Not signed in' } }, { status: 401 })
    const url = to(req, '/login')

    if (pathname !== '/') url.searchParams.set('next', pathname)

    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|images).*)'] }
