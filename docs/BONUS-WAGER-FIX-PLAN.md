# Bonus, Wager, Referral, VIP — hash.game jaisa banane ka Fix Plan

> Status: **DRAFT — aapke confirm hone ka intezaar.** Confirm se pehle koi code ya setting nahi badlegi.
> Source: hash.game live pages, 19 Oct 2026 — `/referral-exhibition`, `/referral` (saare tabs + Rate & Rules),
> `/vip-club` config API, `/bonus`, deposit "View Bonus Details", footer "Wager Contribution".
> Pichhla formula check: https://claude.ai/code/artifact/2e378f1a-d49f-4edf-a1f2-2a7e89ee5890
>
> **Rule:** har naam, number aur % **admin se editable** hoga. Default = hash.game ki value.

---

## 0. Confirm karna hai

| # | Sawal | Default (hash.game) | Aapka jawab |
|---|---|---|---|
| D1 | VIP ladder | hash.game ki 34 levels (Beginner → Eternal X, §1) — naam + XP admin se editable | |
| D2 | Abhi ke players ka level | Unka USD wager same rahega, sirf naya ladder lagega (kuch players ka level/naam badlega) | |
| D3 | Referral locked reward | $1,000 per friend, 10 steps, dost ke VIP level se unlock (§2) | |
| D4 | Commission | `wager × 1% × commission rate (25%) × game rate` (Originals 28%, Slots + Live 60%, Sports 100%) | |
| D5 | Commission kab banega | hash.game: har 24 ghante. Hum: **per-bet** (amount same, bas jaldi dikhta hai) — ya 24h job | |
| D6 | Ab tak 5% wala unclaimed commission | Naye formula se recalculate; jo claim ho gaya woh rehne do | |
| D7 | Deposit bonus | Mahine ke 4 deposit bonus: 180% / 240% / 300% / 360% (§4), locked, wager se unlock | |
| D8 | Bonus unlock rate | `wager × house edge × 1%` har bet par (hash.game Deposit Rakeback popup), claim kabhi bhi, expiry nahi. Note: hamara Help page 20% likhta hai — hash.game ab 1% dikhata hai | |
| D8b | Rakeback + Daily / Weekly / Monthly bonus | hash.game formulas (§4b): house edge par, VIP tier ke fixed % par nahi | |
| D9 | Max bet jab bonus locked | hash.game ke abhi wale deposit bonus mein **nahi hai** → default OFF (admin se on ho sake, $5) | |
| D10 | Wager contribution | hash.game ki per-game / provider list; sports 50% + odds ≥ 1.5 | |
| D11 | Withdrawal 3x rollover | Saare deposit rails gino (abhi sirf fiat) | |
| D12 | Turnover Report (TargetX) | Asli rollover ke saath ek hi source | |

---

## 1. VIP ladder — hash.game ke naam aur XP, admin se editable

**hash.game** (`GET /api/game/support/vip-v2/config/`): **1 XP = $1 wager**, XP kabhi kam nahi hota.

| L | Naam | XP (USD) | L | Naam | XP (USD) |
|---|---|---|---|---|---|
| 0 | Beginner | 0 | 17 | Diamond I | 25,000,000 |
| 1 | Bronze I | 1,000 | 18 | Diamond II | 40,000,000 |
| 2 | Bronze II | 3,000 | 19 | Diamond III | 65,000,000 |
| 3 | Bronze III | 7,000 | 20 | Diamond IV | 110,000,000 |
| 4 | Bronze IV | 15,000 | 21 | Diamond V | 200,000,000 |
| 5 | Silver I | 30,000 | 22 | Diamond VI | 400,000,000 |
| 6 | Silver II | 60,000 | 23 | Diamond VII | 1,000,000,000 |
| 7 | Silver III | 120,000 | 24 | Eternal I | 1,500,000,000 |
| 8 | Silver IV | 240,000 | 25 | Eternal II | 2,200,000,000 |
| 9 | Gold I | 500,000 | 26 | Eternal III | 3,200,000,000 |
| 10 | Gold II | 1,000,000 | 27 | Eternal IV | 4,500,000,000 |
| 11 | Gold III | 2,000,000 | 28 | Eternal V | 6,000,000,000 |
| 12 | Gold IV | 3,500,000 | 29 | Eternal VI | 7,200,000,000 |
| 13 | Platinum I | 6,000,000 | 30 | Eternal VII | 8,300,000,000 |
| 14 | Platinum II | 8,500,000 | 31 | Eternal VIII | 9,000,000,000 |
| 15 | Platinum III | 11,000,000 | 32 | Eternal IX | 9,500,000,000 |
| 16 | Platinum IV | 15,000,000 | 33 | Eternal X | 10,000,000,000 |

