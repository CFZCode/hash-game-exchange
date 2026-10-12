'use client';

import dynamic from 'next/dynamic';

/* Client-only: the app reads window, localStorage and the URL at module scope, as it did under
   Vite, so it is never rendered on the server. */
const ClientApp = dynamic(() => import('./AppShell'), { ssr: false });

export default ClientApp;
