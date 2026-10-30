# Project Flow

Project kaise chalta hai: kaun se users hain, kaunsa data kahan dikhta hai, paisa kaise chalta hai.
Jab bhi koi flow badle ya naya rule aaye, yahan update karo. Kaam ka hisaab `WORKLOG.md`, fixes `FIXLOG.md`, baad ka kaam `PENDINGWORK.md`.

Last updated: 2026-10-30

---

## 1. Apps

| App | Folder | Kya hai |
|---|---|---|
| Player site | `frontend/` | Players ki site (casino + sports) |
| Admin panel | `admin/` | Owner / staff / agents ka panel |
| Owner panel | `owner-panel/` | Sirf owner ke tools (System Tracker, etc.) |
| Backend | `backend/services/*` | admin, user, casino, sports… services; gateway ke peeche |

## 2. Users ke do type

| Type | Pehchaan | Kahan dikhte hain |
|---|---|---|
| **Direct user** | `users.parent_staff_id IS NULL`: khud site pe signup kiya | Admin **Dashboard → Direct Users** tab |
| **Client user** | `parent_staff_id` set hai: kisi agent/staff ne banaya | Admin **Dashboard → Agent System** tab (Sports Exchange) |

- **Referral se signup = direct user.** Signup pe referrer ka code sirf `users.refree` me jaata hai aur affiliate team join hoti hai. `parent_staff_id` set nahi hota (`backend/services/user/src/modules/auth/auth.service.js` → `register`).
- **Client user kabhi referrer nahi ban sakta.** Agent-tree player ka referral code kahin kaam nahi karta (`backend/services/user/src/modules/affiliate/referrerResolver.js`).
- **Promotions sirf direct users ke liye.** Promotions campaigns, Bonus, Redeem codes, Gift cards, Spin wheel, VIP & club, Affiliate, Races, Rakeback, Welcome bonus, Bonus balances, Turnover Report — sab sirf `parent_staff_id IS NULL` wale users. Client user (Agent System) ko koi promotion / bonus nahi.

## 3. Admin Dashboard (`/dashboard`)

Ek hi page, do tab. Tab URL me rehta hai (`?tab=agent`).

### Direct Users tab
- **Sirf direct users ka data** (parent nahi hai): deposits, withdrawals, casino/sports GGR, turnover, registrations, top games/sports, countries, latest movements.
- Backend: `backend/services/admin/src/modules/dashboard/`
  - `dashboard.service.js` → `#scope`: sirf `parent_staff_id IS NULL` wale users.
  - `dashboardStats.service.js` → routes `directOnly: true` ke saath banate hain, isliye har query `parent_staff_id IS NULL` pe filter hoti hai.
- Ye data sirf platform root ke tree (owner / back office) ko dikhta hai. Agent ke tree me sirf client players hote hain, isliye agent ko ye tab khali dikhta hai.
- Permission: `reports:read`.

### Agent System tab
- Sports Exchange ka dashboard: login wale ka balance, exposure, credit/all/settlement/upper/down points, Sports P/L.
- Graph: points = upar bada All Pts card + har point ki simple gradient bar (minus laal), P/L = Total P/L + zero-centre bars (success / danger).
- API: `GET admin/exchange/user-reports/home`. View: `admin/src/views/exchange/ExchangeDashboard.tsx`.
- Permission: koi bhi wallet perm (`wallet:credit|debit|adjust`, `users:read`).

### Dhyan rakho
- `reports/pnlStats.service.js` (P&L report) bhi `DashboardStatsService` use karta hai, lekin **bina** `directOnly` ke. Isliye P&L report caller ka poora tree dikhata hai. Dashboard ka direct-only rule wahan nahi lagta.

## 3b. Users page (`/users`) — sidebar "Main" me Dashboard ke neeche

