import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/* The build-time switches the Vite build read as `import.meta.env.VITE_*` are read in src/ as
   `process.env.NEXT_PUBLIC_*`. The owner-panel push still writes the VITE_ names into .env.local,
   so each one falls back to its VITE_ twin. A NEXT_PUBLIC_ value, from the shell or an env file,
   wins. Unset stays unset: src/services/client.js keeps its own defaults (fixtures ON unless
   "false", no API base, a 400ms fixture delay). */
const KEYS = ['API_BASE', 'USE_FIXTURES', 'FIXTURE_DELAY', 'SITE_TITLE', 'SITE_DESCRIPTION', 'SITE_LOGO'];
const env = {};
for (const key of KEYS) {
  const value = process.env[`NEXT_PUBLIC_${key}`] ?? process.env[`VITE_${key}`];
  if (value !== undefined) env[`NEXT_PUBLIC_${key}`] = value;
}

const ASSET = '*.{png,jpg,jpeg,avif,webp,gif,svg}';
const RAW = { query: /[?&]raw(?=&|$)/ };
const URL_QUERY = { query: /[?&]url(?=&|$)/ };
const SRC = { all: [{ not: 'foreign' }, { path: /^src\// }] };

/** @type {import('next').NextConfig} */
const nextConfig = {
  env,
  /* The Vite entry rendered <App/> without <StrictMode>; the App Router turns it on by default,
     which double-runs every effect in development. Off, so dev behaves as it did. */
  reactStrictMode: false,
  /* The "N" badge would sit on top of the bottom-left of every page in development. */
  devIndicators: false,
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
