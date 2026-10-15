# Owner panel ↔ site contract (hash-game-exchange)

Three apps, two owners:

| App | Path | Port | Who uses it |
|---|---|---|---|
| Owner panel | `owner-panel/` | 3085 | **Us** (the platform). Never handed to the client. |
| Site admin | `admin/` (from the hub's `site-admin`) | 3080 | The client's staff. |
| Frontend | `frontend/` | 5190 | Players. |
| Backend gateway | `backend/` | 4700 | All of the above. |

**The rule:** the owner panel decides what the client is *entitled* to. Only entitled things work.
Features (their ON/OFF and variant) and the business / deposit / withdrawal policies are set **only**
in the owner panel; the site admin shows them read-only. Site flags: the site admin can switch
entitled ones on and off; it can never switch on something the owner has not allowed. Players never
see or reach a non-entitled thing.

**Data separation:** the owner panel's data (entitlements, its login, its audit log) is stored **only**
in the owner panel (`owner-panel/data/`, `owner-panel/.env.local`). Nothing of it is written to the
site database (`cfz_hash_game_exchange`), to the admin, or to the frontend. The backend keeps the
last copy it fetched in a file (`backend/data/owner-entitlements.json`), never in a table.

## 1. Owner panel login (config, not database)

`owner-panel/.env.local` (gitignored, mode 600):

```
OWNER_USERNAME, OWNER_PASSWORD      # the one owner login
OWNER_SESSION_SECRET                # HMAC key for the session cookie
OWNER_SHARED_SECRET                 # also in backend/.env; the backend pulls entitlements with it
SITE_KEY, SITE_NAME, SITE_GATEWAY_URL, SITE_ADMIN_URL, SITE_FRONTEND_URL, PORT=3085
```

No user table, no staff account on the site. Compare with `crypto.timingSafeEqual`. Session cookie
`owner.<exp>.<hmac>` signed with `OWNER_SESSION_SECRET`, httpOnly, sameSite=lax, 12h.

## 2. The entitlements document

Stored at `owner-panel/data/entitlements.json` (gitignored). Every save bumps `version` and appends
a line to `owner-panel/data/audit.jsonl` (`{at, user, version, changes:[{kind,key,from,to}]}`).

```json
{
  "site": "hash-game-exchange",
  "version": 7,
  "updatedAt": "2026-10-09T13:00:00.000Z",
  "features": { "gift_cards": true, "swap": true, "vault": false, "...": true },
  "flags":    { "casino": true, "sports": true, "giftcards": true, "spribe": false, "...": true },
  "variants": { "business_model": "hybrid", "deposit_mode": "both", "withdrawal_mode": "both",
                "gift_cards": "claim_cards", "vault": "none", "...": "..." },
  "template": "carbon_gold"
}
```

**Everything on the site admin's Site Config → Features page (business model, deposits, withdrawals,
every feature's VARIANT and ON/OFF) is managed only here.** The site admin shows it, read-only.

- `features` keys = the backend feature catalogue
  (`backend/packages/common/src/featureCatalogue.js`: business_model, deposit_mode,
  withdrawal_mode, vip, promotions, spin_wheel, gift_cards, bonus, affiliate, races, challenges, raffles,
  vault, swap, chat, notifications, banners, blog, casino_lobby, club_membership, kyc,
  push_notifications, analytics). `true` = the feature is **ON** for the site (it used to mean
  "entitled"; since the client can no longer switch features, entitled == on). The three policies are
  always on; their variant is the policy.
- `variants` = `{ [featureKey]: variantKey }` for every catalogue feature, the policies included
  (business_model: b2c / b2b / hybrid; deposit_mode and withdrawal_mode: automatic / manual / both /
  none = Closed; reward_currency: a coin code from `REWARD_CURRENCY_CHOICES`, default USDT, no
  none — every reward is calculated and paid in it, see `.claude/skills/reward-currency`). Only catalogue features and each feature's own variant keys are accepted (the owner
  panel answers `400 VALIDATION_ERROR` otherwise). A non-policy feature on variant `none` is off. A
  missing `variants`, or a missing key, = keep the site's current variant (older documents keep working).
