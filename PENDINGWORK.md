# Pending work

Jo kaam baad me karna hai. Kaam ho jaye to yahan se hata do aur `WORKLOG.md` (ya bug ho to `FIXLOG.md`) me likh do.

---

## Sports exchange

### 1. MATCH_ODDS pe bet 1 rupaye se zyada nahi lagti (`maxb=1`)
- **Dikkat:** Feed MATCH_ODDS market pe `maxb: 1` bhejta hai. `resolveMarketLimits` (`backend/services/sports/src/modules/bets/controllers/sportbetscontroller.mjs` ~line 151) cricket pe `maxb` ko max stake maan leta hai, isliye owner override ke bina har MO bet "Maximum bet amount is 1" se reject hoti hai.
- **Karna:** Decide karna hai ki MO pe `maxb` flag hai ya asli limit. Agar flag hai to `max` (is match pe 2000) use karo, jaisa racing ke liye pehle se hota hai.
- **Abhi ka jugaad:** owner panel se market ka `bet_limit_overrides` lagana.

### 2. Unmatched bet ki liability settle hone pe wapas nahi aati
- **Dikkat:** Jo unmatched bet market settle hone tak match nahi hui, wo `result_status = 'void'` likhi jaati hai, par settlement uski liability exposure me loss ki tarah ginta hai. Settlement ledger amount 0 aata hai aur paisa wapas nahi milta. Test me: bet 10, 100 ki liability, settled-void ke baad hi wapas aayi.
- **Karna:** Settlement (`settlementv2.mjs`, MO/BM market-level hisaab) me unmatched open bets ka exposure alag karke refund karna. Ye mssports ka purana logic hai, `Wallets.cash` ke time bhi aisa hi tha.

### 3. ~~Points roll-up wapas chalu karna (`credits.id` pe)~~ — ho gaya 2026-10-15 (`creditsPoints.mjs`, dono walletService copies)
- Abhi `updateAllPointHierarchy`, `applyCommissionPoints`, `reverseAllPointHierarchy` aur `reverseCommissionPoints` band hain (calls comment, function me early return).
- **Karna:** In functions ko `Wallets` ki jagah `credits` pe chalana: `point_ledger.wallet_id = credits.id`; `all_point`, `sports_pts`, `upper_point`, `down_point` `credits` se. Iske liye staff/owner ki `credits` rows chahiye (point 4).
- **Asar abhi:** sports statement `point_ledger` se banta hai, isliye naye settlements statement me nahi dikhte (sirf "Opening pts" row aati hai).

### 4. Sports service ko staff/owner ke `credits` rows pe lana
- **Ho gaya (2026-10-15, migration 099):** `credits` me staff/owner ki rows (`user_type`, `staff_id`, uid NULL). Admin-service ke saare paise ke raaste inhi pe hain.
- **Baaki:** sports service (`services/sports`) abhi bhi staff/owner ke liye `mssports."Wallets"` padhta hai — hierarchy (`hierarchyUtility.mjs`, `uplineLevelNo.mjs`) aur staff → player routes (`addCash`, `addDeposit`, `withdrawFromChild`, `settlePointsFromChild` in `lib/services/walletService.mjs`). Inhe `credits` (staff_id) pe lana, phir points roll-up (item 3) chalu karna.

### Exchange section — ~~zip ke baaki screens port karna~~ — ho gaya 2026-10-15 (sab screens, WORKLOG dekho). Bache hue chhote kaam:
- Staff logins DB me save karna (User History me staff ki login history ke liye).
- More modal ka Edit Profile (full name) — users/staff me full name column chahiye to.

### (purana) Exchange section — zip (msadmin) ke baaki screens port karna
Sidebar me **"Sports Exchange"** section ban gaya hai, zip ke poore menu ke saath (2026-10-15). Jo screen port nahi hua uska page "not ported yet" dikhata hai — sahi list `admin/src/views/exchange/screens.ts` hai (har entry: zip page, backend ready ya nahi). Zip ke jo screens abhi aane hain — **casino wala kuch nahi** (user ka faisla: is project me table casino games nahi hain; CasinoSettlement, CasinoSettledVoid, CasinoResult, LiveCasinoReport, casino/*, Casino-games, casino manage, table-casino locks chhodne hain):
- ~~**Points settlement**~~ — ho gaya 2026-10-15: `POST /admin/exchange/points/settle`, Account List / Active Users (D/W) aur Bank screens.
- **Users:** Users / Active users / Insert user / Assign agent (zip `pages/users`, `AssignAgent.jsx`) — hamare Users + Staff screens se milana, jo nahi hai wo Exchange me.
- **Settlement:** Match settlement, Fancy settlement, Void bets (backend `services/sports` me `/declareresult`, `/void`, `/settled-*` pehle se hai; abhi Sports > Settlement screen hai — Exchange me laana ya link karna).
- **Settings:** Bet limits, Buffer time, Max odds, Auto void, Virtual bet limits, Commission, Fixtures, User lock (backend sports `betting-config/*`, `commission-config/*`, `sports-lock/*` pehle se).
- **Reports:** Account statement, Profit/Loss, Total P/L, Sportbook report, Current bets, Turnover, User win-loss, User history, User register detail, Fraud report, Bank, Auth list.
- **Market analysis**, game details, System tracker (owner).
- Har screen: zip jaisa simple code, wallet ki jagah `credits`.

### 5. Sports ki entries platform ke `public.credits_ledger` me nahi jaati
- Sports `credits.inr` me seedha likhta hai. Sports ka hisaab sirf `mssports.credits_ledger` / `debit_ledger` me hai, platform ke ledger me nahi. Platform ka wallet-vs-ledger reconcile check (seed ka "wallets reconcile with their ledger") sports wale players pe mismatch dikha sakta hai.
- **Decide karna:** platform ledger me bhi entry likhni hai (user-service ke wallet flow se), ya reconcile me sports ko alag ginna hai.

### 6. Placement ka silent-skip guard (zip ka B4)
- `walletUpdate` (`sportbetscontroller.mjs`) me debit sirf tab hota hai jab `inr >= delta`, warna chupchaap skip ho jaata hai. Abhi pehle wala balance check isse rok deta hai, par skip ki jagah error throw hona chahiye.

### 7. Platform ke auto-generated models update karna
- `backend/packages/db/src/models/core/Credits.js` me migration 095 ke naye columns (`id`, `credit`, `all_point`, `upper_point`, `down_point`, `sports_pts`, `thirdparty_pts`) nahi hain, aur `models/sports/Fanwins.js` me `runsodds` abhi bhi INTEGER hai (migration 096). `npm run verify:models` ise sirf info ki tarah dikhata hai.
- **Karna:** `npm run generate:models --workspace @ibitplay/db` se dobara generate karna, ya ise jaan-boojh ke chhodna hai to note karna.

## Local / setup

### 8. Seed: agent ke neeche wale demo players nahi bante
- `node scripts/seed-data.js --demo` me "players" dataset `TXN_PASSWORD_INVALID` ("The transaction password is not correct") se fail hota hai. Shayad `772e8d9` ke login-password transaction mode ke baad se. Direct players ban jaate hain.

### 9. README me Adminer ki galat line
- `backend/README.md` me `./tools/adminer/start.sh` likha hai, jo repo me kabhi tha hi nahi. Adminer ab system pe hai (`adminer` command). Line hatani hai ya badalni hai.