Perks (hash.game text): Bonus page Bronze I se; Coin Drop VIP 7; Tipping VIP 8; Weekly Cashback aur Sports Club weekly VIP 22+ (Friday, min $1,000 wager Fri–Thu); har level-up par 1 wheel spin.

**Naam bilkul hash.game jaise (`/referral/rules` aur VIP config dono mein yahi spelling):** Roman numerals — `Bronze I`, `Bronze II`, `Bronze III`, `Bronze IV`, `Silver I` … `Diamond VII`, `Eternal X`. "Bronze 1", "Wood", "VIP 01" jaise naam kahin nahi dikhne chahiye (site, admin, referral table, profile badge, emails).

**Abhi hamare yahan:** ladder code mein fixed — `backend/packages/common/src/vipLevels.js` (**Wood, Bronze 1–5, Silver 1–5** … — naam aur XP dono hash.game se alag), rewards `vipRewards.js:36-116`. Admin se kuch nahi badalta. Referral unlock table ke naam (`106-referral-unlock-tiers.js`) pehle se sahi hain (Bronze I, Bronze II, Bronze IV, Silver I …) — par woh VIP ladder ke naamon se match nahi karte, isliye abhi dost ka level un naamon se mil hi nahi sakta.

**Fix:**
1. Migration: table `vip_levels(level INT PK, name TEXT, card TEXT, min_xp NUMERIC, level_up_bonus NUMERIC, rakeback_rate NUMERIC, daily/weekly/monthly NUMERIC, perks JSONB)`, upar ki 34 rows se seed.
2. `vipLadders.js` naya variant `hashgame` jo table padhe (60s cache); site ka `vip` feature variant → `hashgame`. Purane ladders code mein rahenge (owner switch).
3. Admin: **VIP Levels** screen — har row ka naam (Bronze I…), XP, level-up bonus, rakeback %, perks edit. Route `admin/site-config/vip-levels` (GET/PUT, transaction password).
4. Frontend `/vip-club`, `/bonus`, profile badge — naam aur XP `GET /user/vip/levels` se (pehle se backend se aata hai).
5. **Level-up bonus aur rakeback % hash.game public nahi karta** (API `rewards:null`). Default = abhi ke `vipRewards.js` ke values naye levels par map; admin baad mein badle.

**Test:** `vipLadders.test.js` — 999 XP → Beginner, 1,000 → Bronze I, 15,000 → Bronze IV; admin naam badle → API naya naam.

---

## 2. Referral locked rewards — $1,000 per friend (sabse zaroori)

**hash.game** (`/referral-exhibition`, `/referral/rules`):
> "Invite Friends to Earn $1,000 + 25% Commission"
> 1 Share to friends · 2 Get $1,000 – *Your awards will be locked for now* · 3 Level Up & Receive – *Your friend's VIP level will unlock your awards*
> "Locked Rewards – The rewards that you will receive in the future when your friends' VIP level increases."

| # | Dost ka level | Dost ka total wager (USD) | Aapko unlock (USD) |
|---|---|---|---|
| 1 | Bronze I | 1,000 | 0.50 |
| 2 | Bronze II | 3,000 | 2.50 |
| 3 | Bronze IV | 15,000 | 5.00 |
| 4 | Silver I | 30,000 | 12.00 |
| 5 | Silver III | 120,000 | 25.00 |
| 6 | Silver IV | 240,000 | 50.00 |
| 7 | Gold I | 500,000 | 80.00 |
| 8 | Gold II | 1,000,000 | 120.00 |
| 9 | Gold IV | 3,500,000 | 205.00 |
| 10 | Platinum II | 8,500,000 | 500.00 |
| | **Total** | | **1,000.00** |

