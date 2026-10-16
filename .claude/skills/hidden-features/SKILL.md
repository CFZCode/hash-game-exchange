---
name: hidden-features
description: The inventory of bc.game features Parker567 (hash-game-exchange) does NOT offer and has hidden or removed from the frontend — Passkey sign-in, the One-time Code login tab, Weekly Raffle, Lottery, Predictions, Crypto Futures, Forum, Cwallet, all but five Originals — with every surface each one touched and how it is switched off. Read before restoring, porting or copying anything from the bc.game/hash.game reference into frontend/, before adding a login, settings or sidebar entry, and whenever the user says "hide X everywhere", "remove X from the frontend" or "X hamare paas nahi hai".
---

# Hidden features

**The rule:** the frontend is a copy of bc.game/hash.game (see `hash-ui-fidelity`), but the platform does not offer everything bc.game does. A feature we do not have is hidden on EVERY surface it reaches — sidebar, dialogs, settings tiles, routes, home rows, footer links, explore panel — never left as a button that does nothing. When you port a screen from the reference, check it against this list first, and do not bring a hidden feature back.

## How to hide one

1. **Find every surface.** `grep -rni '<feature>' frontend/src` (labels, route paths, icon names, i18n strings, `session.*` flags). Check `App.jsx` (routes and dialog routes), `layouts/MainLayout/Sidebar`, `Header`, `Footer`, `components/modals/*`, `pages/Settings/*`, `pages/Home/*`, `components/Explore/*`, `services/gates.js` ROUTES.
2. **Prefer a flag over deleting** when the UI may come back: add `<NAME>_ENABLED = false` to `frontend/src/config/hiddenFeatures.js`, list the surfaces in its comment, and wrap each surface in `{X_ENABLED && …}` (routes: `const xRoute = X_ENABLED && pathname === …`). Delete outright only when the user says the product is gone for good (Lottery was).
3. **A hidden route falls to the catch-all** (Home) or the parent layout; never leave a route that renders a dead page.
4. **Record it** in the table below AND under "Deliberate departures" in `.claude/skills/hash-ui-fidelity/SKILL.md` (the pixel check expects these diffs).
5. Lint the touched files; check each surface in the browser at desktop and phone width.

If the operator should be able to switch it on later, it belongs to the owner panel / site admin gates (`services/gates.js`, `/admin/features/public`, `/admin/site-config/public`), not to this file — this file is for features the platform cannot serve at all.

## Inventory

| Feature | Why | Surfaces | How |
|---|---|---|---|
| Passkey | No WebAuthn on the platform | Auth dialog "Sign In with Passkey" button (`components/modals/Auth/index.jsx`), Settings › Security Passkey tile (`pages/Settings/Security.jsx`), `/settings/passkey` dialog route (`App.jsx`, `components/modals/Passkey`) | `PASSKEY_ENABLED = false` in `config/hiddenFeatures.js` |
| One-time Code login | No OTP login | Sign-in tabs were Password / One-time Code | Replaced by **Username / Email** tabs (Username first), both password logins on the platform's `identifier` field (`components/modals/Auth/index.jsx` SignInForm). The OTP arm is deleted. |
| Social logins except Google | Only Google is offered (and no OAuth is wired yet) | Auth dialog Sign In "Log in directly with" row (X, Telegram, MetaMask, WalletConnect, LINE, Steam), Sign Up's "More" row, home hero's Telegram button | `SOCIAL_LOGINS = ['Google']` in `config/hiddenFeatures.js`; the hero's Google button opens /login/regist until OAuth exists |
| Deposit fiats except INR | Only INR deposits are offered | Deposit dialog Fiat tab's currency list (the owner also lists AED, BDT, EUR, MVR, NPR, PKR) | `DEPOSIT_FIATS = ['INR']` in `config/hiddenFeatures.js`, intersected with the owner's list |
| Feature Buy-in | No such list on this platform (empty) | Casino tab strip, casino lobby row, Explore category, the Themes chip | Removed from `pages/Casino/catalogue.js` (TABS, lobby rows, themes) and `components/Explore/catalogue.js` |
| Cwallet sign-in | No Cwallet integration | Auth dialog direct-login row | Not drawn (comment in Auth/index.jsx) |
| Weekly Raffle | No raffle | Promotions sidebar row, `/promotions/weekly-raffle` route + phone dialog, card in `pages/Promotions/promotions.js` | Removed; `pages/WeeklyRaffle` left on disk unrouted |
| Lottery | Not offered | Sidebar group, home LOTTERY card + Upcoming Lottery Draw, Explore search type, footer link | Deleted |
| Predictions | Not offered | Sidebar row `/predictions` | Deleted |
| Crypto Futures | Not offered | Sidebar group (5 rows), home UPDOWN card | Deleted |
| Forum | No forum | Sidebar bottom group external row | Deleted |
| Originals beyond five | Only Limbo, Diamonds, Keno, Mines, Plinko are offered ("Arrow bow" not in the catalogue yet) | Home Originals row, `/casino/brand`, sidebar flyout, Explore, Help pickers, direct `/game/<slug>` | `SHOWN_ORIGINALS` in `frontend/src/services/originals.js`. Planned to move to a site-admin Active toggle. |

The BetBy sportsbook (`pages/Sports`) is replaced rather than hidden — see `hash-ui-fidelity`.
