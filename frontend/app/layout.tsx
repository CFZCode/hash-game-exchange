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

/* Fixture build = the pixel reference: never themed. Same rule as services/client.js. */
const LIVE = String(process.env.NEXT_PUBLIC_USE_FIXTURES ?? 'true') === 'false';

/* index.html's <head>, unchanged: title, SVG favicon, viewport, theme colour. */
export const metadata: Metadata = {
  title: 'bc-games',
  icons: { icon: { url: '/favicon.svg', type: 'image/svg+xml' } },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#232626',
};

/* `app-root dark` is the original's body class, and `#start-up` is the pre-boot loader, torn down
   by the client shell once the app has painted. The body's class is changed at runtime by the
   theme (context/settings.js), hence suppressHydrationWarning. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: BOOT_CSS }} />
        {LIVE && <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />}
      </head>
      <body className="app-root dark" suppressHydrationWarning>
        {children}
        <div id="start-up"></div>
      </body>
    </html>
  );
}