Reference: `admin-structure.zip` → adminpanel/src/components/users. Teen tab (`?tab=`):
- **Direct Users** (parent nahi) aur **Agent System** (parent hai, + Parent Staff column): 5 card + table, Risk column → Risk Management dialog / Balance Sheet dialog. Users / Overview (graphs) toggle.
- **Financial → Withdrawal** (zip jaisa): Withdrawal limit + Wagering bonus **read-only** ("Set in the owner panel"; sirf owner panel → Features & plan → **Withdrawals** tab badalta hai, signed document ka `withdrawalCap`; admin ka purana `PUT …/limit` hata diya, `withdrawal_control` ke limit columns ab padhe nahi jaate), per-user lock table (`GET admin/withdrawal-control/users`), Global Withdrawals ka sirf status (switch ab owner panel → Features & plan → Withdrawals → "Withdrawals enabled", signed document ka `withdrawalsEnabled`; admin ka `PUT admin/withdrawal-control/global` ab 403 `OWNER_MANAGED`, `withdrawal_control` table padhi nahi jaati; OFF = koi player kisi raaste se withdraw nahi kar sakta, check `withdrawBlock`), owner ke withdrawal rules read-only (owner panel → Features & plan → Withdrawals) + direct users ka per-user withdrawal lock.
- Risk dialog: Lock Controls switches (Account / Sports / Casino / Withdrawal) → `POST admin/locks` turant.
- Direct Users aur Financial sirf house staff ko; agent tree ko sirf Agent System.
- API (Users page ke liye naye bane; existing `players` / `balance-sheet` nahi badle): `GET admin/reports/user-list?channel&search&withdrawLocked`, `GET admin/reports/players/summary?channel`, `GET admin/reports/client-balance-sheet/:id`. Direct user ki sheet: `GET admin/reports/balance-sheet/:id`. Lock: `POST admin/locks`.
- **Balance sheet:** direct user → deposits/withdrawals/bets (`balance-sheet`). Client user (parent wala) → sab kuch `mssports.point_ledger` me hai, wahin se (`client-balance-sheet`).
- **Rule:** existing API kabhi mat badlo — naya endpoint banao.

## 3d. Transactions (sidebar group, zip jaisa)

- **Deposit** `/transactions/deposit`, **Withdraw** `/transactions/withdraw` — zip `DepositPage` / `WithdrawPage` jaisa tab bar (`?tab=direct|agent`):
  - **Direct Users**: tabs Crypto | Fiat | Manual (deposit aur withdraw dono). Fiat = gateway (PSP) fiat (deposit: Payment orders screen; withdraw: gateway payouts). Manual = bank transfer / manual payout requests + Super Admin ON/OFF (`admin/manual-payments`). deposits:read / withdrawals:read.
  - **Agent System**: zip `Deposit.tsx` / `Withdraw.tsx` jaisa table, data **point ledger** se — `GET admin/agent-ledger?direction=deposit|withdraw` (naya, users:read; `mssports.point_ledger` ki Credit / Debit / Settlement (Bank Deposite / Withdraw) / User creation entries, bet rows nahi; deposit = delta > 0 parent → child, withdraw = delta < 0 child → parent; parent = `settled_with_wallet_id` ka staff, caller ke tree me). Response `{ total, sum, rows }`.
- **Account Statement** = `/reports/statements` (`admin/accounts/statement`).
- Purane `/deposits/*`, `/withdrawals/*` URL ab bhi khulte hain, sidebar me nahi.

## 3e. Main → Turnover Report (`/turnover-report`) aur Redeem Codes

- Zip `TurnoverReport` jaisa, sirf direct users. Target = total deposit (INR) × TargetX; % = wager / target. Figures `withdrawalCapFigures` se.
- TargetX: `turnover_settings` (default, 3x) / `turnover_targets` (user ka apna + lock). "Update All TargetX" locked users ko chhod ke sabka. API `admin/turnover-report` (naya). Withdrawal rules pe asar nahi.
- Redeem Codes = purana `/redeem-codes`, ab sidebar Main me.

## 3f. Branch Management (owner switch)

