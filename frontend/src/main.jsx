import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { watchRemScale } from './utils/remScale.js'
import { measureSpineRate } from './utils/spineRate.js'
import { applyTheme, readTheme } from './context/settings.js'
import { initPush } from './services/onesignal.js'
import { API_BASE } from './services/client.js'
import { applySiteBranding } from './services/siteBranding.js'

// Before the first render, so the initial paint is already at the right scale.
/* `"scrollRestoration" in history && (history.scrollRestoration = "manual")` — the original's own
   line, at its own bootstrap. It hands scroll position to the app: without it the browser restores
   the previous entry's offset on a back navigation AFTER the router has already moved to the top,
   and the two fight over the first frames. `App` owns the other half — see the scroll effect
   there, which is `Bh` in index-BsFv7ByC.js. */
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

watchRemScale()

// The owner panel's title and description, when it set any; index.html's own otherwise.
applySiteBranding()

/* Same reason, and it matters more here: index.html ships `<body class="app-root dark">`, so a
   visitor whose saved theme is light would otherwise get a full frame of the dark palette before
   React could take the class off. Reading localStorage and toggling the class is synchronous and
   costs nothing, so it happens here rather than in the provider's first effect. */
applyTheme(readTheme())

// Defers itself until after `load`; the block modal runs at 60Hz timing until it settles.
measureSpineRate()

/* The router sits OUTSIDE App so the whole tree — including the session provider and the
   layout chrome — can read the current route. The original's own shell does the same: its
   header, its sidebar and its block dialog all consult the location, not just the page. */
createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)

/* Tear down the pre-boot loader declared in index.html.
 *
 * The original does `document.getElementById("start-up")?.remove()` once the app has booted
 * and its main stylesheet has resolved. `render()` above only SCHEDULES the first paint, so
 * removing on the very next line would drop the loader while the screen is still blank. A
 * double rAF waits for the frame after the one React commits into — the first frame that
 * actually has the app on it. */
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    document.getElementById('start-up')?.remove()
  })
})

/* Web push. The backend decides whether it is on (the owner panel writes that), so this is a
   no-op on a site with push off — OneSignal's script is not even fetched. See
   services/onesignal.js, which is shared with the other CFZ sites. */
initPush({ apiBase: API_BASE })