- Deposit ki shart nahi. Unlock hua reward "Available Referral Rewards" mein, **kabhi bhi "Withdraw to Wallet"**; min amount / expiry nahi.
- My Rewards par 4 figures: Available Commission, Available Referral Rewards, Total Received, **Locked Rewards**.

**Abhi hamare yahan:**
- Payout `affiliate.constants.js:22-33` `UNLOCK_TIERS` se — wager 1,000 / **5,000 / 17,000 / 49,000 / 129,000** / 321,000 / 769,000 / 1,793,000 / 4,097,000 / 9,217,000 → **hash.game se alag**.
- Admin ki table `siteconfig.referral_unlock_tiers` (default **bilkul hash.game wali** — Bronze I 1,000 → 0.50 …) sirf dikhawa hai (`siteConfig.service.js:65`).
- "Locked Rewards" figure player ko nahi dikhta.

**Fix:**
1. `affiliate.service.js` `#tierFor` (:1100) / `unlockFor` (:714) → admin table padhe (5s cache), USD mein. `UNLOCK_TIERS` sirf fallback.
2. Trigger = dost ka **VIP level** (table row ka `level` naam §1 ladder se match — dono jagah same naam: Bronze I, Bronze II, Bronze IV, Silver I, Silver III, Silver IV, Gold I, Gold II, Gold IV, Platinum II); wager threshold usi level ka `min_xp`. Admin agar level ka naam ya XP badle to referral table ka dropdown aur tier khud follow kare (naam ek hi jagah — `vip_levels` — se aaye).
3. Admin table already editable hai (`admin/src/views/site-config/AffiliateSettings.tsx:107`, route `admin/site-config/referral-unlocks`) — label "USD" saaf karo; "level" dropdown §1 ke naamon se.
4. API `GET /user/affiliate` mein `lockedRewards` = har dost ke liye (total − unlocked), sum. Frontend My Rewards par 4 boxes hash.game jaise.
5. Pehle se jinke friends 5,000 / 17,000 wale code-tier par unlock hue: unhe naye table par dobara mat do — `unlocked_rewards.wager_amount` (highest unlocked) se aage hi chale.

**Test:** naya `affiliate/__tests__/referralLocked.test.js` — dost 1,000 → 0.50 unlock; 3,000 → +2.50; locked = 997; admin row badle → naya amount; double unlock na ho.

### 2b. `/referral` page — CDP par click karke dekha (19 Oct 2026)

| Tab | Kya hai |
|---|---|
| **Dashboard** | "Invite a Friend to Get ₹94,893 Referral Rewards + 25% Commission Rewards" · Referral Link + Code (copy) · Share via socials · Referral Terms & Conditions · boxes: Total Reward, Total Friends, Referral Rewards, Commission Rewards · Rewards Activities · **Live Rewards** feed ("Total Rewards Sent To-Date", username + amount) |
| **My Rewards** | Available Commission Rewards (+ Total Received) · Available Referral Rewards (+ Total Received) · **Locked Rewards** · buttons **Swap**, **Withdraw to Wallet** · sub-tabs: **Commission by Friends** (filters All Codes / Registration Date / Wager Date; columns Username, User ID, Commission Rate, Total Deposits (Past 7D), Registration Date, Total Commission) · **Commission by Currency** · **Level Up Rewards** (Username, Registration Date, VIP Level, Code, Earned) · Rules · History (`/reward-history?type=referral`: Currency, Amount, Time, Status) |
| **Referral Codes & Friends** | "Referral Code Created 1/20" · Friends count · **Create Code** dialog = sirf "Campaign Name (Optional)" (rate player nahi chunta, 25%) · table: Name, Code, Link, Commission Rate, Date Created, Referrals |
| **Rate & Rules** | §3 ki table + calculator + §2 ki unlock table + View Rules popup |