- **Switch:** owner panel → Features & plan → **Branch management** (policy `branch_management`, `off` default). Off = admin menu chhupa, saari branch APIs 403 `BRANCH_DISABLED`, branch login band.
- **Branch** = `branches` table (migration 159) ka login, **staff row nahi** (staff tree, agent ladder, sports wallet me kabhi nahi dikhta). Super Admin banata hai: name + username + password.
- **Branch ke players** = normal **direct users** (`parent_staff_id IS NULL`) + `users.branch_id`. Site pe khud deposit / withdraw karte hain, promotions milte hain; Users → Direct Users me bhi dikhte hain. Branch sirf ID banata hai, paisa nahi hilata.
- **Super Admin** (sidebar **Branch Management**, `direct` + `reports:read`, writes `staff:write`, sirf Super Admin / uske executives): Branches `/branches` (create, rename, active/inactive, change password, View) → `/branches/:id` (branch jo dekhta hai wahi); Branch Report `/branch-report` (saari branches ek period me + total). API `admin/branches/*` (module `services/admin/src/modules/branches`).
- **Branch panel:** `/branch/login` → `/branch` (apna cookie `<SESSION_COOKIE_NAME>_branch`, apna sidebar, staff ka nahi). Sidebar: Dashboard (totals), Users (list + Create ID; player page `/branch/users/:id` = profile, balance + niche wale saare reports usi player ke), Deposits / Withdrawals (har rail, har status, payment method + reference + details — user-service ki rail list `/internal/user/history/branch`), Originals / Casino / Sports (statements module ki bet lists, `betsFor`; originals = in-house + Original Games), Statement (`mssports.point_ledger_direct`). Har report: date + Player ID filter. API `admin/branches/portal/*` (`public` audience, apna branch token `TOKEN_TYPES.BRANCH`, key admin key se derive). Super Admin ka `/branches/:id` me wahi sab tabs, player page `/branches/:id/users/:userId`.
- **Numbers:** Dashboard ka hi engine (`DashboardStatsService` + `branchId`), isliye branch ke figures Dashboard se kabhi alag nahi.
- **Inactive / password change / logout** = `branches.token_version` +1 → branch turant signed out. Inactive branch ke players normal khelte rehte hain (user, 2026-10-26).

## 3g. Whitelabel — copy ka company mode (Phase 1), parent ka panel (Phase 2), setup script (Phase 3), 2026-10-30

- **Kya hai:** parker567 (parent) ke Whitelabel panel se bani poori copy (apna folder, DB, ports, pm2). Copy ki `.env` me `WHITELABEL_MODE=true` + `WHITELABEL_LINK_KEY`; admin/frontend build me `NEXT_PUBLIC_WHITELABEL_MODE=true`. Parent pe ye sab OFF — parker567 me kuch nahi badla.
- **Company** = copy ka level-1 staff (Super Admin wali jagah; role ka naam create ke time wala hierarchy name). Saare Super Admin tabs, **lekin khud paisa nahi bana sakti:** `owner/add-balance`, `owner/add-direct-balance` → 403 `WHITELABEL_NO_SELF_FUNDING`; user wallet adjust me INR ke alawa coin ka credit bhi 403 (debit chalta hai; INR adjust direct user ko company ke Direct balance se katta hai).
- **Paisa ka raasta:** parent Super Admin ka **Direct balance → company ka Direct balance** (`POST whitelabel-link/credit`, transfer id se idempotent — retry dobara nahi deta). Company **Direct → Agent System** khud le jaati hai (`POST admin/exchange/owner/move-to-agent-system`, sirf whitelabel, transaction code; ek hi transaction me kat-ke-judta hai), phir agents ko normal D/W (katta hai).
- **First login:** company ka password parent ne rakha hai (`must_change_password`). Change Password screen pe naya password + **apna 6-digit transaction code** chunti hai (issued random code nahi).
- **Link API** (`admin modules/whitelabel-link`, copy pe): `GET status` / `GET theme` / `POST preview/redeem` bina key; baaki (`summary`, `credit`, `company-password`, `maintenance`, `palette`, `preview`) sirf `x-whitelabel-key` + direct call (gateway/Apache ka `X-Forwarded-For` ho to 401) — yani sirf usi server pe parent.
- **Off = maintenance:** `whitelabel_settings.maintenance` (migration 163). Gateway har 5 s padhta hai; ON pe players + staff ko 503 `SITE_MAINTENANCE`. Khule rehte hain: provider callbacks / payment webhooks, branding read, link routes, parent ka preview. Workers seedhe services ko call karte hain — settlement, feeds, crons chalte rehte hain.
- **Preview:** parent `POST preview` → ek baar ka code (60 s) → copy ke admin pe `/preview?code=` → company ki **read-only** session (token `ro`): har GET chalta hai, har write 403 `READ_ONLY_PREVIEW` (logout chhod ke). Password gate preview pe nahi lagta. Upar peeli patti "Read-only preview". Log nahi hota (user, 2026-10-30).
- **Custom colours:** `whitelabel_settings.palette` (13 `--p-*` tokens) → player site `GET whitelabel-link/theme` → `<html data-theme="custom">` + inline vars; owner template se upar. Icon sprites bc ke rang me hi rehte hain.

