# Security checklist

The 19-point hardening list for Parker567, its status in this repo and on live, and what is left.
Update a row when its status changes; add the date and what proved it. Phase plan and reasoning:
the "Parker567 security hardening — phase plan" doc.

Status: **Done** (verified), **Open** (work left), **Skipped** (owner's call), **Verify** (not proven either way).

Last updated: 2026-10-25.

| # | Item | Phase | Status | Evidence / what is left |
| --- | --- | --- | --- | --- |
| 1 | Row level security | — | Done | No browser access to Postgres; services query it through the backend only, each route checks the caller. |
| 2 | Auth on every API route | — | Done | Per-audience guards from each service's module loader; `/internal/*` refused at the gateway (`backend/gateway/src/app.js`). |
| 3 | Never trust the frontend | — | Done | Owner flags re-checked on player routes (`backend/packages/common/src/entitlements.js`); refunds use the stored amount. |
| 4 | Rate limiting | — | Done | Gateway limiter + per-route limits (login, sportsbook init 20/min). Production refuses `RATE_LIMIT_ENABLED=false`. |
| 5 | Sanitize user input | 1 | Done | 2026-10-25: route validators strict. Promotion HTML sanitizer (`frontend/src/utils/sanitizeHtml.js`) now also drops `<svg>`/`<math>` (SMIL `javascript:` and mXSS bypasses). Blog uses an allowlist (`services/blog.js`). Both are staff-written and client-side only — a server-side pass (DOMPurify) is a later improvement. |
| 6 | Parameterized queries | 1 | Done | 2026-10-25 review: 348 SQL templates with `${}` + 19 `literal()` traced — every interpolation is a constant, a whitelist-mapped identifier or a server-computed number; request values go in as replacements. No string concatenation, no `queryRawUnsafe`. |
| 7 | Lock down CORS | 1 | Done | 2026-10-25 live: `Origin: https://evil.example` → 403 on GET, preflight and POST; `https://parker567.com` allowed. |
| 8 | HTTPS everywhere | 1 | Done | 2026-10-25 live: `http://` → 301 `https://` on parker567.com, admin, api. HSTS was missing on the API; now always sent (`createApp.js`), whatever `NODE_ENV` is — live after deploy. |
| 9 | Stop IDOR bugs | 2 | Partly done | 2026-10-25 fixed: sports open-bets / exposure routes (see Findings). Checked sound: KYC, fiat deposits, payment orders, notifications, sessions, whitelist, bank accounts, sports cancel/fancy/statement. Not yet traced: the rest of the TENEXCH sports code (socket placement, odds-events POSTs). |
| 10 | Debug mode off in prod | 1 | Open | Next apps on live are production builds (no dev/HMR markers). Stack traces are never sent in production. **Open:** the API runs without `NODE_ENV=production` (no HSTS on live), which also skips the boot checks in `productionGuards.js`. Run `node scripts/check-production-config.js` in `backend/` on the server; set `NODE_ENV=production` only once it prints "Safe". `X-Powered-By: Next.js` removed from all 3 apps (`poweredByHeader: false`). |
| 11 | CAPTCHA on public forms | 3 | Skipped | Owner's call, 2026-10-25. Sign-up and login have none. |
| 12 | Log admin actions | — | Done | `backend/services/admin/src/modules/audit` and the admin Activity log; KYC document views are logged. |
| 13 | Private storage buckets | 1 | Done | 2026-10-25: KYC files on server disk (`storage/kyc`, git-ignored), served only through `/user/kyc/documents/:kycId/:field` (owner only, else 404) and the staff route (permission + own tree + audit). Path escape refused. Live: both 401 without a login. |
| 14 | Hide admin pages properly | — | Done | Admin `RouteGate` refuses pasted URLs; the server checks permissions again. |
| 15 | Update vulnerable packages | 3 | Open | Next.js 16.2.6 (admin, owner panel), 16.4.0 (player site); a security upgrade is pending. `npm audit` gives no output here (pnpm installs) — run `pnpm audit --prod` per app. |
| 16 | Check file upload types | 2 | Done | 2026-10-25 review: SVG logo/coin uploads are refused unless clean (no script, foreignObject, `on*`, `javascript:`, external refs) and served with `CSP: default-src 'none'; sandbox` + nosniff. Other uploads sniff magic bytes and refuse SVG. |
| 17 | Claude security review | 1 | Done (first pass) | 2026-10-25: auth, IDOR, money, gateway, tokens, secrets, SQL, XSS, uploads. Findings below. No secrets tracked in git; JWT alg pinned; every provider callback verifies its signature before money moves. |
| 18 | Security headers | 2 | Open (half done) | API: helmet (HSTS, nosniff, frame SAMEORIGIN, no-referrer; CSP off by design). 2026-10-25: admin and owner panel send `X-Frame-Options: DENY`, `frame-ancestors 'none'`, nosniff, referrer policy (`next.config.ts`). **Open:** player site — CSP in report-only first (games, sportsbook iframe, scorecard). |
| 19 | Verify webhook signatures | — | Done | HMAC + constant-time compare in JSGames, Slotegrator, seamless, x-casino, aggregator callbacks. |

## Findings

Review results land here, newest first: date, severity, where, what, fix, status.

| Date | Severity | Where | Finding | Fix | Status |
| --- | --- | --- | --- | --- | --- |
| 2026-10-25 | High | sports `GET /sports/user/cricket/matched-bets/all` | Anyone, signed out, could read every bet on an event with usernames and IP addresses, no limit cap | Login + staff/owner only, `ip_address` excluded, limit ≤ 200 | Fixed |
| 2026-10-25 | Medium | sports `cricket/user-open-bets(-grouped)`, `POST matchexposures/match` | Read any player's open bets (signed out) or exposure (signed in) by passing their `user_id` | Login required; `user_id` forced to the token's own id | Fixed |
| 2026-10-25 | Medium | sports `/admin/sports/config/sports-lock/*` | An agent could set or lift sports locks on players/staff outside its tree | `lockScope` guard: target must be in the caller's tree | Fixed |
| 2026-10-25 | Medium | admin login `?next=` | `javascript:` / off-site redirect after a staff sign-in from a crafted link (owner panel: redirect) | Only same-site paths accepted | Fixed |
| 2026-10-25 | Medium | casino `POST /admin/casino/js-games/v1/transfer` | An agent with `wallet:credit` could move any player's balance to the provider (no tree check) | Now needs `wallet:adjust` (house level); no screen used it | Fixed |
| 2026-10-25 | Medium | Google sign-in | Skipped 2FA for accounts that have it on | Refused with "sign in with username, password and code" | Fixed |
| 2026-10-25 | Medium | socket (via gateway `wsProxy.js`) | Client-chosen `x-forwarded-for` beat the per-IP login limit and region block | Gateway resolves the client IP and sends only that | Fixed |
| 2026-10-25 | Low–Med | promotion HTML | SVG/MathML bypasses of the denylist sanitizer | `svg`, `math` blocked | Fixed |
| 2026-10-25 | Low | staff fiat deposit receipts | Any staff with `deposits:read` could open any receipt | Tree check like KYC | Fixed |
| 2026-10-25 | Low | refresh tokens | Two simultaneous refreshes with one token both succeed (reuse alarm misses it) | Conditional `replaced_by IS NULL` update — held: needs the player site to share one refresh across tabs first, or a race signs players out | Open |
| 2026-10-25 | Unsure | gateway | If the gateway port is reachable directly, `x-forwarded-for` can be forged past every per-IP limit (TRUST_PROXY=1) | Confirm the port only listens behind Apache | Verify |
| 2026-10-25 | Verify | x-casino | Legacy unsigned hash accepted only with `XCASINO_ALLOW_LEGACY_HASH=true` | Confirm it is off on the server | Verify |
| 2026-10-25 | Medium | live API | Services not on `NODE_ENV=production`, so the production boot checks (weak secrets, default DB password) never run | Run `scripts/check-production-config.js` on the server, fix what it lists, then set `NODE_ENV=production` | Open |
| 2026-10-25 | Low | frontend, admin, owner panel | `X-Powered-By: Next.js` header | `poweredByHeader: false` | Fixed |
| 2026-10-25 | Medium | admin, owner panel | Pages could be framed by another site (clickjacking on staff screens) | Frame-blocking and nosniff headers | Fixed |
| 2026-10-25 | Medium | live API | No HSTS header | Always sent by `createApp.js` | Fixed |

## How to re-check live

```bash
# CORS: a foreign origin must get 403
curl -s -o /dev/null -w "%{http_code}\n" -H "Origin: https://evil.example" https://api.parker567.com/api/v1/admin/site-config/public
# HTTPS redirect and headers
curl -sI http://parker567.com | head -3
curl -sI https://api.parker567.com/api/v1/admin/site-config/public | grep -iE "strict-transport|x-frame|nosniff"
# On the server, before setting NODE_ENV=production
cd backend && node scripts/check-production-config.js
```
