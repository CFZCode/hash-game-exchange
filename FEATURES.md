# Features — kya hai aur kya ON hai

Parker567 (hash-game-exchange) me kaun se features hain, aur **live server (parker567.com) pe abhi kya ON / OFF hai**.
Ye live owner panel document (`owner-panel/data/entitlements.json`, version 2) aur live DB (`cfz_hash_game_exchange`)
se padh ke likha hai.

Last updated: 2026-10-17

✅ = ON  ·  ❌ = OFF  ·  ⚠️ = ON hai par chalne ke liye kuch missing hai

---

## 0. Ek nazar me

| Cheez | Abhi live pe |
|---|---|
| Player site (parker567.com) | ❌ **Live nahi** — jaan-bujh ke band, 503 deta hai |
| Admin panel (admin.parker567.com) | ✅ Live |
| Owner panel (admin.parker567.com/owner) | ✅ Live |
| API (api.parker567.com) | ✅ Live |
| Sports (exchange) | ✅ ON, odds feed key set hai |
| Casino — in-house Originals (5 games) | ✅ ON |
| Casino — third-party games | ⚠️ Lobby abhi **JSGames** ka hai (1,980 games), par JSGames ki API keys khaali hain, games launch nahi honge. Slotegrator (GIS) is server pe set nahi hai — section 4a |
| Auto deposit (crypto / gateway) | ⚠️ ON, par CCPayment / A-Pay / UPI / CricPay / WayPay keys khaali hain |
| Manual deposit / withdrawal | ✅ ON |
| Global withdrawals | ✅ ON |
| Coins | INR, USDT (sirf TRC20), BTC |
| Template / theme | Hash Game (original colours) |

---

## 1. Policies (owner panel → Features & plan)

| Policy | Value | Matlab |
|---|---|---|
| Business model | `hybrid` | Direct players (B2C) + agent system (B2B) dono |
| Deposit mode | `both` | Automatic + manual dono |
| Withdrawal mode | `both` | Automatic + manual dono |
| Default currency | `USDT` | Naye player ki default currency |
| Reward currency | `USDT` | Saare bonus / reward isi me |
| Withdrawal requirements | `kyc` | Withdraw se pehle KYC verified chahiye |
| Withdrawal cap (deposit limit) | ❌ OFF | ON karne pe: max withdraw = deposits × 3 + wagering bonus (5× tak) |
| Region restriction | ❌ OFF (`none`) | Koi desh block nahi |
| Casino aggregator | `js_games` | Third-party games JSGames se (Slotegrator nahi) |

## 2. Player features (owner panel → Features)

| Feature | Status | Variant / note |
|---|---|---|
| Casino lobby | ✅ | `tabbed_themes` (hamesha ON) |
| Banners | ✅ | `artwork_slides` (hamesha ON) |
| VIP | ✅ | `ring_panel` |
| Promotions | ✅ | `event_list` |
| Bonus | ✅ | `reward_hub`, wagering lock ON |
| Affiliate / referral | ✅ | `referral_hub` |
| Races | ✅ | `daily_contest`, tournaments page ON |
| Challenges | ✅ | `quest_hub` |
| Raffles | ✅ | `ticket_raffle` |
| Vault | ✅ | `flat_balance` |
| Swap | ✅ | `swap_page` |
| Notifications | ✅ | `notice_centre` |
| KYC | ✅ | `document_cockpit` |
| Spin wheel | ❌ | Is UI me nahi hai |
| Gift cards | ❌ | Is UI me nahi hai |
| Tips | ❌ | Is UI me nahi hai |
| P2P trading | ❌ | |
| Chat | ❌ | Is UI me nahi hai |
| Blog | ❌ | Is UI me nahi hai |
| Club membership | ❌ | Is UI me nahi hai |
| Push notifications | ❌ | Is UI me nahi hai |
| Analytics | ❌ | Is UI me nahi hai |

## 3. Bonus settings (admin → Site config)

| Setting | Value |
|---|---|
| Register bonus | ❌ OFF |
| First deposit bonus | ✅ ON, 30 din me expire |
| — Tier 1 | min 10 deposit → 100% bonus, max 100 |
| — Tier 2 | min 100 deposit → 50% bonus, max 500 |
| — Tier 3 | min 1000 deposit → 25% bonus, max 1000 |
| Affiliate bonus | 20, sirf jab referred player deposit kare |
| Affiliate commission | 5% |
| Bonus / rakeback currency | USDT |
| Welcome pack | ✅ ON |

## 4. Products aur game categories (site flags)

| Flag | Status |
|---|---|
| Casino | ✅ |
| Sports | ✅ |
| Lotto | ✅ (flag ON, par Lottery UI se hata diya hai, section 7 dekho) |
| VIP club | ✅ |
| Bonus, Affiliate | ✅ |
| Club membership | ❌ |
| Gift cards | ❌ |
| Wheel spin | ❌ |
| Crash, Originals, Live games, Slots, All live, All slots, Lottery games, Indian games, Cards, Instant games, Provably fair | ✅ sab ON |

**Providers (flag ON, par JSGames keys ke bina chalenge nahi):** Spribe, Evolution, Pragmatic Slots,
Pragmatic Live, Ideal, Microgaming, PG Soft, Hacksaw Gaming, JILI, NetEnt — sab ✅.

### 4a. Casino aggregator: JSGames ya Slotegrator (GIS)

Lobby ek time pe ek hi aggregator ka hota hai. Owner panel → Features & plan → **Casino aggregator**
(`js_games` / `slotegrator`) se badalta hai, 15 second me games swap ho jaate hain.

