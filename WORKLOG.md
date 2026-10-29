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

## 2026-10-29 — Admin bina domain ke chale: sign-in proxy se, backend local port pe
**Kya kiya:** Admin sign-in ab browser se seedha `https://api.parker567.com` nahi jaata — same-origin proxy `/api/gw/api/v1/admin/auth/login` (aur executive login) se jaata hai; middleware ki PUBLIC_API list me dono login paths. `API_URL` (server-side) = `http://127.0.0.1:4700` (admin/.env.local + .env.example). Session cookie `secure` ab sirf https pe (Apache `X-Forwarded-Proto: https`), taaki plain-http local run (`next start -p 3081`, IP se) bhi login rakh sake. Gateway proxy (`app/api/gw/[...path]/route.ts`) browser ka `Origin` header aage nahi bhejta — warna gateway "Origin http://217.216.78.106:3081 is not allowed by CORS" deta tha.
**Kyun:** user ne parker567.com ka DNS doosre server (72.62.251.4) pe kar diya; local admin pe "Sign-in failed — Network error" (browser → domain → galat cert / CORS). User: "admin locally run ho raha hai to local port backend ko api hit kare bss".
**Files / jagah:** admin/src/views/auth/Login.tsx, admin/src/proxy.ts, admin/src/app/api/gw/[...path]/route.ts, admin/src/lib/auth/session.ts, admin/src/app/api/auth/session/route.ts, admin/.env.example (+ untracked admin/.env.local)
**Notes / pending:** asli staff login se end-to-end test nahi hua (credentials nahi the) — galat password pe gateway ka `STAFF_AUTH_INVALID_CREDENTIALS` proxy se aaya. RealtimeRefresh socket abhi bhi `NEXT_PUBLIC_API_BASE` (domain) pe jaata hai → DNS bina sirf live auto-refresh nahi chalega, baaki admin chalega.

---

## 2026-10-28 — TENEXCH jaisa "push instead of poll": balance / exposure, odds (get-match-private-data), all-data, platform sync
**Kya kiya:** TENEXCH ka concept (docs/porting/2026-10-26-production-optimizations.md §B4, §C, odds push plan 2026-10-21) apne structure me:
1. **Balance + exposure push (sports-svc):** naya `lib/helper/pushBalance.mjs` — commit ke turant baad `credits.inr` (getUserWallet 'USER' = credits row) + total exposure → `balanceUpdate`. Lagaya: placeBet, combined bet, cancelBet, void (pehle sirf inr bhejta tha), market void, single open-bet void. Settlement worker pehle se bhejta tha. Socket `subscribeBalance` tick 3 s → **30 s** (sirf safety read).
2. **Odds push:** naya `modules/odds-events/sockets/oddsPush.mjs` — page `subscribeMatch {gmid,sid}` → room `odds_<sid>_<gmid>`; har match ka EK ticker (1 s) REST-jaisa reply (`matchPrivateDataReply`, REST route bhi wahi use karta hai) laata hai, board badla to `matchOdds` bhejta, warna 2 s heartbeat; naya viewer last board turant. Frontend `useMatchMarkets` push pe chalta; push 5 s se taaza ho to HTTP poll skip, socket gira to turant polling (fallback same as pehle).
3. **all-data + match header:** `CricketService` me ek `sharedRead` helper (cache + in-flight share) — private-data (250 ms) usi pe, all-data board 2 s, match header (gamedetailPrivate) 5 s (TENEXCH gameDetailCache).
4. **Change feed (frontend):** `services/exchange/changeFeed.js` — sports `balanceUpdate` aate hi exposure book + open bets refetch (debounce 300 ms); unka poll 5 s / 2 s → 30 s safety (unmatched order ho to exposure 2 s hi). `usePolling` ab events ki list le sakta hai.
5. **Platform socket (user-svc SYNC_STATE):** tick 2 s → **30 s** safety; tab hidden me tick nahi, wapas aate hi sync; read ko taaza state na mile ya write land ho to turant sync (`liveStore` askSync / `markLiveWritten`); `console.log('[socket] SYNC_STATE')` hataya.
**Kyun:** user: "tenexch jaisa optimize karna hai apne structure ke hisaab se … balance, exposure, all data aur getprivatedata … credit table ki key". Pehle har viewer 1 s pe private-data HTTP, 5 s board/header seedha provider, har player 2 s pe 5 DB reads.
**Files / jagah:** backend/services/sports/src: lib/helper/pushBalance.mjs (naya), modules/odds-events/sockets/oddsPush.mjs + sockets.js + __tests__/oddsPush.test.js (naye), lib/core.mjs, lib/services/CricketService.mjs, sockets.js, modules/bets/controllers/sportbetscontroller.mjs, modules/bets/sockets/socketHandler.mjs, modules/odds-events/controllers/cricketController.mjs, modules/settlement/{services/sportsVoidService,services/sportsMarketVoidService,controllers/manualSettleController}.mjs; frontend/src: services/exchange/{oddsSocket,changeFeed}.js + feed.test.js (naye), services/exchange/{feed,balanceSocket}.js, hooks/exchange/{useMatchMarkets,feedHooks,usePolling,useSportsBalance}.js, services/{realtime,liveStore,client}.js + liveStore.test.js, context/SessionContext.jsx (comment), docs/exchange.md
**Notes / pending:** Tests: sports oddsPush 1/1 (+ suite 15/20, wahi 5 purane DB/env failures jo change se pehle bhi the), frontend vitest 259/259, lint saaf. Live (bina login, in-play SA v AUS 795819909, 20 s): private-data HTTP 20 → 0 (19 board WebSocket pe), platform socket frames 11 → 1; socket block karne pe fallback 10 polls / 10 s + odds dikhte rahe; home 40 s: 0 HTTP, 2 frames; all-data repeat 123 ms → ~40 ms (cache). **Pending:** login player ke saath asli bet → turant balance/exposure push live pe verify nahi kiya (bet ke liye user ki permission + test player chahiye; budget rule). `modules/settlement/workers/results/...sportsMarketVoidService.mjs` (worker copy) me push nahi lagaya — 30 s safety tick cover karta hai. Single sports-svc process hai, isliye odds ticker in-process (cluster pe TENEXCH wala Redis lease chahiye — code me shortcut comment).

## 2026-10-28 — Player site ka platform socket ab WebSocket pe (polling nahi)
**Kya kiya:** `frontend/src/services/realtime.js`: socket.io ab `transports: ['websocket', 'polling']` + `tryAllTransports: true` — seedha WebSocket khulta hai; polling sirf tab jab WebSocket na khul paaye. Balance, exposure, me/profile ka 2 s `SYNC_STATE` aur `C.CREDIT` push ab ek khule WebSocket pe frames hain, alag HTTP requests nahi. Purana `NEXT_PUBLIC_SOCKET_TRANSPORT` env knob hata diya (kahin set nahi tha).
**Kyun:** user: "pooling na karke websocket me karna hai … jaise tenexch me". Pehle har 2 s + har push `/socket.io?transport=polling` ki HTTP request thi.
**Files / jagah:** frontend/src/services/realtime.js
**Notes:** Backend/Apache me kuch nahi badla — Apache vhost me Upgrade rewrite aur gateway `wsProxy.js` pehle se `/socket.io` WebSocket carry karte the. Live check: node client `wss://api.parker567.com/socket.io` websocket-only connect + SYNC_STATE reply; headless Chrome me parker567.com 12 s: 1 WebSocket, 0 polling request, 7 frames. Signed-in player ke saath browser me alag se check nahi kiya (handshake same `auth` callback hai). 2 s tick abhi bhi chalta hai (backend pe DB reads utne hi).

## 2026-10-28 — Frontend: build ke time live site "This page couldn't load" nahi dikhayega
**Kya kiya:** pm2 `parker-frontend` ab `frontend/scripts/start-live.sh` se chalta hai: live `.next-live` se serve hota hai (`NEXT_DIST_DIR`, next.config `distDir`), jo har (re)start pe last FINISHED build (`.next/BUILD_ID` naya ho tab) ki copy hai. `npm run build` sirf `.next` me likhta hai, live ko chhoota hi nahi. Flow same: `npm run build` + `pm2 restart parker-frontend`.
**Kyun:** user ka screenshot: mobile pe kabhi kabhi Next ka "This page couldn't load". Wajah: `next build` usi `.next` ko mita ke dobara likhta tha jisse live server chal raha tha — build ke dauraan aur restart tak chunks 500 dete the (live pe pakda: 07:34 UTC wale build ke baad `3b4bmj6f5fp-l.js` 500).
**Files / jagah:** frontend/scripts/start-live.sh (naya), frontend/next.config.mjs (distDir), ecosystem.config.cjs (frontend script), .gitignore (.next-live*)
**Notes:** Live pe build chalate hue har ~1s page + saare chunks poll kiye: build (11s) me 0 error; sirf pm2 restart ka ~1s 503 (pehle jaisa). Restart pe copy 0.4s. Admin / owner-panel me abhi bhi purana tareeka (unka build bhi live ko beech me todta hai).

## 2026-10-27 — Demo: entries point_ledger me, desktop pe Log Out, purge har 1 min
**Kya kiya:** (1) Migration 162: `direct_ledger_write` trigger ab demo user (`is_demo`) ki har balance entry `mssports.point_ledger` me likhta hai (wallet_id = uski `credits.id`, source_user_id = demo), `point_ledger_direct` me nahi — TENEXCH ke demo user jaisa. Baaki users ke liye function same. Purge `source_user_id` se point_ledger rows bhi delete karta hai. (2) Bug: desktop account menu me demo ko sirf "Bet History" dikhta tha, **Log Out** gayab tha (demoOnly filter galat tha) — theek; mobile tiles ka filter bhi same. (3) Demo 30 min hi (user ne 15 bola phir 30 hi rakhne ko kaha); purge job ab har 1 min (pehle 5), to expire hote hi data jaldi hat jaata hai. Owner panel ka text "agent Sign In popup … 30 minutes".
**Kyun:** user: demo entry point_ledger me, direct me nahi; logout ka option; time ke baad data hate.
**Files / jagah:** migrations/162-demo-point-ledger.js, auth/demoCleanup.js, auth/index.js, demoLogin.test.js; frontend Header/AfterLogin/index.jsx, UserEnter/Panels.jsx; owner-panel entitlementCatalogue.ts
**Notes:** demo test 5/5, direct-ledger wale tests 85/85. Live: migration 162 chali; naye demo → point_ledger 1, point_ledger_direct 0; desktop menu "Bet History, Log Out", mobile "Bet History, Sign Out"; worker purge interval 60000.

## 2026-10-27 — Demo game card theme ke hisaab se
**Kya kiya:** Demo account ke game card me: brand green lock icon (gol halke green background me), bold "Real account needed", "Please sign in with a real user to play this game.", aur brand button **Play Sports** (→ `/sports`, agent site pe `/agent/sports`). Sab theme tokens (brand / primary / secondary / tertiary), light theme me bhi apne aap.
**Kyun:** user: validation popup theme ke hisaab se accha dikhe.
**Files / jagah:** frontend/src/pages/Game/index.jsx (PlayOverlay demo arm)
**Notes:** Browser: desktop 1366 (slot) + mobile 390 (Limbo) screenshot dekhe.

## 2026-10-27 — Demo user: game page pe "Please sign in with a real user to play this game."
**Kya kiya:** Demo account Original / GIS (koi bhi casino) game kholta hai to Play wala card (currency sentence + Balance + Play button) ki jagah sirf "Please sign in with a real user to play this game." Toast hataya (card hi bata deta hai). Bug bhi theek: page reload pe gates (/me) aane se pehle auto-launch chal jaata tha → backend DEMO_NOT_ALLOWED → "Under Maintenance" popup; ab auto-launch aur Play gates ready hone tak rukte hain.
**Kyun:** user: demo user ko game pe "please sign in with real user to play this game" dikhe.
**Files / jagah:** frontend/src/pages/Game/index.jsx (PlayOverlay `demo`, play / autoKey `gatesReady`)
**Notes:** Browser (agent site, demo): slot `90spins-by-espressogames` aur Original `limbo` dono pe sirf naya message, maintenance popup nahi.

## 2026-10-27 — Demo Login ab sirf agent site ke Sign In popup me
**Kya kiya:** Header (desktop + mobile) se Demo button hataya, mobile header wapas pehle jaisa (wide logo). **Demo Login** button ab sirf `/agent` site ke Sign In popup me, Sign In ke neeche (owner flag `demo_login` ON ho tab). Demo account `/agent` site pe hi rehta hai (agent player jaisa, `/agent/sports`). Messages "Sign up…" ki jagah "Use a real ID…" (agent site pe sign up nahi): casino toast + backend DEMO_NOT_ALLOWED, demo khatam hone ka toast, DEMO_EXPIRED.
**Kyun:** user: demo button upar header me nahi, sirf sign in popup me, aur sirf agent sign in page pe.
**Files / jagah:** frontend Header/index.jsx (wapas), components/modals/Auth/DemoButton.jsx (Header se move) + Auth/index.jsx, context/GatesContext.jsx, pages/Game/index.jsx; backend casino games/in-house errors, user auth.errors.
**Notes:** Browser (desktop + 390 mobile): main site header + Sign In popup me Demo 0; `/agent/login/signin` me 1; click → `/agent/sports`, DEMO badge, ₹1500.

