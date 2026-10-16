# Worklog

Har kaam ke baad yahan entry likhte hain — kya kiya, kyun kiya, kaunsi files badli.
Newest entry sabse upar.

Format:

```
## YYYY-MM-DD — Short title
**Kya kiya:** ...
**Kyun:** ...
**Files / jagah:** path/to/file, ...
**Notes / pending:** ...
```

---

## 2026-10-16 — Users → Financial poora reference jaisa + Risk dialog ke lock toggles
**Kya kiya:** Financial → Withdrawal ab admin-structure.zip jaisa: Global Withdrawals ON/OFF, Withdrawal limit (ON/OFF + multiplier × deposits, Save), Wagering bonus (ON/OFF + "bonus up to"), example line, Direct users / Withdrawal locked cards, Per-user withdrawal lock table (User · Phone · INR balance · Deposited · Wagered (+bonus) · Withdrawn / max · Joined · Withdrawals · Lock switch, All/Locked, search). Har setting change transaction password confirm (sirf owner). Naye: migration 109 (`withdrawal_control` me limit columns), `PUT admin/withdrawal-control/limit`, `GET admin/withdrawal-control/users`; `GET admin/withdrawal-control` ab limit + ginti bhi deta hai (ye API aaj hi naya bana tha). Enforcement: `withdrawalCap.readAdminWithdrawalCap` (common) — admin ne save kiya ho to wahi, warna owner panel; user-service `capSettings` isi se. Cap figures SQL (deposited / withdrawn / wagered) user-service se `@ibitplay/common` withdrawalCapFigures me shift (user ki withdrawCap.js wahi exports deti hai). Risk Management dialog: Lock Controls ab reference jaise switches (Account / Sports bet / Casino / Withdrawal, `POST admin/locks` turant) + Lock Account / Unlock Account. Backend restart kiya.
**Kyun:** User: "financial system jaisa zip me hai sab kuch, on/off settings wagera" + "direct user me balance sheet aur risk management same zip jaisa, toggle wagera".
**Files / jagah:** backend/packages/db/migrations/109-withdrawal-control-limit.js, backend/packages/common/src/{withdrawalCap.js,withdrawalCapFigures.js,index.js}, backend/services/user/src/modules/withdraw-requirements/{withdrawCap.js,withdrawRequirements.js}, backend/services/admin/src/modules/withdrawal-control/*, admin/src/views/players/{users/FinancialTab.tsx,RiskManagement.tsx}
**Notes / pending:** Tests: withdrawal-control 5/5, user withdraw-requirements + withdrawBlock 31/31. Reference ka "TargetX / monitoring" flag hamare DB me nahi — nahi kiya. Betting-suspended toggle (accounts/status + password) Risk dialog se hata, sirf dikhta hai.

## 2026-10-16 — Users → Financial: Global Withdrawals ON / OFF (reference jaisa)
**Kya kiya:** Naya table `withdrawal_control` (migration 108, ek row) + naya admin module `withdrawal-control`: `GET admin/withdrawal-control` (reports:read) aur `PUT admin/withdrawal-control/global` {enabled, transactionPassword} (wallet:adjust + owner, audit `withdrawals.global`). Rok: `@ibitplay/common` withdrawBlock.assertWithdrawAllowed — switch OFF ho to har PLAYER ka har withdrawal raasta (fiat, crypto, gateway payout, P2P sell, tip) 403 `WITHDRAW_DISABLED`; staff/agent cash-out pe asar nahi; table na ho to ON. Admin Financial tab me "Global Withdrawals" card (ON/OFF chip + switch, last change, OFF pe laal alert, transaction password confirm). Backend restart kiya (dev.js watch nahi karta).
**Kyun:** User: "finance me withdrawal on/off wala nahi kiya — jaisa admin-structure.zip me hai".
**Files / jagah:** backend/packages/db/migrations/108-withdrawal-control.js, backend/packages/common/src/withdrawBlock.js, backend/services/admin/src/modules/withdrawal-control/*, admin/src/views/players/users/FinancialTab.tsx
**Notes / pending:** Tests: withdrawal-control + locks/withdrawLock 15/15, user fiat-withdraw/withdrawBlock 9/9. Withdrawal limit / wagering bonus abhi read-only (owner panel policy).

## 2026-10-16 — Users page: naye APIs (existing wapas original), client balance sheet point ledger se
**Kya kiya:** User rule: existing API mat badlo, naya banao. `admin/reports/players` (listPlayers) aur `admin/reports/balance-sheet/:id` wapas bilkul original. Naye: `GET admin/reports/user-list` (players jaisa + email, phone, country, parentStaff, locks, email/phone search, `withdrawLocked` filter) aur `GET admin/reports/client-balance-sheet/:userId` (client user = parent wala: sheet `mssports.point_ledger` se, INR; Credit/Debit → Agent, Bank Deposite/Withdraw → Deposit/Withdrawal, bet rows → Sports; balance = all_point_after; reconcile = credits.all_point vs SUM(delta)). Users page tables `user-list` use karte hain; Balance Sheet dialog direct user pe purana `balance-sheet`, Agent System user pe `client-balance-sheet` (currency select chhupa). `players/summary` naya hi tha.
**Kyun:** User: "direct user ki balance sheet / risk jaisi hai waisi; client management users ka sab point ledger me save hai, wahan se nikaalo" + "existing api me kuch change mat karna".
**Files / jagah:** backend/services/admin/src/modules/reports/{reports.service.js,reports.validators.js,controllers/index.js,routes/admin.routes.js,__tests__/reports.test.js}; admin/src/views/players/{PlayersList.tsx,users/*}
**Notes / pending:** reports tests 27/27. Memory: no-change-existing-api.

## 2026-10-16 — Users section reference (admin-structure.zip) jaisa + sidebar "Main"
**Kya kiya:** `/users` ko reference admin ke components/users jaisa banaya. Teen tab: Direct Users, Agent System, Financial (Direct aur Financial sirf house staff ko). Direct/Agent: 5 card (Total, Active = deposit kiya, Deposits, Withdrawals, Locked) + table (# · User avatar · Risk · Email · UID · Phone · [Parent Staff] · Deposits · Withdrawals · PNL · Status) + Users/Overview toggle (purane graphs). Risk column: Risk Management dialog (hamara pehle wala) aur naya Balance Sheet dialog (`admin/reports/balance-sheet/:id`: cards, reconcile line, Date/Type/Description/Credit/Debit/Balance, currency, Live 10s refresh, paging). Financial → Withdrawal: owner ke withdrawal rules (requirements, deposit cap, wagering bonus) read-only + direct users ka per-user withdrawal lock (All / Locked filter, Block/Unblock). Backend: `admin/reports/players` rows me email, phone, country, parentStaff, locks; search email/phone; `withdrawLocked` filter; naya `GET admin/reports/players/summary?channel`. Sidebar: naya "Main" group = Dashboard + Users.
**Kyun:** User: "admin-structure.zip ke user section jaisa (balance sheet, risk management, finance) apne me karo; main ke andar dashboard aur users sidebar me".
**Files / jagah:** admin/src/views/players/{PlayersList.tsx,UserStatusOverview.tsx,users/*}, admin/src/configs/navConfig.tsx, backend/services/admin/src/modules/reports/{reports.service.js,reports.validators.js,controllers/index.js,routes/admin.routes.js,__tests__/reports.test.js}
**Notes / pending:** Reference ke ye nahi kiye: Agent tab ka Staff view + Staff Risk dialog, Download report / Casino report / Sports report dialogs, global withdrawals ON/OFF (hamare yahan owner panel ka kaam). reports tests 27/27 pass.

## 2026-10-16 — Users page: teen section (Direct Users / Agent System / Financial)
**Kya kiya:** `/users` pe line-tabs (`?tab=agent|finance`): Direct Users (`channel=direct`) aur Agent System (`channel=agent`) — dono me "User List" (default) + "Overview" (UserStatusOverview ab `channel` prop leta hai) aur har row me Risk / Sheet button. Financial (`channel=all`) — User, Type (Direct/Agent), Balance, Deposits, Withdrawals, Net (dep − wd), Risk / Sheet. Export CSV har section ka apna (table toolbar me). Backend nahi badla — `admin/reports/players` pehle se channel leta hai.
**Kyun:** User: "user wale section me teen section honge: direct user, agent system aur finance".
**Files / jagah:** admin/src/views/players/PlayersList.tsx, admin/src/views/players/UserStatusOverview.tsx

## 2026-10-16 — Users page: User List tab + Risk / Sheet buttons
**Kya kiya:** `/users` (PlayersList) me tab: "User List" (default, direct users ki table upar) aur "Overview" (purane graphs). Har row me "Risk" aur "Sheet" button → `/users/:id?tab=risk` / `?tab=sheet`. Pehle 3-tab (Direct / Agent / Financial) wala naya page aur `players/summary` backend banaya tha — user ne kaha "section theek hai, bas list option do", isliye wo hata diya (backend wapas pehle jaisa).
**Kyun:** User: direct user ki list bina neeche scroll kiye dikhe; direct user ka risk management aur balance sheet dikhe.
**Files / jagah:** admin/src/views/players/PlayersList.tsx

## 2026-10-16 — Account List: D / W = Credit Deposit / Withdraw; CR modal aur Assign Agent page hataye
**Kya kiya:** Account List ke D / W ab points-settle ki jagah Credit Deposit / Credit Withdraw popup kholte hain (`admin/staff/transfer`, zip ka CreditForm). CR (naam ke bagal) pe click wala "Credit Activity" modal hataya — ab sirf number. `CreditActivityDialog.tsx` → `CreditDialog.tsx` (ek mode ka popup + CreditHistory, jo More dialog use karta hai). `SettleDialog.tsx` hataya; `fmt` / `SETTLE_INVALIDATE` / `settleApi` (Bank page) `accountMoney.ts` me. Assign Agent page hataya: route, view, sidebar link, UserPlus icon; backend `GET /exchange/accounts-admin/user-creation.csv` + `userCreationCsv.js` + validator + test.
**Kyun:** User: "D / W me settlement wali API lagi hai, deposit / withdraw wali laga lo; naam ke bagal wala deposit / withdraw modal hata do" aur "/exchange/assign-agent page hata do".
**Files / jagah:** admin/src/views/exchange/{AccountList.tsx, CreditDialog.tsx, accountMoney.ts, Bank.tsx, MoreDialog.tsx}, configs/navConfig.tsx; backend exchange-accounts/{routes/admin.routes.js, exchangeAccounts.validators.js, __tests__/exchangeAccounts.test.js}.
**Notes / pending:** Live: staff/transfer deposit 100 / withdraw 40 → 201; csv route 404; assign-agent 404; Account List / Create / Bank 200. Tests 21 pass. Backend restart kiya.

## 2026-10-16 — Sidebar me naya "Agent Management" section (3 link)
**Kya kiya:** Naya sidebar group "Agent Management" (collapsible) — 3 link: Account List (`/exchange/users`), Assign Agent (`/exchange/assign-agent`), Bank (`/exchange/bank`). Sports Exchange group se ye teeno hataye. Create Account (`/exchange/users/create`) Account List ke button se. (Pehle galti se ek tabs wala page `/exchange/agents` banaya tha — user ne kaha sidebar me chahiye, wo page + TabbedPage ke hidden/permission extras hata diye; purane 4 page git se wapas, `variant` prop hataya kyunki AccountList ab nahi leta.)
**Kyun:** User: "agent management ke andar account list, bank, assign agent — sidebar me dikhne the, switch tab me nahi".
**Files / jagah:** admin/src/{configs/navConfig.tsx, app/(pages)/exchange/{users,users/create,assign-agent,bank}/page.tsx, components/shared/TabbedPage.tsx, views/exchange/AccountList.tsx, views/exchange/accounts/CreateAccount.tsx}
**Notes / pending:** Live: teeno + create + drill-down 200, `/exchange/agents` 404. Settlement / Global Settings tabs waise hi.

## 2026-10-16 — Sports Exchange sidebar chhota: Settlement aur Global Settings tabs me
**Kya kiya:** Sidebar me Settlement ka sub-menu (3 link) → ek link `/exchange/settlement`, tabs: Match Settlement / Fancy Settlement / Void Bets. 6 alag setting links → ek "Global Settings" `/exchange/settings`, tabs: Buffer Time / Commission / Max Odds / Auto Void / Virtual Bet Limits / Bet Limits. Tab URL me `?tab=`; sirf khula tab render (baaki ki API nahi chalti). Naya shared `components/shared/TabbedPage.tsx`. Purane 9 routes hataye; AutoVoid aur owner-panel System Tracker ke links naye URL pe. Bekaar nav icons hataye.
**Kyun:** User: "sports exchange ke andar kuch hi section… settlement ke andar tab… global setting me buffer time se bet limit tak tab mode, jagah bachane ke liye".
**Files / jagah:** admin/src/{components/shared/TabbedPage.tsx, views/exchange/settlement/SettlementTabs.tsx, views/exchange/settings/GlobalSettings.tsx, app/(pages)/exchange/{settlement,settings}/page.tsx, configs/navConfig.tsx, views/exchange/settings/AutoVoid.tsx}, owner-panel/src/views/system-tracker/SystemTracker.tsx
**Notes / pending:** Live 200 (har tab), purane URL 404. Account / Assign Agent / Bank / Reports / Events abhi sidebar me hain — user se poochha.

## 2026-10-16 — Users → Agent System tab se Deposits / Withdrawals / PNL hataye
**Kya kiya:** `views/players/users/UsersTable.tsx`: agent channel me "Total Deposits" / "Total Withdrawals" cards aur Deposits / Withdrawals / PNL (deposit − withdraw) columns nahi dikhte; Direct Users tab me waise hi. Backend check: app ke deposit / withdraw / promotions routes pe pehle se `denyAgentPlayer` laga hai (fiat, payment-orders, p2p, crypto, bonus, affiliate…) — kuch badla nahi.
**Kyun:** User: "agent system ka user kabhi bahar se deposit / withdraw nahi kar sakta, balance system ke andar se milta hai — agent system me deposit / withdraw dikhna hata do".
**Files / jagah:** admin/src/views/players/users/UsersTable.tsx
**Notes / pending:** tsc + eslint clean.

## 2026-10-16 — Direct User Wallet (admin-structure.zip jaisa, kisi bhi currency me)
**Kya kiya:** Naya module `direct-wallet` (purani APIs nahi chhedi): `GET admin/direct-wallet/currencies` (1 unit = kitne INR), `GET /users` (sirf direct users + har currency ka balance), `POST /adjust` (credit / debit, transaction password zaroori), `GET /users/:id/history` (currency filter). Credit = Super Admin ke Direct User wallet (`staff_balances`) se INR value katti hai (`exchangerate`: rate(coin) / rate(INR), paise tak), debit = user se lo, INR wapas wallet me. Agent ke user (parent wala) pe 403. Sab ek transaction me: owner ledger (`owner_direct_ledger` + nayi columns currency / currency_amount / rate, migration 108-owner-direct-ledger-currency), user ka `credits.<coin>`, `credits_ledger` (ADMIN_CREDIT / ADMIN_DEBIT), `wallet_history`. Admin: Users → **Direct User Wallet** (`/direct-wallet`, wallet:adjust) — zip jaisa table: User, UID, Currency select, Balance, History + Manage Funds (Transaction Password, Debit Funds, Credit Funds, ≈ ₹ preview). Header ledger popup me "User got" column.
**Kyun:** User: direct user ko zip ke admin jaisa kisi bhi currency me deposit; staff_balances wallet sirf direct users ke liye; non-INR pe rate se INR kate (user ne chuna).
**Files / jagah:** backend/services/admin/src/modules/direct-wallet/* (naya, test ke saath), lords/ownerWallet.js (writeLedger + list me currency), packages/db/migrations/108-owner-direct-ledger-currency.js; admin views/players/DirectUserWallet.tsx, app/(pages)/direct-wallet/page.tsx, configs/navConfig.tsx, views/exchange/{OwnerDirectLedger.tsx,types.ts}.
**Notes / pending:** Tests 16 pass (direct-wallet + tools). Live: 1000 add → 2 USDT credit (₹166.67 kata) → agent user 403 → 1 USDT debit (₹83.33 wapas). Dusre session ki bhi ek migration 108 (`108-withdrawal-control`) hai — naam alag, dono chal gayi. Finance → Wallets ka purana Adjust (`admin/user/wallet/adjust`) abhi bhi owner ko kisi bhi user ko non-INR bina kaate dene deta hai — user se poochha.

## 2026-10-16 — Super Admin ke Direct User wallet ka ledger
**Kya kiya:** Nayi table `owner_direct_ledger` (migration 107): wallet (`staff_balances`) ke har badlav pe ek row — type (add / user_deposit / user_withdraw / points_settle), credit/debit, amount, pehle aur baad ka balance, direct user, note, time. `lords/ownerWallet.js` ke `credit/debitOwnerDirectBalance` hi likhte hain (usi transaction me, `RETURNING inr` se naya balance), callers (add-direct-balance, refill, adjust, points settle) type + user + note bhejte hain. Nayi API `GET admin/exchange/owner/direct-ledger` (wallet:adjust, sirf owner, limit/offset/from/to). Admin: header ka balance badge ab button — click pe "Direct User wallet ledger" popup (OwnerDirectLedger.tsx). Add balance API pehle se thi: `POST admin/exchange/owner/add-direct-balance`.
**Kyun:** User: "super admin ke wallet me kab kya add kiya uska ledger dikhe" — ye main Direct User wallet hai.
**Files / jagah:** backend/packages/db/migrations/107-owner-direct-ledger.js, lords/ownerWallet.js, lords/lords.service.js, exchange/{pointsSettle.js, exchange.service.js, exchange.validators.js, routes/admin.routes.js}; admin views/exchange/{OwnerDirectLedger.tsx, types.ts, OwnerAddBalance.tsx}, components/layout/OwnerBalance.tsx.
**Notes / pending:** Live: 500 + 200 add → 0→500→700, galat password pe koi row nahi, refill 100 → 700→600 "Given to user". Tests ownerWallet/pointsSettle/lords/tools 52 pass 0 fail. Purani history (107 se pehle) ledger me nahi hai.

## 2026-10-16 — staff_balances me sirf Super Admin ki row
**Kya kiya:** Migration `106-staff-balances-owner-only.js`: role level 1 (Super Admin) ke alawa saari `staff_balances` rows delete (wo 099 ke baad sirf purani copy thi; asli balance `credits` me). Dev + test DB pe chalayi — ab sirf id 1 aur demo super admin id 3 (dono 0). Owner wallet API live 200.
**Kyun:** User: "staff balance me bss super admin ki row rahegi, baaki ka balance credit me chala gaya hai". Bahar ka agent system hat gaya, admin me ab sirf Super Admin, Executives aur Sports Exchange staff login karte hain.
**Files / jagah:** backend/packages/db/migrations/106-staff-balances-owner-only.js
**Notes / pending:** —

## 2026-10-16 — Sports Exchange ke bahar wala agent / client system hataya
**Kya kiya:** Agent / master / client ab sirf Sports Exchange se. Bahar sirf Executives bacha.
- Admin pages hataye: Team → Staff & agents (`/staff`, `/staff/[id]`, views/staff), Finance → Transfers (`/transfers`), User reports ka "Agent users" tab, Risk review ka "Staff risk" tab + agent lock. Users page se "Create user" (creator ke neeche client banata tha), Channel column / "Via agent" filter / Channel donut hataye — Users aur User reports ab sirf direct users (`channel=direct`). `/staff/:id` links (Statements, Marketing, Risk) ab sirf naam. WithdrawBlockAction sirf user.
- Backend: `admin/staff` me sirf `POST /transfer` (Sports Exchange Credit) aur `PATCH /password` (My Account) bache; list / tree / players / transactions / transfers / summary / create / bulk-status / rollup / analytics / :id (get, patch, delete, percent-chain, percent-tree, whatsapp-ref) hataye + controllers, validators, errors, constants aur StaffService ke unused methods (service 1195 → 632 line). `create`, `transfer`, `getById`, `changePassword` rahe (createAccount, lords sockets use karte hain). Reports: `agent-users`, `staff-risk` + service methods. Players: `POST /admin/players` aur update ka `parentId`. Gateway legacy mappings bhi.
- Tests: staff.test (17 subtests), suspendCascade, manageableStaffIds, reports.test, pnlStats (agentUsers part), players.test, gateway legacyRoutes (bache hue patterns pe dobara likha).
**Kyun:** User: "sports exchange ke bahar wala client ya agent system hai uske related sari chije hatani hai, bss executive wala section rakhna hai".
**Files / jagah:** admin/src/{configs/navConfig.tsx, views/reports/{PlayerReports,RiskReview,Statements,types}.tsx, views/players/{PlayersList,UserStatusOverview,WithdrawBlockAction}.tsx, views/marketing/MarketingAnalytics.tsx, views/finance/types.ts}; backend/services/admin/src/modules/{staff,reports,players,locks,staff-directory}, backend/gateway/src/legacyRoutes.js, backend/packages/auth/src/permissions.js (comment).
**Notes / pending:** Badle modules ke tests: 155/163 pass; 8 fail sirf agentMoney.test me jab saath chale — akele 21/21 pass (purane test data ka takraav). Gateway 9/9. Backend restart kiya; live check: hataye routes 404, transfer / password / owner wallet (directBalance ke saath) / direct-only Users list chal rahe. Directory fallback (`admin/user/directory`, sirf users:read wale executive) me abhi channel filter nahi.

## 2026-10-16 — Multi Login aur Active Users pages hataye
**Kya kiya:** `/exchange/multi-login` hataya: page, view MultiLogin.tsx, sidebar link, backend `exchange-accounts/multiLogin.js` + uske 6 routes (`/multi-login*`) + validators + test. `/exchange/users/active` hataya: page, sidebar link; AccountList se 'active' variant nikala (ab ek hi Account List); Create Account ke baad redirect `/exchange/users`.
**Kyun:** User: "iska koi kaam nahi hai, hata do".
**Files / jagah:** admin/src/app/(pages)/exchange/{multi-login,users/active} (deleted), admin/src/views/exchange/{AccountList.tsx,accounts/CreateAccount.tsx,accounts/MultiLogin.tsx (deleted)}, admin/src/configs/navConfig.tsx, backend/services/admin/src/modules/exchange-accounts/{routes/admin.routes.js,exchangeAccounts.validators.js,index.js,multiLogin.js (deleted),__tests__/exchangeAccounts.test.js}.
**Notes / pending:** `executives` table nahi hatayi — Access → Executives page use karta hai. `admin/exchange/accounts` API bhi rahi (Account List, Bank use karte hain).

## 2026-10-16 — Owner ka Direct Users balance (staff_balances)
**Kya kiya:** Owner ke do balance: Agent System (`credits`) sirf children ke liye, Direct Users (`staff_balances.inr`) sirf direct users ke liye. Owner → direct user refill / adjust / points settle ab `staff_balances` se katta hai (pehle kuch nahi katta tha); direct user se liya paisa wahin jaata hai. Naya route `POST admin/exchange/owner/add-direct-balance` (transfer_type `owner_direct_topup`), `owner/wallet` aur `accounts.me` me `directBalance`. Add Balance popup me "Add to" select; SettleDialog direct user pe Direct balance dikhata hai. Merge conflicts (ExchangeDashboard, GameDetails, OwnerAddBalance) dono taraf ka rakh ke solve kiye — merge commit abhi baaki.
**Kyun:** User: "credit wala balance sirf client management / child ke liye, direct user ke liye staff_balances me owner ka balance rahega".
**Files / jagah:** lords/ownerWallet.js, lords/lords.service.js, lords/lords.constants.js, lords/pointLedger.js, exchange/pointsSettle.js, exchange/exchange.service.js, exchange/routes/admin.routes.js, tests (ownerWallet, pointsSettle, lords); admin OwnerAddBalance.tsx, SettleDialog.tsx, types.ts, finance/shared.tsx.
**Notes / pending:** Admin tests 809/809 pass. CreditForm (admin/staff/transfer) direct user ke liye pehle se 404 deta hai — badla nahi.

## 2026-10-16 — Header me owner (super admin) ka balance
**Kya kiya:** Theme toggle ke bagal me chhota badge: wallet icon + sirf Direct Users balance (`staff_balances`) — user ke kehne pe Agent balance aur text labels hataye. Sirf owner ko (executive ko nahi), `GET admin/exchange/owner/wallet` se; Add Balance ke baad wahi query invalidate hoti hai to turant update.
**Kyun:** User: "super admin ke pass jitna balance hai vo dikhana hai, dark/light toggle ke bagal me".
**Files / jagah:** admin/src/components/layout/OwnerBalance.tsx (naya), admin/src/components/layout/Header.tsx
**Notes / pending:** Chal raha backend merge se purana tha, `directBalance` nahi bhej raha tha; restart ke baad aayega. Tab tak sirf Agent balance dikhta hai.

## 2026-10-16 — origin/main merge ke conflicts resolve
**Kya kiya:** 3 conflict files: ExchangeDashboard (hamara bars wala design + remote ka ErrorState), OwnerAddBalance (hamare do balance target + remote ka error/"Could not load" aur amount wala toast), GameDetails (remote ka toast.info + `?tab=agent`). Bache hue "Client Management" text (UI label + comments) → "Agent System".
**Kyun:** User: "git me kuch changes pade, conflicts resolve kar de".
**Files / jagah:** upar wali 3 files + SettleDialog.tsx, types.ts, backend dashboard/exchange/lords comments
**Notes / pending:** Merge commit abhi nahi kiya. lords.test / ownerWallet.test / pointsSettle.test ke unstaged changes user ke apne hain, chhede nahi.

## 2026-10-16 — "Client Management" tab ka naam "Agent System" + simple points graph
**Kya kiya:** Dashboard ka tab "Client Management" → "Agent System" (URL `?tab=agent`, GameDetails ka redirect bhi). Points ke radial rings hata ke simple bars: upar bada All Pts card, neeche har point ki gradient bar + value + %; minus laal. Recharts / TooltipBox ab is page me nahi, isliye charts/index.ts ka TooltipBox export wapas hataya.
**Kyun:** User: "client management ki jagah agent system kar do… graph thoda easy and stylish".
**Files / jagah:** admin/src/views/dashboard/Dashboard.tsx, admin/src/views/exchange/ExchangeDashboard.tsx, admin/src/views/exchange/market/GameDetails.tsx, admin/src/configs/navConfig.tsx (comments)
**Notes / pending:** —

## 2026-10-16 — Client Management tab ke graph naye style me
**Kya kiya:** Purane do "har bar alag rang" wale bar charts hata ke:
- **Points overview:** radial rings (har point type ek ring, ek hi scale, sabse bada = poora gol), beech me All Pts, side me list (value + scale ka %), hover tooltip.
- **P/L overview:** bada Total P/L + trend icon (profit / loss / break-even), neeche zero-centre gradient bars (profit right hara, loss left laal).
- Rang panel ke tokens se: rings = `primary` ke shades, P/L = `success` / `danger`. Dono card me Chart/Table toggle.
- Shared charts barrel se `TooltipBox` export kiya (ring tooltip ke liye).
**Kyun:** User: "graph ko dusre style me, advanced, apni UI ke colors me."
**Files / jagah:** admin/src/views/exchange/ExchangeDashboard.tsx, admin/src/components/shared/charts/index.ts.
**Notes:** Data aur API wahi (`admin/exchange/user-reports/home`); hide rule bhi wahi (points sab 0 → points panel nahi). tsc + eslint clean; browser me screenshot se check nahi hua (Chrome extension is session me connected nahi tha).

---

## 2026-10-16 — Direct Users dashboard me sirf direct users (bina parent) ka data + PROJECT-FLOW.md
**Kya kiya:**
- Direct Users tab ka saara data (overview, user-stats, movements, registrations, totals, today, members, stats/series, stats/top) ab sirf `parent_staff_id IS NULL` wale users ka hai. Parent wale players (agent clients) yahan nahi gine jaate.
- Ye data sirf root ke tree (owner / back office) ko dikhta hai; agent ke tree me direct users nahi hote, isliye unhe khali dikhta hai.
- `DashboardStatsService` me naya option `directOnly` aaya. Dashboard routes ise `true` dete hain. P&L report (`reports/pnlStats`) wahi service bina option ke use karta hai, isliye wo pehle jaisa caller ka tree hi dikhata hai.
- Dashboard tab pe line: "Direct users only — players who signed up on the site and have no parent."
- Naya `PROJECT-FLOW.md` (repo root): users ke type, dashboard tabs, wallet rules, sidebar.
**Kyun:** User: "direct user dashboard me jo bhi data hoga vo direct user ka hoga only jinka koi parent nhi hai; ek project flow.md file banao, usme sab likhte rehna."
**Files / jagah:** backend/services/admin/src/modules/dashboard/{dashboard.service.js,dashboardStats.service.js,routes/admin.routes.js,__tests__/dashboard.test.js,__tests__/dashboardStats.test.js}, admin/src/views/dashboard/Dashboard.tsx, PROJECT-FLOW.md.
**Test:** admin service `npm test` (TEST_DB_NAME=cfz_hash_game_exchange_test): 806 pass, 0 fail. Dashboard ke scope tests naye rule pe likhe (agent ko khali; root ko sirf direct user; client ka naam dene pe bhi 0).

---

## 2026-10-16 — Dono dashboard ek page pe, tab switch (Direct Users / Client Management)
**Kya kiya:** `/dashboard` pe ab do tab hain: **Direct Users** (purana main dashboard — deposits, withdrawals, casino/sports GGR, registrations) aur **Client Management** (purana Sports Exchange dashboard — balance, exposure, points, P/L). Tab URL me `?tab=client` se rehta hai. Jis tab ki permission nahi (`reports:read` / wallet perms), wo nahi dikhta; ek hi bache to tab bar nahi dikhta.
- Sports Exchange sidebar se "Dashboard" link aur `/exchange/dashboard` page hataya. Main "Dashboard" nav ab `reports:read` ya koi wallet perm pe dikhta hai.
- Market khatam hone pe GameDetails ab `/dashboard?tab=client` pe bhejta hai.
- Backend me kuch nahi badla (dono APIs wahi).
**Kyun:** User: "dono ek page me dikhne chahiye, tab switch karo — ek direct user dashboard, ek client management; sports exchange se dashboard main dashboard me le aao."
**Files / jagah:** admin/src/views/dashboard/Dashboard.tsx, admin/src/views/exchange/ExchangeDashboard.tsx (comment), admin/src/configs/navConfig.tsx, admin/src/views/exchange/market/GameDetails.tsx, admin/src/app/(pages)/exchange/dashboard/ (hataya).

---

## 2026-10-16 — Carousel, Fixtures, Secure Auth Bot hataye + hataye gaye pages ka backend bhi
**Kya kiya:** User ke kehne pe sirf wahi code jo use ho raha hai.
- Carousel (posters, auto update / banner sync), Fixtures, Secure Auth Bot: admin pages + views + sidebar links, backend routes (`exchange-accounts` admin.routes), services (`carousel.js`, `fixtures.js`, `secureAuthBot.js`), validators aur tests hataye. Bacha `ownerOnly` / `ownerCheck` bhi (ab koi route use nahi karta).
- Tables: migration 104 ab sirf `integrity_alerts` + `settlement_watchdog` banati hai; nayi 105 `carousels`, `posters`, `banner_sync`, `secure_auth_config` drop karti hai (dev + test DB pe chal chuki).
- Point Ledger page ka backend: `GET /admin/exchange/point-ledger`, `pointLedger()` service aur validator hataye. Owner Wallet: `GET /owner/wallet` ab sirf wallet deta hai (Add Balance popup ka Current Balance), history aur paging hataye.
- Admin me bache unused: `accounts/api.ts` ka `ago` / `money`, nav icons Activity / CalendarDays.
**Kyun:** User: "carousel, fixture aur secure auth bot page hata do, saath me inka backend code bhi; jinka page hata rahe ho unka backend bhi hatate rehna; bas wahi code rakhna jo use ho raha hai."

---

## 2026-10-16 — System Tracker site admin se hata ke Owner Panel (3085) me
**Kya kiya:** System Tracker (Alerts, Account Trace, Watchdog) ab sirf `owner-panel` me hai, sidebar "Monitoring → System Tracker" (`/system-tracker`). Site admin se page, view aur staff routes (`/admin/exchange/accounts-admin/system-tracker/*`) hata diye.
- Backend: naya module `owner-system-tracker` (public audience, `x-owner-key` = OWNER_SHARED_SECRET, warna 401; rate limit): `/api/v1/admin/owner/system-tracker/{alerts,scan,watchdog,watchdog/scan,watchdog/:id/acknowledge,search,:idOrUsername[/provenance]}`. Code wahi `exchange-accounts/systemTracker/*`. Acknowledge "owner" naam se.
- Owner panel: `app/api/owner/system-tracker/[...path]/route.ts` (owner session check, phir gateway ko key ke saath; https ya isi machine ka http), `views/system-tracker/SystemTracker.tsx` (admin wala screen), Watchdog ke "Open … Settlement" buttons site admin (`SITE_ADMIN_URL`) naye tab me kholte hain.
**Kyun:** User: "system tracker owner panel me daalna tha, sirf owner panel me dekh sakte hai."
**Check:** naya test `owner-system-tracker/__tests__/ownerTracker.test.js` + exchange-accounts tests (21/21); backend restart, live 4700: key se 200, bina key 401; owner panel 3085 login karke alerts/watchdog/search 200, unknown 404, watchdog scan 200, bina session 401, `/system-tracker` page 200; admin + owner-panel tsc clean, eslint clean.

---

## 2026-10-16 — Owner Wallet aur Point Ledger pages hataye
**Kya kiya:** `/exchange/owner-wallet` aur `/exchange/point-ledger` pages (views + routes + sidebar links) hata diye. Owner "Add Balance" ab header profile menu se seedha dialog me khulta hai (`views/exchange/OwnerAddBalance.tsx`, zip ke OwnerAddBalanceModal jaisa), page pe nahi jaata. Dashboard ka "Owner wallet" tile hataya (zip Home me nahi tha; Balance tile wahi dikhata hai). Backend APIs (`owner/wallet`, `owner/add-balance`, `point-ledger`) waise hi hain.
**Kyun:** User: "owner-wallet aur point-ledger wala page hata de."
**Check:** admin tsc + eslint clean.

---

## 2026-10-16 — Sidebar: "Sports Exchange" section dropdown jaisa
**Kya kiya:** Sidebar me "SPORTS EXCHANGE" label pe click karne se poora section band / khulta hai (chevron ghoomta hai). `NavItem` me naya `collapsible?: boolean`, abhi sirf Sports Exchange pe on. Exchange ka koi page khula ho to section apne-aap khula rehta hai; user ka click yaad rehta hai (sidebar collapse/expand karne pe bhi). Icon rail me label nahi dikhta, wahan items hamesha dikhte hain.
**Kyun:** User: "Sports Exchange me drop down lagao, click karo to band bhi ho jaye."
**Files:** `admin/src/configs/navConfig.tsx`, `admin/src/components/layout/Sidebar.tsx`.
**Check:** admin tsc clean, eslint clean (Sidebar + navConfig; navConfig ki purani lines-around-comment error bhi --fix se gayi).

---

## 2026-10-15 — Sports Exchange: zip (msadmin / tenexch-admin-bundle) ke saare screens port
**Kya kiya:** Zip ke admin panel ke saare non-casino screens Sports Exchange me, zip jaise (columns, tabs, buttons, flows, labels), theme hamara. Har jagah Wallets ki jagah `credits`.
- **Dashboard** = zip Home: Balance, Exposure, Credit/All/Settlement/Upper/Down pts tiles + Points aur P/L charts.
- **Account List / Active Users:** D/W (settlement), More (Profile, Change Password, User Lock, Credit History), CR → Credit Activity (Credit Deposit/Withdraw/History). Backend: `GET /admin/exchange/credit-history`; list me phone/city/created/sports_pts/upper/down.
- **Settlement:** Match / Fancy / Void Bets zip jaise (Declare, Void, Per Bet, void after settlement + silent void) — `views/exchange/settlement/*`.
- **Settings:** Buffer Time, Commission, Max Odds, Auto Void, Virtual Bet Limits, Bet Limits, General Lock (`views/exchange/settings/*`; sports config APIs).
- **Market Analysis, Events + Game Details, Current Bets** (`views/exchange/market/*`, module `exchange-market`).
- **Reports:** Account Statement, Party Win Loss, Sportbook, Turn Over, Total P/L, User Win Loss (module `exchange-reports`); User History, User Authentication, Fraud, User Register Detail + Home (module `exchange-user-reports`).
- **Accounts / owner tools:** Create Account, Multi Login, Assign Agent, System Tracker, Carousel, Fixtures, Secure Auth Bot (module `exchange-accounts`, migration 104 = mssports integrity_alerts, settlement_watchdog, carousels, posters, banner_sync, secure_auth_config). Client search: module `exchange-lookup`.
- **Owner Add Balance (tenexch-admin-bundle jaisa):** owner ke inr + credit + all_point, point ledger "Credit"; header profile menu me "Add Balance" (owner).
- Sidebar: zip ke owner-only screens `wallet:adjust` (sirf Super Admin) pe; "not ported yet" catch-all aur `screens.ts` hata diye (sab port ho gaye).
- Admin proxy DELETE body fix (FIXLOG).
**Kyun:** User: "jo zip me hai wahi same Sports Exchange me, bas theme apna; wallet ki jagah credits; casino nahi."
**Check kaise kiya:** Naye module tests (exchange 9+11, market 10, reports 11, user-reports 7, accounts 17, lookup 6) pass; full backend suite 2472: 2470 pass, 0 fail, 2 skip; sports 3/1 skip; player vitest 127; admin tsc + build pass (38 exchange pages); dev 3080 pe saare exchange pages 200, unknown 404; live 4700 pe saari exchange APIs 200 (temp owner, baad me hataya).
**Zip se farq (jaan-boojh ke):** casino har jagah se hata; More ka Edit Profile nahi (full name ka column nahi); staff login history khaali (staff logins DB me nahi); Fraud report khaali (zip me bhi backend nahi); Carousel auto-update / Fixtures ke liye `BANNERS_API_URL` / `FIXTURES_API_URL` service abhi nahi; Secure Auth Bot settings save hoti hain par Telegram 2FA bhejne wala kuch nahi; DataTable page sizes 10/20/50/100.

---

## 2026-10-15 — Sports Exchange me data: points roll-up, points settlement, Account List / Active Users / Bank
**Kya kiya:**
- Backend restart (purana code chal raha tha, isliye `/admin/exchange/*` 404 → "could not load").
- **Points roll-up chalu** (`credits` pe): bet settle hone pe P/L player + uske upar ke saare staff ke `credits.all_point` / `sports_pts` me, `mssports.point_ledger` entry ke saath (wallet_id = credits.id). Void ka reversal, silent-void delete aur commission chain bhi `credits` pe. Direct user (koi parent nahi) ki chain me sirf wo khud. Naya helper `services/sports/src/lib/services/creditsPoints.mjs`; dono `walletService.mjs` copies (HTTP + settlement worker) usi ko use karti hain; `settlementv2`, `sportsCommissionService`, `sportsVoidService` ke calls wapas on.
- **Admin API** (`exchange` module): `GET /admin/exchange/accounts` (zip `users/all-details`: direct children, CR, pts, Client(P/L) = all_point − credit, Exposure, Available pts, B st/U st, drill-down `parentId`) aur `POST /admin/exchange/points/settle` (zip `settlePointsFromChild`: sirf direct child, sirf P/L tak, galat sign refuse, ledger mismatch pe block; owner ↔ direct user me owner ka wallet nahi badalta). Naya transfer type `points_settle` (statement me aata hai).
- **Screens** (zip jaise, theme hamara): Account List, Account List For Active Users (D / W settlement modal: parent / child / Profit-Loss abhi → baad), Bank (All → amount → Submit, Transaction Code, Status), Excel/PDF export (`jspdf` add kiya).
**Kyun:** User: exchange me data nahi aa raha, "all points settlement point kuch bhi nahi"; sab kuch zip (msadmin) jaisa, sirf colour/theme apna.
**Files / jagah:** `backend/services/admin/src/modules/exchange/{accountList.js,pointsSettle.js,exchange.service.js,exchange.validators.js,routes/admin.routes.js,__tests__/pointsSettle.test.js}`, `lords/lords.constants.js`, `backend/services/sports/src/lib/services/{creditsPoints.mjs,walletService.mjs}`, worker `services/walletService.mjs`, `settlementv2.mjs`, `sportsCommissionService.mjs`, `sportsVoidService.mjs`, `admin/src/views/exchange/{AccountList,Bank,SettleDialog,exportList}.tsx/ts`, `admin/src/app/(pages)/exchange/{users,users/active,bank}`.
**Check kaise kiya:** Naye 7 tests (pointsSettle) pass; live (4700) temp owner se: roll-up child +100 (owner chain me bhi), direct −50 (sirf khud), galat-sign settle 400, W −100 → P/L 0 aur owner +100, direct D +50 → owner same; pages 200; tsc, eslint, build saaf. QA data hata diya.
**Notes / pending:** Zip ke "More" modal ki jagah hamara user/staff page khulta hai; CR click se point ledger. Bank ka "Transfer All" zip me bhi kuch nahi karta tha, nahi rakha.

---

## 2026-10-15 — Admin panel me "Sports Exchange" section (zip ka poora sidebar)
**Kya kiya:**
- Sidebar ka "Exchange" group hata ke **"Sports Exchange"** group banaya, zip (msadmin) ke sidebar ke order me: Dashboard, Market Analysis, Multi Login Account, **Account** (Active Users, Account List, Create Account), Assign Agent, Bank, Owner Wallet + Point Ledger (hamare apne), System Tracker, Carousel, Fixtures, Secure Auth Bot, **Reports** (12 sub-screens), **Settlement** (Match, Fancy, Void Bets), Buffer Time, Commission, Max Odds, Auto Void, Virtual Bet Limits, Bet Limits, Events. Zip ke sub-menu yahan bhi sub-menu hain.
- Casino ka kuch nahi: Our/Vip/Virtual/Premium/Tembo Casino, Casino Manage, Casino Settlement, Our Casino Result, Live Casino Result, Home Sliders, Game Priority, Third Party Game Limit chhode.
- Chalne wale: Dashboard, Owner Wallet, Point Ledger, aur Settlement > Match / Fancy / Void Bets (purana Sports settlement screen, ab `defaultTab` ke saath).
- Baaki screens ka page `/exchange/<slug>` pe "not ported yet" dikhata hai (zip page ka naam, backend ready hai ya nahi). Ek hi catch-all route: `app/(pages)/exchange/[...slug]/page.tsx`, list `views/exchange/screens.ts`. Screen port hone pe uska apna page.tsx banao aur list se entry hatao.
**Kyun:** User: "Sports Exchange" naam ka section, usme dashboard aur zip ke saare sections, sub-sections unke andar hi.
**Files / jagah:** `admin/src/configs/navConfig.tsx`, `admin/src/views/exchange/{screens.ts,PortPending.tsx}`, `admin/src/app/(pages)/exchange/{[...slug],settlement/*}`, `admin/src/views/sports/Settlement.tsx`.
**Check kaise kiya:** Dev server (3080) pe 36 Sports Exchange pages 200 (galat slug 404); `tsc` saaf; `npm run build` pass.
**Notes / pending:** Screens ka port `PENDINGWORK.md` "Exchange section" me.

---

## 2026-10-15 — Sabka balance `credits` me (owner, staff, player) + owner "Add balance" + Exchange section
**Kya kiya:**
- **Migration `099-credits-for-everyone`:** `credits` me `user_type` ('USER' | 'STAFF' | 'OWNER'), `staff_id`, `exposure_limit` add kiye; `uid` ab NULL ho sakta hai (staff row me). CHECK: player row = uid, staff/owner row = staff_id. Har staff ki row `staff_balances` ka balance copy karke bani (level 1 = OWNER), aur jis player ki row nahi thi uski 0 wali row. `staff_balances` table delete nahi ki, code ab use nahi padhta. Local dev DB aur `cfz_hash_game_exchange_test` dono pe chal chuki hai (dev DB pe saath me pending 095-game-transactions, 097, 098 bhi chali).
- **Model:** naya hand-written `StaffCredits` (`packages/db/src/models/extended/StaffCredits.js`) = `credits` ki staff/owner rows (`staff_id` se). Player ke liye `Credits` hi hai (`uid` se); usme `id`, `credit`, `all_point`, `user_type` extensions me declare kiye.
- **Admin-service me `StaffBalances` → `StaffCredits`** har jagah: `lords/staffFloat.js` (debit/credit/read float), lords (refill, adjust, exposure/credit limit, listing), staff (create, transfer, delete, rollup), players (opening balance, close), reports, statements. **Staff/agent banate hi uski `credits` row banti hai**, player banate hi bhi (pehle se tha).
- **Owner ke rules** (`lords/ownerWallet.js`):
  - Owner khud apne wallet me balance add karta hai: `POST /admin/exchange/owner/add-balance` (sirf owner, transaction password zaroori). `staff_transfers` me `owner_topup` row (from 'system').
  - Owner apne child ko deta hai (staff/agent, ya parent wala player): **owner ke `inr` se katta hai**. Pehle owner bina kate paisa bana deta tha ("issuance") — wo band. Staff transfer, refill aur adjust teeno me.
  - Owner **direct user** (khud signup, `parent_staff_id` NULL) ko deta/leta hai: player ka balance badalta hai, **owner ka nahi**. History alag: `transfer_type 'direct'` + point ledger `Bank Deposite` / `Bank Withdraw`.
  - user-service `POST /admin/user/wallet/adjust`: owner + INR ab admin-service (`player-adjust`) jaata hai, jo upar wala faisla karta hai. Owner ke non-INR coins (USDT waghera) pehle jaise operator adjustment.
- **Point ledger (zip jaisa)**, `lords/pointLedger.js`: parent ↔ direct child ke har len-den pe child ke wallet me `credit` aur `all_point` += delta, aur `mssports.point_ledger` me entry (wallet_id = `credits.id`, `Credit` / `Debit`, closing balances, `settled_with_wallet_id` = parent). Staff transfer, refill, adjust, player ka opening balance aur account close — sab me. Purani entries (credits_ledger, wallet_history, staff_transfers) pehle jaise hi banti hain.
- **Exchange section (admin panel)**: naya backend module `admin/src/modules/exchange` (`GET /exchange/dashboard`, `GET /exchange/owner/wallet`, `POST /exchange/owner/add-balance`, `GET /exchange/point-ledger`). Frontend: sidebar me "Exchange" group (Dashboard sabse upar, Owner wallet, Point ledger) — `admin/src/views/exchange/*`, `admin/src/app/(pages)/exchange/*`. Wallet adjust dialog ka text naye rule ke hisaab se.
- **Tests:** naya `exchange/__tests__/ownerWallet.test.js` (11 cases). Purane money tests `StaffCredits` pe aur owner wale tests naye rule pe update kiye.

**Kyun:** User ka faisla: sabka balance ek hi `credits` table me; owner ka asli balance ho jo kate; direct user ka paisa owner se na kate; zip (msadmin) jaisa point ledger; zip ke admin screens apne admin panel ke "Exchange" section me (casino ka kuch nahi).
**Files / jagah:** `backend/packages/db/migrations/099-credits-for-everyone.js`, `068-...` (fix, FIXLOG dekho), `packages/db/src/models/{extensions.js,extended/StaffCredits.js}`; `services/admin/src/modules/lords/{staffFloat,pointLedger,ownerWallet,lords.service,lords.constants}.js`, `staff/staff.service.js`, `players/players.service.js`, `reports/reports.service.js`, `statements/statements.service.js`, `exchange/*`; `services/user/src/modules/wallet/controllers/admin.controller.js`; admin: `configs/navConfig.tsx`, `views/exchange/*`, `app/(pages)/exchange/*`, `views/finance/shared.tsx`.
**Check kaise kiya:**
- Backend `npm test` test DB ke saath (`TEST_DB_NAME=cfz_hash_game_exchange_test`): **2412 tests, 2410 pass, 0 fail**, 2 skip (legacy folder / git history wale, by design). Sports `npm test` 3 pass 1 skip. Player frontend vitest 127/127. Admin `tsc` aur naye files ka eslint saaf.
- Live (naya code alag ports 4710-4712 pe, gateway ke through, temporary `qa_owner_tmp` owner + 2 players): add balance 1000 → child ko 300 (owner 700) → 5000 maanga to 422 → direct user ko 400 (owner 700 hi) → direct se 100 liya (owner 700 hi) → child se 50 liya (owner 750). Point ledger me Credit/Debit/Bank Deposite/Bank Withdraw sahi. QA data aur extra services baad me hata diye.
- Admin panel (3080) pe teeno Exchange pages 200 render hote hain.
**Notes / pending:**
- **Aapka chalta hua backend (`npm run dev`, 4700-4704) purane code pe hai** — restart karna padega, tabhi Exchange pages ka data aayega aur naye rules lagenge.
- Owner ka wallet abhi 0 se shuru hai: owner ko pehle "Add balance" karna hoga, warna child ko dena 422 dega.
- Baaki zip screens ka port: `PENDINGWORK.md` "Exchange section" dekho.


**Kya kiya:**
- Local pe `node scripts/seed-data.js --demo` chalaya (demo staff + 15 direct players; agent-tree players `TXN_PASSWORD_INVALID` se nahi bane). Stack chalaya: gateway, user, admin, sports, sports-worker.
- Live feed (India v West Indies, England Legends v Australia Legends, Bangladesh Legends v South Africa Legends) pe asli bets lagayi, gateway ke through, aur har step pe `credits.inr` check kiya. **Sab PASS:**
  - MO back (−stake), MO lay (−stake×(odds−1)), fancy YES (−stake), fancy NO (−stake×rate/100), oddeven
  - market void aur single bet void → refund; unmatched bet → cancel-bet → refund
  - MO declare: jeeta → stake + win; haara (back aur lay dono) → kuch nahi
  - fancy declare: YES jeeta → stake + stake×rate/100; NO haara → kuch nahi
  - commission (test rule 10%): jeet me se sahi kata (204 ki jeet → 20.4)
  - settled market ka void (MO aur fancy): jeet aur commission wapas, haare hue ka loss wapas; sab bet se pehle wale balance pe
  - socket `getBalance` = `credits.inr`; statement API 200 (sirf "Opening pts", kyunki points band hain)
- **Bug fix (purana, hamare change se nahi):** fancy bets kabhi settle hi nahi hoti thi. `public.fanwins.runsodds` INTEGER tha (worker `"74.0000"` likhta hai) aur `fanwins.userid` NOT NULL tha (worker `user_id` likhta hai). Migration `096` se `runsodds` → NUMERIC(10,4) aur `userid` nullable. Fail hone pe transaction rollback hota tha, isliye paisa adha update nahi hua tha.
- Tests: backend `npm test` 765 pass, 0 fail, 114 skip (wo tests `ibitplay_test` DB maangte hain jo local pe nahi hai); frontend vitest 127/127 pass.

**Kyun:** Confirm karna tha ki place bet aur settlement me `credits.inr` sahi update ho raha hai.
**Files / jagah:** `backend/packages/db/migrations/096-fanwins-sports-columns.js`. Test harness project ke bahar (scratchpad) hai.
**Notes / pending:**
- Feed MATCH_ODDS pe `maxb=1` bhejta hai aur mssports ise max stake 1 maan leta hai, isliye bina owner override ke MO pe 1 se badi bet nahi lagti ("Maximum bet amount is 1"). Test me temporary `bet_limit_overrides` row lagayi aur baad me hata di.
- Unmatched bet jo match nahi hui, market settle hone pe "void" mark hoti hai par uski liability wapas nahi aati (exposure me loss ki tarah ginti hoti hai). Ye mssports ka purana logic hai, `cash` ke time bhi aisa hi tha. Abhi theek nahi kiya.
- Local DB me ab demo data aur test bets hain. Demo accounts `node scripts/seed-data.js --reset-demo --yes` se hat jaate hain.

## 2026-10-14 — Sports exchange: player wallet `Wallets` → `credits.inr`
**Kya kiya:**
- Migration `095`: `credits` me `id` (BIGSERIAL, unique), `credit`, `all_point`, `upper_point`, `down_point`, `sports_pts`, `thirdparty_pts` add kiye (`inr` pehle se tha). Local DB pe chal chuka hai.
- Sports me naya `Credits` model (`public.credits`), teen jagah: API, settlement worker, results worker.
- Player ka paisa ab `mssports."Wallets".cash/inr_balance` ki jagah `credits.inr` se: bet lagi → `inr` minus; jeeta → `inr` plus (liability wapas + jeet); haara → `inr` me kuch nahi (liability placement pe hi kat chuki). Cancel bet, market void, manual void, settled-bet void aur commission bhi `credits.inr` pe.
- Purana Wallets wala code har jagah `// OLD` ya `/* */` me comment karke rakha hai, naya code `// NEW (credits.inr)` ke saath.
- Points roll-up band: `updateAllPointHierarchy` ke saare calls comment kiye aur function me early return. Commission points (`applyCommissionPoints`) aur void reversal (`reverseAllPointHierarchy`, `reverseCommissionPoints`) ke calls bhi comment.
- Statement ab `point_ledger.wallet_id = credits.id` se padhta hai. Socket balance (`getUserWallet`) player ke liye `credits.inr` deta hai. `ensureUser` player ki `credits` row na ho to bana deta hai.