- `flags` keys = the siteconfig flags (the hub owner-admin's `src/views/flags/flagGroups.ts`: Products,
  Game categories, Providers, Fiat, Crypto, Home sections). `false` = **not entitled**.
- A key that is missing = on / entitled (so a new catalogue key never breaks a live site). The owner
  panel always writes the full catalogue.
- First run: the owner panel creates the file with everything `true` and no `variants` (today's
  behaviour). The owner screen fills a missing `variants` (or a key added since) for editing from the
  site's live state, `GET <SITE_GATEWAY_URL>/api/v1/admin/features/public` (a feature it does not list
  is off), or, if that does not answer, from the current template; the first save writes the full map
  (the audit line carries `seededFrom: 'backend'|'template'`). The pull (`GET /api/entitlements`)
  never invents variants.
- Owner screen `/entitlements` ("Features & plan"): the template cards, a Policies group (dropdowns
  only), every feature with its ON switch and a VARIANT dropdown, then the site flags. Picking a template
  fills every variant it names (its `none` = off, anything else = on); rows stay adjustable before
  saving. Review and save lists variant and policy changes as "Gift cards: Activate-then-claim cards →
  Off" (`claim_cards → none`); audit change kinds are `template`, `variant`, `feature`, `flag`.
- `withdrawal_requirements` (policy, default `kyc` = the behaviour before it existed): `none` (nothing
  required; NOT "closed"), `kyc` (KYC Verified), `wager` (all open wagering complete: the deposit
  rollover of `/user/wager/tasks` and every active bonus; forfeiting a bonus clears its part),
  `kyc_and_wager`. Enforced by user-service `modules/withdraw-requirements` on fiat, crypto (HTTP
  service + `SUBMIT_NEW_WITHDRAWL` socket) and gateway payouts: KYC missing → the rail's own
  `*_KYC_REQUIRED`; deposit rollover open → `403 WITHDRAW_WAGER_REQUIRED` `{ remaining, currency:'USD',
  deposit, bonus, forfeitable }`; only bonus wagering open → the existing `409 BONUS_FORFEIT_REQUIRED`.
  KYC also needs `WITHDRAW_REQUIRE_KYC` on (backend env, default on). Players read it at
  `GET /api/v1/user/withdrawals/requirements`.
  **The owner screen shows it as three switches, any combination:** KYC required, Wagering complete
  required (together = the variant above, so `none/kyc/wager/kyc_and_wager` are exactly the four
  combinations and older documents and backends keep working), and **Deposit cap** = the document's
  `withdrawalCap` block (next item).
- `withdrawalCap` (optional): `{ enabled, depositMultiplier, wagerBonus, wagerMultiplier }`, default
  `{ false, 3, true, 5 }` (missing = off). Multipliers: a number > 0, ≤ 100, at most 2 decimals (the
  save answers `422 VALIDATION_ERROR` otherwise; the backend reads a bad value as its default). Audit
  change kind `withdrawal_cap`. Rule, per currency and in that currency (never converted: the cap limits
  money out of one wallet, so a rate move must not change it and a coin with no USD rate still has a
  cap; this differs on purpose from the wagering requirement, which is in USD):
  `cap = deposited × depositMultiplier + min(wagered, deposited × wagerMultiplier)` (second term only
  with `wagerBonus`), `remaining = max(cap − withdrawn, 0)`. Deposited = credited deposits on every
  rail (fiat, A-Pay, CricPay, UPI, WayPay pay-in, CCPayment) + staff/agent funding to the player
  (`staff_transfers`, INR). Withdrawn = pending and paid on every rail (fiat, crypto, A-Pay, payout
  orders) + agent collections; rejected / failed-and-refunded excluded. Wagered = in-house bets, GIS
  (net of refunds/rollbacks), seamless, js-games v1/v2, x-casino, aggregators, and settled sports
  bets at `LEAST(stake, liability)` (void/refund excluded). Code: `packages/common/src/withdrawalCap.js`,
  user-service `modules/withdraw-requirements/withdrawCap.js`. Enforced on fiat, crypto (service +
  socket) and payment-order payouts, after KYC and wagering and before the bonus forfeit, and again
  inside the rail's transaction under a per-player lock (two requests at once cannot both fit):
  `403 WITHDRAW_CAP_EXCEEDED` `{ cap, withdrawn, remaining, deposited, wagered, unlockedByWager,
  wagerToRaise, currency }` with the message "You can withdraw up to X more (3× your total deposits + Y
  unlocked by wagering). Wager Z more or deposit to raise your limit."; fails closed with
  `503 WITHDRAW_CAP_CHECK_FAILED` when a figure cannot be read. The requirements read takes
  `?currency=` (strict) and adds `cap`. Site admin: shown read-only under the policy.
