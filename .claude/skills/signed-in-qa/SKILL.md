---
name: signed-in-qa
description: Test Parker567's SIGNED-IN screens (header currency picker, account menu, /user/enter, wallet panes incl. Rollover, deposit, game page Play overlay) with a real QA player — signed up on a LOCAL copy of the frontend wired to the LOCAL backend, never on live. Use when a change touches anything behind login, when the user says "signup karke test kar", "login karke check kar", "mobile view me signed-in dekh", or before claiming a signed-in screen works.
---

# Signed-in QA

Signed-in screens cannot be checked from a signed-out browser, and **a test account is never created on the live site** (https://parker567.vercel.app / api.parker567.com): that writes to production, and the browser-safety rules forbid creating accounts anywhere but a local dev host. So the QA player lives on the local stack.

| Piece | Where |
|---|---|
| Local backend gateway | http://localhost:4700 (`./run.sh`, `node scripts/dev.mjs status`) |
| QA frontend (copy of `frontend/`, API → local gateway via the same-origin proxy) | http://localhost:5195 |
| CDP Chrome | port 9333 (profile `~/.chrome-cdp-9333`) — the scripts open and close their own tabs |
| QA player credentials | appended to `CREDENTIALS.local.md` (gitignored) by the signup script; never print them |

## 1. Bring the stack up

```bash
curl -s localhost:4700/health | head -c 80          # local backend up?
cd backend && npm run -s db:status | grep '\[ \]'   # pending migrations? then: npm run db:migrate
# after a migrate or a git pull touching backend/: restart the services (scripts/dev.js has NO watcher)
for s in user admin casino sports user-worker sports-worker gateway; do node scripts/dev.mjs restart $s; done
.claude/skills/signed-in-qa/scripts/qa-frontend.sh   # copy + start :5195
```

**A signup that answers "Database error" is almost always a pending migration.** `logs/user.log` shows the SQL; Postgres code `42703` (column does not exist) on an `INSERT INTO credits` means the model has a column the local DB lacks (2026-10-16: `bdt`, twelve migrations behind after a teammate's pull). The same applies to the SERVER: deploy = `git pull && npm run db:migrate && pm2 restart …`.

## 2. Sign a QA player up (through the real form)

```bash
node .claude/skills/signed-in-qa/scripts/signup.mjs http://localhost:5195 "$PWD/CREDENTIALS.local.md" /tmp/signup.png
# → {"path":"/","signedIn":true,...}
```

It refuses any origin but `http://localhost:<port>`, generates the username/password itself, fills `/login/regist` (Username tab), submits, and appends the row to `CREDENTIALS.local.md` only when the sign-in sticks. The session tokens stay in the CDP profile's localStorage for `localhost:5195`, so every later tab is signed in.

## 3. Give the player data where a screen needs it (local DB only)

A brand-new player has nothing to show. Seed ONLY the local database, and only for the QA player's id (shown on `/user/enter` as `ID:`):

```bash
q(){ psql -h 127.0.0.1 -d parker567 -At -c "$1"; }
# Rollover: an approved deposit + some wagering (target = deposits x multiplier, default 3)
q "insert into fiat_deposits (user_id, amount, currency, status, transaction_id, admin_comment, created_at) values (<ID>, 100, 'USDT', 'approved', 'QA-LOCAL-1', 'local QA test row', now())"
q "insert into userwager (uid, wager) values (<ID>, 120) on conflict (uid) do update set wager = 120"
```

Never run these against the server.

## 4. Look at it — phone AND desktop

```bash
V=.claude/skills/signed-in-qa/scripts/vshot.mjs; O=http://localhost:5195
node $V $O/wallet/rollover 440 /tmp/roll.png
node $V $O/user/enter 440 /tmp/enter.png
node $V $O/game/mines-by-spribe 440 /tmp/game.png
# open the header currency pill (phone → bottom sheet titled "Currency")
node $V $O/ 440 /tmp/sheet.png "(() => { const p=[...document.querySelectorAll('div')].find(e=>String(e.className).includes('mr-1 flex flex-auto cursor-pointer')&&e.offsetParent); p&&p.click(); return !!p })()"
# desktop account dropdown (avatar, top right)
node $V $O/ 1440 /tmp/menu.png "(() => { const i=[...document.querySelectorAll('img')].find(i=>i.offsetParent&&i.getBoundingClientRect().top<60&&i.getBoundingClientRect().left>innerWidth-120); i?.closest('button,div')?.click(); return !!i })()"
```

`vshot.mjs <url> <width> <out.png> [js]` prints `{path, overflow, text}` — `overflow: true` means horizontal scroll/zoom on that page — then saves a viewport screenshot. Read every screenshot; a 200 is not a pass.

Checklist for a signed-in change:
- header pill, Deposit `+`, gift, bell, avatar fit at 390 and 440;
- currency picker: phone = bottom sheet, footer (View in currency / Hide Small) inside the sheet; desktop = popover;
- account menu / `/user/enter`: no hidden features (see `hidden-features`: Free Plays, Do Not Disturb, Passkey…);
- `/wallet/rollover`: turnover strip (Wagered / Required / Remaining) and the row's wagered / target;
- game page: the Play overlay card stays inside the frame;
- no `overflow: true`.

## What this does NOT prove

- **Live data.** Local coins/config differ from live (local site admin has every coin on; live is INR, USDT TRC20, BTC). Re-check live-only state with `live-verify` (`node scripts/verify-live.mjs`).
- **Parallel screenshots.** Five `vshot.mjs` tabs at once once rendered a page twice in the capture (a raster glitch, one dialog in the DOM). Re-shoot a suspicious frame alone before calling it a bug.
- **iOS Safari.** CDP Chrome is Blink; Safari-only bugs (e.g. a `calc()` max-width ignored inside an absolute flex overlay) need the user's phone. Say so instead of claiming it.
- **The user's own live account.** If the user signs up on live themselves, they test there; never ask for or type their password.

## Cleanup

`.claude/skills/signed-in-qa/scripts/qa-frontend.sh stop`. QA players and seeded rows stay in the local DB (harmless; ids are in `CREDENTIALS.local.md`). Delete only rows this run created, by id.
