import { request } from './client';
import ENDPOINTS from './endpoints';
import {
  ACCESS,
  ENGAGE,
  FAQ_TABS,
  FAQ_TITLE,
  HERO,
  MORE,
  PERKS,
  REWARDS,
  TRANSFER,
  VIDEO,
} from '../pages/VIP/vip';

/* The VIP Club — `/vip-detail`.
 *
 * HOW THIS PAGE'S CHUNK WAS RECOVERED, because the method is the useful part and it applies to
 * every remaining hole in the mirror. `index-DLlkBGhd.js` is not in the saved page, and
 * bc.game's own origin times out from this environment — the wall that `/deposit-offer`'s
 * artwork hit and that CLAUDE.md records as unrecoverable. It is not. The VIP page's `<video>`
 * carries `poster="https://hash.game/assets/poster-D0tNvOgo.png"`, i.e. the deploy is served
 * from a SECOND origin under a different domain, and that one answers. Every file the mirror is
 * missing — chunks, stylesheets, the origin-hosted /assets PNGs — came off `hash.game/assets/`
 * under the identical content hashes `Enter-MsmOuq5R.js` already names in `__vite__mapDeps`.
 * Source maps are the one thing it refuses (403 on `.js.map`). Fetch with PowerShell's
 * `Invoke-WebRequest`, not curl, for the same reason the promotions art did.
 *
 * So unlike the raffle or the deposit dialog, nothing on this page is inferred. The copy is
 * verbatim `t("…")` out of the chunk, the class lists are the rendered DOM's, and the artwork
 * is the deploy's own PNGs.
 *
 * WHY THE FIXTURE IS THE WHOLE PAGE. The VIP Club's copy is not a payload — it is i18n text
 * compiled into the chunk, and the live page fetches none of it. The two calls it really makes
 * are `ENDPOINTS.vip.support` and `ENDPOINTS.vip.rankInfo`, both read from the recovered
 * `index-BGw8Rzb9.js` / `vip-service-CYiVi9f2.js`, and both feed the SIGNED-IN level and XP
 * widgets, which this page does not render (the chunk's `Bt` branch is behind a `when: !0`
 * Show that never falls through to it). They are recorded in endpoints.js for whoever builds
 * those.
 *
 * It still goes through `request()` rather than being imported by the component, because the
 * one-seam rule is what makes the eventual swap a config change: when a real backend serves
 * this page's blocks — and a marketing page's blocks are exactly the kind of thing that ends
 * up behind a CMS — only this file changes.
 */
export const getVipClub = () =>
  request(ENDPOINTS.vip.support, {
    fixture: {
      hero: HERO,
      video: VIDEO,
      transfer: TRANSFER,
      rewards: REWARDS,
      perks: PERKS,
      more: MORE,
      access: ACCESS,
      engage: ENGAGE,
      faq: { title: FAQ_TITLE, tabs: FAQ_TABS },
    },
  });

export default getVipClub;
