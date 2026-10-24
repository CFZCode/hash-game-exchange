import type { MetadataRoute } from 'next';

/* The installable-app (PWA) manifest. Its icons are the owner-panel mark (public/brand/,
   the same green P the favicon falls back to), so a home-screen install shows the site's logo. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Parker567 — Casino & Sports',
    short_name: 'Parker567',
    start_url: '/',
    display: 'standalone',
    background_color: '#232626',
    theme_color: '#232626',
    icons: [
      { src: '/brand/parker567-icon-192.png?v=311', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/brand/parker567-icon-512.png?v=311', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