**Kyun:** Sports ko platform ke main wallet (`credits.inr`) se chalana hai. Baad me agent/staff ke wallet bhi `credits` me shift honge, isliye points wale columns abhi add kiye.
**Files / jagah:** `backend/packages/db/migrations/095-credits-sports-wallet.js`; `backend/services/sports/src/`: `models/user/Credits.mjs` (+ `workers/{settlement,results}/models/user/Credits.mjs`), `modules/bets/controllers/sportbetscontroller.mjs`, `workers/settlement/sportsbet/betresult/settlementv2.mjs`, `workers/settlement/services/settlement/sportsCommissionService.mjs`, `modules/settlement/services/{sportsMarketVoidService,sportsVoidService}.mjs`, `workers/results/services/admin/sportsMarketVoidService.mjs`, `modules/settlement/controllers/manualSettleController.mjs`, `modules/statement/controllers/UserStatementController.mjs`, `lib/services/walletService.mjs` (+ worker copy), `lib/identity/platformAccounts.mjs`.
**Notes / pending:**
- Points band hone se settlement ki `point_ledger` entries nahi ban rahi, isliye sports statement (jo `point_ledger` se banta hai) me naye settlements nahi dikhenge, jab tak points `credits.id` pe wapas on na ho.
- Staff/owner abhi bhi `mssports."Wallets"` me hain. Staff → player transfer routes (addCash, addDeposit, withdrawFromChild, settlePoints) ko haath nahi lagaya.
- Sports `credits.inr` me seedha likhta hai, platform ke `public.credits_ledger` me entry nahi banti. Sports ka hisaab `mssports.credits_ledger` / `debit_ledger` me hai.
- `npm run verify:models` me naye `credits` columns "missing in model" dikhte hain, kyunki platform ka `Credits.js` auto-generated hai. Ye sirf info hai, fail nahi hota.
- Test: sports `npm test` pass (3 pass, 1 skip: test DB nahi hai). Rollback transaction me `Credits` model ka lock/save/increment check kiya. Asli bet place → settle end-to-end nahi chalaya, kyunki local `credits` me koi player nahi hai.