**Hamare frontend/backend mein yeh banana hai:** Locked Rewards box, Level Up Rewards tab (dost ka VIP level + earned), Commission by Friends ke columns/filters, 20 codes tak "Create Code" (campaign name), Swap/Withdraw to Wallet, History. Admin: per-code commission rate edit (default 25%).

---

## 3. Commission — hash.game Rate & Rules

**hash.game** (`/referral/rules` → Commission Reward Rate):
| Category | Formula |
|---|---|
| The Original Games | Wager × 1% × Commission Rate × **28%** |
| 3rd Party Slots, Live Casino | Wager × 1% × Commission Rate × **60%** |
| All Sports | Wager × 1% × Commission Rate × **100%** |

- Commission Rate default **25%**, har referral code par alag ho sakta hai (1–100). User ke **20 referral codes** tak.
- "The system calculates the commission every 24 hours." · "Commissions can be withdrawn into our internal wallet at anytime."
- Calculator: ₹1,000 × 1% × 25% × 28% = **₹0.70** (2 decimal neeche).

**Abhi:** `affiliate.service.js:117` `commissionUsd = percentOf(delta, commissionPercent)` — flat **5%**, game type pata hi nahi. ₹1,000 par ₹50 (hash.game ₹0.70–₹2.50).

**Fix:**
1. Pehle §6 (wager ke saath category). Phir `onWager`: `usd × 1% × codeRate × gameRate[category]`.
2. Settings (admin editable): `affiliate_commission_rate` (25), `affiliate_game_rates` `{originals:28, slots:60, live:60, sports:100}`. Admin `AffiliateSettings.tsx` mein "Commission %" ki jagah yeh 5 fields.
3. Referral code par apna rate (`referral_codes.commission_rate`, default 25); max 20 codes per user.
4. D6: `backend/scripts/recalc-unclaimed-commission.js` (dry-run, `--apply`).

**Test:** ₹1,000 → Originals ₹0.70, Slots/Live ₹1.50, Sports ₹2.50; code rate 10% → 0.28.

---

## 4. Deposit bonus + locked bonus — hash.game "Monthly Deposit Bonus"

**hash.game** (deposit → View Bonus Details):
> "Get 4 deposit bonuses every month. Each bonus is locked and unlocks as you wager. All 4 chances reset on the 1st of each month at 00:00 UTC."
> "Claim your unlocked rewards from the Bonus page anytime - no expiration. All rewards are real cash and can be withdrawn immediately."

| Deposit | Bonus | Min crypto | Min INR | Max bonus |
|---|---|---|---|---|
| 1st | 180% | $5 | ₹1,000 | — |
| 2nd | 240% | $10 | ₹2,000 | — |
| 3rd | 300% | $20 | ₹3,000 | — |
| 4th | 360% | $30 | ₹5,000 | — |

Unlock (`/bonus` → Deposit Rakeback info): **"Wagered * house edge * 1%"** — real time; popup mein Unlock Progress %, Unlocked, Locked aur Claim. "Only real money, non-PvP wagers count. Reward varies by game type and house edge." House edge: hedgeable games 2%, non-hedgeable 0.5%, warna 1 − RTP (max 4%). Deposit page: INR fiat ₹100–₹50,000, ₹1,000 par "Extra +₹1,800".

**Abhi:** sirf **first deposit** bonus (`firstDepositBonus.service.js:344-357`), `required = bonus × multiplier` (`playerBonus.service.js:126`), shart poori → ek saath cash (:367). Live par multiplier khaali → **bonus seedha cash**.

**Fix:**
1. Admin "Deposit bonus" table: 4 rows (%, min per currency, max bonus optional), reset din (1 tarikh UTC) — default upar wali.
2. `player_bonuses` mein `unlocked_amount`, `claimed_amount` (migration). `onStake` (:214): har bet par `unlock = stake × contribution × houseEdge(game) × unlockRate` (unlockRate default 1%), locked se zyada nahi. House edge per game: catalogue RTP se (`1 − RTP`, max 4%), na mile to category default (originals 1%, slots 4%, live 2%, sports 2%) — admin editable.
3. `POST /user/bonus/claim-unlocked` — jitna unlock hua, kabhi bhi cash (expiry nahi, D8).
4. `bonus_unlock_mode` (`gradual` default / purana `rollover`) admin se.
5. D9 Max bet: setting `bonus_max_bet_usd` (default **off**). On ho to user-service wallet debit (`BET_STAKE`) refuse `BONUS_MAX_BET`.
6. Frontend `/bonus`: Locked / Unlocked / Claim, aur deposit page par "Deposit 1/4 … 180%".

