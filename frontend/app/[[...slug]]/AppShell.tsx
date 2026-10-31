'use client';

/* src/main.jsx, as a client-only module: the same bootstrap, in the same order, then the same
   tree. It is loaded once, in the browser only (see ./client.tsx). */
import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import App from '../../src/App.jsx';
import { AGENT_BASE, underAgentBase } from '../../src/services/agentBase.js';
import { watchRemScale } from '../../src/utils/remScale.js';
import { measureSpineRate } from '../../src/utils/spineRate.js';
import { applyTheme, readTheme } from '../../src/context/settings.js';
import { initPush } from '../../src/services/onesignal.js';
import { API_BASE } from '../../src/services/client.js';
import { applySiteBranding, loadSiteBranding } from '../../src/services/siteBranding.js';

// Before the first render, so the initial paint is already at the right scale.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

watchRemScale();

// The owner panel's branding (live mode: the cached copy now, the backend's answer when it comes;
// fixture mode: the build-time title and description only); the layout's own otherwise.
applySiteBranding();
loadSiteBranding();

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
        /* HIDDEN, NEVER REMOVED: `#start-up` is rendered by app/layout.tsx, so React owns it.
           Removing it left React holding a node that is no longer in <body>; the next time Next
           swapped the page segment (Back onto a history entry written before a reload) React
           inserted before it and the page died on "insertBefore … not a child of this node". */
        const loader = document.getElementById('start-up');
        if (loader) {
          loader.hidden = true;
          loader.style.display = 'none';
        }
      });
    });
    /* Web push. The backend decides whether it is on; see services/onesignal.js. */
    initPush({ apiBase: API_BASE });
  }, []);

  return (
    <BrowserRouter basename={underAgentBase() ? AGENT_BASE : undefined}>
      <App />
    </BrowserRouter>
  );
}