## 2026-10-13 — Adminer system pe install (project ke bahar)
**Kya kiya:** PHP 8.4 install kiya (`winget install PHP.PHP.8.4`). Adminer 6.1.2 system pe `%LOCALAPPDATA%\Programs\Adminer\` me rakha, saath me `adminer.cmd` launcher. Ye folder user PATH me add kiya aur Start Menu me "Adminer" shortcut banaya. Launcher browser me `http://127.0.0.1:8088/adminer.php` kholta hai (pgsql + mysql extensions on).
**Kyun:** Local Postgres (`cfz_hash_game_exchange`) ko browser se dekhne ke liye. Project me kuch add nahi kiya (pehle `tools/adminer/` banaya tha, hata diya).
**Files / jagah:** Project me koi file nahi badli. System: `%LOCALAPPDATA%\Programs\Adminer\{adminer.php, adminer.cmd}`, user PATH, Start Menu shortcut.
**Notes / pending:** Chalane ke liye naya terminal kholke `adminer` (ya `adminer 9000` dusre port ke liye), ya Start Menu se Adminer. Login: System = PostgreSQL, Server = `127.0.0.1`, User = `postgres`, Database = `cfz_hash_game_exchange`, password `backend/.env` me `DB_PASSWORD`. `backend/README.md` me jo `./tools/adminer/start.sh` likha hai wo script repo me exist nahi karti.

## 2026-10-13 — Worklog shuru kiya
**Kya kiya:** `WORKLOG.md` banaya. Ab se har change yahan log hoga.
**Kyun:** Taaki team ko yaad rahe kya kaam hua, kya badla aur kis jagah.
**Files / jagah:** `WORKLOG.md`

### Pehle ka kaam (git history se, reference ke liye)
- 2026-10-13 `c51e69c` — Signed-in player locked ho to account-locked message dikhana
- 2026-10-13 `772e8d9` — Role hierarchy fixes, login-password transaction mode, shared rate limits
- 2026-10-13 `18d6c85` — `/sports` par native sports exchange (TENEXCH functionality, hash.game look)
- 2026-10-12 `d9d9857` — Docs: catalogue launch v2 keys ke saath live; in-house ko abhi v1 chahiye
