'use client';

/* src/main.jsx, as a client-only module: the same bootstrap, in the same order, then the same
   tree. It is loaded once, in the browser only (see ./client.tsx). */
import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import App from '../../src/App.jsx';
import { watchRemScale } from '../../src/utils/remScale.js';
import { measureSpineRate } from '../../src/utils/spineRate.js';
import { applyTheme, readTheme } from '../../src/context/settings.js';
import { initPush } from '../../src/services/onesignal.js';
import { API_BASE } from '../../src/services/client.js';
import { applySiteBranding } from '../../src/services/siteBranding.js';

// Before the first render, so the initial paint is already at the right scale.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

watchRemScale();

// The owner panel's title and description, when it set any; the layout's own otherwise.
applySiteBranding();

applyTheme(readTheme());

// Defers itself until after `load`; the block modal runs at 60Hz timing until it settles.
measureSpineRate();

let bootLoaderScheduled = false;

export default function AppShell() {
  /* Tear down the pre-boot loader on the frame after the one the app first commits into
     (main.jsx's double rAF, run after the first commit instead of after render()). */
  useEffect(() => {
    if (bootLoaderScheduled) return;
    bootLoaderScheduled = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById('start-up')?.remove();
      });
    });
    /* Web push. The backend decides whether it is on; see services/onesignal.js. */
    initPush({ apiBase: API_BASE });
  }, []);

  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}
