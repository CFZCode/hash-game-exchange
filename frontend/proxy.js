import { NextResponse } from 'next/server';

/* SAME-ORIGIN API PROXY (with API_PROXY_TARGET set — a Vercel deployment; see next.config.mjs).
   The browser calls this site's own /api/v1/* and /ws/*, and they are forwarded to the live
   gateway WITHOUT the browser's Origin/Referer: the gateway refuses a POST whose Origin is not on
   its CORS list (403 "Origin … is not allowed"), and this host is not on it. Server-to-server, no
   Origin is the honest description of the request. Unset, this does nothing. */
const TARGET = (process.env.API_PROXY_TARGET ?? '').replace(/\/+$/, '');

export function proxy(req) {
  if (!TARGET) return NextResponse.next();
  const url = new URL(`${req.nextUrl.pathname}${req.nextUrl.search}`, TARGET);
  const headers = new Headers(req.headers);
  headers.delete('origin');
  headers.delete('referer');
  return NextResponse.rewrite(url, { request: { headers } });
}

export const config = { matcher: ['/api/v1/:path*', '/ws/:path*'] };
