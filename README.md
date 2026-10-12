# hash-game-exchange

The client build of the Hash Games site, on the SmartBet (CFZ) platform. Site key
`hash-game-exchange`, database `cfz_hash_game_exchange`, template `bcgame` (= `emerald_dark`).

| folder | what | port |
|---|---|---|
| `frontend/` | The hash-games (bc.game rebuild) UI, copied exactly from `cfz/hash-games` at `ed2bece`. Being migrated to Next.js with the UI unchanged. | 5190 |
| `backend/` | The SmartBet hub backend (casino-sportsbook `91c27d9`): gateway + user/admin/casino/sports services + sports and user workers. | gateway **4700**; services 4701–4704; workers 4705 (sports), 4706 (user) |
| `admin/` | The site admin (hub `site-admin`), for the client's staff. | 3080 |
| `owner-panel/` | The owner panel: what the client is entitled to. **Ours, never handed to the client.** Listens on 127.0.0.1 only. | 3085 |
| `scripts/` | `stack.config.mjs` (site key, DB, ports), `make-env.mjs` (env files + fresh secrets), `dev.mjs` (run/stop the stack). | |
| `docs/` | `OWNER-PANEL.md` (owner panel ↔ backend contract), `frontend-api-contract.md` (what the frontend calls vs what the backend answers). | |
| `tools/ui-compare.mjs` | The pixel check against the reference UI. | |
| `.claude/skills/hash-ui-fidelity` | The rules that keep the UI identical. Read it first. | |

## First run

```bash
(cd backend && npm ci) && (cd admin && npm ci) && (cd owner-panel && npm ci) && (cd frontend && npm ci)
node scripts/make-env.mjs                 # backend/.env, admin/.env.local, owner-panel/.env.local; fresh secrets, never printed
cd backend
node packages/db/src/cli.js create        # cfz_hash_game_exchange
node packages/db/src/cli.js migrate
node packages/db/src/cli.js seed          # roles + bootstrap super admin (SEED_ADMIN_* in backend/.env)
node scripts/seed-data.js --demo          # platform config + demo cast; logins in backend/.demo-credentials.local.md (gitignored)
cd ../owner-panel && npm run seed:plan -- --apply   # owner plan: what the bcgame template uses, switched on
```

## Every day

```bash
./run.sh            # start everything, print the URLs   (= node scripts/dev.mjs start)
./run.sh status     # per-port status + gateway /health
./run.sh stop       # stop what run.sh started
./run.sh logs gateway
```

Logs go to `logs/<name>.log`, pids to `.run/`. A port already taken by something else is reported and
skipped, never killed. The frontend is started with `next dev -p 5190` once its `dev` script is Next.js
(Vite `--port 5190` until then) and gets `NEXT_PUBLIC_API_BASE=http://127.0.0.1:4700` unless set.

## Logins

- Site admin (http://localhost:3080, Staff tab): the bootstrap super admin `SEED_ADMIN_EMAIL` /
  `SEED_ADMIN_PASSWORD` from `backend/.env`, or a `demo_*@demo.local` staff account.
- Players: `demo_*` accounts, passwords in `backend/.demo-credentials.local.md`.
- Owner panel (http://127.0.0.1:3085): `OWNER_USERNAME` / `OWNER_PASSWORD` in `owner-panel/.env.local`.

None of these files is committed. Rotate every generated secret with `node scripts/make-env.mjs --rotate`.

## Sportsbook (mssports)

`backend/services/sports` runs the sports code exported from TENEXCH ("mssports"), moved in unchanged:
its 69 API routes keep their TENEXCH paths through the gateway (`/api/user/place`, `/api/internalsettle/...`,
`/api/admin/betting-config/...`), its tables live in Postgres schema `mssports` (migration 094), and the sports
worker (:4705) runs its four workers — odds, events, results, settlement — one process each. Layout and rules:
`backend/docs/STRUCTURE.md` §3a.

- Odds/events need `AVRKHUB_SPORTS_BASE_URL` + `AVRKHUB_SPORTS_KEY` in `backend/.env`; without them every bet is
  refused `FEED_UNAVAILABLE`.
- Players and staff sign in as usual; their mssports account and wallet are made on the first sports call
  (Super Admin = the mssports owner). The mssports wallet (`mssports."Wallets".cash`) is separate from the
  platform balance and starts at 0.
- Owner-only actions with a transaction password (void after settlement, market-lock toggles) check
  `mssports."Owners".transaction_password` / `mssports.staff.transaction_password`, which start empty.

## Before handover

- [ ] `RATE_LIMIT_ENABLED=true` in the delivered `backend/.env` (the `make-env.mjs` default; a dev stack
      made with `--dev-no-rate-limit` has it `false` — check with `grep RATE_LIMIT_ENABLED backend/.env`
      and restart the backend after changing it).

## Owner panel ↔ backend

admin-service pulls `GET http://127.0.0.1:3085/api/entitlements` every 15 s (`OWNER_PANEL_URL`,
`OWNER_SHARED_SECRET`, `OWNER_VERIFY_KEY` Ed25519, `OWNER_SITE_KEY=hash-game-exchange`) and keeps the
last good copy in `backend/data/owner-entitlements.json`. See `docs/OWNER-PANEL.md`.

## Tests

```bash
cd backend && TEST_DB_NAME=cfz_hash_game_exchange_test npm test
cd owner-panel && npm test
```
