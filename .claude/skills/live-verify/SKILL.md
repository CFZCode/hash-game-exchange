---
name: live-verify
description: Test Parker567 (hash-game-exchange) against the LIVE API and the Vercel frontend in real time — coins (only INR, USDT on TRC20, BTC), default currency, the five Originals, after-login slides, first-deposit bonus, promotions, blog entitlement, and the Vercel same-origin proxy (no CORS). Use after any change that touches live data or deployment, when the user says "live pe test kar", "real time test", "sab connect hai kya", "CORS error", or before telling the user something works on live.
---

# Live verify

Everything this project ships must work against the live backend, not just localhost.

| What | Where |
|---|---|
| Live API | https://api.parker567.com |
| Frontend (Vercel) | https://parker567.vercel.app (project `parker567`, team `parkashmi09s-projects`; deploy from `frontend/`: `vercel --prod --yes`) |
| Site admin (live) | https://admin.parker567.com |
| Owner panel (live) | https://admin.parker567.com/owner (this Mac's owner panel does NOT drive the live site) |

## 1. Run the smoke test

```bash
node scripts/verify-live.mjs            # API + Vercel defaults
WEB=http://localhost:5190 node scripts/verify-live.mjs   # same checks through the local frontend
```

Read-only. Exit 1 on a failure. Update the expectations in the script when the operator changes the intended state (e.g. more coins enabled).

## 2. Check it in a browser

Open the page with the chrome-devtools MCP in a NEW tab, at desktop and at phone width (`emulate` viewport `390x844x2,mobile,touch` and `440x956x2,mobile,touch`). For each page:
- `list_network_requests` (fetch/xhr): every API call is 2xx and, on Vercel, same-origin (`parker567.vercel.app/api/v1/...`).
- `list_console_messages` types error: no CORS errors, no 403 from the gateway.
- `document.documentElement.scrollWidth > innerWidth` is false (no horizontal overflow / zoom).

Signed-in pages (deposit, wallet, /referral/rules, signed-in home slides) need a player session; if the CDP browser is signed out, say so instead of claiming they work.

## How the pieces connect (so a failure is easy to place)

- **CORS:** the gateway allows only its own origins and refuses a POST with any other `Origin` (403 "Origin … is not allowed"). The Vercel build sets `API_PROXY_TARGET=https://api.parker567.com`; then the client's API base is `''` and `frontend/proxy.js` forwards `/api/v1/*` and `/ws/*` to the gateway WITHOUT Origin/Referer. Never add the Vercel host to the gateway's CORS list as the fix.
- **Coins:** `/admin/currencies/public` = owner plan ∩ site admin switches (site admin › Coins, `PUT admin/currencies/:code {enabled}`, per-network `{networks:[{key,enabled}]}`). The frontend reads the owner's `kind` and `image` for every coin; the deposit Fiat tab is cut to `DEPOSIT_FIATS` (hidden-features skill).
- **Owner plan:** the live backend polls the SERVER's owner panel every 15 s (`OWNER_POLL_SECONDS`). Changes made in this Mac's owner panel never reach live.
- **Site admin dev server** (`localhost:3080`) can hang after a while (Next dev OOM / stuck). Restart: `NODE_OPTIONS=--max-old-space-size=8192 node scripts/dev.mjs restart site-admin`.

## Writing to live

Live writes (coins, banners, promotions, bonuses) change real players' money or content: do them only on the user's explicit request, through the live site admin session, and say what was changed.
