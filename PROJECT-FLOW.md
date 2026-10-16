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

## 4. Paisa / wallet

- Sabka balance `credits` table me hai: player = `uid`, staff = `staff_id`, owner = `staff_id` (OWNER).
- Owner sirf apne wallet me paisa add karta hai (Sports Exchange → Owner wallet / header "Add Balance").
- Owner kisi child ko paisa de (staff/agent ya parent wala player) → owner ke `credits.inr` se katta hai.
- Owner direct user ko paisa de → owner se **nahi** katta. Ye transfer_type `direct` ke naam se alag record hota hai.
- Har parent ↔ child move pe `mssports.point_ledger` entry likhi jaati hai.
- Sports (mssports): player ka sports paisa `public.credits.inr` me rehta hai. Staff/owner abhi bhi `mssports."Wallets"` pe hain.

## 5. Admin sidebar

- **Dashboard**: upar wala ek hi link, dono tab yahin hain.
- **Sports Exchange**: msadmin.zip ke screens (Market Analysis, Account, Bank, Reports, Settlement…). Casino ka kuch nahi. Iska alag dashboard ab nahi hai, wo main Dashboard ke Agent System tab me chala gaya.