**Parent ki side (Phase 2):** sidebar **Whitelabel → Whitelabels** (`/whitelabels`, `direct` + `reports:read`; copy pe ye group hai hi nahi, backend bhi 403 `WHITELABEL_NOT_ON_A_COPY`). Backend `admin modules/whitelabels`, migration 164 (`whitelabels`, `whitelabel_jobs`, `whitelabel_transfers`).
- **New** (`/whitelabels/new`): name + short name (folder / DB / pm2 prefix), title, description, logo (PNG/WebP/SVG ≤ 256 KB), 3 domains (admin/api apne aap `admin.` / `api.` + site), template + custom colours (live preview), company: hierarchy name, name, email, password. Save = row `queued` + `whitelabel_jobs` create row (setup script Phase 3 me). Company password sirf bcrypt hash; link key secret box se sealed (TOTP_ENCRYPTION_KEY).
- **Detail** (`/whitelabels/:id`): setup / delete ka step + log (3 s me refresh), copy ke figures (`summary`: company Direct + Agent System, agents + players ka INR, players with balance, accounts), Send balance, transfers list, company password change, Switch off / on, Preview admin (naye tab me `https://<admin>/preview?code=`), colours edit, Delete.
- **Send balance:** parent Super Admin ka Direct balance pehle katta hai (`to_whitelabel`, ek transaction me `whitelabel_transfers` pending) → copy ko `p<id>` bhejta hai. Jawab nahi aaya = pending + `uncertain` (detail khulne pe 15 s baad dobara bhejta hai, "Send pending again" button bhi) — aisa transfer kabhi apne aap refund nahi hota. Copy ne seedha mana kiya (4xx) aur pehle koi bina-jawab try nahi = refund (`whitelabel_refund`).
- **Setup script (Phase 3):** `scripts/whitelabel/worker.mjs` (pm2 `parker-whitelabel-worker`, root) queued jobs ek-ek karke chalata hai, step + log job row me (panel dikhata hai). Create: DNS check (teeno domain is server ke IP pe, warna fail — A record lagao, "Run setup again") → folder `/var/www/main/<slug>` (marker `.whitelabel.json`), ports 6100+ ka free block (10), Redis DB 8–15 me free (max 8 whitelabel is machine pe) → parent ka `git archive HEAD` (commit hua code hi jaata hai) → `make-env.mjs` (naye secrets) + env patch (`WHITELABEL_MODE`, link key, parent se sirf allowlist: sports feed, JSGames v2, limits; payment / GIS / v1 / OG / SMTP / Telegram khaali) → `npm ci` ×4 → DB `wl_<slug>` apne role ke saath → migrate + seed + seed-data → company (seeded super admin = company, parent ka hash, must change), parent ke exchange rates, logo / naam / colours → `npm run build` ×3 → `pm2 start` + save → health → Apache 3 sites + certbot. Fail = status failed; "Run setup again" pehle apna adhoora kaam hata ke dobara banata hai. Delete: final `pg_dump` (`/var/www/main/whitelabel-archive/<slug>-<time>.sql.gz`) → `<slug>-*` pm2 apps → apni Apache sites + certs → DB + role drop → apna Redis DB flush → folder (marker match pe hi).
- Copy ke commands ko worker sirf PATH / HOME / LANG deta hai — parent ka DB env kabhi copy ke migrate / build tak nahi pahunchta. Copy ka owner panel login: `/var/www/main/<slug>/owner-panel/.env.local` (server pe).
- **Delete:** creating/deleting chal raha ho to nahi. Queued (shuru hi nahi hua) = job cancel + row deleted. Live = pehle Switch off, koi pending transfer nahi, aur paisa bacha ho (ya padh na sake) to "Delete it anyway" zaroori. Phir status `deleting` + delete job (script final DB export rakhta hai).

