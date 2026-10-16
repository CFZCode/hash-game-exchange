# Project Flow

Project kaise chalta hai: kaun se users hain, kaunsa data kahan dikhta hai, paisa kaise chalta hai.
Jab bhi koi flow badle ya naya rule aaye, yahan update karo. Kaam ka hisaab `WORKLOG.md`, fixes `FIXLOG.md`, baad ka kaam `PENDINGWORK.md`.

Last updated: 2026-10-16

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
- **Financial → Withdrawal** (zip jaisa): Withdrawal limit + Wagering bonus (ON/OFF + multiplier; `PUT admin/withdrawal-control/limit`; admin ne save kiya to wahi chalta hai, warna owner panel ka cap — `withdrawalCap.readAdminWithdrawalCap`), per-user lock table (`GET admin/withdrawal-control/users`), **Global Withdrawals ON/OFF** (`withdrawal_control`, `PUT admin/withdrawal-control/global`, sirf owner + transaction password; OFF = koi player kisi raaste se withdraw nahi kar sakta, check `withdrawBlock`), owner ke withdrawal rules read-only (owner panel → Policies → Withdrawal requirements) + direct users ka per-user withdrawal lock.
- Risk dialog: Lock Controls switches (Account / Sports / Casino / Withdrawal) → `POST admin/locks` turant.
- Direct Users aur Financial sirf house staff ko; agent tree ko sirf Agent System.
- API (Users page ke liye naye bane; existing `players` / `balance-sheet` nahi badle): `GET admin/reports/user-list?channel&search&withdrawLocked`, `GET admin/reports/players/summary?channel`, `GET admin/reports/client-balance-sheet/:id`. Direct user ki sheet: `GET admin/reports/balance-sheet/:id`. Lock: `POST admin/locks`.
- **Balance sheet:** direct user → deposits/withdrawals/bets (`balance-sheet`). Client user (parent wala) → sab kuch `mssports.point_ledger` me hai, wahin se (`client-balance-sheet`).
- **Rule:** existing API kabhi mat badlo — naya endpoint banao.

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
- **Direct User Wallet** (Users → Direct User Wallet, `/admin/direct-wallet/*`): Super Admin direct users ko kisi bhi currency me credit / debit karta hai, `staff_balances` se — non-INR `exchangerate` rate se INR value. Agent ke users pe 403. App ke deposit / withdraw / bonus bhi sirf direct users ke liye.
- Har parent ↔ child move pe `mssports.point_ledger` entry likhi jaati hai.
- Sports (mssports): player ka sports paisa `public.credits.inr` me rehta hai. Staff/owner abhi bhi `mssports."Wallets"` pe hain.

## 5. Admin sidebar

- **Dashboard**: upar wala ek hi link, dono tab yahin hain.
- **Sports Exchange**: msadmin.zip ke screens (Market Analysis, Account, Bank, Reports, Settlement…). Casino ka kuch nahi. Iska alag dashboard ab nahi hai, wo main Dashboard ke Agent System tab me chala gaya.
- **Agent Management** (alag sidebar section): Account List `/exchange/users` (D / W = Credit Deposit / Withdraw, `admin/staff/transfer`), Bank `/exchange/bank`; Create Account Account List ke button se. Assign Agent hata diya.
- Sports Exchange me **Settlement** (`/exchange/settlement`: Match / Fancy / Void Bets tabs) aur **Global Settings** (`/exchange/settings`: Buffer Time / Commission / Max Odds / Auto Void / Virtual Bet Limits / Bet Limits tabs) ek-ek link hain; tab `?tab=` me.
- Hata diye (2026-10-16): Multi Login Account, Account List For Active Users. Executives sirf Access → Executives se.
- **Agent / master / client sirf Sports Exchange se** (Create Account, Assign Agent). Bahar ka agent system hata diya (2026-10-16): Staff & agents, Transfers, Agent users tab, Staff risk tab, Users page ka Create user. Bahar Team me sirf Executives (+ Marketing, Activity log).
- **Users** aur **User reports** sirf direct users dikhate hain (`channel=direct`, `parent_staff_id IS NULL`).
- Backend `admin/staff` me sirf `POST /transfer` aur `PATCH /password` bache hain.
