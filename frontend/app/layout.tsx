import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
/* The one global stylesheet, as src/main.jsx imported it. Every other stylesheet is imported by
   the component that uses it, exactly as before. */
import '../src/index.css';
import { BOOT_CSS } from './boot-style';

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
      </head>
      <body className="app-root dark" suppressHydrationWarning>
        {children}
        <div id="start-up"></div>
      </body>
    </html>
  );
}