## 4. Paisa / wallet

- Sabka balance `credits` table me hai: player = `uid`, staff = `staff_id`, owner = `staff_id` (OWNER).
- **Owner (Super Admin) ke do balance hain:**
  - **Agent System balance** = `credits.inr` (staff_id = owner). Sirf children ke liye: staff/agent aur parent wale players.
  - **Direct Users balance** = `staff_balances.inr` (staff_id = owner). Sirf direct users ke liye (parent nahi).
- Owner dono me khud paisa add karta hai: header "Add Balance" → "Add to" select (`POST admin/exchange/owner/add-balance` / `add-direct-balance`). Direct wala staff_transfers me `owner_direct_topup`.
- Owner kisi child ko paisa de → `credits.inr` se katta hai.
- Owner direct user ko paisa de (refill / adjust / points settle) → `staff_balances.inr` se katta hai; direct user se le → wapas `staff_balances` me. Kam ho to 422 `INSUFFICIENT_FUNDS` (party `owner_direct`). Record: transfer_type `direct`, point ledger `Bank Deposite` / `Bank Withdraw`.
- Code: `backend/services/admin/src/modules/lords/ownerWallet.js`.
- Direct User wallet ka ledger: table `owner_direct_ledger` (har badlav, pehle / baad ka balance), API `GET admin/exchange/owner/direct-ledger`, admin header ke balance pe click → ledger popup.
- **Direct User Wallet** (Main → Wallets `/wallets`, zip ke Wallet page jaisa; API `/admin/direct-wallet/*`): Super Admin direct users ko kisi bhi currency me credit / debit karta hai, `staff_balances` se — non-INR `exchangerate` rate se INR value. Agent ke users pe 403. App ke deposit / withdraw / bonus bhi sirf direct users ke liye.
- Har parent ↔ child move pe `mssports.point_ledger` entry likhi jaati hai.
- Sports (mssports): player ka sports paisa `public.credits.inr` me rehta hai. Staff/owner abhi bhi `mssports."Wallets"` pe hain.

## 5. Admin sidebar

- **Dashboard**: upar wala ek hi link, dono tab yahin hain.
- **Sports Exchange**: msadmin.zip ke screens (Market Analysis, Account, Bank, Reports, Settlement…). Casino ka kuch nahi. Iska alag dashboard ab nahi hai, wo main Dashboard ke Agent System tab me chala gaya.
- **Agent Management** (alag sidebar section): Account List `/exchange/users` (har row pe rangeen button — "Deposit / Withdraw" = `admin/staff/transfer`, "Settlement" = points settle — zip wallet jaisa −/+ popup khulta hai; aur More), Bank `/exchange/bank`; Create Account Account List ke button se. Assign Agent hata diya.
- Sports Exchange me **Settlement** (`/exchange/settlement`: Match / Fancy / Void Bets tabs) aur **Global Settings** (`/exchange/settings`: Buffer Time / Commission / Max Odds / Auto Void / Virtual Bet Limits / Bet Limits tabs) ek-ek link hain; tab `?tab=` me.
- Hata diye (2026-10-16): Multi Login Account, Account List For Active Users. Executives sirf Access → Executives se.
- **Agent / master / client sirf Sports Exchange se** (Create Account, Assign Agent). Bahar ka agent system hata diya (2026-10-16): Staff & agents, Transfers, Agent users tab, Staff risk tab, Users page ka Create user. Bahar Team me sirf Executives (+ Marketing, Activity log).
- **Users** aur **User reports** sirf direct users dikhate hain (`channel=direct`, `parent_staff_id IS NULL`).
- Backend `admin/staff` me sirf `POST /transfer` aur `PATCH /password` bache hain.

