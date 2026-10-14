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

## 2026-10-14 — Sports `credits.inr` ka end-to-end test + fancy settlement fix
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