| | Live server pe abhi |
|---|---|
| Policy | `js_games` (seed se, kabhi badla nahi) |
| Lobby (`gisgamesnew`) | 1,980 JSGames games (microgaming, pragmatic, netent, bgaming, jili, hacksaw, pgsoft, evolution…) |
| Parked (`gisgamesnew_parked`) | **khaali** — Slotegrator ke 1,710 games sirf local/dev DB me import hue the, live DB me nahi |
| JSGames V2 keys | API key + secret khaali |
| Slotegrator (GIS) keys | `GIS_BASE_URL`, `GIS_MERCHANT_ID`, `GIS_MERCHANT_KEY` khaali |
| Slotegrator IP whitelist | ❌ Slotegrator is server ko `406` deta hai — server IP whitelist nahi hai |

Naam me "gis" hone se Slotegrator nahi hota: `gisgamesnew`, `gis_providers_new`, `/api/gis/gamesgis`
purane naam hain, inme JSGames ka data hai.

Slotegrator chalane ke liye: Slotegrator se server IP whitelist karwao → `backend/.env` me GIS keys →
casino restart → GIS sync (games parked me aayenge) → owner panel me aggregator `slotegrator`.
Sportsbook / esports hamesha JSGames ke rehte hain.

**Home page sections:** Hero, Welcome banner, Latest wins, Live casino, Live sports, Gaming cards,
Popular slots, ₹500 bonus banner, Crash games, Payment banner, Leaderboard, Promo cards — sab ✅.

## 5. Coins

| Coin | Type | Status | Network |
|---|---|---|---|
| INR | fiat | ✅ | — |
| USDT | crypto | ✅ | sirf TRC20 (ERC20, BEP20 OFF) |
| BTC | crypto | ✅ | Bitcoin |
| ETH, LTC, TRX, DOGE, BCH, ADA, XRP, BNB, USDP, NEXO, MKR, TUSD, USDC, BUSD, SHIB, MATIC, SC | crypto | ❌ | owner ne allow kiye hain, site pe OFF |
| MVR, AED, NPR, PKR, EUR, BDT | fiat | ❌ | owner ne allow kiye hain, site pe OFF |
| NC | points | ❌ | |

Deposit me fiat sirf INR dikhta hai (frontend `DEPOSIT_FIATS = ['INR']`).

## 6. Paise ke raaste (deposit / withdraw)

| Raasta | Status |
|---|---|
| Manual deposit (bank transfer) | ✅ ON (`manual_payment_control`) |
| Manual withdrawal | ✅ ON |
| Global withdrawals | ✅ ON (`withdrawal_control`) |
| Crypto deposit (CCPayment) | ⚠️ key khaali |
| Gateway deposit / payout (A-Pay, UPI, CricPay, WayPay) | ⚠️ keys khaali |
| Agent system (points: credit / debit / settlement) | ✅ |

## 7. Player site pe jo bc.game me hai par hamare paas NAHI

Frontend bc.game ki copy hai, par ye cheezein hata di ya chhupa di hain (detail: `.claude/skills/hidden-features`):

- Passkey sign-in, One-time Code login, Cwallet sign-in
- Social login — sirf Google rakha hai (OAuth abhi wired nahi)
- Weekly Raffle page, Lottery, Predictions, Crypto Futures, Forum
- Feature Buy-in, Free Plays, Do Not Disturb, game info card
- Originals sirf 5: **Limbo, Diamonds, Keno, Mines, Plinko**
- BetBy sportsbook ki jagah apna sports exchange

## 8. Admin panel (admin.parker567.com)

| Section | Pages |
|---|---|
| Main | Dashboard (Direct Users / Agent System), Users (Direct / Agent / Financial), Wallets, Redeem Codes, Turnover Report |
| Sports Exchange | Market Analysis, Current Bets, Turn Over, Settlement, Global Settings, Events |
| Agent Management | Account List, Bank, Account Statement, Party Win Loss, Total Profit Loss, User Win Loss, General Lock |
| Users | Login & IP history, KYC, Bank details |
| Transactions | Deposit, Withdraw (Crypto / Fiat / Manual), Account Statement |
| Finance | Exchange rates, Coins, Vault, Swap history, Tips, P2P trading |
| Promotions | Campaigns, Bonus, Bonus balances, Gift cards, Spin wheel, VIP & club, Affiliate, Races |
| Casino | Game catalogue, Lobby curation, Providers, In-house games, Bet history, Wager report, Providers / Vendor / Type Priority |
| Team | Executives, Marketing, Activity log |
| Content | Banners, Blogs, Notifications, Push (Compose, Campaigns, Templates, Settings) |
| Reports | User reports, Profit & loss, Risk |
| Settings | Features (read-only), Branding, Feature flags, Limits and policy, Affiliate rates, Welcome bonuses, Email (SMTP), Sports switch, Payment Methods, My account |

## 9. Owner panel (admin.parker567.com/owner)

Overview, **Features & plan** (policies, features, flags, withdrawal rules, region), Coins, Branding,
System Tracker, Audit. Site ka har feature ON/OFF yahin se badalta hai — admin sirf dekh sakta hai.

---

## Kahan se badle

| Kya | Kahan |
|---|---|
| Feature ON/OFF, policies, withdrawal cap, region, template | Owner panel → Features & plan |
| Coins ka allow list | Owner panel → Coins; site pe ON/OFF admin → Coins |
| Bonus amounts, home sections, provider flags | Admin → Site config |
| Manual payments ON/OFF | Admin → Transactions → Deposit/Withdraw → Manual |
| Global withdrawals ON/OFF | Admin → Users → Financial |
| API keys (payment, casino) | `backend/.env`, phir backend restart |