- **Settings (zip jaisa):** Payment Methods `/payment-methods` (A-Pay live status, `GET admin/user/payments/payment-systems`, config:read), Site config (`/site-config/*`), Providers Priority `/providers-priority`, Vendor Priority `/vendor-priority`, Type Priority `/type-priority` (casino curation APIs). Casino → Lobby curation `/casino/curation` sirf lobby order.
- **Transactions → Deposit / Withdraw (Direct Users):** Deposit = Crypto | Gateway | Manual, Withdraw = Crypto | Manual; har screen me Listing pehle, Stats alag tab. Manual ke upar Super Admin ON/OFF (`admin/manual-payments`, table `manual_payment_control`) — OFF = direct user manual deposit / withdrawal request MANUAL_*_DISABLED.
- **Direct vs Agent lists:** mixed player lists ke upar `ChannelTabs` (Direct Users | Agent Users); APIs me optional `channel=direct|agent` (direct = `parent_staff_id IS NULL`). Promotions / vault / swap / deposit-withdraw lists sirf direct (`channel=direct`, tab nahi).
- **Point ledger — do alag tables (2026-10-17):** agent user sirf **INR** me khelta hai, direct user **kisi bhi currency** me — isliye dono ki entry alag table me, kabhi dono me nahi:
  - **Agent / child user** (`parent_staff_id` set, `agentPlayers.js`) → `mssports.point_ledger`: user + upar ki poori staff chain, har wallet ki row, `credits.all_point` badalta hai. Sports settlement v2 (settle / commission / void reversal), JS games callback aur GIS callback (CASINO, sirf INR).
  - **Direct user** (`parent_staff_id IS NULL`) → `mssports.point_ledger_direct` (migration 116): sirf uski EK row, us currency me jisme khela; `delta` signed, `balance_after` = us currency ka wallet balance (direct ka "all point" uska paisa hai, `credits.all_point` nahi chhuta). Sab save hota hai, kuch delete nahi: sports `BET_SETTLEMENT`, settle ke baad void (silent bhi) → `REVERSAL`, settle se pehle void (OPEN_BET / MARKET / FEED_SUSPENDED / AUTO_TIMEOUT) → `VOID` (delta 0), JS games + GIS ka har paisa-move callback (CASINO). Code: `sports/src/lib/services/directPointLedger.mjs`, `casino/src/modules/js-games/pointLedger.js`. Demo user, net-0 bet aur commission ki direct entry nahi.
  - **Player site statement:** agent user `POST /api/v1/sports/user/account-statement-v2` (point_ledger), direct user `POST /api/v1/sports/user/account-statement-direct` (point_ledger_direct; body `fromDate, toDate, reportType ALL|SPORTS|CASINO, currency?, search?, page, limit`; v2 jaisa shape + `currency`; agent user pe 403). Result popup dono ka `account-statement-v2/bets`.
- **Wager (Rollover / VIP / rakeback / admin):** sab `userwager` + `wager_activity` (user-service `/internal/user/wager/record|reverse`, USD). Casino paths har stake pe post karte hain; sports ke liye sports-worker ka job `wager:sports-sync` (`sports/src/modules/wager-report/sportsWagerSync.js`, har minute) settled (won/loss) bets ka stake `sports:<betId>` se record karta hai aur void hui counted bets reverse karta hai — exactly-once, purani bets bhi bhar deta hai. Open / settle se pehle void bet ka wager nahi.
  - **Admin se direct user ki bet history:** `POST /api/v1/admin/exchange/reports/direct-bet-history` (point_ledger_direct; body `clientId, fromDate, toDate (max 31 din), category ALL|SPORTS|CASINO, currency?, page, limit`). Har ledger row ek line (newest first) + SPORTS row pe `bet` (event, market, selection, side, odds, stake, result); void/reversal pe `void: true`. Sirf owner (`canIssueFunds`), sirf direct user (agent ka player → 404 not in tree). Market ke saare bets: `POST /admin/exchange/reports/statement/bet-detail` `{ betId, category: 'SPORTS' }`. Agent user ka admin statement: `POST /admin/exchange/reports/statement` (point_ledger). Code: `admin/src/modules/exchange-reports/directBetHistory.js`.
  - Agent/child create sirf `admin/exchange/accounts-admin/create`, deposit/withdraw sirf `admin/staff/transfer` (direct child, TENEXCH jaisa). Affiliate / promotions / deposit sirf direct users.
