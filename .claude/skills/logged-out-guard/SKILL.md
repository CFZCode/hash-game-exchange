---
name: logged-out-guard
description: Prove that a signed-out visitor never sees a screen meant for signed-in players on the Parker567 player site. It opens every route signed out at phone and desktop width over CDP and flags any private screen that renders, or that fires player-API calls answered 401. Use when the user says "bina login koi screen nahi aani chahiye jo login ke baad aati hai", "logout me wallet dikh raha hai", "login guard check kar", or after adding a new signed-in route.
---

# Logged-out guard audit

## How the guard works (frontend/src/App.jsx)

- **The general guard:** `privateNeedsAuth` covers these routes when signed out:
  - `/wallet/*` (and the two detail dialogs)
  - `/notification`, `/free-plays`, `/vip-level`, `/bonus`, `/quests`
  - `/user/statistics`, `/settings/edit-profile`, `/settings/edit-avatar`

  For a signed-out visitor it does three things:
  - raises the **sign-in dialog** (`Auth mode="signin"`) over the page you came from;
  - blanks the route's own element (`/wallet` gets `<></>`; `/bonus` and `/quests` get `null`);
  - gates each dialog flag on `session.login`.
- **Older per-route guards** (each raises the same sign-in dialog):
  - `/deposit`, which opens the sign-up tab instead
  - `/user/enter`, `/favorite`, `/recent`, `/sports/my-bets`, `/sports/statement`
  - `/settings/*`, the whitelist form, phishing, passkey, verify, `/user-action/*`
- **Referral:** `/referral*` and `/affiliate` redirect to `/referral-exhibition` in the router, before the dashboard mounts. The dashboard's own redirect used to fire 4 affiliate reads that came back 401.

**A new signed-in route goes into the `privateNeedsAuth` regex** (or gets its own `…NeedsAuth` flag), **and into `PRIVATE` in `routes.mjs`.**

## Run it

1. In the CDP Chrome (port 9333), open a NEW page in a fresh isolated context, so it is signed out. For example, `new_page` with `isolatedContext: "loggedout"` at `http://localhost:5190/`.
2. Get its target id from `curl -s http://127.0.0.1:9333/json/list`. Always pass the id, never a URL fragment that other people's tabs could also match.
3. Run:

   ```bash
   node .claude/skills/logged-out-guard/guard-audit.mjs <target-id> http://localhost:5190 > logs/qa/guard-run.txt
   grep -v '"verdict":"OK"' logs/qa/guard-run.txt
   ```

The script visits `routes.mjs` PRIVATE plus PUBLIC at 390×844 (touch) and at 1280×900. It refuses to run if the page holds a session. Each route gets one verdict:

| Verdict | Meaning |
| --- | --- |
| `OK` | A private route shows the login wall (a visible password field, i.e. the sign-in dialog, or a `/login` path) or leaves for a public page. A public route renders without a wall. |
| `LEAK` | A private route rendered with no login wall. |
| `WALL+401` | Guarded, but private reads still went out and came back 401, so the page mounted before redirecting. |
| `WALLED-PUBLIC` | A public page asked for a login. |

## Results on 21 Oct 2026

- **Before:** 47 flagged.
  - The whole wallet rendered signed out at both widths, including its 401 reads such as `/user/wallet/ledger` and `/user/vault`.
  - The detail dialogs, profile editors, `/user/statistics`, `/notification`, `/free-plays` and `/vip-level` had no login wall.
  - `/bonus`, `/quests` and `/referral*` fired 401s before redirecting.
- **After:** `ALL OK`, 100 of 100 (50 routes × 2 widths).
