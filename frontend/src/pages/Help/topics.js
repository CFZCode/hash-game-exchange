/* The Help Center's rail, and the map behind `/help/:helpId`.
 *
 * RECOVERED FROM A FEDERATED REMOTE, which is a route this project had not used before and the
 * thing worth knowing about this page. `/help` is not built from the main bundle at all:
 *
 *   Enter-MsmOuq5R.js:  { component: h("Layout"), path: "/help", info: { dialog: m.mobile },
 *                         children: [{ path: "/",        component: () => r(Pn, { remoteComponent: Bt }) },
 *                                    { path: "/:helpId", component: () => r(Pn, { remoteComponent: Bt }) }, …] }
 *
 * where `h = zt(yo)` and `yo = () => import("/modules/static/remoteEntry.js")`, and
 * `Bt = X("ProvablyFair")` with `X = zt(Io)`, `Io = () => import("/modules/games/remoteEntry.js")`.
 * So the SHELL is Module Federation remote `static` and the Provably Fair BODY is remote `games`
 * — two separate micro-frontends, neither under `/assets/`. There are three in total
 * (`account`, `static`, `games`); the mirror saved `account` and `games` but not `static`, and
 * neither saved remote carries its lazy chunks.
 *
 * The recovery path is the same `hash.game` trick one directory up: `hash.game/modules/<name>/
 * remoteEntry.js` re-exports a `manifest-*.js` that holds the exposes map and the `__vite__mapDeps`
 * table, and every chunk hangs off `hash.game/modules/<name>/assets/`. That is where
 * `index-Buajimh5.js` (HelpCenter), `ProvablyFair-CJEm-Nog.js`, `GameFairnessFile-DEzcpem0.js`
 * and all thirty fairness documents came from.
 *
 * `/help` REDIRECTS HERE. The chunk does `s.pathname === "/help" && L("/help/provably-fair",
 * { replace: !0 })` unless `v.bcng || v.bcke` (two white-label brand flags), which send it to
 * `/help/privacy` instead. That is why Provably Fair is the row lit up in the capture — it is
 * the Help Center's default, not a link anyone followed.
 *
 * ROW ORDER IS THE CAPTURE'S. The chunk builds its map by spreading three objects together, so
 * the object's own key order is not the rendered order — the rendered order comes from a
 * separate `routes` array. Seventeen rows, and the capture shows all seventeen, so this list is
 * read off it rather than off the merged map. The map itself holds several more ids that the
 * rail does not show (`about_us`, `bonus`, `providers`, `contact_us`, and a whole second family
 * for the licensing microsite: `kyc`, `dispute-resolution`, `fairness-testing-methods`, …).
 *
 * `element` is the id of the HTML document the pane renders, NOT the route id — they differ
 * often enough to matter (`coinlimit` -> `coin_limit`, `reglog` -> `registration_login`, and
 * BOTH `gameble-aware` and `protect-minors` render the same `gamble_minors` file). `provably-fair`
 * is the one row with no document: its element is the remote component.
 *
 * `gameble-aware` keeps the original's own misspelling — it is the real path, and the footer's
 * Gamble Aware link already points at it. */

export const TOPICS = [
  { id: 'provably-fair', label: 'Provably Fair', element: null },
  { id: 'privacy', label: 'Privacy Policy', element: 'privacy' },
  { id: 'terms-service', label: 'Terms Of Service', element: 'terms_of_service' },
  { id: 'terms-sports', label: 'Terms Of Sports', element: 'terms_of_sports' },
  { id: 'law-enforcement', label: 'Law Enforcement', element: 'law_enforcement' },
  { id: 'coinlimit', label: 'Coin Accuracy Limit', element: 'coin_limit' },
  { id: 'contactus', label: 'Support', element: null },
  { id: 'fee', label: 'Fee', element: 'fee' },
  { id: 'googlecheck', label: 'Google Authenticator', element: 'google_authenticator' },
  { id: 'faq', label: 'FAQs', element: 'faq' },
  { id: 'passcurrency', label: 'Currency', element: 'currency' },
  { id: 'reglog', label: 'Registration and Login', element: 'registration_login' },
  { id: 'passkey', label: 'Passkey', element: 'passkey' },
  { id: 'swappolicy', label: 'Swap Policy', element: 'swap_policy' },
  { id: 'gameble-aware', label: 'Gamble Aware', element: 'gamble_minors' },
  { id: 'protect-minors', label: 'Protecting Minors', element: 'gamble_minors' },
  { id: 'aml', label: 'AML', element: 'aml' },
];

/* `c2()` — THE ROUTE LIST, WHICH IS ONE ENTRY LONGER THAN THE RAIL, and the difference is the
 * original's own inconsistency rather than a transcription gap:
 *
 *   let t = ["provably-fair","privacy","terms-service","terms-sports","limit-game",
 *            "law-enforcement","coinlimit","contactus","fee","googlecheck","faq",
 *            "passcurrency","reglog","passkey","swappolicy","gameble-aware",
 *            "protect-minors","aml"]
 *
 * `limit-game` has no entry in the routesMap. The DESKTOP rail is built by walking this list and
 * pushing only ids the map answers for (`if (C.routesMap[u]) …`), so it silently drops that one
 * and shows seventeen rows — which is the capture. The MOBILE Select is handed the raw list
 * (`options: C.routes`) with no such filter, so it shows eighteen and the fifth has no label at
 * all: a blank row with a radio button, exactly as the phone capture shows.
 *
 * Reproduced rather than tidied, for the reason `f-ull` and `texxt-sm` are kept. Point the mobile
 * Select at `TOPICS.map(t => t.id)` to drop it. */
export const ROUTE_IDS = [
  'provably-fair',
  'privacy',
  'terms-service',
  'terms-sports',
  'limit-game',
  'law-enforcement',
  'coinlimit',
  'contactus',
  'fee',
  'googlecheck',
  'faq',
  'passcurrency',
  'reglog',
  'passkey',
  'swappolicy',
  'gameble-aware',
  'protect-minors',
  'aml',
];

export const DEFAULT_TOPIC = 'provably-fair';

/* `F` in ProvablyFair-CJEm-Nog.js — the game's own url slug to the fairness document that
 * describes it. Anything not listed falls through to `general`, which is the chunk's own
 * `F[t.gameUnique] || "general"`.
 *
 * Note this is many-to-one and not a tidy rename: `keno` maps to `general` while
 * `keno-multiplayer` gets its own file, and `fastparity` maps to `parity`. Copied verbatim. */
export const FAIRNESS_DOC = {
  crash: 'crash',
  cave: 'cave',
  'classic-dice': 'classicdice',
  coinflip: 'coinflip',
  'hash-dice': 'hashdice',
  hilo: 'hilo',
  'keno-multiplayer': 'kemomultiplayer',
  keno: 'general',
  mines: 'mines',
  plinko: 'plinko',
  limbo: 'limbo',
  'roulette-single': 'roulettesingle',
  'tower-legend': 'tower',
  'ultimate-dice': 'ultimatedice',
  'video-poker': 'videopoker',
  wheel: 'wheel',
  blackjack: 'blackjack',
  egyptian: 'egyptian',
  'oriental-beauties': 'beauties',
  roulettemultiplayer: 'roulettemultiplayer',
  sword: 'sword',
  twist: 'twist',
  double: 'double',
  fastparity: 'parity',
  'bubble-shooter': 'bubble-shooter',
};