- `region` (optional): `{ listType: 'blocklist'|'allowlist', countries: [ISO alpha-2] }`, the region
  restriction's list; its mode is the `region_restriction` policy (`none` = Off, `notice`, `block`).
  Missing = an empty blocklist. See `docs/region-restriction.md`.
- `template` (optional): the site template, **the owner's choice alone**. One of the catalogue's
  template keys, named for a colour theme, never for another site:

  | key | label | look |
  |---|---|---|
  | `hash_game` | Hash Game (original) | the bc.game UI's own colours, unchanged. **This client's default** |
  | `carbon_gold` | Carbon Gold | hazard yellow on carbon black |
  | `violet_night` | Violet Night | deep violet on dark |
  | `emerald_dark` | Emerald Dark | green on near-black |
  | `neon_navy` | Neon Navy | neon green on midnight navy |

  Old names (`stake`, `shuffle`, `bcgame`, `addaplay`) still resolve to these
  (`LEGACY_TEMPLATES` / `resolveTemplateKey` in `featureCatalogue.js`), wherever they are read: this
  field, a stored `_template` row (migration 059 rewrites it), `SITE_TEMPLATE`, the hub's sites.json.
  An unknown name is dropped (the rest of the document still applies). Missing or `null` = leave
  the site's template as it is.

### 2.1 This client: the bc.game UI (hash-game-exchange)

The frontend is the fixed bc.game UI with one layout per feature, so here:

- **A template is a colour theme only.** `features/public` carries `{feature:'theme', variant:<key>}`;
  `frontend/src/services/gates.js` puts it on `<html data-theme>` (`src/theme/applyTheme.js`, last
  value cached in localStorage `hge.theme` and painted by a `<head>` script before first paint).
  `src/theme/palettes.css` maps each SmartBet palette (casino-sportsbook `theme/brands.css`) onto the
  bc tokens (`--color-layer1..6`, `brand`, `primary`, `secondary`…, dark mode only);
  `src/theme/sprites.css` + `src/assets/themes/<key>/` are recoloured icon sprites
  (`node tools/gen-theme-sprites.mjs`). `hash_game`, an unknown key and fixture mode change nothing.
  Picking a template in the owner panel never changes a feature.
- **Features** (`owner-panel/src/configs/siteUi.ts`, copied to `admin/src/configs/siteUi.ts`):
  *toggle* (vip, promotions, bonus, affiliate, races, challenges, raffles, vault, swap,
  notifications, kyc: ON/OFF only, variant pinned to the bc one); *fixed* (casino_lobby, banners:
  always on); *absent* — "Not in this UI" (spin_wheel, gift_cards, tips, chat, club_membership,
  push_notifications, analytics, blog: always off). The owner save pins the document to it
  (`pinToUi` in `lib/entitlements/store.ts`).
- **Cashier policies in the UI:** the only live deposit rail is Crypto (automatic) and the only
  withdrawal the crypto request (manual), so `deposit_mode` manual/none hides Deposit and
  `withdrawal_mode` automatic/none hides Withdraw (`GATES.deposit/withdraw.rail`). `reward_currency`
  has no frontend surface; `region_restriction` is read by `services/region.js`.

## 3. Transport: the backend pulls

Owner panel: `GET /api/entitlements` with header `x-owner-key: <OWNER_SHARED_SECRET>`
(timing-safe compare; anything else → 401). Response:

```json
{ "data": { ...the document... }, "signature": "<hex HMAC-SHA256 of JSON.stringify(data) with OWNER_SHARED_SECRET>" }
```

