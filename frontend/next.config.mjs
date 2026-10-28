import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/* The build-time switches the Vite build read as `import.meta.env.VITE_*` are read in src/ as
   `process.env.NEXT_PUBLIC_*`. The owner-panel push still writes the VITE_ names into .env.local,
   so each one falls back to its VITE_ twin. A NEXT_PUBLIC_ value, from the shell or an env file,
   wins. Unset stays unset: src/services/client.js keeps its own defaults (fixtures ON unless
   "false", no API base, a 400ms fixture delay). */
const KEYS = ['API_BASE', 'USE_FIXTURES', 'FIXTURE_DELAY', 'SITE_TITLE', 'SITE_DESCRIPTION', 'SITE_LOGO',
  'SPORTS_STREAM_BASE', 'SCORECARD_BASE', 'SCORE_SOCKET_URL'];
const env = {};
for (const key of KEYS) {
  const value = process.env[`NEXT_PUBLIC_${key}`] ?? process.env[`VITE_${key}`];
  if (value !== undefined) env[`NEXT_PUBLIC_${key}`] = value;
}

/* SAME-ORIGIN PROXY for a host the live API's CORS list does not carry (a Vercel deployment):
   with API_PROXY_TARGET set (e.g. https://api.parker567.com) the browser calls this site's own
   /api/v1/* and /ws/*, and proxy.js forwards them (dropping Origin), so no request is
   cross-origin. The client's API base is then '' (same origin). Unset — local dev, the pm2
   server — nothing changes. */
const PROXY_TARGET = (process.env.API_PROXY_TARGET ?? '').replace(/\/+$/, '');
if (PROXY_TARGET) env.NEXT_PUBLIC_API_BASE = '';
/* The proxy carries HTTP only — Vercel does not forward a WebSocket upgrade — so the realtime
   socket (src/services/realtime.js) dials the gateway itself. That origin must be on the
   gateway's SOCKET_ALLOWED_ORIGINS. An explicit NEXT_PUBLIC_SOCKET_BASE wins. */
const SOCKET_BASE = process.env.NEXT_PUBLIC_SOCKET_BASE ?? (PROXY_TARGET || undefined);
if (SOCKET_BASE) env.NEXT_PUBLIC_SOCKET_BASE = SOCKET_BASE;

const ASSET = '*.{png,jpg,jpeg,avif,webp,gif,svg}';
const RAW = { query: /[?&]raw(?=&|$)/ };
const URL_QUERY = { query: /[?&]url(?=&|$)/ };
const SRC = { all: [{ not: 'foreign' }, { path: /^src\// }] };

/** @type {import('next').NextConfig} */
const nextConfig = {
  // No `X-Powered-By: Next.js`: the framework and its version are not advertised (docs/SECURITY-CHECKLIST.md #10).
  poweredByHeader: false,
  /* Live (pm2) serves `.next-live`, a copy of the last finished build made by scripts/start-live.sh,
     so a `next build` — which wipes `.next` — never breaks the running site. */
  distDir: process.env.NEXT_DIST_DIR || '.next',
  env,
  /* The Vite entry rendered <App/> without <StrictMode>; the App Router turns it on by default,
     which double-runs every effect in development. Off, so dev behaves as it did. */
  reactStrictMode: false,
  /* The "N" badge would sit on top of the bottom-left of every page in development. */
  devIndicators: false,
  /* The content security policy in REPORT-ONLY mode: the browser blocks nothing and logs in its
     console what an enforced policy would have blocked (games, the sportsbook iframe, payments,
     scorecards load from many hosts). Enforce it — rename the header — only once a week on live
     shows no violation from a real feature (docs/SECURITY-CHECKLIST.md #18). */
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Content-Security-Policy-Report-Only',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
            "style-src 'self' 'unsafe-inline' https:",
            "img-src 'self' data: blob: https:",
            "font-src 'self' data: https:",
            "connect-src 'self' https: wss:",
            "media-src 'self' blob: https:",
            "frame-src 'self' https:",
            "worker-src 'self' blob:",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self' https:",
          ].join('; '),
        },
      ],
    },
  ],
  turbopack: {
    root: here,
    /* Vite's own order. It matters: EditProfile has both frames.js and frames.jsx, and
       `import … from './frames'` means the .js one (Next's default order would pick .jsx). */
    resolveExtensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
    rules: {
      /* What Vite gave a JS import: an image is its URL string (Next would otherwise hand back a
         StaticImageData object) and `?raw` is the file's text. scripts/asset-url-loader.cjs tags
         src/'s image imports with `?url` so this applies to them and not to CSS url(), which
         keeps Next's own handling. */
      '*.{js,jsx}': {
        condition: SRC,
        loaders: [path.join(here, 'scripts/asset-url-loader.cjs')],
      },
      [ASSET]: [
        { condition: { all: [{ not: 'foreign' }, RAW] }, type: 'raw' },
        { condition: { all: [{ not: 'foreign' }, URL_QUERY] }, type: 'asset' },
      ],
      '*.html': { condition: { all: [{ not: 'foreign' }, RAW] }, type: 'raw' },
    },
  },
};

export default nextConfig;