## 2026-10-27 — Demo login (TENEXCH jaisa): Demo button, ₹1500, sirf sports exchange, 30 min, phir delete; admin me kahin nahi
**Kya kiya:**
- **Owner panel → "Demo login"** switch (`demo_login`, default ON). OFF = button gayab aur backend mana (DEMO_DISABLED).
- **Website:** Sign In ke paas **Demo** button (desktop + mobile; mobile pe button aane ke liye square logo). Ek click = naya demo account, seedha `/sports`. Header me **DEMO** badge, sirf INR balance, bell/gift nahi, menu me sirf Bet History (sports My Bets) + Log Out. Wallet, settings, profile, notifications, sports Statement, bonus/promo/VIP sab band (gates `notDemo`). Casino/Originals dikhte hain par launch pe toast "Demo accounts can only bet on sports". 30 min pe apne aap sign out.
- **Backend:** `POST /user/auth/demo-login` → `users.is_demo` direct user `demo######`, random password, credits.inr 1500, session + token demo ke end (30 min) tak, idle logout nahi, signup/referral bonus nahi. Restrictions agent player jaisi (`isRestrictedPlayer` = agent ya demo): koi deposit/withdraw/bonus/VIP/race/notification nahi, wallet sirf INR. Casino launch guard + in-house engine demo ko mana (DEMO_NOT_ALLOWED).
- **Exchange (TENEXCH flow):** demo ka `mssports.users` account **`demo_owner`** (mssports.Owners #2) ke neeche, `is_demo` + `demo_expires_at` ke saath — iska P&L / commission site owner tak nahi jaata (walletService ki demo branch).
- **Delete:** user-worker job har 5 min: jo demo expire ho chuka aur koi open sports bet nahi, uski har table (`public` + `mssports`, user_id/uid/userid) ki rows + users row ek transaction me delete.
- **Admin:** 23 files me demo users har list/count/report/dashboard/chart/market book/bet list/lookup/push/notification audience se bahar (`is_demo`).
**Kyun:** user: TENEXCH jaisa demo user — 1500, sirf sports exchange bet, koi promotion/bonus/extra feature nahi, sirf INR, bet history, thodi der me sab delete, admin me kuch nahi, demo ka sign, owner panel se ON/OFF, demo owner TENEXCH jaisa.
**Files / jagah:** migration 161-demo-users; auth (demoLogin, demoCleanup + job), packages/auth agentPlayers; wallet, notifications; casino gameEntitlement + in-house engine; sports platformAccounts (ensureDemoOwner); admin 23 service files; frontend DemoButton, gates, GatesContext, Header/AfterLogin, UserEnter, Exchange rail/frame, Game page; owner-panel entitlementCatalogue.
**Notes / tests:** demoLogin.test 5/5 (₹1500, 30 min, caps off, expired refresh refused, purge open-bet/real-player safe); admin 3 naye test, baaki failures pehle se same; gates 8/8, frontend 255/255. Live: demo-login, /me, sirf INR 1500, originals launch/deposit/withdraw/bonus refused, notifications 0, **₹100 sports bet laga** (1500→1400) aur exchange account demo_owner ke neeche; admin users list/dashboard/direct wallet/exchange bets/book me nahi dikha; purge: expired bina bet wala demo poora gaya, open bet wala ruka. UI (headless, desktop + 390 mobile) check kiya.

## 2026-10-27 — F2Pay ka adhoora (non-final) callback ab audit log me save hota hai
**Kya kiya:** Deposit aur payout callback jab final state (Paid / Completed / Failed / Closed) nahi hota to pehle chupchap 200 deta tha, body kahin save nahi hoti thi. Ab `psp_callback_log` me ek row (`rejection_code = NOT_FINAL`, poora signed payload) likhti hai. Paisa / status kuch nahi badalta, digest reserve nahi hota.
**Kyun:** ₹100 payout (WD_1793114441952_6cd937034923) ka callback 17:32 UTC pe F2Pay (13.228.197.106) se aaya, signature sahi, 200 diya, par row Pending hi rahi — F2Pay ne kaunsa status bheja ye pata hi nahi chal sakta tha.
**Files / jagah:** backend/services/user/src/modules/psp/psp.service.js
**Notes:** PSP tests 35/35.

## 2026-10-27 — 2 purane fail test theek kiye (bug nahi tha)
**Kya kiya:** (1) Dashboard chart test `USD` maang raha tha — dashboard ab owner ki default coin (USDT, unset ho to) me dikhata hai (b5570102), USDT = USD 1:1, isliye sirf test ki expectation `USDT` ki. (2) Manual deposit test kam amount (450 of 500) bina reason ke approve kar raha tha — backend ab reason maangta hai (CREDIT_REASON_REQUIRED), test me reason joda. App ka code nahi badla.
**Kyun:** user: fail kyun hue, koi bug to nahi — dono test purane the, code sahi.
**Files / jagah:** services/admin/src/modules/dashboard/__tests__/dashboardStats.test.js, services/user/src/modules/fiat-deposit/__tests__/depositWithdraw.test.js
**Notes:** dashboard 42/42, fiat-deposit 25/25.

## 2026-10-27 — F2Pay withdrawal admin dashboard chart me bhi + F2Pay data audit
**Kya kiya:** Dashboard ka deposits/withdrawals chart (`stats/series`) sirf `withdrawals` + `fiat_withdrawals` padhta tha — `f2paywithdrawals` (Success) joda. Baaki jagah check kiya, F2Pay pehle se aa raha tha: dashboard headline + drill-down (movements), Transactions → Withdraw/Deposit → Fiat, Users list Deposits/Withdrawals + upar ke cards, balance sheet, finance/player stats, statements. F2Pay deposits sab jagah (depositRails). `point_ledger_direct` me F2Pay deposit (+500), withdrawal hold (-10, -100) aur refund (+10) sab rows hain.
**Kyun:** user: F2Pay withdraw ka data bhi har jagah dikhe jahan baaki withdraw dikhte hain; deposit aur direct ledger bhi check.
**Files / jagah:** backend/services/admin/src/modules/dashboard/dashboardStats.service.js
**Notes / pending:** ₹100 F2Pay payout (WD_1793114441952_6cd937034923) 15:20 UTC se Pending — F2Pay ka payout callback abhi tak nahi aaya. Dashboard tests 40/42 (2 fail pehle se, change ke bina bhi).

## 2026-10-27 — Manual withdrawal toggle ab website pe bhi lagta hai
**Kya kiya:** Admin → Transactions → Withdraw → Manual ka Super Admin "Manual withdrawals ON / OFF" switch pehle se tha aur backend mana karta tha (MANUAL_WITHDRAW_DISABLED), par website form dikhata rehta tha. Ab `gates.manualWithdraw()` `/me` capabilities.manualWithdraw bhi dekhta hai: OFF = Withdraw me Manual form/tab nahi dikhta (Automatic chalu ho to sirf wahi). Dono band = "Bank withdrawals are not available right now." Gate test +1.
**Kyun:** user: deposit jaisa — Super Admin OFF kare to website se manual withdraw na ho.
**Files / jagah:** frontend/src/services/gates.js, gates.test.js, frontend/src/pages/Wallet/Withdraw/FiatForm.jsx

## 2026-10-27 — Manual deposit approve: amount ab edit nahi hota
**Kya kiya:** Admin → Transactions → Deposit → Manual → Approve dialog me "Credit amount" ab sirf dikhta hai (disabled), badla nahi ja sakta. Approve pe sirf transaction password jaata hai, player ne jitna amount bheja utna hi credit hota hai. Kam amount + reason wala field hata diya.
**Kyun:** user: approve karte waqt amount editable nahi hona chahiye.
**Files / jagah:** admin/src/views/finance/FiatDeposits.tsx (Approve)

## 2026-10-27 — Admin Deposit → Manual: Super Admin ka "Manual deposits ON / OFF" toggle wapas
**Kya kiya:** Transactions → Deposit → Direct Users → Manual ke upar `ManualSwitch kind='deposit'` wapas lagaya (Withdraw wale jaisa). OFF = website pe manual deposit ka option chhup jaata hai (`gates.manualDeposit()` → `/me` capabilities.manualDeposit) aur backend bhi mana karta hai (MANUAL_DEPOSIT_DISABLED). Sirf Super Admin badal sakta hai, transaction password ke saath. Naya code nahi — switch, API aur gate pehle se the, sirf admin me dikhna band tha (362be175).
**Kyun:** user chahta hai manual deposit website pe tabhi dikhe jab Super Admin ne ON kiya ho.
**Files / jagah:** admin/src/views/transactions/Transactions.tsx

## 2026-10-27 — Automatic withdraw: ₹100–₹30,000 ki limit + "approved successfully" popup; wagering check wapas chalu
**Kya kiya:** Wallet → Withdraw → Automatic me amount ₹100 se kam ya ₹30,000 se zyada ho to form wahi rok deta hai (Max button bhi 30,000 pe rukta hai, niche "Max: 30,000 INR" likha). Payout accept hone pe naya popup "Withdrawal request approved successfully" (amount + Transaction link), purana toast hata diya. TEMP wala `wager: false` wapas `wager: true` — rollover check fir se chalu.
**Kyun:** F2Pay ₹10 ka payout mana kar raha tha ("amount should between 100.00 - 30000.00"); user ko success ke baad clear popup chahiye tha. F2Pay test ho gaya, isliye wagering check wapas.
**Files / jagah:** frontend/src/pages/Wallet/Withdraw/FiatForm.jsx (AutoWithdraw, ApprovedPop), backend/services/user/src/modules/withdraw-requirements/withdrawRequirements.js

## 2026-10-27 — TEMP: withdraw ka wagering (rollover) check band, F2Pay withdrawal test ke liye
**Kya kiya:** `rules()` me `wager: true` → `wager: false`. Ab koi bhi withdrawal "Complete your wagering requirement…" pe nahi rukta (backend + Withdraw page dono).
**Kyun:** user ko F2Pay automatic withdrawal test karna hai, test player ka rollover pura nahi tha. **Test ke baad wapas `wager: true` karna hai.**
**Files / jagah:** backend/services/user/src/modules/withdraw-requirements/withdrawRequirements.js:183

## 2026-10-27 — F2Pay withdrawal (automatic) chalu + Withdraw me Manual / Automatic do section
**Kya kiya:** F2Pay ka commented payout code chalu kiya: INR bank payout (BANK_INR, `/payout/inr/order/create`), sirf INR. Player request karta hai → balance usi waqt hold (ek transaction me hold + `f2paywithdrawals` Pending row) → F2Pay ko signed payout → reject / error pe turant refund. Callback `/api/v1/user/psp/f2pay/payout-callback`: `Completed` → Success, `Failed` → ek hi baar refund, `Processing` jaisa beech ka state → kuch nahi (pehle har non-success pe refund ho jata tha). Naya table `f2paywithdrawals` (migration 160, model `F2payWithdrawals`). F2Pay withdrawal har jagah gina: player Transaction history + admin Transactions → Withdraw → Fiat, withdrawal cap + daily limit (pending bhi), admin dashboard totals + movements, finance stats (Fiat withdrawals "F2Pay"), player stats, reports (lifetime totals, reward totals, ledger), statement. `/user/payments/methods/f2pay` ab `payout: ['INR']` bhi deta hai (AUTO_WITHDRAWALS_ENABLED + owner withdrawal_mode + gateway / `f2pay_inr` switch). Player site Wallet → Withdraw (INR): "Withdraw Type: Manual | Automatic" (deposit jaisa) — Automatic me Account Holder Name, Account Number, IFSC, amount → F2Pay. Owner ne withdrawal_mode "automatic only" kiya ho tab bhi Withdraw tab khula rehta hai.
**Kyun:** User: "f2pay ka withdraw bhi hai usko bhi laga do … ek section withdraw me automatic rakhna and ek manual do section me divide karo … automatic me f2pay ka withdraw laga do … ui me bhi".
**Files / jagah:** backend/packages/db/{migrations/160-f2pay-withdrawals.js,src/models/extended/F2payWithdrawals.js}, backend/services/user/src/modules/payment-orders/{gateways/index.js,paymentOrders.service.js,__tests__/paymentOrders.test.js}, backend/services/user/src/modules/psp/{providers/index.js,psp.service.js,controllers/index.js,__tests__/psp.test.js}, backend/services/user/src/modules/transaction-history/transactionHistory.constants.js, backend/packages/common/src/{withdrawalCapFigures.js,withdrawalDailyLimit.js}, backend/packages/common/__tests__/withdrawalDailyLimit.test.js, backend/services/admin/src/modules/{dashboard/dashboard.constants.js,dashboard/dashboard.service.js,reports/financeStats.service.js,reports/playerStats.service.js,reports/reports.service.js,statements/statements.service.js}, frontend/src/{pages/Wallet/Withdraw/FiatForm.jsx,services/withdraw.js,services/gates.js}, frontend/docs/wallet.md
**Notes / pending:** Live: backend/.env `AUTO_WITHDRAWALS_ENABLED=true` (backup `.env.bak-f2pay-withdraw-2026-10-27`; A-Pay/WayPay/CricPay/UPI ke keys khali hain to sirf F2Pay khulta hai), migration 160 live DB pe, parker-user-svc + parker-admin-svc + parker-user-worker restart, frontend build + parker-frontend restart. Live check: methods/f2pay → `payout: ["INR"]`, payout-callback route live (bina sahi sign 401 PSP_INVALID_SIGNATURE, CORS bypass). Tests: payment-orders + psp 83 pass (1 purana fail "operator's stored maximum" — settings stub, pehle se), naye 4 test pass; history / cap / admin reports me sirf pehle wale 10 fail, naya koi nahi. Asli F2Pay payout live pe NAHI bheja (asli paisa jata) — pehla real test user ke bank account se karna; F2Pay ko payout ke liye server IP 217.216.78.106 whitelist karna pad sakta hai (payin pe tha). Signed-in Withdraw screen ka screenshot nahi liya (live pe test session banana block hua). Player ke Transaction detail dialog me F2Pay withdrawal ka detail nahi khulta (fiat list me match nahi hota). Push nahi kiya.

---

## 2026-10-26 — Idle logout: login ke 5 min baad ek check, bet nahi to logout (owner + Super Admin switch)
**Kya kiya:** Naya owner flag `idle_logout` (owner panel → Player sessions, default OFF, "Allow all" se ON nahi hota) + Super Admin switch (Site config → Limits → User accounts, `idle_logout`, default ON; sirf tab dikhta hai jab owner ne flag ON kiya). Dono ON → login (password / Google / sign-up) ke jawab me `idleCheckAt` = login + 5 min. Player site (`services/tokens.js`) us waqt ek baar `POST /api/v1/user/auth/idle-check` bulati hai; backend pichhle 5 min me player ki bet dekhta hai — sports (`mssports."SportsBet"`), Originals (`og_transactions` kind bet), casino (`gis_transactions` action bet, JSGames `js_game_transactions` bhi). Koi bet nahi → session revoke (`idle_logout`), tab logout; bet hai → check khatam, dobara nahi chalta. Reload pe time localStorage se wapas aata hai, refresh pe wahi rehta hai. Purana fixed cap `player_session_minutes` (login ke 5 min baad sabko logout, bet karte hue bhi) hataya: setting, `SESSION_CAP_EXEMPT_LOCALHOST`, refresh ka end carry-over, uska test; session phir se 30 din.
**Kyun:** User: "ye section owner me lagao and super admin me bhi only … login hone ke baad 5 min baad ek setTimeout chalao … sports bet, original game, gis game transaction se nikal kar agar koi bhi entry nahi hai to 5 min baad logout … jab ye functionality active hogi owner se ya super admin se tabhi ye setTimeout ek baar chalega".
**Files / jagah:** backend/packages/common/src/entitlements.js, backend/services/user/src/{config.js,modules/auth/{auth.service.js,routes/user.routes.js,controllers/user.controller.js,__tests__/idleLogout.test.js}}, backend/services/user/src/modules/auth/__tests__/sessionCapOrigin.test.js (deleted), backend/services/admin/src/modules/site-config/siteConfig.service.js, backend/.env.example, owner-panel/src/configs/entitlementCatalogue.ts, admin/src/{contexts/SessionContext.tsx,views/site-config/OperatorSettings.tsx}, frontend/src/services/{tokens.js,auth.js,endpoints.js}
**Notes / pending:** Live: parker-user-svc + parker-admin-svc restart, admin + owner-panel + frontend build + restart. Live API test (QA player, baad me delete): flag OFF → idleCheckAt null; owner ON → 5.00 min; bina bet check → signedOut, refresh 401 AUTH_SESSION_REVOKED; SA OFF → null; aakhir me SA default + owner OFF (live abhi OFF). Purana access token revoke ke baad bhi apni expiry (≤15 min) tak `/auth/me` pe chalta hai — player site wahi pal tokens hata deti hai. Bet wala rasta live pe nahi chalaya (unit test me hai); browser me timer nahi dekha. Tests: user auth 70/70 + naya 3/3, frontend 254/254, owner 66/67 (siteUi pehle se), admin site-config akele sirf purana "every flag the admin screen lists".

---

## 2026-10-26 — Live data fresh: sirf owner + Super Admin bache, baaki sab saaf
**Kya kiya:** Live DB `parker567` se saare players (76), agents (agentx11, qaagbtjxg, agentx12, agentx13), Admin (qastaff9uhi), dono executives, branch001 aur unka saara data hataya: wallets / credits, ledgers (public + mssports, point_ledger_direct, owner_direct_ledger), deposits / withdrawals (fiat, F2Pay, CCPayment, PSP log), bets (originals, Slotegrator, sports + settlement / exposure / result tables), wager / VIP / bonus / rakeback / race rewards / referral (team, rewards, unlocked_rewards), vault, KYC, bank accounts, sessions, login history, notifications, activity logs, staff_transfers, settled races (open race #13 bacha). Super Admin: Direct User balance 10,00,000 (owner_direct_ledger me ek `add` + staff_transfers me ek `owner_direct_topup`), Agent System wallet (credits) ke inr / credit / all_point / sports_pts / original_game_pts 0. KYC + deposit receipt files (`backend/storage/kyc`, `storage/deposits`, 87) disk se hataye. Settings, owner panel data, games catalogue, promotions, banners, VIP levels, payment methods, currencies sab waise hi.
**Kyun:** User: "is project ka jo data hai vo pura fresh kar do … owner and super admin ko chhod ke sab delete … super admin ka vapas account 10 lakh reset kar do".
**Files / jagah:** Sirf live DB + backend/storage (code nahi badla). Backup: `/var/backups/parker567/parker567-before-wipe-2026-10-26-1139.dump` (pg_dump -Fc, wipe se pehle, services band), files `/var/backups/parker567/storage-before-wipe-2026-10-26-1139/`, chalayi SQL `/var/backups/parker567/wipe-2026-10-26-1139.sql`.
**Notes / pending:** Ek transaction me chala (pehle BEGIN/ROLLBACK dry-run). Backend services wipe ke dauran band, phir saare parker-* backend + gateway restart (online, naye errors nahi). Live check (SA login): owner wallet directBalance 1000000, agent wallet sab 0, players directory 0, dashboard movements 0. IDs ke sequences reset NAHI kiye — naya player purani id nahi lega (casino providers ke paas purani ids ka data hai). Redis is setup me nahi hai. Wapas chahiye to: `pg_restore --clean -d parker567 <dump>`. Naya signup / deposit flow wipe ke baad nahi chalaya. Push nahi kiya.

---

## 2026-10-26 — Owner panel: payment methods ab entitlements API me (alag route hataya)
**Kya kiya:** Owner panel ka `GET /api/owner/entitlements` ab document ke saath `siteMethods` bhi deta hai (site ke `payment_methods` rows: gateway, currency, code, ownerEnabled, siteEnabled, addedBy, `source` / `reason`). Alag route `GET /api/owner/payment-methods` hata diya; Features screen ka F2Pay methods editor ab ek hi call padhta hai. `SiteMethods` type `lib/entitlements/types.ts` me. Super Admin ka `admin/site-config/payment-gateways` pehle se methods ko har gateway ki currencies ke andar deta hai — wahan koi alag API nahi thi, badla nahi.
**Kyun:** User: `/owner/api/owner/payment-methods` ka data usi API me aaye jisse payment gateway ka baaki data aata hai, merge karo, alag API nahi.
**Files / jagah:** owner-panel/src/app/api/owner/entitlements/route.ts, owner-panel/src/app/api/owner/payment-methods/route.ts (deleted), owner-panel/src/lib/entitlements/{siteMethods.ts,types.ts}, owner-panel/src/views/entitlements/Entitlements.tsx
**Notes / pending:** Live: owner-panel build + parker-owner-panel restart. Live check: signed-in `GET /owner/api/owner/entitlements` me `siteMethods` (f2pay INR UpiMixed, USDT PI_USDT_TRX), purana route 404. Coins / Branding screens bhi yahi GET padhte hain — ab unke load pe bhi site ka methods read hota hai (4 s timeout, fail hone pe khaali list). Tests 66/67 (siteUi pehle se fail). Backend nahi badla. Push nahi kiya.

---

## 2026-10-26 — Branch casino bets: vendor naam hataye + push
**Kya kiya:** Branch view ke casino bets "Provider" column me Slotegrator / JSGames / Seamless likha aata tha — ab shared `casinoSourceLabel` (Casino feed 1/2/3). Origin ke 2 naye commits par rebase karke push kiya.
**Kyun:** Admin me vendor ka naam nahi dikhna chahiye (admin-no-vendor-names). User: "code push krde".
**Files / jagah:** admin/src/views/branches/BranchView.tsx
**Notes / pending:** Live: admin build + parker-admin restart.

## 2026-10-26 — Branch panel: sidebar + Users / Deposits / Withdrawals / Originals / Casino / Sports / Statement
**Kya kiya:** Branch panel (`/branch`) ko apna sidebar diya (mobile pe ☰). Naye reports, sirf branch ke direct players: Deposits / Withdrawals (har rail, har status, payment method, reference, details — user-service `transaction-history` me `branchId` filter + internal route `GET /internal/user/history/branch`, internalAcl me admin-service ko allow), Originals / Casino / Sports (StatementsService `betsFor(ids, { kind, sources })`, casino union me `sources` filter), player page (profile + balance + saare reports us player ke). Branch module me routes `players/:userId`, `deposits`, `withdrawals`, `bets?kind=` (portal + Super Admin dono). Super Admin ka `/branches/:id` ab saare tabs + `/branches/:id/users/:userId`.
**Kyun:** User: "branch panel in side bar where we can see users, deposite withdraw reports payment method and details report regarding original, casino, sports and all history … the branch can see all data of his user properly".
**Files / jagah:** backend/services/admin/src/modules/branches/*, backend/services/admin/src/modules/statements/statements.service.js, backend/services/user/src/modules/transaction-history/{index.js,transactionHistory.service.js,transactionHistory.validators.js,routes/internal.routes.js}, backend/packages/common/src/internalAcl.js, admin/src/views/branches/*, admin/src/app/branch/(panel)/*, admin/src/app/(pages)/branches/[branchId]/users/[userId]/page.tsx
**Notes / pending:** Live: parker-user-svc + parker-admin-svc + parker-admin restart, admin build. Test: branches 8 / 8 (deposits / bets / player page doosri branch ke nahi dikhte); statements + transaction-history + common: wahi 1 purana fail (verify-strict-validators, HEAD par bhi). Live DB par branch001 ke saare reports bina error chale (abhi 0 players). Bet reports me branch ke player ids list ki tarah query me jaate hain (hazaron tak theek). Push nahi kiya.

## 2026-10-26 — Branch Management (owner switch, Super Admin branches, /branch panel)
**Kya kiya:** Owner panel me policy `branch_management` (On / Off, default Off). Migration 159: `branches` table + `users.branch_id`. Admin-service module `branches`: Super Admin `admin/branches` (list, create, rename, active / inactive, password, report, har branch ka summary / players / create player / statement) aur branch ka apna `admin/branches/portal/*` (login, me, logout, summary, players, create player, statement) apne token (`TOKEN_TYPES.BRANCH`) ke saath. Branch ke players direct users + `branch_id`. Totals `DashboardStatsService` me naye `branchId` scope se; statement `point_ledger_direct` se (`directBetHistory.ledgerRow` share). Admin: sidebar Branch Management (Branches, Branch Report), `/branches/:id`, `/branch/login` + `/branch` panel (apna cookie, proxy + gw route branch path pe branch cookie bhejte hain), `policyOn()` SessionContext me.
**Kyun:** User: "owner panel me option to on and off feature for branch management … super admin can create a branch with login details … /branch login … branch can see all direct player under him … create id … transaction game play … total deposit and withdraw … super admin each branch report status … off branch or active change password … analysis all branch report". Faisle: players = direct users; inactive = sirf branch login band.
**Files / jagah:** backend/packages/db/migrations/159-branches.js, backend/services/admin/src/modules/branches/*, backend/packages/auth/src/tokens.js, backend/packages/common/src/{featureCatalogue.js,sitePolicy.js}, backend/services/admin/src/modules/dashboard/dashboardStats.service.js, backend/services/admin/src/modules/exchange-reports/directBetHistory.js, owner-panel/src/configs/entitlementCatalogue.ts, admin/src/{proxy.ts,configs/site.ts,configs/navConfig.tsx,contexts/SessionContext.tsx,hooks/use-nav-visible.ts,lib/api/client.ts,lib/auth/session.ts,app/api/gw/[...path]/route.ts,app/api/branch/*,app/branch/*,app/(pages)/branches/*,app/(pages)/branch-report/page.tsx,views/branches/*,views/site-config/Features.tsx}
**Notes / pending:** Live: migration 159 on parker567, admin + owner panel build, parker-admin-svc + parker-admin + parker-owner-panel restart. Switch live par Off hi chhoda (owner ka faisla) — APIs `BRANCH_DISABLED` deti hain, /branch/login khulta hai. Test: branches 7 / 7 (test DB); dashboard / exchange-reports / features / auth / common: sirf purana dashboardStats "converted to USD" fail. Switch On karke UI ka poora flow browser me nahi chalaya. Report har branch ke liye dashboard series chalata hai (tens of branches tak theek). Branch player ka per-player deposit total nahi (statement me player filter + Deposit type). Push nahi kiya.

## 2026-10-24 — Admin Transactions → Deposit / Withdraw → Fiat ab gateway tables (F2Pay samet) se
**Kya kiya:** Fiat tab ("Gateway (PSP) orders across every rail") `admin/user/history/deposits` / `/withdrawals` padhta hai, jo galti se purana crypto `deposits` table aur `fiat_withdrawals` (manual) padhte the — koi gateway (A-Pay, WayPay, F2Pay) wahan kabhi nahi dikhta tha. Naya `gatewayTransactions({ kind })` (transaction-history service): DEPOSIT_SOURCES / WITHDRAWAL_SOURCES me se crypto aur manual chhod ke saari gateway rails, sab players, UI ke shape me (provider, id, userId, reference, amount, currency, status, createdAt). Purana admin-only `withdrawals()` hataya. Test: F2Pay + A-Pay + WayPay aate hain, crypto / manual nahi.
**Kyun:** User: "super admin me transaction wale section me iska table ka withdraw and deposit wali table se data aa raha bhai … admin panel me jaha jaha baaki sari payment gateway table se data aa raha hai vahi par is f2pay ka table se data nikal kar add kar do bhai simple".
**Files / jagah:** backend/services/user/src/modules/transaction-history/{transactionHistory.service.js,controllers/index.js,__tests__/transactionHistory.test.js}
**Notes / pending:** Live: parker-user-svc restart; Transactions → Deposit → Fiat par ab F2Pay ke 13 orders dikhte hain (screenshot liya). Withdraw → Fiat ab khaali — F2Pay ka payout nahi aur A-Pay / WayPay payouts live par 0; pehle wahan manual (`fiat_withdrawals`) dikh raha tha jo Manual tab me hai hi. Admin UI nahi badla. Push nahi kiya.

---

## 2026-10-24 — F2Pay ke deposits har jagah jahan baaki gateways ke aate hain (balance sheet, reports, graph, gift card, spin wheel) + direct ledger check
**Kya kiya:** Poore backend me jahan baaki payment gateways (A-Pay, WayPay, CricPay) ke deposit padhe jaate hain, wahan F2Pay (`f2paydeposits`, status Success) joda: admin player Balance Sheet (`reports.service #collectEvents`, "F2Pay deposit (<order>)", callback ka `updated_at`), Marketing stats (`marketing.constants` DEPOSIT_SOURCES), Deposit Reports (user-service `depositReports.constants` SOURCES `f2pay`; validator ki provider list ab SOURCES se), Gift card ki deposit shart aur Spin wheel ki deposit shart (`giftCards.constants`, `spinWheel.constants`). Jo pehle se F2Pay padhte the (badla nahi): dashboard series / graph, finance stats graph, player stats, Users list / summary / Risk (`realDepositsSql`), withdrawal cap + Turnover Report (`withdrawalCapFigures`), wager rollover, affiliate, transaction history; first-deposit bonus aur profile turnover `credits_ledger` DEPOSIT padhte hain jo F2Pay callback likhta hai. Direct ledger: F2Pay callback ka `wallet.credit` `directLedgerContext` (DEPOSIT / DEPOSIT / `PSP_F2PAY:<order>`) lagata hai aur trigger `mssports.point_ledger_direct` me row likhta hai — psp test me ab assert hai.
**Kyun:** User: "deposit and withdraw dono jaha jaha data aata hai baaki payment gateway ka vaha vaha se f2pay ka bhi data aana chahiye … graph me bhi reflect … jab user deposit and withdraw karta hai f2pay me to uski point ledger direct me save bhi honi chahiye entry callback me … user ke balance sheet wagera me code ke hisaab se sab kuch aana chahiye".
**Files / jagah:** backend/services/admin/src/modules/reports/{reports.service.js,__tests__/reports.test.js}, backend/services/admin/src/modules/marketing/marketing.constants.js, backend/services/user/src/modules/deposit-reports/{depositReports.constants.js,depositReports.validators.js}, backend/services/user/src/modules/gift-cards/giftCards.constants.js, backend/services/user/src/modules/spin-wheel/spinWheel.constants.js, backend/services/user/src/modules/psp/__tests__/psp.test.js
**Notes / pending:** Withdrawal: F2Pay ka payout band hai (user ne deposit-only bola tha), koi f2pay withdrawal table nahi — jodne ko kuch nahi; payout chalu karna ho to table + callback + ye sab jagah alag kaam. Live: parker-user-svc + parker-admin-svc restart; tonny ki balance sheet API 200. Live par F2Pay ka abhi koi Success deposit nahi, isliye screens par F2Pay rows abhi 0. Pehle se fail reports ke 6 tests (HEAD par bhi). Push nahi kiya.

---

## 2026-10-24 — Dashboard (Direct Users) me F2Pay ke deposits
**Kya kiya:** Admin dashboard jahan direct users ke deposit / withdrawal dikhata hai, wahan F2Pay (`f2paydeposits`) joda. "Latest money movements" (`MOVEMENT_SOURCES`) me naya source `f2pay_deposit` "F2Pay deposit" (status Success), aur headline totals (`#depositTotals`, overview) me F2Pay ka group. Graph / KPI wali series (`realDepositsSql`) me F2Pay pehle se tha. `DEPOSIT_SUCCESS.f2paydeposits = ['success']`. Test: F2Pay ka Success deposit movements aur totals me, Pending nahi.
**Kyun:** User: "dashboard me data jo jo payment gateway se aa raha hai … f2pay wale table se data aana chahiye … deposit and withdrawal … direct user wale section me … jaha jaha dashboard me direct user ka deposit and withdrawal show ho raha hai vaha f2pay se data bhi nikal ke add kar lena".
**Files / jagah:** backend/services/admin/src/modules/dashboard/{dashboard.constants.js,dashboard.service.js,__tests__/dashboard.test.js}
**Notes / pending:** Withdrawal: F2Pay ka koi withdrawal table nahi (payout band, sirf deposit) — kuch jodne ko nahi. Live par F2Pay ka abhi koi Success deposit nahi (13 rows, sab Pending / Failed), isliye dashboard par abhi 0 dikhega; pehla paid deposit aate hi dikhega. parker-admin-svc restart (admin UI nahi badla). Pehle se fail: dashboardStats "without a currency … converted to USD" (HEAD par bhi). Push nahi kiya.

---

## 2026-10-24 — F2Pay INR + crypto (USDT); owner panel me INR / Crypto switch, Super Admin sirf F2Pay ON/OFF
**Kya kiya:** user-service gateway: F2Pay ab INR aur USDT (`F2PAY_CRYPTO = ['USDT']`). INR order `/payin/inr/order/create`, USDT order `/payin/crypto/order/create` jisme bizContent me `currency: 'USDT'` (F2Pay ke sample jaisa), method `PI_USDT_TRX`. Migration 155: `payment_methods` me f2pay USDT PI_USDT_TRX. `#methods` ab sirf owner ke switch dekhta hai (method `owner_enabled` + currency flag `f2pay_inr` / `f2pay_usdt`); Super Admin ke currency/method filter hataye. admin-service: F2Pay currencies INR + "Crypto (USDT)", Super Admin ka switch sirf poora gateway (`PAYMENT_SWITCHES` = gateway names); currency switch, "Add method" aur method switch (routes, validators, service, errors) hataye; list me active currencies + methods sirf dikhte hain. Admin Settings → Payment Methods: F2Pay ka ON/OFF + uske neeche active currencies aur methods (read-only). Owner panel F2Pay group: `f2pay_inr` "INR (UPI)" + `f2pay_usdt` "Crypto (USDT, TRC20)". Frontend: Crypto tab me USDT par F2Pay ka "Automatic" option (Deposit Method: Deposit Address / Manual | Automatic), `AutoDeposit` crypto ke liye (`crypto` prop, wallet row USDT, label "USDT · TRC20"). Tests: USDT order crypto endpoint par, USDT callback USDT me credit, Super Admin sirf gateway switch.
**Kyun:** User: "f2pay ka code bss inr and crypto ke liye hi rakho … agar frontend me currency inr hai to inr se agar crypto … to crypto se payment karo … owner panel me option do f2pay me active karne ke liye inr and crypto bss lekin super admin ko bss ye dikhna jo active hai bss super admin ye kar sakta hai f2pay on ya off".
**Files / jagah:** backend/services/user/src/modules/payment-orders/{gateways/index.js,paymentOrders.service.js,__tests__/paymentOrders.test.js}, backend/services/user/src/modules/psp/__tests__/psp.test.js, backend/services/admin/src/modules/site-config/{siteConfig.service.js,siteConfig.validators.js,siteConfig.errors.js,routes/admin.routes.js,__tests__/siteConfig.test.js}, backend/packages/db/migrations/155-f2pay-crypto-usdt.js, admin/src/views/settings/PaymentMethods.tsx, owner-panel/src/configs/entitlementCatalogue.ts, frontend/src/pages/Deposit/{CryptoTab.jsx,AutoDeposit.jsx,deposit.js}
**Notes / pending:** Live: migration 155, parker-user-svc + parker-admin-svc restart, admin + owner-panel + frontend build + restart. Live test (tonny, USDT 10, PI_USDT_TRX): F2Pay `20002 invalid method` — request + signature theek, merchant F2_6312 par crypto method chalu nahi / code alag. F2Pay se crypto channel chalu karwana ya sahi method code lena; code mile to owner panel → F2Pay → Crypto ke methods me daal do (code change nahi). Crypto callback ka shape INR jaisa maana hai (state / amount). Frontend build me Next.js ka security check kabhi fatal ho jata hai (16.4.0 par advisory) — dobara chalane par build ho gaya; upgrade alag kaam. Pehle se fail wahi 3 tests. Push nahi kiya.

---

## 2026-10-24 — F2Pay sirf INR: IDR ke methods, payload aur switches hataye
**Kya kiya:** F2Pay ab sirf INR ke liye. user-service gateway: `F2PAY_PAYIN` (INR/IDR endpoint + decimals table) hataya — `supports` = INR only, order hamesha `/payin/inr/order/create`, amount 2 decimals, phone last 10 digits. admin-service: F2Pay ki currencies me sirf INR (`f2pay_idr` switch gaya; Super Admin IDR method add kare to 422). Owner panel: F2Pay group me sirf `f2pay_inr` (IDR row + uske methods editor gaye). Migration 154: `payment_methods` se F2Pay ke 6 IDR methods (QRIS, DANA, CIMB, BRI, MANDIRI, BNI) delete. Frontend `DEPOSIT_FIATS` wapas `['INR']`. Tests INR-only ke hisaab se badle, F2Pay IDR wale test hataye. Callback check: 20:49 par F2Pay ka callback bypass ke baad 200 se aaya (signature sahi; state Paid nahi thi isliye credit nahi).
**Kyun:** User: "f2pay bss inr ke liye hi hai bhai to idr hata do … owner panel me bss f2pay me inr hi dikhao … idr ke method and payload hata do bhai bss inr ke liye code rakho".
**Files / jagah:** backend/services/user/src/modules/payment-orders/{gateways/index.js,__tests__/paymentOrders.test.js}, backend/services/user/src/modules/psp/__tests__/psp.test.js, backend/services/admin/src/modules/site-config/{siteConfig.service.js,__tests__/siteConfig.test.js}, backend/packages/db/migrations/154-f2pay-inr-only.js, backend/.env.example, owner-panel/src/configs/entitlementCatalogue.ts, owner-panel/src/lib/entitlements/{paymentMethods.ts,types.ts}, owner-panel/src/views/entitlements/Entitlements.tsx, frontend/src/config/hiddenFeatures.js
**Notes / pending:** Live: migration 154 (ab `payment_methods` me sirf f2pay INR UpiMixed), parker-user-svc + parker-admin-svc restart, owner-panel + frontend build + restart. Admin code nahi badla (Payment Methods screen backend ki list dikhata hai) to admin build nahi kiya. IDR wallet currency (migrations 151/152, `credits.idr`) waise hi hai — owner panel → Fiat currencies se OFF ho sakti hai. Pehle se fail: user paymentOrders "operator's stored maximum", admin site-config "every flag the admin screen lists", owner-panel siteUi (HEAD par bhi). Push nahi kiya.

---

## 2026-10-24 — F2Pay callback CORS par 403 ho raha tha — callbacks ab CORS se bahar
**Kya kiya:** F2Pay ka callback (13.228.197.106, 15:17) `Origin: https://example.com` header ke saath aaya aur gateway ke CORS ne `403 Origin … is not allowed by CORS` de diya — signature check tak pahuncha hi nahi. `packages/common/src/createApp.js`: ek niyam `isProviderCallback(path)` (`/callback|webhook/` ya PROVIDER_CALLBACK_PREFIXES) — CORS callbacks ko chhod deta hai; `gateway/src/encryptionRule.js` ab yahi niyam use karta hai (encryption + CORS ek hi rule). Baaki routes par CORS allowlist waisi hi. Test: `packages/common/__tests__/corsCallbacks.test.js`.
**Kyun:** User: "maine f2pay se ek callback bheja hai, dekho aaya hai, signature theek hai".
**Files / jagah:** backend/packages/common/src/{createApp.js,index.js}, backend/gateway/src/encryptionRule.js, backend/packages/common/__tests__/corsCallbacks.test.js
**Notes / pending:** Saare parker-* backend restart. Live check: foreign Origin ka nakli callback ab 401 PSP_INVALID_SIGNATURE (route tak pahunchta hai), player route par foreign Origin abhi bhi 403. F2Pay se callback dobara bhejna hai — signature tab dikhega. Push nahi kiya (user: bina bole push nahi).

---

## 2026-10-24 — F2Pay live test: IPv4 fix, INR order chala, IDR "invalid method"
**Kya kiya:** user-service `index.js` me `dns.setDefaultResultOrder('ipv4first')` — server F2Pay se IPv6 (2400:d321:2314:1798::1) par jata tha aur F2Pay ki whitelist me IPv4 hai (`20010 … not in payin ip white list`). Fix ke baad live par tonny (8623441393) ka INR ₹500 UpiMixed order bana: F2Pay `0000 success`, F2Pay ka signature hamari public key se verify, platNo PI6670135595243101, cashier URL mila (order DEP_1792847266494_461a92903d0e, Pending). IDR ke saare 6 methods (QRIS, DANA, CIMB, BRI, MANDIRI, BNI, 50,000 IDR) par F2Pay `20002 invalid method` (test DB par check kiya; tonny ki 3 live IDR requests bhi isi se Failed).
**Kyun:** User: "ek order create karke dekhna request ja rahi hai f2pay me ki nahi … tonny ke account se karo".
**Files / jagah:** backend/services/user/src/index.js
**Notes / pending:** parker-user-svc restart. F2Pay ab Payment Methods me ON hai (user ne kiya). IDR: F2Pay se pooch-na hai ki merchant F2_6312 par IDR API me chalu hai ya methodCode alag hain. Tonny ka ₹500 order pay karne par callback se credit hona chahiye — abhi pay nahi kiya.

---

## 2026-10-24 — F2Pay ke methods env se DB me: owner panel + Super Admin add / active
**Kya kiya:** Naya table `payment_methods` (migration 153): gateway, currency, code, `owner_enabled`, `site_enabled`, `added_by` (owner / site), `updated_by` (owner / staff:<id>), timestamps — env wale 7 methods (INR UpiMixed; IDR QRIS, DANA, CIMB, BRI, MANDIRI, BNI) seed. `.env` me ab sirf F2Pay keys (`F2PAY_INR_METHODS` / `F2PAY_IDR_METHODS` config, .env.example aur live .env se hataye). user-service `#methods`: ek query + owner plan ka ek read + Super Admin list ka ek read → chalu methods (dono switch ON, currency ON); methods list aur order dono isi se. Super Admin (Settings → Payment Methods): har currency ke neeche methods, har method ka switch, "Add method" — sab transaction code ke saath, DB me `updated_by` + activity log. Owner panel: owner document me naya block `paymentMethods` (`{ f2pay: { IDR: [{ code, active }] } }`), F2Pay group me har currency ke neeche editor (site ke methods bhi dikhte hain owner-key read `GET /admin/site-config/payment-methods/owner` se; owner kisi bhi method ko OFF kar sakta hai, naya add kar sakta hai). admin-service owner document apply hote hi `payment_methods.owner_enabled` likhta hai (`applyOwnerPaymentMethods`). Owner OFF = Super Admin ON nahi kar sakta.
**Kyun:** User: "env se hata do, env me bas keys … payment method add karne ka option owner panel me aur super admin me … background me sara data db me store hona chahiye ki admin ne kon kon sa system enable ya disable kiya".
**Files / jagah:** backend/packages/db/migrations/153-payment-methods.js, backend/packages/db/src/models/extended/PaymentMethod.js, backend/packages/common/src/{paymentMethods.js,index.js}, backend/services/admin/src/modules/entitlements/entitlements.store.js, backend/services/admin/src/modules/features/features.service.js, backend/services/admin/src/modules/site-config/{siteConfig.service.js,siteConfig.validators.js,siteConfig.errors.js,routes/admin.routes.js,routes/public.routes.js,__tests__/siteConfig.test.js}, backend/services/user/src/modules/payment-orders/{gateways/index.js,paymentOrders.service.js,__tests__/paymentOrders.test.js}, backend/services/user/src/config.js, backend/.env.example, admin/src/views/settings/PaymentMethods.tsx, owner-panel/src/lib/entitlements/{paymentMethods.ts,siteMethods.ts,store.ts,types.ts,draft.ts}, owner-panel/src/app/api/owner/{entitlements,payment-methods}/route.ts, owner-panel/src/views/entitlements/{Entitlements.tsx,ChangeList.tsx}, owner-panel/scripts/paymentMethods.test.mjs, owner-panel/package.json
**Notes / pending:** Live: migration 153, .env backup `.env.bak-2026-10-24-f2pay-methods-db`, parker-user-svc + parker-admin-svc restart, admin + owner-panel build. Owner panel ka `siteUi.test.mjs` 1 test pehle se fail (HEAD par bhi). Dono panel browser me nahi khole. F2Pay khud abhi bhi Payment Methods me OFF (9992).

---

## 2026-10-24 — Super Admin bhi F2Pay ki currencies ON/OFF kare (transaction code ke saath)
**Kya kiya:** Settings → Payment Methods par F2Pay ke neeche har currency (INR, IDR) ka Super Admin switch — sirf wahi currencies dikhti hain jo owner ne ON rakhi. Switch ki key wahi jo owner flag ki (`f2pay_inr`, `f2pay_idr`) aur wo usi purani list `siteconfig.settings.payment_gateways_off` me jaati hai — naya storage nahi. user-service ka `#allowsCurrency` (pehle `#ownerAllowsCurrency`): currency tabhi chalegi jab owner ON **aur** Super Admin ON; methods list aur order dono me. Payment Methods ke har switch (gateway + currency) par ab transaction code zaroori: backend `assertTransactionPassword` (`PUT /admin/site-config/payment-gateways/:name` body `transactionPassword`), admin UI me ManualSwitch jaisa dialog. Gateway ki key ka naam `ownerFlag` → `currencySwitch`.
**Kyun:** User: "same super admin ko bhi ye karne ka access hai … with transaction code ke sath super admin ke liye".
**Files / jagah:** backend/services/admin/src/modules/site-config/{siteConfig.service.js,siteConfig.validators.js,routes/admin.routes.js,__tests__/siteConfig.test.js}, backend/services/user/src/modules/payment-orders/{gateways/index.js,paymentOrders.service.js,__tests__/paymentOrders.test.js}, admin/src/views/settings/PaymentMethods.tsx
**Notes / pending:** parker-admin-svc + parker-user-svc restart, admin build. Tests: transaction code missing / galat → refuse, owner-off currency Super Admin nahi chhoo sakta, Super Admin ki OFF currency methods se hat-ti hai aur order mana. F2Pay khud abhi bhi Payment Methods me OFF (9992).

---

## 2026-10-24 — IDR built-in currency + owner panel se F2Pay ki currencies
**Kya kiya:** IDR ab asli wallet currency (INR jaisi): migration 151 `credits.idr`, registry row (builtin fiat, icon `idr.svg`), IDR rate row, aur direct-ledger trigger me `idr`; code me `CURRENCY_COLUMN`, `BUILTIN_CURRENCIES` (+ owner-panel `BUILTIN_COINS`), Credits model extension, hourly rate refresh (`FIAT_CODES`), reports ke currency columns. Live par owner panel se IDR custom coin pehle hi ban chuka tha (13:31) — migration 152 ne use built-in banaya (custom balance hota to `credits.idr` me jata; 0 tha), aur owner ka fixed rate market refresh pe diya. Owner panel: "Fiat currencies" me `idr`, naya group "F2Pay" (`f2pay_inr`, `f2pay_idr`, missing = on) — jis currency ka switch ON, usi me F2Pay khulta hai (methods list + order dono check, `#ownerAllowsCurrency`).
**Kyun:** User: "owner panel se daal sakta hai ki f2pay me kon si currency chalegi … multiple bhi … agar idr currency na ho to vo bhi add kar do credit and exchange rate table me".
**Files / jagah:** backend/packages/db/migrations/{151-idr-currency.js,152-idr-builtin.js}, backend/packages/db/assets/coins/{idr.svg,README.md}, backend/packages/db/src/models/extensions.js, backend/packages/common/src/currencies.js, backend/services/user/src/modules/wallet/wallet.constants.js, backend/services/user/src/modules/exchange-rate/exchangeRate.service.js, backend/services/admin/src/modules/reports/reports.constants.js, backend/services/admin/src/modules/site-config/siteConfig.service.js, backend/services/user/src/modules/payment-orders/{gateways/index.js,paymentOrders.service.js,__tests__/paymentOrders.test.js}, backend/services/user/src/modules/psp/__tests__/psp.test.js, backend/services/user/src/config.js, backend/.env.example, owner-panel/src/configs/entitlementCatalogue.ts, owner-panel/src/lib/entitlements/coins.ts
**Notes / pending:** Live: migrations 151 + 152, saare parker-* backend restart, owner-panel build. IDR abhi owner + site dono par ON hai (admin ne 13:34 pe ON kiya tha), to direct players ke wallet me IDR dikhta hai (agent players ko sirf INR). IDR me games / sports nahi chalenge (casino / originals / sports ki currency lists me IDR nahi) — sirf deposit + wallet. Owner document me purani custom IDR definition ab "built-in" bol ke ignore hoti hai; owner panel next save pe hata dega. F2Pay abhi bhi 9992 + Payment Methods me OFF.

---

## 2026-10-24 — F2Pay: conversion hataya — jis currency me deposit, usi me payment
**Kya kiya:** Pichhli entry ka IDR→INR conversion poora hataya: `#converted`, `pay_amount`/`pay_currency`, IDR rate row aur `FIAT_CODES` me IDR (migration 151 live + test DB par `migrate:undo`, file delete). Ab F2Pay ke methods currency ke hisaab se: player jo currency chunta hai (INR / IDR), F2Pay usi ke methods dikhata hai aur usi currency me order banta hai aur credit hota hai. `supports(currency)` = us currency ke methods env me hain; `payIn(currency, method)` sirf usi currency ke methods me se; galat method → METHOD_NOT_SUPPORTED (order banne se pehle). Currency active hai ya nahi, ye pehle se `currencyRegistry.assertCurrencyEnabled` check karta hai. Frontend: FiatTab sirf chuni hui currency ke methods dikhata hai; `DEPOSIT_FIATS` me IDR joda (owner ki chalu list ke saath milta hai).
**Kyun:** User: "hum code me kuch bhi conversion nahi lagana hai … frontend se user currency select karega, usi currency me f2pay dikhega … check karna hai idr active hai ki nahi aur fir pay idr me".
**Files / jagah:** backend/services/user/src/modules/payment-orders/{gateways/index.js,paymentOrders.service.js,__tests__/paymentOrders.test.js}, backend/services/user/src/modules/psp/{psp.service.js,__tests__/psp.test.js}, backend/services/user/src/modules/exchange-rate/exchangeRate.service.js, backend/packages/db/src/models/extended/F2payDeposits.js, backend/packages/db/migrations/151-f2pay-pay-currency.js (deleted), backend/services/user/src/config.js, backend/.env.example, frontend/src/pages/Deposit/{AutoDeposit.jsx,FiatTab.jsx,deposit.js}, frontend/src/config/hiddenFeatures.js, frontend/docs/wallet.md
**Notes / pending:** IDR abhi system me currency hai hi nahi (`credits` me `idr` column nahi, currencies registry me nahi; owner custom coin deposit/games me mana hai) — isliye IDR ke methods abhi kisi ko nahi dikhte. IDR ko asli wallet currency banana alag kaam hai (credits column, registry row, games / sports me IDR). F2Pay abhi bhi 9992 + Payment Methods me OFF.

---

## 2026-10-24 — F2Pay: India (UPI) aur Indonesia (QRIS, DANA, CIMB, BRI, MANDIRI, BNI) dono methods
**Kya kiya:** F2Pay ka payload ab method ki currency se banta hai: INR method → `/payin/inr/order/create`, amount 2 decimal; IDR method → `/payin/idr/order/create`, amount bina decimal. Methods env se: `F2PAY_INR_METHODS=UpiMixed`, `F2PAY_IDR_METHODS=QRIS,DANA,CIMB,BRI,MANDIRI,BNI` (`F2PAY_METHOD_CODE` hata diya). Wallet INR hi hai: player INR amount daalta hai, IDR method pe site ke exchange rate se IDR bana kar F2Pay ko jata hai (`#converted`, IDR rate na ho to order nahi banta). Order par dono figure: `amount`/`currency` (wallet me credit) aur `pay_amount`/`pay_currency` (F2Pay jo collect karega) — migration 151. Callback ka amount `pay_amount` se milta hai, credit `amount` (INR). IDR ka rate row (migration 151) + hourly refresh me IDR (`FIAT_CODES`). Player site Automatic me "Pay With" buttons (UPI, QRIS, DANA …); IDR method pe note "charged in IDR at today's rate". Saath me .env ki multi-line private key ek line me ki.
**Kyun:** User ne F2Pay ke India aur Indonesia dono payload diye: "currency ke hissab se utha sakte ho, payload country ke hissab se". Merchant ke methods (QRIS…) IDR ke hain, site INR ki.
**Files / jagah:** backend/packages/db/migrations/151-f2pay-pay-currency.js, backend/packages/db/src/models/extended/F2payDeposits.js, backend/services/user/src/config.js, backend/.env.example, backend/services/user/src/modules/payment-orders/{gateways/index.js,paymentOrders.service.js,__tests__/paymentOrders.test.js}, backend/services/user/src/modules/psp/{psp.service.js,__tests__/psp.test.js}, backend/services/user/src/modules/exchange-rate/exchangeRate.service.js, frontend/src/pages/Deposit/{AutoDeposit.jsx,FiatTab.jsx,deposit.js}, frontend/docs/wallet.md
**Notes / pending:** Live: migration 151, .env (backup .env.bak-2026-10-24-f2pay-methods), parker-user-svc + parker-user-worker restart, frontend build. Merchant F2_6312 abhi bhi 9992 "Merchant not configured" deta hai (nakli merchant ID pe bhi yahi) — F2Pay se IP 217.216.78.106 whitelist + API URL confirm karwana; tab tak F2Pay Super Admin → Payment Methods me OFF. Sab methods sab players ko dikhte hain (country se filter nahi). IDR methods ka F2Pay min/max hamari taraf se check nahi hota.

---

## 2026-10-24 — F2Pay gateway (INR automatic deposit) + Fiat tab Manual / Automatic
**Kya kiya:** f2pay-code.zip ka F2Pay hamare gateway structure me laga: outbound `payment-orders/gateways` (`f2pay`: bizContent RSA-SHA256 sign, F2Pay ka answer `F2PAY_PUBLIC_KEY` se verify, code '0000', cashier `payUrl`), inbound `psp/providers` (`f2pay`: callback ka signature, `mchOrderNo`, Paid / UnequalPaid / Failed / Closed, beech ki state = kuch nahi). Nayi table `f2paydeposits` (migration 150, model `extended/F2payDeposits`). Saari keys env me (`F2PAY_MERCHANT_ID`, `_BASE_URL`, `_PRIVATE_KEY`, `_PUBLIC_KEY`, `_METHOD_CODE`, `_RETURN_URL`); code me koi key nahi. Payout code comment me rakha (`supports` payout pe false). Player site Wallet → Deposit → Fiat (INR): "Deposit Method" me Manual (pehle jaisa) / Automatic (F2Pay: amount → F2Pay ka payment page), jab dono chalu hon. F2Pay deposit har jagah deposit gina jata hai: rollover / withdrawal cap / Turnover (`withdrawalCapFigures`), admin deposit reports (`depositRails`, finance stats, statement label), player Transactions, affiliate 7 din deposits; first-deposit bonus psp callback se. Owner panel flag `gateway_f2pay` + Super Admin Payment Methods list me F2Pay. Saath me `#notifyUrl` theek kiya: `/api/v1/payments/callback/<p>` 404 deta tha, ab `/api/v1/user/psp/<p>/callback`.
**Kyun:** User: "f2 payment gateway bhi add karna hai … frontend pr inr deposit me manual aur automatic option … payout wala code comment … saari keys env me".
**Files / jagah:** backend/packages/db/migrations/150-f2pay-deposits.js, backend/packages/db/src/models/extended/F2payDeposits.js, backend/services/user/src/config.js, backend/.env.example, backend/services/user/src/modules/payment-orders/{gateways/index.js,paymentOrders.service.js,paymentOrders.validators.js,controllers/index.js,__tests__/paymentOrders.test.js}, backend/services/user/src/modules/psp/{providers/index.js,psp.service.js,controllers/index.js,__tests__/psp.test.js}, backend/packages/common/src/withdrawalCapFigures.js, backend/services/admin/src/modules/reports/{depositRails.js,financeStats.service.js}, backend/services/admin/src/modules/statements/statements.service.js, backend/services/admin/src/modules/site-config/{siteConfig.service.js,__tests__/siteConfig.test.js}, backend/services/user/src/modules/transaction-history/transactionHistory.constants.js, backend/services/user/src/modules/affiliate/affiliate.service.js, owner-panel/src/configs/entitlementCatalogue.ts, admin/src/views/finance/types.ts, frontend/src/pages/Deposit/{AutoDeposit.jsx,FiatTab.jsx,deposit.js}
**Notes / pending:** Live: migration 150 chali, zip ki keys (merchant F2_6831) backend/.env me (backup .env.bak-2026-10-24-f2pay), parker-user-svc + parker-admin-svc restart, frontend / admin / owner-panel build. Asli F2Pay API pe test order ka jawab: code 9992 "Merchant not configured" — F2_6831 is server ke liye chalu nahi. Isliye F2Pay Super Admin → Settings → Payment Methods me OFF rakha (`payment_gateways_off: ["f2pay"]`); asli keys + F2Pay pe IP 217.216.78.106 / callback URL set hone ke baad wahan ON karna. UnequalPaid (alag amount) apne aap credit nahi hota — amount match rule; staff manual credit karein. F2Pay ka min/max (zip: 500–30000) F2Pay khud batata hai, hamari taraf se check nahi.

---

## 2026-10-23 — Player auto-logout (admin setting) + game page / header / provider logo fixes
**Kya kiya:** Admin → Site config → Limits me naya setting "Sign players out after (minutes, 0 = never)" (`player_session_minutes`). User-service login pe session ka end = login + N min; refresh purana end hi rakhta hai (naya 30 din nahi); access token us end se aage valid nahi (`TokenService.signAccessToken({ notAfter })`). Player site `expiresAt` store karke theek us waqt sign out karta hai (`services/tokens.js`), reload ke baad bhi. Saath me: header pill me ₹ ki jagah "INR 4,637.30"; signed-in player ke liye game seedha launch (Play card nahi); game load pe side "0/0 Players" panel ka flash band; High win / Lucky win table home ke Latest round board jaisa + rows slide-in; Explore → Providers ke logos ab crop nahi hote (backend ke logos 200x80 nahi hote, `max-h-full`).
**Kyun:** User ki demands (screenshots ke saath); auto-logout testing ke liye 5 min.
**Files / jagah:** backend/services/admin/src/modules/site-config/siteConfig.service.js, backend/services/user/src/modules/auth/auth.service.js, backend/packages/auth/src/tokens.js (+ __tests__/accessNotAfter.test.js), frontend/src/services/tokens.js, frontend/src/layouts/MainLayout/Header/AfterLogin/index.jsx, frontend/src/pages/Game/index.jsx + Game.css, frontend/src/components/shared/ProviderLogo/index.jsx
**Notes / pending:** Local backend pe check: 1 min pe login → session 60 s, refresh same end, 62 s baad `/me` aur refresh dono 401; 5 min pe 300 s. Live pe deploy (server pe pull + pm2 restart user/admin) ke baad Limits page pe 5 set karna hai — tab tak live pe kuch nahi badla. Setting on hone se pehle ke sessions apna 30 din wala end rakhte hain. Server pe ye setting hamesha sab real players pe lagti hai.

---

## 2026-10-22 — Balance sheet me Vault ki entries
**Kya kiya:** Admin balance sheet (section 6e) ab swap ke saath vault ki `credits_ledger` rows bhi padhta hai: `TRANSFER_OUT` / `TRANSFER_IN` jinka `meta.refType = 'VAULT'`, category "Vault", description wahi jo vault ne likhi ("Vault deposit — 7 Days"), vault me daalna = DEBIT, vault se nikalna = CREDIT. Test: "vault deposits and withdrawals are on the sheet as Vault, with their sign".
**Kyun:** User: "valut ka bhi data ana chaiye". Pehle sheet sirf swap wale TRANSFER rows padhti thi, isliye tonny (8623441393) ki sheet me vault ke ₹100 + ₹200 "unexplained −300" aate the. Ab live par uski sheet: ledger 786.30 = live 786.30, unexplained 0.
**Files / jagah:** backend/services/admin/src/modules/reports/reports.service.js, backend/services/admin/src/modules/reports/__tests__/reports.test.js
**Notes / pending:** parker-admin-svc restart kiya. Admin UI me badlaav nahi (dialog category seedha dikhata hai, tone default 'info'). Statements page (statements.service.js) me vault check nahi kiya.

## 2026-10-22 — Admin → Payment Methods: owner ke chalu gateways + Super Admin ka on/off
**Kya kiya:** Settings → Payment Methods page ab sirf wo payment gateways dikhata hai jo owner ne owner panel (Site flags → Payment gateways, `flags.gateway_<naam>`, khaali = on) me chalu kiye hain — CCPayment, A-Pay, WayPay, CricPay, UPI (EkQR) me se — aur har ek ka Super Admin switch. Pehle wala A-Pay live status table is page se hataya (user: "bas itna dikha"). Backend: admin-service `GET /admin/site-config/payment-gateways`, `PUT /admin/site-config/payment-gateways/:name` (config:write, audit `site-config.payment-gateway.toggle`; owner-off gateway pe NOT_ENTITLED). SA ka off `siteconfig.settings.payment_gateways_off` me, user-service ko internal `/settings` ke jawab me jaata hai; user-service `#assertOwnerAllows` = owner flag AND SA switch → band gateway pe naya deposit, withdrawal, methods list 503 PAYORDER_PROVIDER_DISABLED (khule orders / callbacks pehle jaise). Menu item `direct: true` + `/payment-methods` PROMOTION_ROUTES me (agent tree ko nahi dikhta).
**Kyun:** User: Super Admin ko is section me sirf owner ke enable kiye gateways dikhao, aur Super Admin bhi inhe enable / disable kar sake.
**Files / jagah:** `backend/services/admin/src/modules/site-config/{siteConfig.service.js, siteConfig.validators.js, routes/admin.routes.js, routes/internal.routes.js, __tests__/siteConfig.test.js}`; `backend/services/user/src/modules/payment-orders/{paymentOrders.service.js, __tests__/paymentOrders.test.js}`; `admin/src/views/settings/PaymentMethods.tsx`, `admin/src/configs/navConfig.tsx`.
**Notes / pending:** Live: admin build, parker-admin-svc + parker-user-svc + parker-user-worker + parker-admin restart. Live pe owner ne sirf CCPayment chalu rakha hai, isliye list me sirf wahi; CricPay toggle NOT_ENTITLED (sahi). SA switch live par nahi dabaya (CCPayment hi live crypto deposit hai) — test se covered. Tests: site-config naya test pass (40 / 42, 2 purane fail); payment-orders naya test pass (33 / 37, 4 purane fail, same baseline); poora admin suite 20 purane fail, same. Mila (purana bug, nahi chheda): refused staff action (4xx) ka audit row `admin_activity_logs_status_check` se fail hota hai (20 Oct se 6 baar). Backend ka `payments/payment-systems` (A-Pay live status) route ab kisi page se nahi bulaya jaata.

---

## 2026-10-22 — Super Admin bhi site ka naam aur metadata badal sakta hai (Branding)
**Kya kiya:** Admin → Site config → Branding me "Name and metadata" ab Super Admin ke liye form hai: Site name, Page title, Title template, Meta description, Meta keywords, Open Graph title / description, Theme colour — Save, aur "Reset" (platform wala wapas). Rule logo jaisa: jo baad me badle wahi players ko dikhe — Super Admin save kare to uska; owner baad me apna metadata badle to owner ka (owner ka koi aur save, jaise flags, Super Admin ka nahi hatata). Backend: migration 149 `site_branding_meta` (ek row: meta + us waqt owner ka metadata), `PUT / DELETE /api/v1/admin/branding/meta` (config:write, agent accounts nahi), owner panel jaisi limits (naam 40, title 70, description 300, keywords 20, `<` `>` nahi, template me `%s` ek baar, colour #RRGGBB). `GET admin/branding` me `metaBy: site | platform`. Players ko public branding + socket sync + page HTML sab isi se milta hai.
**Kyun:** User: jaise owner metadata badal sakta hai, waise Super Admin bhi badal sake.
**Files / jagah:** `backend/packages/db/migrations/149-site-branding-meta.js`; `backend/services/admin/src/modules/branding/` (`branding.store.js`, `branding.validators.js`, `branding.rules.js`, `routes/admin.routes.js`, test); `admin/src/views/site-config/Branding.tsx`.
**Notes / pending:** Live: migration 149 chala, admin-svc restart, admin build + restart. Abhi kisi ne Super Admin metadata save nahi kiya, site wahi (Parker567). Tests: branding 14/14 (2 naye); entitlements ke 8 fail pehle se (saaf HEAD pe bhi wahi 8). Admin login nahi tha, isliye form live pe khol ke save nahi kiya. Owner panel me owner ko apni value dikhti hai, Super Admin ki nahi (logo jaisa).

---

## 2026-10-22 — Race sirf direct users ke liye, claim ki entry BONUS
**Kya kiya:** Race (daily + weekly, ek hi code) se agent system hataya: board pe ab sirf direct users (`users.parent_staff_id IS NULL`) aate hain — `race.service.js` `#standings` ka naam wala lookup direct-only, agent-tree player ka wager ho tab bhi board pe nahi (pehle board pe dikhta tha, sirf prize nahi milta tha). Admin → Races ke Live board aur Rewards se Direct Users | Agent Users tab hataye; backend se `adminLeaderboard` channel filter aur rewards ka `channel` param hataya. Claim pe `point_ledger_direct` entry pehle se banti thi (wallet trigger; live: `bal:3021` "Weekly race — rank 18"), ab uski category `OTHER` ki jagah `BONUS` (`packages/common/src/directLedger.js` `categoryFor`).
**Kyun:** User: daily race me agent system hatao, claim pe point ledger entry bane, ye sirf direct user ke liye hai.
**Files / jagah:** `backend/services/user/src/modules/race/{race.service.js, race.validators.js, controllers/index.js, routes/admin.routes.js, __tests__/race.test.js}`; `backend/packages/common/src/directLedger.js` (+ test); `admin/src/views/promotions/Races.tsx`.
**Notes / pending:** Live: admin build, parker-user-svc + parker-user-worker + parker-admin restart. Tests: race 40 / 40 (naya: agent player board pe nahi), directLedger 2 / 2; wallet 74 / 81 — 7 purane fail (tips / rain), same baseline. Live API: public board + admin board + rewards ok, board pe sirf direct user. Admin ka purana khula tab Rewards pe `channel` bhejega → 422, ek refresh. Purani claim row (1) ki category `OTHER` hi rahi. Admin menu me Races pehle se `direct: true` (agent staff ko dikhta hi nahi). Pichle 2 din me kisi agent user ka wager nahi tha, isliye live pe agent ka hatna sirf test se dikha.

---

## 2026-10-22 — Check: GIS (Slotegrator) callback ka race condition
**Kya kiya:** User ka reference code (harman wala atomic `UPDATE credits SET col = col + $1 WHERE uid AND col >= amount`) hamare `backend/services/casino/src/modules/gis/gis.service.js` se milaya. Hamare me: `gis_transactions` row paise se PEHLE usi DB transaction me (unique `transaction_id` → retry ek hi baar), paisa user-service wallet se (`FOR UPDATE` lock, debit SQL me `>= amount`, credit `col + amount`, idempotency key `credits_ledger_idempotency_key_uq` unique), refund `rf:<bet id>` aur rollback `rb:<id>` derived key, rollback hamara stored amount. Live par dono unique index maujood. GIS tests 32 / 32 pass (concurrent bets, ek saath 3 win, fresh id wala refund / rollback). Live: 440 gis_transactions (20–21 Oct) — wallet move missing 0, double 0, amount mismatch 0.
**Kyun:** User: reference me race condition solve kiya tha, apne GIS callback me bhi waise handle hai na.
**Files / jagah:** sirf WORKLOG (code nahi badla).
**Notes / pending:** Do gap (dono reference me bhi): (1) bet aane se pehle / beech me rollback aaye to "never applied" skip hota hai aur koi nishaan nahi rehta — baad me aayi wahi bet paisa kaat leti hai; (2) refund ka rollback: refund `rf:<bet id>` se save hai, rollback provider ki refund id bhejta hai → row nahi milti → refund wapas nahi hota (test bhi nahi). Refund ka amount request se aata hai (stake se bada bhi ho sakta hai).

---

## 2026-10-22 — Check: har balance move ki point_ledger_direct entry banti hai ya nahi
**Kya kiya:** Live pe check kiya (sirf padha). Trigger `direct_ledger_credits` (credits) aur `direct_ledger_wallet_balances` (wallet_balances) dono enabled; code me koi bypass (session_replication_role / DISABLE TRIGGER) nahi. Har direct user ki har currency: wallet = point_ledger_direct ki `bal:` + `opening:` rows ka jod — 100 me 97 exact, 3 me 0.0000000000001 ka float noise (credits me 867.4999999999999). Balance sheet ki 17 Oct ke baad ki 2876 non-sports rows me se har ek ki trigger row mili (1 deposit request 19 Oct / approve 20 Oct, 24h window se bahar tha, entry `bal:2434` maujood).
**Kyun:** User: balance sheet ki tables me jab bhi data update hota hai to point_ledger_direct me entry banti hai kya.
**Files / jagah:** sirf WORKLOG (code nahi badla).
**Notes / pending:** Entry hamesha banti hai (wallet pe trigger), par naam (label) har jagah nahi: aaj bhi bina label (`BALANCE_CHANGE` / `OTHER`) sirf sports settlement ki wallet move aati hai (87 rows, aakhri 21 Oct 20:18). Original Games (1106, 18–19 Oct) aur baaki (117, aakhri 19 Oct 05:36) purani rows hain, ab label lagta hai. point_ledger_direct me `settle:` / `og:` / `void:` rows P/L hain, wallet move nahi — wallet se milana ho to sirf `bal:` + `opening:` jodo. Balance sheet deposit ko request ke time dikhata hai, wallet approve pe badalta hai.

---

## 2026-10-21 — Saare players ki balance sheet ka live audit
**Kya kiya:** Live admin API (`/reports/balance-sheet`, agent ke liye `/reports/client-balance-sheet`) se har player ki sheet nikaali: 64 users, 110 sheets (59 direct users ki har currency jisme paisa / ledger hai = 105, 5 agent users). HTTP error 0, 108 sheets ka `unexplained` 0. Sports P/L ka cross-check settlement record se (`mssports.credits_ledger` profit + loss, settlement + settlement_void): 57 / 59 direct users exact; agent user userx11 ki dono bets (+15, +100) `point_ledger` se sahi.
**Kyun:** User: test karo, sabki balance sheet sahi chal rahi hai ya nahi; aur jo bhi hai pull leke deploy.
**Files / jagah:** sirf WORKLOG (code nahi badla).
**Notes / pending:** Pull me kuch naya nahi tha; har pm2 proc apne aakhri commit ke baad restart / build hua tha, migrations 147 applied / 0 pending — deploy me kuch nahi karna pada. Bache 2: parkertester01 (−2040) aur parkertester02 (−200), dono QA users — 17 Oct 21:53 (migration 117) se pehle settle hui bets ka P/L, jinki point ledger row nahi hai. Admin UI me dialog khol ke nahi dekha (API ka shape same hai).

---

## 2026-10-21 — Balance sheet: sports sirf bet ka P/L, point ledger se
**Kya kiya:** Admin → player → Balance sheet (INR) me sports ab simple: pehle user ki saari bets (`mssports."SportsBet"` ki ids), fir un bet ids ki `category = 'SPORTS'` rows point ledger se — direct user ho to `mssports.point_ledger_direct`, agent user ho to `mssports.point_ledger` (player ka apna wallet). Har row = us bet ka P/L (`delta`), description = ledger ka remark, delta 0 (void) wali row nahi. Bet placed / exposure released / settlement wali cash rows hata di (`debit_ledger`, `mssports.credits_ledger`, `post − running` sab gaya). Khuli bet ka paisa `openExposure` me (ab `mssports.total_exposures` se, pehle open stake ka jod tha) aur `unexplained` = live + openExposure − ledger.
**Kyun:** User: sports bet sirf point ledger se dikhao, usme delta = profit / loss hai, jaise user side dikhta hai; direct user → point_ledger_direct, agent user → point_ledger; pehle bets nikalo fir unse point ledger; sirf zaroori columns.
**Files / jagah:** `backend/services/admin/src/modules/reports/reports.service.js` (balanceSheet + section 6b) + `__tests__/reports.test.js`; issue doc ka status.
**Notes / pending:** Live: parker-admin-svc restart. Live DB pe 24 sports users purane vs naye code se mila ke dekhe: 22 ka `unexplained` 0 (parkertest12 bhi). 2 QA users me farak: parkertester01 −2040, parkertester02 −200 — ye unki 17 Oct 21:53 (migration 117) se pehle settle hui bets ka P/L hai, jinki point ledger row migration ne hata di thi (har bet ka hisaab mila ke dekha). Exposure (parkertester02 1373.25) theek baitha. Balance column khuli bet ke exposure jitna wallet se upar dikhta hai (exposure row nahi hai). Admin tests: reports 32/32; poore suite me 20 purane fail, same baseline. Admin UI nahi badla, build nahi kiya.

---

## 2026-10-21 — Balance sheet: sports bet placed + exposure release point_ledger_direct se
**Kya kiya:** Admin → player → Balance sheet (direct user, INR) me sports "Bet placed" ab `mssports.point_ledger_direct` ki BET_PLACED row se aata hai, aur naya "Exposure released" row BET_RELEASED se (BACK after LAY jaisi bet jo exposure ghatati hai). `debit_ledger` se sirf wahi bet placed aate hain jinki point_ledger_direct me row nahi hai (migration 117 se pehle ki bets). Settlement / refund / void pehle jaise `mssports.credits_ledger` se.
**Kyun:** Issue doc `backend/docs/issue-balance-sheet-exposure-release.md`: release ki `debit_ledger` row nahi banti thi, to agla row (jaise haari fancy ka settlement) uska paisa apne naam se dikhata tha (+35) aur beech me `unexplained` non-zero rehta tha. User: sports bets point ledger direct se dikhao; agent user ki sheet pehle se `point_ledger` se (`clientBalanceSheet`), wo nahi badli.
**Files / jagah:** `backend/services/admin/src/modules/reports/reports.service.js` (section 6b) + `__tests__/reports.test.js`; issue doc ka status.
**Notes / pending:** Live: parker-admin-svc restart. Live DB pe 24 sports users ki sheet purane vs naye code se mila ke dekhi: sabka `unexplained` 0 (parkertest12 ka pehle 23.00090881 tha), 4 hedge wale users me release rows aayi, baaki ki sheet same. 17 Oct se pehle ki releases kahin record nahi hain, wo jaisi thi waisi. debit_ledger ka balance 2 dp hai, isliye point_ledger_direct wali rows ab exact hain. Pending (wahi gap): admin User statement (`statements.service.js`), admin Ledger tab + player site Wallet → Transaction (`wallet.repository.js`) abhi bhi debit_ledger padhte hain, release nahi dikhta. Settlement ka wallet move point_ledger_direct me bina label (`BALANCE_CHANGE`) aata hai. Admin tests: reports 32/32; poore admin suite me 20 purane fail, same baseline.

---

## 2026-10-22 — Users → Financial se "Withdrawal rules" box hataya
**Kya kiya:** Admin → Users → Financial tab (`/users?tab=financial`) se "Withdrawal rules" card (Withdrawal limit, Wagering bonus, Daily withdrawal limit — owner ki read-only setting) hata diya. Upar ke 4 cards aur "Per-user withdrawal lock" table waise hi hain.
**Kyun:** User: is section se Withdrawal rules box remove kar do.
**Files / jagah:** `admin/src/views/players/users/FinancialTab.tsx`.
**Notes / pending:** Sirf UI; backend / owner ki setting nahi chhui, rules waise hi lagte hain. Admin build + `parker-admin` restart. eslint + tsc saaf; build me "Withdrawal rules" text nahi bacha.

---

## 2026-10-22 — Balance sheet: Original Games ki transaction id hata di
**Kya kiya:** Admin → player → Balance sheet me Original Games ki line ab sirf game + type dikhati hai ("Plinko bet", "Plinko win"), aage ka `· <transaction id>` hata diya.
**Kyun:** User: balance sheet me original game ki id mat dikhao, baaki sab theek hai.
**Files / jagah:** `backend/services/admin/src/modules/reports/reports.service.js` (`#originalGameNames`) + `__tests__/reports.test.js`.
**Notes / pending:** admin-svc restart (admin UI nahi badla, build nahi). Live pe saari 1714 Original Games ledger rows ka `og_transactions` me match hai, to har line ko game naam milta hai. Reports tests 32/32.

---

## 2026-10-21 — Owner panel me payment gateway on/off switch
**Kya kiya:** Owner panel → Features & plan → Site flags me naya group "Payment gateways": CCPayment, A-Pay, WayPay, CricPay, UPI (EkQR) — har gateway ka switch (owner document `flags.gateway_<naam>`, khaali = on). Backend (user-service `paymentOrders.service.js`): owner ne gateway off kiya to us gateway pe naya deposit, naya withdrawal aur methods list `503 PAYORDER_PROVIDER_DISABLED` — paisa hold hone se pehle, gateway ko call kiye bina. Jo order pehle se khule hain unke callback / status pehle jaise chalte hain. Site pe CCPayment off = crypto tab me CCPayment ka form nahi aata (methods khaali), purana manual address wala form dikhta hai.
**Kyun:** User: owner panel me ye setting honi chahiye ki site pe kaunsa payment gateway enable / disable ho — nahi thi.
**Files / jagah:** `backend/services/user/src/modules/payment-orders/paymentOrders.service.js` (+ test); `owner-panel/src/configs/entitlementCatalogue.ts`.
**Notes / pending:** Live: owner panel build + restart, user-svc restart. Owner doc me abhi koi `gateway_*` flag nahi = sab on, live pe kuch nahi badla. Test: naya test pass (off = deposit / withdraw / methods refuse, balance same, gateway call 0; flag na ho to chalta hai); payment-orders 35/37 (2 purane fail). Owner panel tsc + eslint saaf. Owner login nahi tha, isliye panel me switch daba ke live nahi dekha. Super Admin me ye switch nahi daala (sirf owner). Admin ka Payment Methods page (A-Pay status) owner-off nahi dikhata.

---

## 2026-10-21 — Doc: Original games ko naye project me lagane ka guide
**Kya kiya:** `backend/docs/original-games-new-project.md` banaya — Original Games Aggregator (seamless wallet) ko kisi doosre project me (bina owner panel, simple admin + website) lagane ka guide: provider se kya milta / kya dena hai, env keys (`OG_*`), tables ka SQL (`og_games`, `og_sessions`, `og_transactions`, `og_nonces`), signing (Node code), game sync, launch flow, wallet callbacks ke rules (verify, dedupe, bet / win / rollback, minor units, error codes), admin ki listing / stats / bet history ki SQL, website lobby + iframe, go-live checklist, aam galtiyan, aur Parker567 me code kahan hai.
**Kyun:** User: jo original game abhi backend / admin / website pe chal raha hai uska md doc chahiye, doosre project me sirf integration karna hai (keys unke paas hain).
**Files / jagah:** `backend/docs/original-games-new-project.md`.
**Notes / pending:** Sirf doc, code nahi badla — deploy / restart nahi. Rules hamare `originalGames.service.js` aur provider guide (`backend/docs/original-games-integration-guide.md`) se mila ke likhe.

---

## 2026-10-21 — USDT ke saare CCPayment networks + owner aur Super Admin dono ka network switch
**Kya kiya:** Migration 148: USDT me CCPayment ke baaki networks jode — SOL (Solana), POLYGON, TON, ARETH (Arbitrum One), OPTIMISM (OP Mainnet), OPBNB — chalu; TRC20 / ERC20 / BEP20 pehle se the (purane ka naam / switch nahi chheda). Crypto contract (`COIN_NETWORKS.USDT`) me bhi ye keys, taaki deposit / withdraw dono me chalein. Owner panel → Coins: har built-in crypto coin ke har network ka switch (owner document `flags["usdt:bep20"]`, khaali = on). Owner off kare to wo network players, Super Admin ke Coins page aur deposit / withdraw rails se hat jaata hai; owner ko dikhta rehta hai taaki wapas on kar sake. Super Admin → Coins → coin edit → Networks ka apna on/off pehle se tha, ab owner ke andar chalta hai. Site pe network select me ek chain ek hi baar (capture me OPTIMISM do baar tha).
**Kyun:** User: CCPayment jitne network deposit ke liye allow karta hai sab dikhne chahiye, owner me daal ke enable karo, aur ye option Super Admin me bhi ho — dono control kar saken.
**Files / jagah:** `backend/packages/db/migrations/148-usdt-ccpayment-networks.js`; `backend/services/admin/src/modules/currencies/currencies.service.js` (+ test); `backend/services/user/src/modules/crypto/crypto.constants.js`; `owner-panel/src/views/coins/Coins.tsx`; `frontend/src/services/currencies.js` (+ test).
**Notes / pending:** Live: migration 148 chala; USDT ERC20 / BEP20 jo Super Admin ne band kiye the, user ke kehne pe on kiye (DB, `updated_by = owner-request:2026-10-21`); public list ab USDT ke 9 networks. Asli CCPayment pe har network (TRON, BSC, ETHEREUM, SOLANA, POLYGON, TON, OPTIMISM, ARETH, OPBNB) ka test order bana, sabka address mila, TON pe memo. Live site ke Network select me 9 options, BEP20 → `BSC` gaya. Tests: currencies 26/26 (ek ek file chalane par; parallel me customCoins ke saath DB race ke 2 fail pehle jaise), crypto / withdraw / bank-details / payment-orders 89/91 (2 purane), vitest 241. Owner panel UI me login karke switch nahi dabaya (credentials nahi) — build + tsc + lint saaf, owner feed me 9 networks. Naye networks withdraw form me bhi dikhenge; manual payout staff us network pe karega. CCPayment baad me naya network de to migration / key jodni padegi (apne aap nahi aata).

---

## 2026-10-21 — CCPayment crypto deposit (player side), CCPayment doc ke hisaab se
**Kya kiya:** Wallet → Deposit → Crypto: jis coin ko CCPayment deta hai (USDT, BTC…), wahan player amount daalta hai → "Get Deposit Address" → CCPayment us order ka address banata hai → QR, "Send exactly", address, memo aur confirmations dikhte hain. Coin CCPayment pe na ho ya owner ka deposit_mode `manual` ho to pehle wala manual deposit. Webhook ab doc ke hisaab se: signature check → order hamara hai? → CCPayment se `getAppOrderInfo` → `paidList` me jo payment `Success` aur risky nahi hai, wahi credit, aur jo AAYA wahi amount (8 decimal tak kaata, upar round nahi). Har CCPayment `recordId` ek hi baar credit hota hai (ek order pe do payment dono credit). Risky → status `Risky`, credit nahi. Sab Failed → `Failed` + player ko ek notification. Webhook ka jawab `Success`. Coin id `.env` me rakhne ki zaroorat nahi: CCPayment ki live coin list (`getCoinList`, 10 min cache) se aate hain; `CCPAYMENT_COIN_IDS` sirf optional override. Site ka network naam (TRON / BITCOIN / ETHEREUM, TRC20…) backend me CCPayment chain (TRX / BTC / ETH) ban jaata hai. CCPayment deposit pe sirf Super Admin ki per-coin limit lagti hai (env ka INR wala min 1 nahi, warna min 1 BTC ho jaata). `Ccdeposit` model 8 decimal (DB pehle se 30,8 tha).
**Kyun:** User: CCPayment doc ke hisaab se integration check aur fix kar, frontend pe bhi laga; sirf user side deposit, CCPayment withdrawal nahi.
**Files / jagah:** `backend/services/user/src/modules/crypto/crypto.service.js`, `crypto.constants.js`, `controllers/index.js`, test `crypto.test.js`; `payment-orders/gateways/index.js`, `paymentOrders.service.js`, test `paymentOrders.test.js`; `notifications/__tests__/playerNotifications.test.js`; `services/user/src/config.js`; `packages/db/src/models/payments/Ccdeposit.js`; `frontend/src/pages/Deposit/CryptoTab.jsx`, `deposit.js`, `services/gates.js` (+ test `autoDeposit`).
**Notes / pending:** Tests: crypto 20/20, payment-orders + reports + history + notifications 127/129 (2 fail pehle se: "operator's stored maximum" wala, bina change ke bhi). vitest 232 pass. Live: asli CCPayment pe USDT/TRX aur BTC ke test order bane (address mila, paisa nahi bheja); signed test webhook → `200 Success`; browser me mock login se phone + desktop pe USDT aur BTC flow dekha, live site pe bhi. Asli crypto bhej ke credit end-to-end nahi kiya. CCPayment dashboard me: Webhook URL `https://api.parker567.com/api/v1/user/crypto/ccpayment/callback`, aur Tokens for your business me USDT/BTC on. Order band karke dobara kholo to purana address dobara nahi dikhta (naya order banta hai; purane pe bheja paisa bhi credit hota hai). First-deposit bonus ka line CCPayment form me nahi dikhaya (bonus credit pe lagta hai).

---

## 2026-10-21 — Owner panel: Rate limit on/off
**Kya kiya:** Naya owner policy `rate_limit` (On default / Off), owner panel me "Rate limit" row (business, sirf owner — site admin me chhupa). Har service (user, admin, casino, sports, gateway) `createApp` se `watchOwnerRateLimit` chalati hai: har 15 sec admin-service ka `/admin/features/public` padhti hai. Off pe har rate limiter counting band karta hai, sirf login, password reset, OTP, 2FA, staff sign-in / 2FA aur txn-code verify wale guards hamesha on (account hack se bachav). Limits ki values abhi bhi `backend/.env` se.
**Kyun:** User: owner me rate limit ka section, owner on/off kare tabhi chale.
**Files / jagah:** `backend/packages/common/src/middleware/rateLimit.js`, `createApp.js`, `featureCatalogue.js`, `sitePolicy.js`, test `rateLimit.test.js`; `owner-panel/src/configs/entitlementCatalogue.ts`; `admin/src/views/site-config/Features.tsx`.
**Notes / pending:** rateLimit tests 18/18 pass (naya switch test bhi). entitlements.test ke 7 fail pehle se (bina change ke bhi same 7). Restart: parker-user/admin/casino/sports-svc + gateway; owner-panel + admin build + restart, /owner/login 200. Live: services har 15 sec features/public padh rahi hain (200), limit on (`ratelimit: limit=300`). Owner panel me Off karke live test nahi kiya — owner khud kare.

---

## 2026-10-21 — Casino / Sports / Originals off → site pe section, banner, promotion sab gayab
**Kya kiya:** Frontend `services/gates.js` me naya `casino` gate (flag `casino` = owner Site flags → Casino AND Super Admin Features → Casino) + `/casino`, `/gamelist`, `/tagname`, `/section` routes (Originals ke paths pehle), aur `sportsPromo` / `casinoPromo` (`/promotion/sports|casino/*` = section + promotions). Off hone par: home ke Hot Games / Slots / Live Casino / Bingo / Exclusive / Recent Big Wins / Continue Playing rows, Highlights (sports), home ke CASINO / SPORTS / category cards, mobile tabbar ke Casino / Sports, Explore ka Casino / Sports type, Casino page ke tabs, promotions list ke casino / sports offers aur tabs, aur jo banner `/casino`, `/sports`, `/promotion/<segment>/…` ya `/game/<slug>` pe le jaata hai — sab chhup jaata hai; page khola to `/` pe redirect, casino game ka page "not found". Sidebar / footer / header pehle se `routeOn` se chalte the, ab casino bhi.
**Kyun:** User: owner ya Super Admin se sports, casino ya original games off karein to site pe unka section, banner aur promotion na dikhe.
**Files / jagah:** `frontend/src/services/gates.js` (+ test), `services/promotions.js`, `services/game.js`, `pages/Home/index.jsx`, `pages/Home/CategoryCards/index.jsx`, `pages/Home/Hero/Banner/index.jsx`, `pages/Casino/TabStrip.jsx`, `layouts/MainLayout/Tabbar/index.jsx`, `components/Explore/index.jsx`.
**Notes / pending:** vitest 214 pass. Live build + parker-frontend restart; live pe abhi teeno ON hain to kuch nahi chhupa. Browser me flags off simulate karke dekha (live switch nahi chheda): casino+sports off → sirf Originals; originals off → Originals row / tab gayab, `/casino/brand` → `/`. Banner jiska CTA link khaali ya kisi aur page ka hai, uska section pata nahi chalta, isliye wo dikhta rahega. Super Admin ke paas Originals ka poora section band karne ka switch nahi hai (2026-10-20 ko hataya gaya), sirf har game ka switch hai; owner ka Originals flag kaam karta hai. Backend ka casino launch guard sirf owner plan dekhta hai, Super Admin ka casino switch nahi.

## 2026-10-21 — Wallet → Transaction: Slotegrator game ka naam, transaction id nahi
**Kya kiya:** Player ledger (`GET /user/wallet/ledger`) me Slotegrator rows "bet <txid>" / "win <txid>" / "refund rf:<txid>" ab `gis_transactions.game_uuid → gisgamesnew` (ya `gisgamesnew_parked`) se game ka naam padhte hain: "Aviator bet", "Aviator win". Game na mile to "Casino game". `#nameOriginalGames` ke bagal me `#nameGisGames`, read-time — purani rows bhi theek. Test me ek GIS row.
**Kyun:** User: /wallet/transaction pe Aviator khela to game ki jagah id aa rahi thi.
**Files / jagah:** `backend/services/user/src/modules/wallet/wallet.repository.js`, `backend/services/user/src/modules/wallet/__tests__/playerLedger.test.js`.
**Notes / pending:** Test pass (ibitplay_test). parker-user-svc restart; live DB pe us player ki rows "Aviator bet/win/refund" aa rahi. JSGames rows "jsGames bet <id>" likhti hain — live pe abhi 0 rows, isliye nahi chheda.

## 2026-10-21 — Encryption rule file: callbacks / webhooks hamesha bypass
**Kya kiya:** Naya `backend/gateway/src/encryptionRule.js` (`isCallback`): game callbacks (GIS, Original games wallet, JSGames v1/v2, seamless, aggregators, x-casino) aur payment gateway callbacks / webhooks (PSP callback + payout-callback, ccpayment, OAuth) kabhi encrypt nahi hote — list aur naya provider jodne ka tareeka file ke upar likha hai. `apiEncryption.js` ab yahi file use karta hai. Test me Original games wallet + payout-callback ki line add.
**Kyun:** User: koi bhi payment gateway / game callback ya webhook aaye to encryption bypass ho, ye rule ek file me likho taaki aage yaad rahe.
**Files / jagah:** `backend/gateway/src/encryptionRule.js`, `backend/gateway/src/apiEncryption.js`, `backend/gateway/src/__tests__/apiEncryption.test.js`.
**Notes / pending:** Test pass. parker-gateway restart. Live: 5 callback routes encryption header ke saath bhi plain, player API `{"enc":...}`. Owner audit: aaj api_encryption owner ne khud kai baar off/on kiya (10:18, 10:32 off) — us waqt plain dikhna sahi tha.

---

## 2026-10-21 — API encryption: sports calls bhi encrypted
**Kya kiya:** Sports exchange ka apna fetch (`exchange/api.js`) ab bhi `ENC_ACCEPT` header bhejta hai aur `openSealed` se answer kholta hai, baaki `request()` jaisa.
**Kyun:** User: owner panel se encryption on kiya par chal nahi rahi. Gateway + baaki API pehle se encrypted the; sirf sports (`/sports/user/...all-data`, tree, latest events) plain JSON aa rahe the kyunki wo `client.js` se nahi jaate.
**Files / jagah:** `frontend/src/services/exchange/api.js`, `frontend/src/services/client.js` (token refresh `/user/auth/refresh` bhi plain jaata tha — ab encrypted).
**Notes / pending:** Live check (headless Chrome): home, casino, sports, promotions, VIP, referral pe har JSON answer `{"enc":...}`, sports odds sahi dikhe. Socket frames pehle se scrambled (encrypted nahi). `siteFeatures.js` bina header ke fetch karta hai — plain hi rahega.

---

## 2026-10-20 — Admin Casino bets: provider naam hataye, Stats me USDT graph, Raw tab hata
**Kya kiya:** `/casino/bets`: Transactions me game ke neeche studio/vendor ki jagah sirf "Casino feed" label. Stats tab: sab wallets USDT me (site ke current rate, USDT = 1), cards Bets / Wagered / Paid out / GGR + "Casino by day" bar graph (wagered, paid out, GGR); currency select aur source table (jisme "slotegrator"/"jsgames" raw dikh raha tha) hataya. "Raw provider tables" tab aur chhupa Analytics tab code se hataye. Backend `stats` ab din + currency group karke `usdt: { totals, days, unconverted }` deta hai.
**Kyun:** User: is section me koi provider naam na aaye, stats me graph, USDT me; Slotegrator admin me kahin na dikhe.
**Files / jagah:** `admin/src/views/casino/BetHistory.tsx`, `backend/services/casino/src/modules/bet-history/betHistory.service.js`, test `betHistory.test.js`.
**Notes / pending:** bet-history 35/35 pass. Vendor scan: static saaf, live 73 pages saaf. Live check: ₹600 wager = 6.3123 USDT.

## 2026-10-20 — Admin me har balance len-den pe transaction code zaroori (route middleware + form)
**Kya kiya:**
- Naya shared middleware `requireTxnPassword({ clients })` (`@ibitplay/common`): `body.transactionPassword` ko admin-service (`/internal/admin/staff-directory/verify-transaction-password`) se check karta hai, phir field hata deta hai (strict validators ke liye). Khaali → 403 `TXN_PASSWORD_REQUIRED`, galat → 403.
- Jahan code bilkul nahi tha, wahan route pe laga: crypto withdrawal decision, P2P buy/sell release + cancel (4), bonus forfeit, casino js-games v1 transfer. Sports `declareresult`, `void`, `void-single-bet` pe sports ka apna `verifyTransactionPassword`.
- Owner wale raaste jo sirf "set ho to" check karte the, ab hamesha zaroori: staff transfer (D/W), Create Account opening credit, player create opening balance, player wallet adjust (INR via lords + non-INR operator adjust).
- Admin forms me Transaction password field (naya `components/shared/TxnCodeInput.tsx`): Crypto withdrawal Decide, P2P release/cancel, Bonus forfeit, Match/Fancy settlement (declare + void), single bet void. Wallet adjust me field ab sabke liye required.
- Live check (Super Admin token, fake ids): bina code `TXN_PASSWORD_REQUIRED`, galat code `Invalid transaction password`, sports "Transaction password is required".
**Kyun:** User: admin panel me jahan bhi balance diya ya liya jaaye, transaction code zaroori ho, aur route pe middleware bhi.
**Files / jagah:** `backend/packages/common/src/{middleware/requireTxnPassword.js,index.js}`, `backend/services/user/src/modules/{crypto-withdraw,p2p,player-bonuses}/routes/admin.routes.js`, `backend/services/user/src/modules/wallet/controllers/admin.controller.js` (+ `__tests__/adjustRouting.test.js`), `backend/services/casino/src/modules/js-games/routes/admin.routes.js`, `backend/services/sports/src/modules/settlement/routes/admin.routes.js`, `backend/services/admin/src/modules/{staff/staff.service.js,exchange-accounts/createAccount.js,players/players.service.js,lords/lords.service.js}`, `admin/src/components/shared/TxnCodeInput.tsx`, `admin/src/views/finance/{CryptoWithdrawals,P2P,shared}.tsx`, `admin/src/views/promotions/BonusBalances.tsx`, `admin/src/views/exchange/settlement/{MatchSettlement,FancySettlement,shared}.tsx`.
**Notes / pending:** Live `TXN_PASSWORD_MODE=separate`; owner aur Super Admin ka code set hai, ek L6 agent ka nahi (usko My account me set karna padega). Jo cheezein seedha balance nahi badaltin par paise ka haq banati hain, unpe abhi code nahi hai: redeem code / gift card / bonus records banana, affiliate unlock/rewards, race settle, casino free spins/vouchers. Tests: chhue modules 488/499; jo fail hue (staff role FK, tipping) wo test DB setup ke hain, in files ko chhua nahi.

## 2026-10-20 — Deposit / Withdraw stats hamesha USDT me (site ki default coin)
**Kya kiya:** Finance stats (Stats tab + Manual tab ke upar wale cards) ab list ke currency filter se nahi chalte: saari currencies owner ki `default_currency` (live: USDT) me convert hoke dikhti hain (`useStatsQuery` → `convertTo`). List ka currency filter waisa hi hai.
**Kyun:** User: `/transactions/deposit` pe har jagah stats USDT me dikhein.
**Files / jagah:** `admin/src/views/finance/FinanceStatsPanel.tsx`, `admin/src/views/finance/FiatDeposits.tsx` (Crypto/Fiat deposits + withdrawals ke stats sab isi panel se).
**Notes / pending:** Jis currency ka rate nahi hai, wo totals se bahar rehti hai aur panel uska note dikhata hai.

## 2026-10-20 — Check: encryption / internal ACL naye notifications ko block nahi karte
**Kya kiya:** API encryption (`gateway/src/apiEncryption.js`) PSP `/psp/:provider/callback`, `/crypto/ccpayment/callback` aur GIS callback ko plain chhodta hai, isliye koi naya bypass nahi chahiye. Per-service internal keys live pe set hain, isliye ACL lagu hai. Live test: casino ki key se `PUT /internal/admin/notifications/player` → `VALIDATION_ERROR` (ACL paar). Sports → 403, jo sahi hai kyunki sports notification nahi bhejta.
**Kyun:** User: "jo chije encryption block karegi usko bypass karwa do jo jaruri hai".
**Files / jagah:** Code nahi badla (casino ki ACL entry `c0c0d88` me hai).

## 2026-10-20 — Deposit callbacks aur har bonus ka bell notification (`c0c0d88`)
**Kya kiya:**
- Transactions tab: PSP aur CCPayment crypto deposit ka failed/rejected callback ab `deposit_failed` bhejta hai. Success aur manual approve/reject pehle se bhejte the.
- Promotions tab: naya helper `notifyBonus` / `afterBonus` (`notifyPlayer.js`), kind `bonus_credited`, COMMIT ke baad chalta hai: daily/weekly/monthly claim, redeem code, staff bonus grant, rakeback, race reward, gift card, registration bonus, affiliate reward/commission/claim-all, gradual unlocked bonus claim.
- Casino GIS free spins: grant aur free-spin win pe `free_spins` (`gis.service.js #notifyFreeSpins`). Casino-service ko `internalAcl.js` me `/internal/admin/notifications` diya.
- `categories.js` + frontend `services/notification.js` ki `PROMOTION_TYPES` me `bonus_credited`, `free_spins`, `vip_level_up`, `vip_rank_up`, `affiliate_reward`, `affiliate_commission`. VIP aur referral rewards ab Promotions tab me.
- Push templates: `deposit_failed`, `bonus_credited`, `free_spins`.
**Kyun:** User: har deposit callback ka notification Transactions me, aur har bonus/promotion/free spin ka Promotions me.
**Files / jagah:** `backend/services/user/src/modules/{notifications,psp,crypto,bonus,rakeback,race,gift-cards,affiliate,player-bonuses}`, `backend/services/casino/src/modules/gis/gis.service.js`, `backend/packages/common/src/internalAcl.js`, `backend/services/admin/src/modules/push/push.constants.js`, `frontend/src/services/notification.js`.
**Notes / pending:** Naya `bonusNotice.test.js` + chhue modules ke 353 tests pass (`playerNotifications.test.js` me VIP ka tab Promotions kiya). Restart: user-svc, user-worker, casino-svc, admin-svc, frontend build. Deposit refund ka code system me nahi, isliye uska notification nahi. Free spin ki har jeet pe alag notification. Staff wallet credit (Direct User Wallet, agent transfer, `adminAdjust`) aur P2P release/cancel notify nahi karte.

## 2026-10-20 — Bank details: on/off switch, deposit range, site pe step-by-step deposit (`90b753f`)
**Kya kiya:**
- Admin Bank details: har row me "Shown to users" switch (delete button hataya), form me Min/Max deposit, list me "Deposit range".
- Migration `147`: `currency_payment_details.min_amount` / `max_amount` (NULL = koi limit nahi). `GET /user/bank-details/:coin?amount=` sirf wahi active accounts deta hai jinki range me amount aata hai.
- Bug fix: multipart `isActive: 'false'` ko `z.coerce.boolean()` true padhta tha, isliye form se band nahi hota tha.
- Site `ManualDeposit.jsx`: progress line (1. Amount → 2. Pay → 3. Confirm): pehle amount, phir us range wale accounts, phir UTR + screenshot.
**Kyun:** User: enable/disable, aur amount ke hisaab se kaunsa account dikhe (0–10000 pe A, 10000–20000 pe B), Tinder jaisa section-by-section flow.
**Files / jagah:** `backend/packages/db/migrations/147-bank-detail-amount-range.js`, `backend/packages/db/src/models/extensions.js`, `backend/services/user/src/modules/bank-details/*` (+ `__tests__/amountRange.test.js`), `admin/src/views/finance/BankDetails.tsx`, `frontend/src/pages/Deposit/ManualDeposit.jsx`, `frontend/src/services/fiatDeposit.js`.
**Notes / pending:** Purane accounts me range khaali, isliye wo har amount pe dikhte hain. Submit pe server range dobara check nahi karta. Range set karne ka haq har `config:write` staff ke paas.

## 2026-10-20 — P&L: Original Games section sirf Original Games; casino games ke naam (`800c607`, `9c214f5`)
**Kya kiya:** `pnlStats.service.js`: Slotegrator ka naam ab `gisgamesnew` → `gisgamesnew_parked` → `gis_games` se (pehle khaali `gis_games` se aata tha, isliye uuid dikhta tha). "Original Games" sirf `og` source se; purane in-house `bets` casino lists me. `og_games` me naam na ho to code capital (crash → Crash).
**Files / jagah:** `backend/services/admin/src/modules/reports/pnlStats.service.js`, `__tests__/pnlStats.test.js`.

## 2026-10-20 — Admin search box me browser autofill band (`e8bb65d`)
**Kya kiya:** Shared `Input` ka default `autoComplete='off'`; login/password fields apni value khud dete hain. AgentLedger ke raw inputs pe bhi off.
**Files / jagah:** `admin/src/components/ui/input.tsx`, `admin/src/views/transactions/AgentLedger.tsx`.

## 2026-10-20 — Owner: API encryption (on/off) + callbacks hamesha plain
**Kya kiya:** Owner panel → Policies me "API encryption" (default Off). On: gateway player site ke API jawab AES-256-GCM `{enc}` me bhejta hai, site `services/apiCrypto.js` se kholti hai. Sirf wahi request encrypt jo `Accept: application/vnd.enc+json` bheje (sirf site ka `client.js` bhejta hai). Bypass: koi bhi path jisme `callback`/`webhook` ho (GIS, JS games, PSP deposit/payout, ccpayment, Google), `PROVIDER_CALLBACK_PREFIXES`, HEAD, aur admin/owner panel (header nahi bhejte). Aane wala data kabhi nahi chhuya jata, isliye signature checks same. 304 se bachne ke liye encrypt wali request se If-None-Match hataya, `Vary: Accept` lagaya. Gateway har 15 s `features/public` padhta hai.
**Kyun:** User: owner on kare to API data encrypted aaye, abhi off; callbacks reject na hon.
**Files / jagah:** `backend/gateway/src/{apiEncryption,proxy,app,config,index}.js`, test `__tests__/apiEncryption.test.js`, `frontend/src/services/{apiCrypto,client}.js`, `featureCatalogue.js`, `sitePolicy.js`, `owner-panel/src/configs/entitlementCatalogue.ts`, `admin/.../Features.tsx` (site admin ko nahi dikhta). Key: `backend/.env` `API_ENCRYPTION_KEY` = `frontend/.env.local` `NEXT_PUBLIC_API_ENC_KEY`.
**Notes / pending:** Key site ke bundle me hai: sirf network tab me chhupata hai, asli suraksha HTTPS. Live pe On karke browser me nahi dekha.

## 2026-10-20 — Owner: Slotegrator INR games in PKR (on/off)
**Kya kiya:** Owner policy `slotegrator_inr_as_pkr` (default Off). On: INR wallet ka game Slotegrator pe PKR me khulta hai, session `gis_sessions.currency = 'INR>PKR'` yaad rakhta hai; callback ka PKR site rate (exchangerate INR/PKR) se INR me badalta hai, balance/bet/win/refund sab INR wallet me, jawab ka balance wapas PKR me. Off: INR me khule, INR me kate.
**Files / jagah:** `backend/services/casino/src/modules/gis/gis.service.js`, `gis.test.js` (32 pass).
**Notes / pending:** Slotegrator contract me PKR limits abhi 0 hain — tab tak On mat karo.

## 2026-10-20 — Swap: fee Super Admin set kare, fee history alag table, profit by day
**Kya kiya:** Admin `/swap`: upar "Swap fee" box (direct staff + config:write, 0–50%), `GET/PUT admin/user/swap/fee`, `admin_configurations.swap_fee` (nahi = 1%). Tabs: Swaps | Fee history | Fee profit by day; cards: kul fee, mahina, aaj (USDT). Swap sirf direct users.
**Files / jagah:** `backend/services/user/src/modules/swap/*`, `admin/src/views/finance/SwapHistory.tsx`.

## 2026-10-20 — Features / Originals switches, Branding upload, notifications, reports, rates
**Kya kiya:**
- Super Admin site admin → Features me feature on/off; Original games ka har game on/off (migration 146).
- Branding: logo/icon upload/reset (migration 145).
- Notifications: Direct Users | Agent Users tabs, Sent list edit/delete (migration 144); site ke bell pe unread dot.
- User reports: Overview/Users tabs, Originals players chart.
- Exchange rates: hourly market refresh (CoinGecko + open.er-api), stablecoins 1.0.
- Slotegrator: INR↔PKR swap hataya (INR, PKR apne naam se).
**Files / jagah:** commits `9dda5e5`, `e51ba19`, `db02fb5`, `9c2f48f`, `a6e9112`, `ecdc344`, `da64309`, `1addc18`, `d8cb518`, `a33313a`.
**Notes / pending:** Site admin → Coins me PKR on karna; admin pages browser me check karne; pagination audit.

## 2026-10-17 — Admin "Agent System" page hata diya (page + backend)
**Kya kiya:** Pehle hide kiya tha, phir user ne poora hatane ko bola. `/agent-system` page, `views/agent-system/` (Staff Portal, Hierarchy tabs), sidebar entry aur backend module `agent-hierarchy` (`GET admin/agent-hierarchy`, sirf isi page ka tha, apni koi table nahi) delete kiye. `admin/staff/transfer`, `admin/accounts/status`, `admin/exchange/accounts-admin/create` dusre pages me use hote hain, isliye rakhe.
**Kyun:** User: is page ki chije ab use nahi hongi.
**Files / jagah:** `admin/src/app/(pages)/agent-system/` (deleted), `admin/src/views/agent-system/` (deleted), `backend/services/admin/src/modules/agent-hierarchy/` (deleted), `admin/src/configs/navConfig.tsx`, `PROJECT-FLOW.md` (section 3c hataya), `FEATURES.md`.
**Notes / pending:** Wapas chahiye to git history se: is commit se pehle wala version.

## 2026-10-17 — Website pe direct user ka manual deposit form + User Win Loss Direct tab ki nayi API
**Kya kiya:**
- Website Deposit → Fiat (`frontend/src/pages/Deposit/ManualDeposit.jsx` naya, `FiatTab.jsx`, `services/fiatDeposit.js`, `services/gates.js`): koi gateway channel na ho aur `gates.manualDeposit()` (deposit gate + player ki deposit capability + owner deposit_mode manual allow + `/me` `capabilities.manualDeposit`) ho to manual form: notice, house bank details copy buttons ke saath (+ QR), multiple accounts pe Pay To chooser, Amount, Bank Reference / UTR, screenshot (KYC jaisa dashed box), Submit → `POST /user/deposits/fiat` multipart. Site ki maujooda classes; fixture build same. `GATES.deposit` me `orManual` (manual-only site pe bhi /deposit khule).
- Admin User Win Loss → Direct Users tab ki NAYI API `POST admin/exchange/reports/direct-user-win-loss` (purani point-ledger API same; Agent tab wahi): sirf owner, sirf direct users, P/L = settled `mssports."SportsBet"` ke liye Σnetamount(settlement, settlement_void, commission, commission_void) − stake; response user-win-loss jaisa (sports_pts = INR). Files: `exchange-reports/{winLossReports,reports.service,reports.validators}.js`, `routes/admin.routes.js`, test; `admin/.../reports/UserWinLoss.tsx`.
**Kyun:** User: "agar manual deposit ON hai to dikhna chahiye" + "direct user ke liye alag api banani hai, direct sports bet se ya credit ledger se data nikalo".
**Notes / pending:** Tests: exchange-reports 13/13, tools 9/9, frontend vitest 141/141, eslint/tsc clean. Local live: direct QA user ne website se ₹150 submit kiya → admin Transactions → Deposit → Manual me pending → approve → balance 1082 → 1232; Manual deposit OFF → form chhupa, ON → wapas. User Win Loss Direct tab: qa00edca +52 aur baaki direct users. Pixel-compare (ui-compare) nahi chalaya (fixture path chhuya nahi).

## 2026-10-17 — Point ledger sirf child users, admin audit + duplicates, admin→website switches, TENEXCH deposit parity, poora QA
**Kya kiya:**
- **Point ledger (child users only):** sports settlement v2 (`walletService.mjs` dono copies) — `updateAllPointHierarchy` direct user ke liye skip (points_applied set nahi), `applyCommissionPoints` sirf child, `reverseCommissionPoints` tabhi jab asli commission entry ho; helper `creditsPoints.mjs#isChildUser`. JS games callback (`casino/js-games/pointLedger.js` + `#applyMovement`): child user (INR) ki har bet/win pe player + staff chain ke `all_point`/`thirdparty_pts` aur `mssports.point_ledger` (category CASINO, entry_ref `jsgames:<refId>`, idempotent), paisa move hone ke baad alag transaction.
- **Child ki pehchaan** (`packages/auth/agentPlayers.js`): ab `parent_staff_id` ho to child (pehle sirf level 4–6 parent). Affiliate sirf direct (onWager member check, joinTeam/unlockFor/recordReward), admin-created player ko referral code nahi; child ke liye band: owner non-INR adjust, bonus game grant, fiat deposit approve, race prize.
- **TENEXCH parity** (`staff.service transfer`, `createAccount.js`, `players#fund`, `lords/pointLedger.js`, StaffPortal): `admin/staff/transfer` har staff level ke liye player + staff dono, sirf DIRECT child; player withdraw cap min(inr, credit); settlement points spendable me nahi; Create Account ek transaction; opening entry 'User creation' / `open:<walletId>`; remark deposit `#parent/child`. StaffPortal owner refill bhi `admin/staff/transfer`.
- **Admin duplicates:** Agent System me sirf Staff Portal + Hierarchy (copy tabs hataye; owner wallet card Settings → My account pe, `views/account/AccountPage.tsx`); PaymentOrders se "Gateway payouts" tab hataya (Withdraw → Fiat me hai); `/deposits/*`, `/withdrawals/*` → Transactions redirect; Feature flags se `sports` (Sports switch page pe hai).
- **Admin → website:** `/me` capabilities me Global Withdrawals OFF → `withdraw:false`, `manualDeposit` / `manualWithdraw`; crypto withdraw pe global switch; `home_livesports` public flag. Frontend (data-only, look same): `gates.flag()`, Home sections `home_*` flags se, PayYourWay + currency sheet Deposit agent player ko nahi.
- **Sports stats fix:** dashboard / pnl / wager / playerStats ab `mssports."SportsBet"` + `mssports.credits_ledger` padhte hain (public wale khaali / casino rows the); GGR = settled stake − Σnetamount.
**Kyun:** User: duplicate/active check, admin change website pe reflect, point ledger settlement v2 + js game callback sirf child, agent/child create + deposit sirf Sports Exchange API (TENEXCH bundle se verify), affiliate sirf direct, sab test karo (agent / child / direct bana ke, bet laga ke).
**Notes / pending:** QA (local): direct user website signup + Wallets se ₹1000; agent `qaagent952814` (staff 11) aur child `qachild952814` (9851758952) Create Account API se; dono ne website se Bookmaker bet (100) lagayi, admin Settlement se declare → direct 1082 (point entry nahi), child 582 (settle entry child+agent+owner); casino v2 callbacks (temp local key, phir .env wapas) → child ki CASINO entries, direct ki nahi; agent → child deposit 200 / withdraw 50 (9999 cap pe refuse), owner → grandchild 404, direct-wallet child pe 403, child affiliate/deposit 403. Admin switches (Global Withdrawals, Manual deposit, home_latestwins) OFF/ON website pe reflect. Admin crawl: 71 routes + saare tabs — sirf P2P (plan me off) aur Races live board (race nahi chal rahi). Full backend suite 2467/2484: fail sirf entitlements (6) + paymentOrders max-limit (2) — teammate commit 12d043c (owner cashier limits) ke purane tests; agentMoney sirf parallel me (akele 21/21). QA data local DB me rakha (ids upar). Baaki: website pe direct user ka manual deposit form nahi (frontend me naya UI chahiye), affiliate rate rules hardcoded (28/60/100%), User Win Loss direct tab khaali (direct ki point entry nahi), admin theme kisi commit (11bf943) ne neutral kiya.

## 2026-10-17 — Har mixed list pe "Direct Users | Agent Users" tabs; sirf-direct lists pe direct filter
**Kya kiya:** Jahan bhi player ki list / history me direct aur agent dono ke users aa sakte hain, wahan list ke upar `components/shared/ChannelTabs.tsx` (Direct Users | Agent Users, dono ki alag listing). Backend list APIs me **optional** `channel=direct|agent` (na bhejo = purana jawab same; user ne ye exception approve kiya). Direct = `users.parent_staff_id IS NULL`, agent = NOT NULL, caller ke purane scope ke andar.
- Tabs: IP tracker (logins + shared IPs), Profit & loss, Wager report, Notifications → Devices, Current Bets, Party Win Loss, User Win Loss, Total Profit Loss, Turn Over (client search bhi tab ke hisaab se), Account List + Bank (drill-down me tabs nahi; export / Create Account / Transaction Code ab table toolbar me), Statements → Transfers, Casino Bet history (saare andar ke tabs), In-house Bets + Bets (2m), KYC, Tips (receiver pe filter), Races → Live board + Rewards (admin ke liye naya `adminLeaderboard` service method; player wala leaderboard same).
- Sirf direct (koi tab nahi, screen same; frontend `channel=direct` bhejta hai): Transactions → Deposit / Withdraw ke Crypto / Manual lists, Bonus balances, Vault users + interest, Swap history, Bonus module lists (records / games / events / awards / codes / redeem users), Gift-card records, Spin-wheel claims.
- Backend files: admin service `reports` (ipTracker, pnlStats, wagerStats, validators), `notifications`, `exchange-market`, `exchange-reports` (reportScope `treeOf`), `exchange` (accountList), `lords` (transferStatement); casino `bet-history`; user service `directory/playerScope.js` (`withChannel`, `CHANNEL_SQL`) + kyc, tip, race, fiat-deposit, fiat-withdraw, crypto-withdraw, deposit-reports, player-bonuses, vault, swap, bonus, gift-cards, spin-wheel. Har jagah strict validator me sirf optional `channel`. Casino `/bet-history/analytics` pe pehle validator nahi tha — ab strict (sirf `channel`).
**Kyun:** User: "jahan user ka data aa raha hai aur agent user ka bhi aa sakta hai wahan tab se divide karo, dono ki alag listing… jo sirf direct user ke liye hai wahan divide mat karna".
**Notes / pending:** Tests (ek-ek file): admin reports/notifications 80/80, exchange 72/72, casino bet-history 26/26, user service 319/319, tools 9 pass; admin tsc + eslint clean. Backend restart. Browser (QA owner): har tab wale page pe dono tab dikhe aur Agent tab pe koi API error nahi; sirf-direct pages pe koi tab nahi, koi error nahi. Account List API: direct tab = direct QA user, agent tab = agent QA user. Races Live board local pe "race not running" (404) — pehle se, channel se nahi.
Chhoda: VIP members/earnings, P2P lists, Payment orders history (`admin/user/history/*`), In-house "House counters", Affiliate. Account List / Bank me page number + search URL me hain to tab badalne pe saath rehte hain.

## 2026-10-17 — Deposit / Withdraw: Fiat tab wapas (Manual ke saath)
**Kya kiya:** Direct Users ke tabs ab — Deposit: **Crypto | Fiat | Manual**, Withdraw: **Crypto | Fiat | Manual**. Fiat = gateway (PSP) wala fiat: deposit me Payment orders screen (Gateway deposits / payouts / By user / Provider probe — pehle "Gateway" naam se), withdraw me gateway payouts list (`AllRails kind=withdrawals`, `admin/user/history/withdrawals`). Manual waisa hi (Super Admin ON/OFF + bank transfer / manual payout list).
**Kyun:** User: withdraw me fiat kyu hataya — fiat dono me rahega aur saath me manual bhi.
**Files / jagah:** `admin/src/views/transactions/Transactions.tsx`, `admin/src/views/finance/PaymentOrders.tsx` (`AllRails` export).
**Notes / pending:** Sirf frontend, koi API nahi badli. Fiat aur Manual alag data dikhate hain (gateway vs bank transfer), ek list do jagah nahi. tsc + eslint clean.

## 2026-10-17 — Sidebar: Site Config alag section (Settings ke barabar)
**Kya kiya:** "Site config" Settings ke andar dropdown tha — ab apna alag **Site Config** section (Settings ke parallel): Features, Branding, Feature flags, Limits and policy, Affiliate rates, Welcome bonuses, Email (SMTP), Sports switch seedhe. Settings me ab Payment Methods + My account. Har item pe `config:read` aur pehle wale feature / promotions / ownerFlag marks waise hi.
**Kyun:** User: site config ko settings se bahar, parallel karo.
**Files / jagah:** `admin/src/configs/navConfig.tsx`
**Notes / pending:** Sirf sidebar; pages / API waise hi. tsc + eslint clean.

## 2026-10-17 — Deposit / Withdraw: listing pehle, Stats alag tab; Manual section + Super Admin ON/OFF
**Kya kiya:**
- Transactions → Deposit / Withdraw ke har screen (Crypto, Manual) me ab pehle **Listing** (table), stats cards / charts alag **Stats** tab me (`views/finance/ListStatsTabs.tsx`; Crypto withdrawals ke "queue right now" cards bhi Stats me). Period / currency filter upar hi (wo table ko bhi filter karta hai). reports:read na ho to sirf listing.
- Direct Users ke andar tabs: Deposit = **Crypto | Gateway | Manual** (pehle Crypto | Fiat | Payment orders), Withdraw = **Crypto | Manual** (pehle Fiat). Manual = purana fiat (bank transfer + screenshot / manual payout) screen, title "Manual deposits / withdrawals".
- Manual ke upar **Super Admin ka ON/OFF** card (`views/transactions/ManualSwitch.tsx`): switch → transaction password → `PUT admin/manual-payments`. Sirf `wallet:adjust` (Super Admin) badal sakta hai, baaki dekh sakte hain.
- Backend: migration `111-manual-payment-control.js` (table `manual_payment_control`, default dono ON = aaj jaisa), `@ibitplay/common` `manualPayments` (`readManualPayments`, `assertManualAllowed` → MANUAL_DEPOSIT_DISABLED / MANUAL_WITHDRAW_DISABLED 403), naya admin module `manual-payments` (`GET` deposits:read|withdrawals:read, `PUT` owner + transaction password, activity log). User service: fiat-deposit `create` aur fiat-withdraw `create` me owner ki deposit_mode / withdrawal_mode policy ke baad ye check. Agent ke users pe app deposit / withdraw pehle se band (denyAgentPlayer).
**Kyun:** User: "stats deposit/withdraw ka divide karo, andar stat daal ke, listing upar dikhao… ek section manual deposit / manual withdraw, super admin on/off kare tabhi direct user manual deposit/withdraw kar payenge… apne setup ke according, zip se reference".
**Files / jagah:** `admin/src/views/transactions/{Transactions,ManualSwitch}.tsx`, `admin/src/views/finance/{ListStatsTabs,CryptoDeposits,CryptoWithdrawals,FiatDeposits,FiatWithdrawals}.tsx`; `backend/packages/db/migrations/111-manual-payment-control.js`, `backend/packages/common/src/{manualPayments,index}.js`, `backend/services/admin/src/modules/manual-payments/*`, `backend/services/user/src/modules/{fiat-deposit/fiatDeposit.service.js, fiat-withdraw/fiatWithdraw.service.js}`.
**Notes / pending:** Migration dev + test DB pe chali. Tests (ek-ek file, `--test-concurrency=1`): manual-payments + withdrawal-control + fiat-deposit + fiat-withdraw 51/51, tools 9 pass. (Ek saath parallel chalane pe switch wale tests dusre DB tests ko beech me OFF kar dete hain — isliye serial.) Backend restart. Browser: Deposit pe Listing default, Stats tab me cards; Manual tab me switch OFF → "Manual deposits switched OFF" → wapas ON; Withdraw → Manual me switch dikhta hai. Player app (frontend) me OFF hone pe sirf server ka error message aayega — manual option chhupana ho to frontend me alag kaam.

## 2026-10-17 — Sidebar: Casino ek hi section
**Kya kiya:** Sidebar me "Casino" do baar aata tha (group heading + andar "Casino" dropdown) aur Providers / Vendor / Type Priority Settings me alag the. Ab ek hi **Casino** section: Game catalogue, Lobby curation, Providers, In-house games, Bet history, Wager report, Providers Priority, Vendor Priority, Type Priority — seedhe (dropdown nahi). Har item pe `flag: casino` (casino off ho to chhup jaata hai, pehle jaisa).
**Kyun:** User: casino ke do alag section kyu, ek hi rakho.
**Files / jagah:** `admin/src/configs/navConfig.tsx`
**Notes / pending:** Sirf sidebar; pages / API waise hi. tsc + eslint clean.

## 2026-10-17 — Settings section zip jaisa: Payment Methods, Site config, Providers / Vendor / Type Priority
**Kya kiya:** Sidebar Settings ab admin-structure.zip ke order me: **Payment Methods** (naya), Site config (apna, children wahi), **Providers Priority**, **Vendor Priority**, **Type Priority**, My account.
- Payment Methods (`/payment-methods`, `views/settings/PaymentMethods.tsx`): zip ka "Payment Methods — Live Status" — har currency (INR, PKR, NPR, BDT, phir baaki) ka table: Method, System name, Deposit (gateway) / Deposit (on site) chips, deposit limits, Withdrawal chip (+ "used" agar site payout rail), withdrawal limits, Notes; "Refresh from gateway" (`?fresh=1`), har 60s auto refresh. A-Pay configure na ho to "A-Pay is not configured".
- Naya backend `GET admin/user/payments/payment-systems` (user service, payment-orders module, `config:read`, strict query `fresh`): apay gateway `getPaymentSystems` → A-Pay `/Remotes/payment-systems-info`, service `paymentSystemsOverview` (5 min cache, site rails = `APAY_DEPOSIT_SYSTEMS` / `APAY_WITHDRAWAL_SYSTEMS`, labels `APAY_SYSTEM_LABELS`). Test `__tests__/paymentSystems.test.js` (DB nahi chahiye).
- Providers / Vendor / Type Priority (`/providers-priority`, `/vendor-priority`, `/type-priority`, `views/settings/*`): Casino → Curation ke wahi tab components (`CollectionsTab`, `PriorityTab`, ab export) — APIs same (`admin/casino/games/collections/:slug`, `priority/:vendor`, `type-priority/:type`). Casino ka "Curation & priority" ab sirf **Lobby curation** (duplicate tabs hataye).
**Kyun:** User: "jaise zip file me setting wala section hai (vendor, site config wagera) vaise hi apne me bhi kar do… setup apna hi follow karna".
**Files / jagah:** `admin/src/configs/navConfig.tsx`, `admin/src/views/settings/{PaymentMethods,ProvidersPriority,VendorPriority,TypePriority}.tsx`, `admin/src/app/(pages)/{payment-methods,providers-priority,vendor-priority,type-priority}/page.tsx`, `admin/src/views/casino/Curation.tsx`; `backend/services/user/src/modules/payment-orders/{gateways/index.js, paymentOrders.constants.js, paymentOrders.service.js, paymentOrders.validators.js, controllers/index.js, routes/admin.routes.js, __tests__/paymentSystems.test.js}`.
**Notes / pending:** Tests: payment-orders 36/36, tools 9 pass (1 skip). Backend restart. Browser: paancho pages khulte hain (Payment Methods local pe "not configured" — local .env me APAY_API_KEY/PROJECT_ID nahi). Zip ke Site Config ke toggles hamare Site config → Feature flags / Sports switch me pehle se hain; zip ke "per-sport toggles" aur global match-odds-limit flag hamare yahan nahi hain (Max Odds per sport Sports Exchange → Global Settings me hai).

## 2026-10-17 — Deposit / Withdraw zip jaisa + "Agent System" tab (point ledger)
**Kya kiya:** `/transactions/deposit` aur `/transactions/withdraw` ka UI zip `DepositPage` / `WithdrawPage` jaisa (exact colours): upar tab bar **Direct Users** / **Agent System**; Direct Users me zip ka "Crypto | Fiat" switcher (deposit me "Payment orders" bhi) — andar apne purane screens. **Agent System** tab: zip `Deposit.tsx` jaisa header ("Deposit History" / "Withdraw History"), summary cards (Transactions, Total Amount, This Page, Page), filter (ID, From, To, Min ₹, Max ₹, Clear), table (ID, From, To, Type, Amount, Date & Time), Previous / Next.
**Kyun:** User: deposit / withdraw zip jaisa, aur Agent System tab me agent wala deposit apne setup ka — point ledger se naya API.
**Files / jagah:** naya API module `backend/services/admin/src/modules/agent-ledger/` (`GET admin/agent-ledger`), `admin/src/views/transactions/{Transactions,AgentLedger}.tsx`. Hataya: `agent-transfers` module + `AgentTransfers.tsx` (aaj hi bana tha, sirf pichhla "Agent Users" tab use karta tha; ab ledger wala tab).
**Notes / pending:** Koi existing API nahi badli. Test agent-ledger 3/3, tsc + eslint clean, backend restart, route 401 (purana agent-transfers 404). Browser me dekhna baaki.

## 2026-10-17 — Sidebar: har section aur item ka matlab wala icon (zip jaisa)
**Kya kiya:** Har sidebar section heading ke bagal me icon (`NavItem.groupIcon`: Main, Sports Exchange, Agent Management, Users, Transactions, Finance, Promotions, Casino, Team, Content, Reports, Settings). Har item ka apna alag icon (pehle reports sab pe same FileBarChart tha) — jaise Current Bets = Radio, Settlement = Gavel, Party Win Loss = Scale, General Lock = Lock, Coins = Bitcoin. Sub-items (Casino, Push notifications, Site config ke andar) pe bhi icon (`icon?` on sub items; Sidebar me `NavIcon`). navIcons map + imports sirf use hone wale icons.
**Kyun:** User: "sidebar me har section ke bagal me icon bhi laga do… jaise zip file me hai, meaningful".
**Files / jagah:** `admin/src/configs/navConfig.tsx`, `admin/src/components/layout/Sidebar.tsx`
**Notes / pending:** tsc + eslint clean; headless Chrome screenshot me headings + items ke icons dikhe (collapsed branches ke andar ke sub-item icons screenshot me khol ke nahi dekhe).

## 2026-10-17 — Admin ka purana "Sports" section hataya
**Kya kiya:** Sidebar se "Sports" group (Bets, Settlement, Catalogue & locks, Wager report) hataya, aur pages `admin/src/app/(pages)/sports/*` (bets, settlement, catalogue, results, wager-report) + views `admin/src/views/sports/*` delete kiye. Nav se unused `Goal` icon bhi hataya.
**Kyun:** User: Sports Exchange section pehle se hai, ye purana Sports section nahi chahiye.
**Files / jagah:** `admin/src/configs/navConfig.tsx`, `admin/src/app/(pages)/sports/` (deleted), `admin/src/views/sports/` (deleted).
**Notes / pending:** Backend NAHI chheda (rule: existing API mat badlo). Wajah: `admin/sports/internalsettle` Sports Exchange ke Settlement page me use hota hai; sports `bet-admin` ke internal routes `lords` (net exposure) use karta hai aur gateway `legacyRoutes` me purane URL us pe mapped hain; `admin/sports/catalogue` / `results` ka backend tha hi nahi (404 deta tha). Casino wala `views/casino/WagerReport` waisa hi (casino wager report me use). Site config ka "Sports switch" (player site ka sports flag) waisa hi. tsc + eslint clean.

## 2026-10-17 — Agent System me Hierarchy tab (zip Percentage Hierarchy, bina %)
**Kya kiya:** `/agent-system?tab=hierarchy` — zip `PercentageHierarchyPage` jaisa tree (exact colours): upline → aap ("you") → downline, click se node band / khula, level ke rang ka legend (Super Admin … Agent, apne levels). Percentage nahi dikhaya — uski jagah har node ke upar uske direct users ki ginti.
**Kyun:** User: percentage-hierarchy client management me, percentage mat dikhao, apne setup ke hisaab se.
**Files / jagah:** naya API module `backend/services/admin/src/modules/agent-hierarchy/` (`GET admin/agent-hierarchy`, users:read ya staff:read; staff `parent_id` upar tak + `manageableStaffIds` neeche, role/level, users count), `admin/src/views/agent-system/{Hierarchy,AgentSystem}.tsx`.
**Notes / pending:** Koi existing API nahi badli. Test 2/2, tsc + eslint clean, backend restart, route 401 (maujood). Browser me dekhna baaki.

## 2026-10-17 — Turnover Report: zip ke exact colours / buttons
**Kya kiya:** `/turnover-report` ka UI zip `TurnoverReport.tsx` ke exact hex colours me dobara likha (page #0C0D1D, card #0E1831, border #1E2D55, th/input #0B1427, hover #162140, blue #2B6EF5 / #5581F7, green #0ECC68 "Update All TargetX" / "Update TargetX", red #E01B4F lock). Zip jaisa: clickable sort headers, Previous / page / Next pagination (10 per page), "Edit Target Multiplier" dialog (User ID, Name, Email, Current Multiplier, Status, Cancel + Update TargetX).
**Kyun:** User: theme aur button colour zip jaisa exact.
**Files / jagah:** `admin/src/views/turnover/TurnoverReport.tsx`
**Notes / pending:** Sirf frontend; API wahi. Ye page light theme me bhi zip jaisa dark hi dikhega. tsc + eslint clean.

## 2026-10-17 — Main me Turnover Report + Redeem Codes (zip jaisa)
**Kya kiya:** Sidebar **Main** me **Redeem Codes** (Promotions se yahan aaya, page wahi `/redeem-codes`) aur naya **Turnover Report** (`/turnover-report`) — zip `TurnoverReport` jaisa: direct users ka User ID, Name, Email, Wager, Total Deposit, Target (= deposit × TargetX, pencil se user ka TargetX), % Achieved, Progress bar, Lock; toolbar me search, "Update All TargetX", sort + direction.
**Kyun:** User: zip ke Main jaisa turnover-report aur redeemcode Main me.
**Files / jagah:** naya API module `backend/services/admin/src/modules/turnover-report/` (`GET /admin/turnover-report`, `GET|PUT /multiplier`, `PUT /:userId`; read reports:read, write config:write, audit `turnover.multiplier` / `turnover.user`), migration `110-turnover-targets.js` (`turnover_settings` default 3x, `turnover_targets` user ka TargetX + lock), `admin/src/views/turnover/TurnoverReport.tsx`, `admin/src/app/(pages)/turnover-report/page.tsx`, `admin/src/configs/navConfig.tsx`.
**Notes / pending:** Deposit / wager figures wahi jo withdrawal cap use karta hai (`withdrawalCapFigures`, INR). Lock = "Update All" us user ka TargetX nahi badlta (zip jaisa), withdrawal lock nahi. Sirf report + target hai — withdrawal ke rules nahi badle. Koi existing API nahi badli. Migration dev + test DB pe lagi (saath me doosre session ki pending 106-referral-unlock-tiers bhi). Test 3/3, tsc + eslint clean, backend restart, route 401 (maujood). Browser me dekhna baaki.

## 2026-10-17 — Sidebar: Turn Over ab Sports Exchange me
**Kya kiya:** `/exchange/reports/turnover` (Turn Over) Agent Management se hata ke Sports Exchange section me (Current Bets ke baad). Page / URL / permission same.
**Kyun:** User: "turnover wala section sports exchange me daal do".
**Files / jagah:** `admin/src/configs/navConfig.tsx`
**Notes / pending:** eslint clean.

## 2026-10-17 — Main → Wallets ab zip ka Wallet page (Direct User Wallet) jaisa
**Kya kiya:** `/wallets` ab admin-structure.zip ke `WalletUpdate.tsx` jaisa: card ke andar "Direct User Wallet" title + "Only direct user balances (no parent) · N users", search + refresh; table # · User (rangeen initials avatar) · UID (neela chip) · Currency (per-row select) · Balance (peela wallet chip, 4 decimal) · Actions (History neela icon, Manage Funds purple icon). Manage Funds row ke neeche: Transaction Password box (peela lock), Debit Funds (laal) / Credit Funds (hara) — "Amount in <coin>". History popup: Date & Time · Coin · Operation chip · Amount · Prev / New Balance, currency filter, Close. Data / APIs apne hi: `admin/direct-wallet/*` (sirf direct users, staff_balances se, non-INR rate se INR). Purana `/wallets` view (`views/finance/Wallets.tsx`, sab users + Adjust) hata diya; sidebar se duplicate "Direct User Wallet" hata diya; `/direct-wallet` ab `/wallets` pe redirect. Wallets nav permission `wallet:adjust` (API wahi maangti hai). Unused `WalletBalanceRow` type hataya.
**Kyun:** User: "wallet wala section vaise hi kar do jaise zip file me hai… setup apna follow karna hai aur data zip jaisa dikhana hai".
**Files / jagah:** `admin/src/views/players/DirectUserWallet.tsx`, `admin/src/app/(pages)/{wallets,direct-wallet}/page.tsx`, `admin/src/configs/navConfig.tsx`, `admin/src/views/finance/types.ts`; delete `admin/src/views/finance/Wallets.tsx`.
**Notes / pending:** tsc + eslint clean. Headless Chrome, QA owner: list me sirf direct user (agent ka user nahi), Credit 25 ✓, Debit 5 ✓ (0 → 25 → 20), History me dono entries ✓; test data saaf. Backend ka `GET admin/user/wallet/balances` (purane Wallets list ka) ab admin me kahin use nahi hota — hataana ho to alag se.

## 2026-10-17 — Transactions (Deposit / Withdraw / Account Statement) zip jaisa
**Kya kiya:** Sidebar me naya group **Transactions** (zip ka): **Deposit** (`/transactions/deposit`) aur **Withdraw** (`/transactions/withdraw`), dono me tab **Direct Users** (apne purane Fiat / Crypto / Payment orders screens, chhote switch se) aur **Agent Users** (zip ka "Deposit History — Agent → User": ID, From, To, Amount, Date; filter ID / From / To / Min / Max / Clear). **Account Statement** = apna `/reports/statements` (Reports group se yahan aaya). Finance group me baaki (Exchange rates, Coins, Vault, Swap, Tips, P2P) waise hi; purane Deposits / Withdrawals sub-menu hataye (pages wahi, ab tab ke andar).
**Kyun:** User: finance system zip jaisa — uska architecture, setup apna.
**Files / jagah:** naya API module `backend/services/admin/src/modules/agent-transfers/` (`GET admin/agent-transfers?direction=deposit|withdraw&search&from&to&min&max`, users:read, sirf apne tree ka; deposit = staff → user, withdraw = user → staff, `staff_transfers`), `admin/src/views/transactions/{Transactions,AgentTransfers}.tsx`, `admin/src/app/(pages)/transactions/{deposit,withdraw}/page.tsx`, `admin/src/configs/navConfig.tsx`.
**Notes / pending:** Koi existing API nahi badli (`admin/accounts/statement` me direction filter nahi tha, isliye naya endpoint). Test agent-transfers 3/3 pass, tsc + eslint clean, backend restart karke route 401 (maujood). Browser me login karke dekhna baaki.

## 2026-10-17 — Sidebar: Wallets ab Main me
**Kya kiya:** Sidebar ka "Wallets" (`/wallets`) Finance se hata ke Main section me (Dashboard, Users ke baad). Page/URL/permission same.
**Kyun:** User: "ye wallet wala section main ke andar daalo".
**Files / jagah:** `admin/src/configs/navConfig.tsx`
**Notes / pending:** tsc + eslint clean; browser me sidebar: MAIN → Dashboard, Users, Wallets.

## 2026-10-17 — Agent System page (zip ke AdminManagement tabs)
**Kya kiya:** Naya page `/agent-system` (sidebar → Agent Management → Agent System). Tabs (`?tab=`), Dashboard chhod ke zip jaisa: **Agent Listing** (zip table: Login Name, Account Type, Balance, CR, Net Exposure, Current %, Betting Status, Status, Client P/L, Actions — Deposit/Withdraw, Settlement, Settings, downline drill-down; Create Agent = apna Create Account page), **Staff Portal** (Quick ID Creation, Wallet Refill, Close Sports / Casino / Lock Account), **My Account** (owner ke dono balance + Add Balance, phir apna My account), **Executives**, **Marketing**, **Activity Log** (apna audit log).
**Kyun:** User ne zip ke client management ke sections maange, apne agent setup (Sports Exchange levels / points) ke hisaab se.
**Files / jagah:** `admin/src/views/agent-system/{AgentSystem,AgentListing,StaffPortal}.tsx`, `admin/src/app/(pages)/agent-system/page.tsx`, `admin/src/configs/navConfig.tsx`, `admin/src/views/access/ExecutivesList.tsx` (sirf export).
**Notes / pending:** Koi API nahi badli, koi nayi nahi bani — sab purani: `admin/exchange/accounts`, `admin/exchange/accounts-admin/create` (userType USER), `admin/staff/transfer`, `admin/accounts/refill` (owner), `admin/accounts/status`, `admin/exchange/points/settle`, `admin/access/executives|marketing-users`, `admin/audit/activity`. tsc + eslint clean; browser me login karke dekhna baaki.

## 2026-10-17 — Account List: action buttons premium pill + chhote labels
**Kya kiya:** `/exchange/users` ke action buttons ab chhote "pill" (rounded-full, halka rangeen background + ring; hover pe poora rang, white text, glow, thoda upar uthna). Labels chhote: "D / W", "Settle", "More" — poora naam tooltip (title) me.
**Kyun:** User: "button thoda premium aur button ke andar text thoda kam karo, bas understandable".
**Files / jagah:** `admin/src/views/exchange/AccountList.tsx`
**Notes / pending:** tsc + eslint clean; dark + light screenshot dekhe, "Settle" click pe Settlement popup khulta hai.

## 2026-10-17 — Poore admin me admin-structure.zip ke colours aur buttons
**Kya kiya:** `globals.css` ke theme tokens zip ke `src/theme.ts` jaise: dark mode navy (background #0C0D1D, card/sidebar #0E1831, muted #121E38, border #1E2D55, text #F9F9F9 / #8384A5), primary blue #2B6EF5, success #0ECC68, danger/destructive #E01B4F, warning #FFC23F, info #5581F7; light mode me wahi blue/red aur thode gehre green/yellow/info (safed pe padhne layak). Button: rounded 10px, font-semibold; default blue hover pe halka + glow (zip jaisa); outline hover pe blue border + halka tint; destructive ab solid laal (zip ke Debit jaisa); ghost hover blue.
**Kyun:** User: "jaise is zip me color aur button acche hai vaise hi apne me use karo" — scope poocha, user ne "Poore admin me" chuna.
**Files / jagah:** `admin/src/app/globals.css`, `admin/src/components/ui/button.tsx`
**Notes / pending:** Sirf colours/buttons — font (zip me Montserrat) nahi badla. tsc + eslint clean; Dashboard (dark + light), Account List aur D/W popup ke screenshot dekhe.

## 2026-10-17 — General Lock: client search ki suggestion list card me kat rahi thi
**Kya kiya:** `/exchange/reports/general-lock` ka Card `overflow-visible` kiya (Card me default `overflow-hidden` hai, isliye "Search By Client Name" ki dropdown list card ke neeche kat jaati thi). Reports (reportKit) pehle se aisa hi karte hain.
**Kyun:** User: "searching kar rahe hai to neeche suggestion hide ho raha hai box ke andar".
**Files / jagah:** `admin/src/views/exchange/settings/GeneralLock.tsx`
**Notes / pending:** Headless Chrome screenshot se check: list poori dikhti hai. Pura flow (search → Load → tree → lock/unlock, reload pe lock dikhna) bhi chal raha hai.

## 2026-10-17 — Account List: Action menu ki jagah rangeen button + zip wallet jaisa −/+ popup
**Kya kiya:** `/exchange/users` me har row pe ab teen rangeen button: "Deposit / Withdraw" (hara), "Settlement" (peela), "More" (neela). D/W ya Settlement dabane pe popup (zip ke Wallet page ke Manage Funds jaisa): upar rangeen cards me parent balance, user CR (Settlement me user pts + Profit/Loss), Amount, (Settlement me Remark), Transaction Code, aur do bade button "− Withdraw" (laal) / "+ Deposit" (hara). Deposit / Withdraw = `admin/staff/transfer`, Settlement = `admin/exchange/points/settle` (APIs same). Purana Action dropdown, Credit Deposit/Withdraw popup aur SettleDialog hata diye; `CreditDialog.tsx` → `CreditHistory.tsx` (sirf More ka Credit History); MoreDialog ab sirf trigger se khulta hai. Drill-down me pehle jaisa sirf "P". (Pehle row ke neeche khulne wala panel banaya tha — user ko pasand nahi aaya, popup kar diya.)
**Kyun:** User: "action button ki jagah do button… + - wala button jaise wallet me (zip)", phir "thoda colorful button bnao", "more wala button rahega".
**Files / jagah:** `admin/src/views/exchange/{AccountList.tsx, FundsDialog.tsx (naya), CreditHistory.tsx, MoreDialog.tsx}`, `SettleDialog.tsx` delete.
**Notes / pending:** tsc + eslint clean. Headless Chrome se QA owner pe live: D/W popup se Deposit 10 ✓, Withdraw 4 ✓ (CR 10 → 6), Settlement popup khula aur API ne sahi "no pending settlement" diya (P/L 0 tha), More popup ✓. Koi console error nahi. Backend change nahi.

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

## 2026-10-16 — Account List: ek Action menu (Deposit / Withdraw + Settlement + More)
**Kya kiya:** Do alag D / W columns ki jagah har row me ek "Action" dropdown: section "Deposit / Withdraw" (D, W → CreditDialog), section "Settlement" (D, W → SettleDialog), phir More. Popups menu ke bahar, state se khulte hain: CreditDialog / SettleDialog ab `open` / `onOpenChange` lete hain (trigger nahi); MoreDialog me trigger optional + controlled mode (drill-down ka "P" waise hi).
**Kyun:** User: "dono alag alag bahut ajeeb lag raha hai — ek action button rakho, use select karne pe D and W".
**Files / jagah:** admin/src/views/exchange/{AccountList.tsx, CreditDialog.tsx, SettleDialog.tsx, MoreDialog.tsx}
**Notes / pending:** tsc + eslint clean, page + drill-down 200.

## 2026-10-16 — User History hataya (aur khaali Exchange Reports section)
**Kya kiya:** User History page + `views/exchange/user-reports/` (UserHistory + shared) hataye; sidebar ka Exchange Reports section (ab khaali) hataya. Backend `exchange-user-reports`: `/login-history`, `/password-history`, `/ip-detail` routes, service methods (loginHistory, passwordHistory, ipDetail, #historyTarget), helpers (fmtDate, normalizeIp, dateRange, emptyPage, notInDownline), validators, 2 tests. Module me ab sirf `/home` (Dashboard → Agent System).
**Kyun:** User: "reports/user-history section hata do".
**Files / jagah:** admin/src/configs/navConfig.tsx; backend exchange-user-reports/{index.js, routes/admin.routes.js, userReports.service.js, userReports.validators.js, __tests__/userReports.test.js}.
**Notes / pending:** Tests 11 pass. Live: 3 routes + page 404, home + dashboard 200. Backend restart kiya.

## 2026-10-16 — General Lock aur Turn Over Agent Management me
**Kya kiya:** Sidebar: General Lock aur Turn Over Exchange Reports se Agent Management me (User Win Loss ke neeche). Exchange Reports me sirf User History bacha. URLs wahi.
**Kyun:** User: "general-lock, turnover client management ke andar daal do".
**Files / jagah:** admin/src/configs/navConfig.tsx
**Notes / pending:** tsc + eslint clean.

## 2026-10-16 — Fraud Report, User Register Detail, User Authentication hataye
**Kya kiya:** Teeno pages + views (FraudReport, UserRegisterDetail, AuthList) + sidebar links hataye. Backend `exchange-user-reports`: routes `/fraud`, `/auth-list`, `/register-detail`, service methods (authList, fraud, registerDetail, #registerScope), validators (list, registerDetail), unused `descendantIds` import, 3 tests. Exchange Reports me ab: User History, General Lock, Turn Over.
**Kyun:** User: "fraud, user-register-detail, user-authentication hata do exchange reports se".
**Files / jagah:** admin/src/{configs/navConfig.tsx, views/exchange/user-reports/*}; backend exchange-user-reports/{routes/admin.routes.js, userReports.service.js, userReports.validators.js, __tests__/userReports.test.js}.
**Notes / pending:** Tests 13 pass. Live: teeno API + pages 404, baaki 200. Backend restart kiya.

## 2026-10-16 — Current Bets Sports Exchange me
**Kya kiya:** Sidebar: Current Bets Exchange Reports se Sports Exchange section me (Market Analysis ke neeche). URL wahi (`/exchange/reports/current-bets`).
**Kyun:** User: "current-bets sports ke andar daal do".
**Files / jagah:** admin/src/configs/navConfig.tsx
**Notes / pending:** tsc + eslint clean.

## 2026-10-16 — Sportbook ka sab kuch hataya
**Kya kiya:** Sportbook Report page + view + sidebar link hataye; backend `POST /exchange/reports/sportbook-report` route, service method, validator. Total Profit Loss: Type filter (All / Sports / Sportbook) aur khaali Sportbook table hataye; API se `type` param aur `sportbook: []` hataye (ab `{ sports }`). User Win Loss: SportBookpts column + `SPORTSBOOK` category / `sportsbook_pts` hataye. (marketBlocks ka `v-sportbook` sirf % badge ka naam hai — rehne diya.)
**Kyun:** User: "sportbook jaisa koi bhi cheez yahan nahi hai, wo hata do".
**Files / jagah:** admin/src/{views/exchange/reports/{TotalProfitLoss,UserWinLoss}.tsx, configs/navConfig.tsx}; backend exchange-reports/{routes/admin.routes.js, reports.service.js, reports.validators.js, winLossReports.js, index.js, __tests__/exchangeReports.test.js}.
**Notes / pending:** Tests 20 pass. Live: sportbook route 404, total-profit-loss `{ sports: [] }` 200, `type` bhejne pe 422, user-win-loss totals `{ sports_pts, total }`. Backend restart kiya.

## 2026-10-16 — 4 reports Agent Management me
**Kya kiya:** Account Statement, Party Win Loss, Total Profit Loss, User Win Loss — Exchange Reports se utha ke Agent Management section me (Account List, Bank ke neeche). Exchange Reports me 8 bache. URLs wahi.
**Kyun:** User: "account-statement, party-win-loss, total-profit-loss, user-win-loss client management me daal do" (client management = sidebar ka Agent Management).
**Files / jagah:** admin/src/configs/navConfig.tsx
**Notes / pending:** tsc + eslint clean.

## 2026-10-16 — Exchange Reports alag sidebar section
**Kya kiya:** Sports Exchange group se "Reports" (12 sub-links) nikal ke naya collapsible group "Exchange Reports" (Sports Exchange ke theek neeche, uske parallel) — 12 seedhe links, reports:read. Pages / URLs wahi.
**Kyun:** User: "sports exchange me jo reports wala section hai usko bahar le aao, exchange ke parallel daal do".
**Files / jagah:** admin/src/configs/navConfig.tsx
**Notes / pending:** Naam "Exchange Reports" isliye ki "Reports" group (direct users ke) pehle se hai. Pages 200.

## 2026-10-16 — Account List: D / W ke do section (Deposit / Withdraw + Settlement)
**Kya kiya:** Account List me do alag column: "Deposit / Withdraw" (D / W → CreditDialog, `admin/staff/transfer`) aur "Settlement" (D / W → SettleDialog, `admin/exchange/points/settle`, pehle jaisa). SettleDialog commit `f95f9d6^` se wapas, helpers `accountMoney.ts` se. Action me ab sirf More (drill-down me P). Drill-down me paise wale column "—".
**Kyun:** User: "D / W ko do section me divide karo — ek me settlement wala chalega, ek me simple deposit / withdraw, jaise pehle chal raha tha".
**Files / jagah:** admin/src/views/exchange/{AccountList.tsx, SettleDialog.tsx}
**Notes / pending:** tsc + eslint clean, page 200.

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
**Test:** admin service `npm test` (TEST_DB_NAME=parker567_test): 806 pass, 0 fail. Dashboard ke scope tests naye rule pe likhe (agent ko khali; root ko sirf direct user; client ka naam dene pe bhi 0).

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
- **Migration `099-credits-for-everyone`:** `credits` me `user_type` ('USER' | 'STAFF' | 'OWNER'), `staff_id`, `exposure_limit` add kiye; `uid` ab NULL ho sakta hai (staff row me). CHECK: player row = uid, staff/owner row = staff_id. Har staff ki row `staff_balances` ka balance copy karke bani (level 1 = OWNER), aur jis player ki row nahi thi uski 0 wali row. `staff_balances` table delete nahi ki, code ab use nahi padhta. Local dev DB aur `parker567_test` dono pe chal chuki hai (dev DB pe saath me pending 095-game-transactions, 097, 098 bhi chali).
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
- Backend `npm test` test DB ke saath (`TEST_DB_NAME=parker567_test`): **2412 tests, 2410 pass, 0 fail**, 2 skip (legacy folder / git history wale, by design). Sports `npm test` 3 pass 1 skip. Player frontend vitest 127/127. Admin `tsc` aur naye files ka eslint saaf.
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
**Kyun:** Local Postgres (`parker567`) ko browser se dekhne ke liye. Project me kuch add nahi kiya (pehle `tools/adminer/` banaya tha, hata diya).
**Files / jagah:** Project me koi file nahi badli. System: `%LOCALAPPDATA%\Programs\Adminer\{adminer.php, adminer.cmd}`, user PATH, Start Menu shortcut.
**Notes / pending:** Chalane ke liye naya terminal kholke `adminer` (ya `adminer 9000` dusre port ke liye), ya Start Menu se Adminer. Login: System = PostgreSQL, Server = `127.0.0.1`, User = `postgres`, Database = `parker567`, password `backend/.env` me `DB_PASSWORD`. `backend/README.md` me jo `./tools/adminer/start.sh` likha hai wo script repo me exist nahi karti.

## 2026-10-13 — Worklog shuru kiya
**Kya kiya:** `WORKLOG.md` banaya. Ab se har change yahan log hoga.
**Kyun:** Taaki team ko yaad rahe kya kaam hua, kya badla aur kis jagah.
**Files / jagah:** `WORKLOG.md`

### Pehle ka kaam (git history se, reference ke liye)
- 2026-10-13 `c51e69c` — Signed-in player locked ho to account-locked message dikhana
- 2026-10-13 `772e8d9` — Role hierarchy fixes, login-password transaction mode, shared rate limits
- 2026-10-13 `18d6c85` — `/sports` par native sports exchange (TENEXCH functionality, hash.game look)
- 2026-10-12 `d9d9857` — Docs: catalogue launch v2 keys ke saath live; in-house ko abhi v1 chahiye