Backend env (`backend/.env`): `OWNER_PANEL_URL=http://127.0.0.1:3085`, `OWNER_SHARED_SECRET`,
`OWNER_POLL_SECONDS=15`.

Hardening (the HMAC key is also the `x-owner-key` sent on every poll, so on its own it only
stops someone who cannot see a request):
- `OWNER_PANEL_URL` must be `https://` unless it is this host; an `http://` URL elsewhere is
  never called.
- The owner panel adds `issuedAt` inside `data` and, with `OWNER_SIGNING_KEY` (Ed25519 private,
  `owner-panel/.env.local`), a `signatureEd25519` (base64) over the same `JSON.stringify(data)`.
  With `OWNER_VERIFY_KEY` (the public half, `backend/.env`) set, the backend believes only that
  signature and requires `issuedAt`. `node owner-panel/scripts/owner-keys.mjs` writes both.
- The backend refuses an answer whose `issuedAt` is older than `OWNER_MAX_AGE_SECONDS` (300), a
  `version` lower than the copy it holds, and a `site` other than `OWNER_SITE_KEY` (else the
  cached copy's). A refused answer counts as an outage. After resetting the owner panel's data
  to a lower version, delete `backend/data/owner-entitlements.json`.
- The owner panel listens on 127.0.0.1 only and throttles `POST /api/auth/login` (429
  `TOO_MANY_ATTEMPTS`). Reach it over an SSH tunnel or VPN.

The **admin service** is the only poller. Every `OWNER_POLL_SECONDS` it fetches, verifies the signature,
and on a new `version`:
1. writes `backend/data/owner-entitlements.json` (gitignored),
2. applies the document to `site_features`: `enabled = features[key] !== false` (policies always on;
   their variant is the policy), `variant = resolveVariantKey(variants[key])` when it is a valid
   variant of that feature, else unchanged; `updated_by: 'owner'`; config/secrets untouched. The old
   template apply (only entitled features, never a business policy, never over a keyed-in
   integration) remains only as the fallback for a document with a `template` but no `variants`; the
   `template` itself (theme + preset) is still recorded in the `_template` row. `none` reads as off
   whatever the switch says; only rows that differ are written, so re-applying is a no-op; a feature
   whose on/off changed mirrors its linked siteconfig flag (as a staff save did). An unknown variant is
   logged and ignored. A document with no `variants` at all never switches anything (it would
   otherwise turn every entitled feature on). Code: `FeaturesService.applyOwnerDocument` /
   `applyOwner` / `onEntitlementsChange` (`services/admin/src/modules/features/features.service.js`);
   the poller keeps `variants` (strings only) in `current()`,
3. pushes the existing `siteConfigUpdated` / `featuresUpdated` socket events so open frontends refresh.

At boot admin-service also applies the cached document (`applyOwner`: its variants and on/off, or for
an older document its `template` if the row differs), so a failed apply is retried. With no
`OWNER_PANEL_URL` there is no poller and nothing is applied (the site is not managed). `SITE_TEMPLATE` (`backend/.env`) only seeds a database that has never had a
template.

**The nudge (live in seconds).** After a save that changed something, the owner panel calls
`POST <SITE_GATEWAY_URL>/api/v1/admin/entitlements/refresh` with header `x-owner-key:
<OWNER_SHARED_SECRET>` (same https-unless-this-host rule as the poll). admin-service compares the key
timing-safe (else `401`) and runs one poll **now**: the document is still fetched from the owner panel
and passes every check above, so the key alone cannot plant a document. Pulls run one at a time and at
most once a second; a call arriving meanwhile waits for one shared follow-up pull (never dropped, so two
saves a moment apart both go live). Answer
`{ version, source, changed }`, never a secret. A failed nudge never fails the save; the regular poll
picks it up. The save answer carries `live: { live, version?, reason? }`.
Test: `services/admin/src/modules/entitlements/__tests__/refresh.test.js`.

Failure: owner panel unreachable or bad signature → keep the last good copy (memory, then the file).
No copy at all (fresh install, owner panel never reached) → everything entitled, and log a warning
every poll. The other services ask the admin service:
`GET /internal/admin/entitlements` (internal key), cached 3 s (`ENTITLEMENTS_TTL_MS`) and dropped at once when
admin-service pushes (user-service's site-config push calls `invalidateEntitlements()`), through one helper
`packages/common/src/entitlements.js` (`getEntitlements()`, `isFeatureEntitled(key)`, `isFlagEntitled(key)`).

## 4. Enforcement (backend)

Features (incl. the policies): **owner-managed**. `site_features.enabled` / `variant` are written from
the document (§3 step 2, `updated_by: 'owner'`). Flags: effective = **entitled AND enabled by the
site**; `siteconfig` is never rewritten by an entitlement change, so switching an entitlement back on
restores the client's own choice.

- `PUT /api/v1/admin/features/:feature` (staff) that changes `enabled` or `variant` →
  `403 OWNER_MANAGED` `{feature}`. Saving config/secrets for the **current** variant (integration keys,
  e.g. the push notifications app id / api key) is still allowed: a body that repeats the current
  `variant` / `enabled` is not a change. A policy's `enabled` is ignored (it follows the variant).
  Error catalogue: `services/admin/src/modules/features/owner.errors.js`. Only when `OWNER_PANEL_URL`
  is set; without it (the hub default) staff keep every switch as before.
- `GET /api/v1/admin/features` (staff) adds `managedBy: 'owner'` (top level and on each row; `null`
  when there is no owner panel), and each row's `enabled` / `variant` as applied plus
  `on` = `enabled && entitled` (what players get).
- **The template is owner-only.** `PUT /api/v1/admin/features/template` (staff) always answers
  `403 TEMPLATE_OWNER_ONLY`; the owner sets it through the document's `template` (§2), and it applies
  only entitled features. `GET /api/v1/admin/features` (staff) returns
  `template: { key, label, setBy: 'owner' }` (or `null`); the site admin shows it read-only, labelled
  "Set by the platform". `GET /api/v1/admin/features/catalogue` lists the templates as
  `{ key, label, description, variants }`.
- No other site's name reaches anyone: template and variant labels and descriptions are generic, and
  the catalogue's internal `builtFor` (which site a variant was ported from) is never in a response.
- `PUT /api/v1/admin/site-config/global` and `/sports`: turning on a non-entitled flag →
  `403 NOT_ENTITLED` `{kind:'flag', key}`.
- `GET /api/v1/admin/features`, `/site-config/global` (staff): each item gains `entitled: boolean`.
- `GET /api/v1/admin/features/public`, `/api/v1/admin/site-config/public` (players): non-entitled
  reads as disabled / `false`.
- A feature with a linked siteconfig flag (catalogue `flag`: gift_cards → giftcards, bonus → bonus,
  vip → vipclub, affiliate → affiliate, spin_wheel → wheelspin, club_membership → clubmembership,
  raffles → lotto, casino_lobby → casino, banners → home_heroSection) is entitled only when both
  are; the refusal names whichever is off.
- Server guards, all `403 NOT_ENTITLED`:
  - `sitePolicy.assertAllowed` (deposit / withdrawal / business policies);
  - `sports`: the in-house feed (`sportsEnabled`), `POST /sports/bets`, and
    `POST /casino/sportsbook/init` and `/refresh` (the third-party book);
  - every game launch (`/casino/js-games/v1|v2/launch`, `/casino/gis/launch` and `launch-demo`,
    `/casino/catalogue/launch`, `/casino/x-casino/launch`, `/casino/seamless/launch`): a
    sportsbook or esports book needs `sports`; any other game needs `casino` plus its provider
    flag and its category flag (crash / livegames / slotsgames / lotterygames / cards; an `India…` type counts as cards)
    where the catalogue row names one; in-house games (`vendor = 'in-house'`) need `originals`;
  - the catalogue lists (`/casino/js-games/v1/games`, `/v1/games/search`, `/v1/collections/:c`)
    drop rows whose provider or category flag is off, and a list asked for by a switched-off
    vendor (`?vendor=in-house` with `originals` off) answers 403 (`games/gameEntitlement.js`);
  - the in-house engine (`GameEngine.placeBet`, every socket stake): `casino` + `originals` (+
    `crash` for the crash games); open rounds still settle and cash out;
  - the player routes of gift_cards, swap, vault, bonus, spin_wheel (also the public slices),
    races, vip, club_membership, affiliate, and `GET /admin/promotions` (promotions);
  - chat: the `ADD_CHAT` and `ADD_MESSAGES` socket events answer `{ status: false }` with that code.
- Not guarded on purpose: KYC (`/user/kyc`). Withdrawals require a verified KYC (under the default
  `withdrawal_requirements` policy), so closing
  KYC submission would strand a player's money; "not entitled" only hides the KYC screens.
- `GET /api/v1/admin/entitlements` (`config:read`): `{ features, flags, template, version, fetchedAt,
  source: 'owner'|'cache'|'default' }` for the site admin. Never any secret.

## 5. Site admin (`admin/`)

A copy of the hub's `site-admin` (`cfz/admins/site-admin`), taken as `agents/push-admin.mjs` would push it; this repo does not depend on the hub to run it.
Entitlement support is added **in the hub's `site-admin`** (generic, so the next push keeps it) and
tolerates a backend without the route (404 → everything entitled):
- sidebar: a nav item whose `flag` / feature is not entitled is hidden;
- Site Config → Features: shows the business model, deposits, withdrawals and every feature's variant
  and ON/OFF **read-only** ("Managed by the platform"; the backend marks it `managedBy: 'owner'`); no
  variant picker, switch or policy control. Staff may still save the config/secrets of the current
  variant (integration keys). A `403 OWNER_MANAGED` reads as a plain message.
- Feature flags screen: a non-entitled row shows "Not in your plan", locked, toggle disabled.
- live: `admin/entitlements` is re-read every 4 s and on window focus (`admin/site-config/global` every
  15 s); a new `version` refetches every `admin/features*` and `admin/site-config*` read, so the sidebar
  and the open screen follow an owner save without a reload.

## 6. Frontend (`frontend/`)

Reads `GET /api/v1/admin/site-config/public` and `GET /api/v1/admin/features/public` (already masked)
through one hook, and hides what's off: gift cards (page + links), wallet Swap tab, Vault Pro tab and
`/vault`, sports / esports entries, bonus, VIP, affiliate, promotions where a flag/feature exists. A
direct visit to a hidden page shows a plain "not available" state. `npm run theme:audit` stays clean.

## 7. Coins (the coin registry, migration 061)

Every coin the wallet knows has a row in the site table `currencies` (approved exception to §"Data
separation", like `site_features`: it holds the *applied* coin definitions, never the owner's
login, audit or document). Columns: `code` (PK, `^[A-Z][A-Z0-9]{1,9}$`), `kind` (fiat | crypto |
points), `decimals`, `builtin`, `owner_enabled`, `site_enabled`, `name`, `symbol`, `sort_order`,
`image_*` (bytes in the row, like banners), `networks` JSONB `[{key,name,enabled}]`, `retired`
(BJB), `managed_by`, `updated_by`, timestamps. Balances stay in the `credits.<code>` columns
(`CURRENCY_COLUMN`); the registry never turns a code into a column.

- **Owner:** the document's per-coin flags (`flags.btc`, `flags.inr`, …, and the crypto master
  `flags.cryptocoin` for every crypto coin) are applied to `currencies.owner_enabled`
  (`managed_by 'owner'`) by `FeaturesService.applyOwner` → `CurrenciesService.applyOwnerDocument`,
  at boot and on every new version. Owner panel screen `/coins` switches those flags (same
  document, same save + nudge); it reads the coin list from `GET /api/v1/admin/currencies/owner`
  (`x-owner-key`). Custom coins: see §7.1.
- **Site admin** (Finance → Coins, house staff only): `GET /api/v1/admin/currencies`
  (`config:read`), `PUT /api/v1/admin/currencies/:code` (`config:write`; strict allow-list
  `{name, symbol, sortOrder, enabled, networks:[{key,name,enabled}]}`; switching on a coin the owner
  has off → `403 NOT_ENTITLED {kind:'currency', key}`; a retired coin → `409 CURRENCIES_RETIRED`;
  network keys are the contract and cannot be added or renamed → `400 CURRENCIES_UNKNOWN_NETWORK`),
  `POST /api/v1/admin/currencies/:code/image` (PNG / WebP by magic bytes, SVG only without script,
  handlers, external references, DOCTYPE/ENTITY; ≤ 200 KB). Agent tree → `403 CURRENCIES_HOUSE_ONLY`.
  `enabled` mirrors the `siteconfig.<code>` flag column both ways (Feature flags screen stays in step).
- **Players:** `GET /api/v1/admin/currencies/public` (enabled coins, enabled networks, image URL
  `…/currencies/:code/image?v=<hash>`), pushed live as the `currenciesUpdated` socket event.
  The frontend's `wallet/coins.ts` merges it over its local list (fallback when the read fails).
- **Other services:** `currencyRegistry` in `@ibitplay/common` (`listCurrencies`, `describe`,
  `isEnabled`, `networksOf`), backed by `GET /internal/admin/currencies`, cached 5 s, fails open.
  The crypto module offers networks through it (`GET /api/v1/user/crypto/networks?coin=`; keys from
  `COIN_NETWORKS` in `crypto.constants.js`, names and on/off from the registry) and the withdrawal /
  deposit-address sockets refuse a switched-off coin or network (`CRYPTO_WITHDRAW_NETWORK_UNAVAILABLE`).

### 7.1 Custom coins (phase B, migration 065)

The owner creates coins the site did not have. **Owner panel** `/coins` → *Add coin*: code
`^[A-Z][A-Z0-9]{1,9}$` (not a built-in code; fixed once created), name, symbol, kind
crypto/fiat/points, decimals 0–8 (the wallet's money arithmetic is 8-place minor units), USD rate
> 0 (≤ 8 places), networks `[{key,name}]` for crypto (labels only), enabled. Edit and switch off
from the row; a coin is never removed (`400 COIN_DELETE_REFUSED`). Saved as
`coins: [{code, kind, name, symbol, decimals, usdRate, networks, enabled}]` in the document through
the usual review → save → nudge; one audit line per coin (`kind: 'coin'`, action
added / edited / enabled / disabled). Rules: `owner-panel/src/lib/entitlements/coins.ts`
(tests: `npm test` in owner-panel).

**Backend** (`CurrenciesService.applyOwnerDocument`, boot + every new version): inserts a missing
code as `builtin = false` (site switch on), updates only the owner's columns of an existing custom
row (kind, decimals, `usd_rate`, network keys — the site's name, symbol, image, network names and
switch stay), never writes a built-in row from `coins[]`, never deletes (a coin dropped from the
list or `enabled: false` → `owner_enabled = false`); the rate is upserted into `exchangerate`
(`managed_by 'owner'`, which the site's rate editor refuses: `409 EXCHANGE_RATE_OWNER_MANAGED`).
The default document (no owner reachable) leaves custom coins alone.

**Balances:** `wallet_balances (uid, currency → currencies.code, balance numeric(38,18) ≥ 0)`.
`wallet.repository.js` routes a custom code there (built-in codes keep their `credits` column):
the `credits` row is still the lock, then the balance row `FOR UPDATE`, credit = upsert
`balance + :amount`, debit = guarded `balance >= :amount`, same ledger + history rows. Balance reads
merge both (an enabled custom coin always, a disabled one only while it holds something — the
retired-coin rule); `credits.credit_limit` is never listed as a coin.

**Works with:** balances, ledger / history / statements, house-staff wallet adjust, swap (via the
USD rate; a switched-off coin is not a swap target), Vault Pro. **Refused** with
`422 CURRENCY_NOT_SUPPORTED_FOR_<FEATURE>` (`refuseCustomCurrencies` in `@ibitplay/common` on the
player routers, `assertCurrencySupportedFor` in sockets): deposits (crypto, fiat, PSP, payment
orders), withdrawals (crypto, fiat, bank details), P2P, third-party and in-house games (the in-house
engine settles on `credits` columns), sports. Agent-tree adjusts stay INR (`FLOAT_CURRENCY_ONLY`).
The player wallet hides custom coins on the Deposit / Withdraw tabs.

## 8. Branding (site name, metadata, logo)

Owner screen `/branding`. Saved in the document as `branding` through the usual review → save
→ audit (`kind: 'branding'`, one line per field; images by file name) → nudge. Absent = not
branded: the site keeps the UI's own title and logo. Rules: `owner-panel/src/lib/entitlements/branding.ts`
(tests: `scripts/branding.test.mjs`), mirrored by `backend/services/admin/src/modules/branding/branding.rules.js`.

```json
"branding": {
  "siteName": "jumboflush", "title": "Jumbo Flush — Casino & Sports", "titleTemplate": "%s · Jumbo Flush",
  "description": "…", "keywords": ["…"], "ogTitle": "", "ogDescription": "", "themeColor": "",
  "logo": { "file": "<sha256>.png", "type": "image/png", "bytes": 7959, "width": 576, "height": 128 },
  "mark": { "file": "<sha256>.png", "type": "image/png", "bytes": 4786, "width": 256, "height": 256 },
  "ogImage": null
}
```

- Text: siteName ≤ 40 (required once anything is set), title ≤ 70, titleTemplate ≤ 80 with `%s`
  exactly once, description ≤ 300, ogTitle ≤ 90, ogDescription ≤ 300, ≤ 20 keywords of ≤ 40; no
  `<`, `>` or control characters. themeColor `#RRGGBB` or empty. A bad field on save → `422`.
- **Uploads** `POST /api/owner/branding/upload?slot=logo|mark|ogImage` (session, multipart `file`):
  PNG / WebP by magic bytes (never the name or declared type); JPEG / GIF refused; SVG only when
  inert — XML declaration, comments and `<metadata>` are stripped, and anything with script,
  `on*=` attributes, `javascript:`, `<foreignObject>`/embeds, DOCTYPE/ENTITY, CDATA, `@import` or
  an `href`/`url()` other than `#id` or an inline `data:image` is **refused** (not rewritten).
  Logo ≤ 256 KB and wider than tall (1.5:1 or more; 4.5:1 fills the original's 288x64 box), mark
  ≤ 256 KB and square (0.8–1.25), OG image ≤ 1 MB, every side ≤ 4096. Stored as
  `owner-panel/data/branding/<sha256>.<ext>` (never overwritten or deleted). A save may only name
  files uploaded here (`422 BRANDING_FILE_MISSING`).
- **Transport:** the signed document carries the hashes. On a new version (and at boot)
  admin-service fetches each image it lacks from `GET <OWNER_PANEL_URL>/api/branding/asset/<file>`
  (`x-owner-key`, same https-unless-this-host rule) and keeps it in `backend/data/branding/` only
  when the bytes hash to the name and pass the same image checks (`branding.store.js`).
- **Backend reads:** `GET /api/v1/admin/branding/public` (anyone, no query string; an image URL is
  listed only once the file is here) → `{ version, branded, siteName, title, titleTemplate,
  description, keywords, ogTitle, ogDescription, themeColor, logoUrl, markUrl, ogImageUrl }`;
  `GET /api/v1/admin/branding/asset/<sha256>.<png|webp|svg>` (strict name, `immutable` one-year
  cache, `nosniff`, `CSP sandbox`); `GET /api/v1/admin/branding` (staff, `config:read`) = the same
  + `managedBy: 'owner'`. No write route. Site admin: Site config → Branding, read-only
  ("Managed by the platform").
- **Frontend (live mode only; fixture mode unchanged, the pixel reference):** `app/layout.tsx`
  server-renders title (+ template), description, keywords, Open Graph, theme colour, the favicon
  and the loader image (`#start-up`) from the public read; `services/siteBranding.js` reads it at
  runtime (build-time `NEXT_PUBLIC_SITE_*` as the fallback), caches it in localStorage
  `hge.branding` (painted by a `<head>` boot script before first paint), and swaps the logo in the
  header (desktop and mobile), footer, region pop-up, sports bet slip and the house provider's
  logo (`BC.GAME`), and the square mark in the signed-in mobile header — each in the original's
  box. Logo sources: `branding/` at the repo root (`build-logo.py`, `render-png.mjs`).
