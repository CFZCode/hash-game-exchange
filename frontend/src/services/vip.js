import { walletCode } from '../utils/currency';
import { request, USE_FIXTURES, getAccessToken } from './client';
import ENDPOINTS, { PLATFORM } from './endpoints';
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

/* ── LIVE: THE PLAYER'S OWN STANDING, FOR THE LEVEL CARD ON /bonus ─────────────────────────────
 *
 * `GET /user/vip` answers `{level, name, card, wager, nextLevel, nextName, wagerToNextLevel,
 * progressPct, ladder, totalLevels}` off the PLATFORM's ladder (41 levels, Wood to Diamond),
 * which is not bc.game's captured one in data/vipConfig.js. The card's name, percentage and
 * "… XP to <next>" line are therefore taken from this answer on the live path; looking the
 * level number up in the captured ladder would print bc.game's tier for it. XP here is the
 * platform's wager, the unit its ladder is measured in.
 *
 * Null in fixture mode and without a session, which tells the card to keep reading the account
 * exactly as it always has. A failed read is null too: the card then falls back the same way. */
export function toVipStanding(row) {
  if (!row) return null;
  return {
    level: Number(row.level) || 0,
    name: row.name ?? '',
    /* The glyph family the card's icon map keys on (`gold` -> Gold); a family it has no glyph
       for (Wood, Unranked) falls back to Beginner, as the captured ladder's odd rows do. */
    family: row.card ? row.card[0].toUpperCase() + row.card.slice(1) : '',
    nextName: row.nextName ?? null,
    percent: Math.min(100, Math.max(0, Number(row.progressPct) || 0)),
    toNext: row.nextLevel == null ? 0 : Number(row.wagerToNextLevel) || 0,
    /* MONEY, NOT XP. The platform's ladder is wager: `wagerToNextLevelInCurrency` is the
       distance in the owner's default coin (`currency`), which the cards print in the player's
       selected currency (useSelectedCurrency). An older backend sends only the USD figures. */
    currency: walletCode(row.currency || 'USD'),
    toNextAmount:
      row.nextLevel == null ? 0 : Number(row.wagerToNextLevelInCurrency ?? row.wagerToNextLevel) || 0,
    wagered: Number(row.wagerInCurrency ?? row.wager) || 0,
  };
}

export const getVipStanding = () =>
  USE_FIXTURES || !getAccessToken()
    ? null
    : request(PLATFORM.user.vip.standing, { live: true }).then(toVipStanding, () => null);

export default getVipClub;
