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