**Test:** ₹1,000 1st deposit → ₹1,800 locked; ₹10,000 slots wager → ₹20 unlock; claim → cash; 5th deposit same month → koi bonus nahi; 1 tarikh → reset.

---

## 4b. Rakeback + Daily / Weekly / Monthly bonus — hash.game formulas

**hash.game** (`/bonus`, har card ka info button):

| Card | Window | Milta kab | Claim kab tak | Formula |
|---|---|---|---|---|
| Instant (rakeback) | real time | har poora ghanta | — | **Wagered × house edge × 10%** |
| Deposit Rakeback | real time | wager ke saath unlock | kabhi bhi | **Wagered × house edge × 1%** (§4) |
| Daily Bonus | 00:00–23:59 UTC | agle din | 24 ghante | **Wagered × house edge × 4%** |
| Weekly Bonus | Fri 00:00 – Thu 23:59 UTC | har Friday | 7 din | **Wagered × house edge × 4% + net loss × 1%** |
| Monthly Bonus | 15 – 14 tarikh UTC | har 15 tarikh | 30 din | **Wagered × house edge × 3.5% + net loss × 1.5%** |
| Level Up Bonus | — | agla level aate hi | — | amount public nahi |

"Only real money, non-PvP wagers count." Hedged bets (ek round mein dono taraf) count nahi. Bonus page Bronze I se khulta hai.
VIP tiers ka text: Bronze "All Bonuses unlocked and boosted", Silver "Enhanced…", Gold "Superior…", Platinum "Premium…", Diamond "Elite…", Eternal "Maximum Level Up, Weekly & Monthly Bonus" — matlab upar ke % VIP badhne par badhte hain (exact % hash.game nahi dikhata; upar wale Beginner/Bronze ke hain).

**Abhi hamare yahan:** `vipRewards.js:36-116` — rakeback = USD stake × fixed % per card (0.1%–0.6%), daily/weekly/monthly fixed amounts per card. House edge ya net loss nahi.

**Fix:**
1. Settings (admin editable, default upar wale): `instant_rate 10%`, `daily_rate 4%`, `weekly_rate 4% + loss 1%`, `monthly_rate 3.5% + loss 1.5%`, windows (UTC), claim windows (24h / 7d / 30d), aur §1 VIP table mein per-tier multiplier (default 1.0 sab par — "boosted" ka % aap set karna).
2. `wager_activity` se per period `Σ usd × houseEdge` aur net loss (stake − payout) — net loss ke liye payout bhi record karna hoga (§6 mein `payout` column).
3. Rakeback job: instant har ghante; daily 00:00 UTC; weekly Friday; monthly 15 tarikh. Existing `bonus_history` + claim flow reuse.
4. Level-up bonus: §1 VIP table ka `level_up_bonus` (abhi ke values se seed).

**Test:** $1,000 slots wager (HE 4%) → instant $4, daily $1.60; weekly net loss $200 → +$2; claim window ke baad expire.

---

## 5. Wager contribution (bonus unlock ke liye)

**hash.game** footer "Wager Contribution for Bonus Balance Details": "Wager amount = Bet Amount × Contribution Rate". BC Originals: Bingo 100%, Dice/Limbo/Mines/Plinko 80%, Beauties/Savior Sword 60%, Blackjack/Crash 50%; providers 50–100% (poori list pichhle doc §4). Sports: 50%, sirf odds ≥ 1.5.

**Fix:** table `wager_contribution(provider, game_ref, category, percent)` hash.game list se seed; admin screen "Wager contribution"; sirf bonus unlock par lagega (VIP / commission par full wager).

---

## 6. Foundation — wager ke saath game category

