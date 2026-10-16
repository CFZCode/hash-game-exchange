import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
/* The one global stylesheet, as src/main.jsx imported it. Every other stylesheet is imported by
   the component that uses it, exactly as before. */
import '../src/index.css';
/* The owner's colour themes; none of them matches without <html data-theme>, see the file. */
import '../src/theme/palettes.css';
import '../src/theme/sprites.css';
import { BOOT_CSS } from './boot-style';
import { THEME_BOOT_SCRIPT } from '../src/theme/applyTheme';
import { BRANDING_BOOT_SCRIPT, BRANDING_PATH, cleanBranding } from '../src/services/siteBrandingCore.js';

/* Fixture build = the pixel reference: never themed. Same rule as services/client.js. */
const LIVE = String(process.env.NEXT_PUBLIC_USE_FIXTURES ?? 'true') === 'false';

/* index.html's <head>, unchanged: title, SVG favicon, viewport, theme colour. The fixture build
   (the pixel reference) and an unbranded live site keep exactly these. */
const ORIGINAL_METADATA: Metadata = {
  title: 'Parker567 — Casino & Sports',
  icons: { icon: { url: '/favicon.svg', type: 'image/svg+xml' } },
};

/* Live mode with no owner mark yet: Parker567's own square mark (public/brand/, the same
   fallback services/siteBranding.js uses), never the original's favicon and loader art. */
const FALLBACK_MARK = LIVE ? '/brand/parker567-mark.png' : null;
const FALLBACK_ICONS: Metadata['icons'] = FALLBACK_MARK
  ? { icon: { url: FALLBACK_MARK, type: 'image/png' }, apple: FALLBACK_MARK }
  : ORIGINAL_METADATA.icons;

/* bc.game's own viewport, read off the live site's <meta name="viewport">:
     width=device-width,minimum-scale=1,maximum-scale=1,user-scalable=no,initial-scale=1.0,viewport-fit=cover
   The hash-games copy carried only `width=device-width, initial-scale=1`, and that left two ways for
   a phone to rescale the page by itself:
   - ANY element wider than the screen (a long unbroken string, a nowrap row) widened Chrome's
     layout viewport to fit it (innerWidth 900 on a 440px phone, measured): the fixed header was laid
     out across the wider box so its right half (balance pill, avatar) went off screen, and the
     zoomed-out page switched on Chrome's text autosizing, which inflates paragraph text. With
     minimum-scale=1 the page can never be shown below 1:1, so the layout viewport stays at the
     device width whatever the content does.
   - iOS zooms in on focus of any input under 16px, and below 430px this build's 1rem IS under 16px
     (remScale: 14.5px at 390). maximum-scale=1 stops that, as on bc.game.
   viewport-fit=cover is what the env(safe-area-inset-*) rules in index.css / MainLayout.css were
   written against. */
const ORIGINAL_VIEWPORT: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#232626',
};

type Branding = NonNullable<ReturnType<typeof cleanBranding>>;

/* The gateway as the server reaches it: GATEWAY_URL (run.sh sets it), else the browser's base. */
const GATEWAY = String(process.env.GATEWAY_URL || process.env.NEXT_PUBLIC_API_BASE || '').replace(/\/+$/, '');
const PUBLIC_BASE = String(process.env.NEXT_PUBLIC_API_BASE ?? '').replace(/\/+$/, '');

/* Live mode: the owner's branding (docs/OWNER-PANEL.md §8), so the first HTML already carries the
   right title, description, OG tags and favicon. Short timeout, cached 30 s; any failure = none. */
async function serverBranding(): Promise<Branding | null> {
  if (!LIVE || !/^https?:\/\//.test(GATEWAY)) return null;
  try {
    const res = await fetch(`${GATEWAY}${BRANDING_PATH}`, { next: { revalidate: 30 }, signal: AbortSignal.timeout(1500) });
    if (!res.ok) return null;
    const body = await res.json();
    return cleanBranding(body?.data);
  } catch {
    return null;
  }
}

const assetUrl = (path: string | null) => (path ? `${PUBLIC_BASE}${path}` : undefined);
const typeOf = (url: string) => (url.endsWith('.svg') ? 'image/svg+xml' : url.endsWith('.webp') ? 'image/webp' : 'image/png');

export async function generateMetadata(): Promise<Metadata> {
  const b = await serverBranding();
  if (!b) return { ...ORIGINAL_METADATA, icons: FALLBACK_ICONS };
  const title = b.title ?? b.siteName;
  const mark = assetUrl(b.markUrl);
  const ogImage = assetUrl(b.ogImageUrl);
  return {
    title: b.titleTemplate ? { default: title, template: b.titleTemplate } : title,
    description: b.description ?? undefined,
    keywords: b.keywords.length ? b.keywords : undefined,
    applicationName: b.siteName,
    icons: mark ? { icon: { url: mark, type: typeOf(mark) }, apple: mark } : FALLBACK_ICONS,
    openGraph: {
      siteName: b.siteName,
      title: b.ogTitle ?? title,
      description: b.ogDescription ?? b.description ?? undefined,
      type: 'website',
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const b = await serverBranding();
  return b?.themeColor ? { ...ORIGINAL_VIEWPORT, themeColor: b.themeColor } : ORIGINAL_VIEWPORT;
}

/* `app-root dark` is the original's body class, and `#start-up` is the pre-boot loader, torn down
   by the client shell once the app has painted. The body's class is changed at runtime by the
   theme (context/settings.js), hence suppressHydrationWarning. */
export default async function RootLayout({ children }: { children: ReactNode }) {
  /* Live mode: the owner's square mark as the pre-boot loader's picture (same 11rem box). */
  const mark = assetUrl((await serverBranding())?.markUrl ?? null) ?? FALLBACK_MARK;
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: BOOT_CSS }} />
        {LIVE && <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />}
        {mark && (
          <style
            id="brand-loader"
            dangerouslySetInnerHTML={{
              __html: `#start-up,body.dark #start-up{background-image:url("${mark}");background-repeat:no-repeat;background-position:center}`,
            }}
          />
        )}
        {LIVE && <script dangerouslySetInnerHTML={{ __html: BRANDING_BOOT_SCRIPT }} />}
      </head>
      <body className="app-root dark" suppressHydrationWarning>
        {children}
        <div id="start-up"></div>
      </body>
    </html>
  );
}
