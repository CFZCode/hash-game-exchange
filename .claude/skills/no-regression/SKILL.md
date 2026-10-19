---
name: no-regression
description: Guard against breaking the Parker567 admin, player site (frontend) or owner panel. Run BEFORE every commit/push that touches admin/, frontend/, owner-panel/ or backend/ — static checks, the tests of every touched module compared against the pre-change baseline, and a CDP smoke pass of the key screens. Use when the user says "functionality break na ho", "kuch toot na jaye", "push se pehle check kar", or whenever a change is about to be pushed.
---

# No-regression check

A change is not done until this passes. A failure that also fails on the old code is a pre-existing failure: report it, do not hide it, do not count it against the change.

## 1. Before editing: baseline

- Note which modules you will touch.
- Run their tests on the current code and keep the pass/fail counts (step 3 commands). Without a baseline you cannot tell a new failure from an old one.

## 2. Static checks (only the changed files)

| App | Command |
| --- | --- |
| frontend | `cd frontend && npx eslint <files> && npx vitest run` (all must pass) |
| admin | `cd admin && npx eslint <files> && npx tsc --noEmit -p .` (ignore `.next/` type noise) |
| owner-panel | `cd owner-panel && npx eslint <files> && npx tsc --noEmit -p . && npm test` |
| backend file | `node -e "require('./backend/services/<svc>/src/<file>.js')"` loads without error |

## 3. Tests of every touched backend module

- user / admin / casino: `cd backend/services/<svc> && TEST_DB_NAME=cfz_hash_game_exchange_test node --test --test-concurrency=1 src/modules/<module>/__tests__/*.test.js`
- sports: `DB_NAME=cfz_hash_game_exchange_test DB_USER=postgres DB_PASSWORD=postgres DB_HOST=127.0.0.1 node --test --test-concurrency=1 src/modules/*/__tests__/*.test.js`
- A new migration: run it on the test DB (up, down, up) before the tests.
- Compare with the baseline. The same failures before and after are fine. Any NEW failure blocks the push.
- To get a baseline after the fact: `git stash push <files>`, run, `git stash pop`.

Known pre-existing failures (re-check, they may change):
- admin: dashboard "converted to USD", P&L breakdown, audienceStats, the reports "P&L/stats against a database" checks, 7 in features/entitlements.
- user: withdrawCap "per currency…", tip/rain, 2 in fiat-deposit.
- owner-panel: siteUi "hash_game … matches the pins" (raffles).

## 4. Shared code: find every caller

Changing a shared component, hook, service or SQL helper breaks screens you did not open. Before pushing:
- `grep -rn "<name>" admin/src frontend/src owner-panel/src backend/services backend/packages` and check each caller still gets what it needs.
- Shared UI in admin: `components/ui/*` (dialog, select, table), `components/shared/*` (FilterBar, StatCard, DataTable). Shared in frontend: `components/shared/*`, `services/*`, `context/*`.
- A removed field / prop / route: grep the name in all three apps before removing.

## 5. CDP smoke pass (local servers, live API)

The local apps call `https://api.parker567.com` (`NEXT_PUBLIC_API_BASE` in each `.env.local`). Start them with `npm run dev` (frontend :5190, admin :3080, owner-panel :3085) and open each page in the CDP Chrome (port 9333). For each page: it renders (no blank page, no error boundary), no new red console errors, and the network calls answer 2xx.

- **Player site** (phone 390px and desktop 1280px): `/`, `/casino`, `/game/mines`, `/sports`, a `/sports/match/...`, `/wallet/balance`, `/wallet/deposit`, `/wallet/withdraw`, `/wallet/swap`, `/wallet/bet-history`, `/bonus`, `/vip-level`, `/referral`, `/user/enter`, `/settings/preferences`.
- **Admin**: `/dashboard` (both tabs), `/users`, `/wallets` (open History), `/transactions/deposit` (Crypto, Fiat, Manual), `/transactions/withdraw`, `/reports/statements`, `/casino/original-games/*`, `/site-config/features`, a player's Risk Management dialog.
- **Owner panel**: `/overview`, `/entitlements`, `/branding`.
- Only open what the change can reach, plus `/` of each app. Read-only: no live writes (deposits, approvals, locks, config saves) without the user's say-so; the betting budget (`qa-betting-budget`) still applies.

## 6. Report

Before pushing, say in one or two lines: which checks ran, the test counts before → after, which pages were smoke-checked, and anything not checked. Never claim a check that did not run.