`wager_activity` mein `category`, `provider`, `game_ref`, `odds`, `house_edge`, `payout` (migration; payout settle par update — net loss ke liye). `recordActivity` (`casino/.../games.service.js:1237`) `gameRef` forward kare. Mapping: `inhouse` / `original-games` → originals; `sports` → sports (+odds); `gis` / `jsgames-v2` / `seamless` / `xcasino` / `agg-*` → catalogue `type` mein live → live, warna slots. §3, §4, §5 isi par chalte hain.

---

## 7. Withdrawal rollover 3x + Turnover Report

- `wager.service.js:297-305` sirf `FiatDeposits` → `withdrawalCapFigures` `DEPOSITED_SQL` (saare rails).
- `wager_multiplier_common` INTEGER → NUMERIC (2.5 sahi save ho).
- Turnover Report TargetX → `users.wager_multiplier` hi likhe; INR + USDT dikhaye. Player page par multiplier edit.

---

## 8. Chhoti problems

| # | Problem | Fix |
|---|---|---|
| S1 | USDT rate row na ho to koi non-USD bet count nahi (`exchangeRate.service.js:97`) | USD/USDT = 1 fallback + boot check |
| S2 | Sports `original_amount` null → galat currency (`sportsWagerSync.js:41`) | null → `stake_amount` INR |
| S3 | Seamless/aggregators hamesha USDT | confirm, warna fix |
| S4 | GIS PKR → INR rate (`gis.constants.js:38`) | PKR rate se gino |
| S5 | In-house bet lagte hi count (`gameEngine.js:199`) | settle par |
| S6 | VIP rate exact-case (`vip.service.js:144`) | `upper()` |
| S7 | Har step par rounding neeche | sirf final par |
| S8 | Rakeback % code mein fixed (`vipRewards.js`) | §1 table mein, admin editable |

---

## 9. Kaam ka order

1. §6 category · 2. §1 VIP ladder table · 3. §2 referral locked rewards · 4. §3 commission (+ recalculation script) · 5. §5 contribution · 6. §4 deposit/locked bonus · 7. §4b rakeback + daily/weekly/monthly · 8. §7 rollover · 9. §8
Har step alag commit, tests green hone par agla. Live: migrations → admin settings → QA skill run.

---

## 10. Confirm ke baad banne wale 2 skills

**`hash-formula-fix`** — is plan ko step-by-step lagane ka skill: har step ki files, migrations, admin screens, hash.game defaults (upar ki tables), aur live setting badalne ka rule (pehle value padho, transaction password, restore).

**`wager-bonus-test`** — testing skill (pehle local, phir live `qa-betting-budget` ke andar):
- VIP: 1,000 XP → Bronze I, admin naam badle → site par naya naam
- Referral: dost Bronze I → 0.50 unlock, Locked Rewards = 999.50
- Commission: ₹1,000 → 0.70 / 1.50 / 2.50
- Deposit bonus: 4 deposits → 180/240/300/360%, unlock per bet, claim, monthly reset
- Contribution: Crash 50%, Mines 80%, sports odds 1.4 → 0
- Rollover: har deposit rail → required wager
- Reversal: bet rollback → wager, commission, unlock teeno wapas
- Output: PASS/FAIL table `logs/qa/wager-bonus/`

---

## 11. Risk

- VIP ladder badalte hi kuch players ka level naam badlega (Wood/Bronze 5 → Bronze I–IV); level-up bonus dobara na mile, dhyan.
- Commission 20x–71x kam hoga — referrers ko batana.
- Deposit bonus 180%–360% bahut bada hai; house edge × 20% unlock se hi sahi chalega — rates admin par hi check karna.
- Rollover sab rails par lagne se crypto depositors ki withdrawal ruk sakti hai.
- hash.game ke level-up bonus amounts, VIP-wise boosted %, Lossback / Reload / Top Player (host-only) aur Lucky Spin prize table public nahi — yeh hamare purane values se shuru honge, admin baad mein badle.
- Deposit bonus unlock 1% (hash.game) vs 20% (hamara Help page) — Help page bhi update karna padega.
