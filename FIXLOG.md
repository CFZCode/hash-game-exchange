# Fixlog

Jo bug fix hue: kya toota tha, kyun, kaise theek kiya, kaise check kiya.
Newest fix sabse upar. Baaki kaam ka hisaab `WORKLOG.md` me, jo baad me karna hai wo `PENDINGWORK.md` me.

Format:

```
## YYYY-MM-DD — Short title
**Kya toota tha:** ...
**Wajah:** ...
**Fix:** ...
**Files:** ...
**Check kaise kiya:** ...
```

---

## 2026-10-16 — Events page crash: `matchCount` me `.reduce` of null
**Kya toota tha:** Sports Exchange → Events page khulte hi error (`views/exchange/market/sportsTree.ts:60`, `matchCount`).
**Wajah:** `/sports/user/all/sports/events` me jis sport me abhi koi match nahi (Esoccer, Snooker, Ice Hockey…), uska `children: null` aata hai. `groupRaces` use waisa hi lauta deta tha aur `matchCount` `null.reduce` chalata tha.
**Fix:** `groupRaces` ab `children` ko hamesha array banata hai (sport aur series dono me), `matchCount` me bhi `?? []`.
**Check:** live payload pe shaping chalaya: 39 sports, koi null children nahi, counts sahi (Cricket 36, Football 131…); admin tsc + eslint clean.

## 2026-10-16 — Admin: Button (Link/a ke roop me) pe Base UI error
**Kya toota tha:** Sports Exchange ke Account List ("Create" button) aur Auto Void (bahar ke links) pe console/overlay error `components/ui/button.tsx:48`.
**Wajah:** Base UI ka Button default me native `<button>` maanta hai; `render={<Link/>}` / `render={<a/>}` dene par `nativeButton={false}` dena zaroori hai, ye do jagah chhoot gaya tha.
**Fix:** `views/exchange/AccountList.tsx` aur `views/exchange/settings/AutoVoid.tsx` me `nativeButton={false}` lagaya. Poore `src` me aur koi aisa Button nahi bacha.
**Check:** grep (Link/a wale saare Buttons me nativeButton), admin tsc clean.

## 2026-10-15 — Tests kabhi-kabhi fail (test ids / role ids ki takkar)
**Kya toota tha:** Full suite me har baar alag tests fail hote the (lords, parentFunding, notifications, push, ownerWallet, lookup) — akele chalane pe pass.
**Wajah:** Test ids process id se bante hain, aur test DB me pichhle runs ka data rehta hai: (1) purane child staff / players us staff id ke neeche reh jaate the → staff delete pe FK error; (2) naye exchange tests owner (level 1) roles 9700/9800 range me banate the, jahan push/access/notifications apne level 3 role `DO NOTHING` se banate the → wahi id owner ban jaati thi; (3) owner ki purani top-up history ginti me aa jaati thi.
**Fix:** Exchange tests ke role ids alag 8xxx range me; seedStaff pehle us id ke child staff / players detach karta hai (aur ownerWallet purane transfers hatata hai); notifications / push / access ke role aur staff insert `ON CONFLICT DO UPDATE` (level / role_id set).
**Files:** `backend/services/admin/src/modules/{lords,staff,notifications,push,access,exchange,exchange-lookup,exchange-user-reports,exchange-market,exchange-reports}/__tests__/*.test.js`
**Check kaise kiya:** Full backend suite 2472: 2470 pass, 0 fail, 2 skip.

---

## 2026-10-15 — Admin proxy se DELETE ki body gateway tak nahi pahunchti thi
**Kya toota tha:** Sports Exchange > Buffer Time / Commission / Max Odds me cell ko "Inherit" pe wapas karna (DELETE + JSON body) 400 deta tha.
**Wajah:** Admin ka Next proxy (`admin/src/app/api/gw/[...path]/route.ts`) body stream (chunked) karke bhejta tha; gateway ka `http.request` DELETE ko chunk-encode nahi karta, isliye upstream ko body mili hi nahi.
**Fix:** Sirf DELETE ki body pehle poori padh li jaati hai aur Content-Length ke saath bheji jaati hai. Baaki methods pehle jaise stream.
**Files:** `admin/src/app/api/gw/[...path]/route.ts`
**Check kaise kiya:** Teeno reset DELETE live 200; bina body wale DELETE pehle jaise chalte hain.

---

## 2026-10-15 — Migration 068 dobara chalti to staff ki credit limit 0 kar deti
**Kya toota tha:** Migration 068 `UPDATE credits SET credit_limit = 0` poori table pe chalata hai (players ka credit hatane ke liye). 099 ke baad staff/owner ki rows bhi `credits` me hain, aur unka `credit_limit` agent ki asli credit line hai — 068 dobara chalne pe (fresh DB, test) wo bhi 0 ho jaati.
**Wajah:** 068 ke time `credits` me sirf players the, isliye WHERE me player filter nahi tha.
**Fix:** 068 me `WHERE uid IS NOT NULL AND (...)` — sirf player rows. 099 `credits.credit_limit` ka column comment bhi sahi karti hai (068 ne "UNUSED" likha tha).
**Files:** `backend/packages/db/migrations/068-no-plaintext-passwords-no-player-credit.js`, `099-credits-for-everyone.js`
**Check kaise kiya:** `agentMoney.test.js` ka "migration 068 zeroes player credit limits" test fail ho raha tha (staff ka 300 → 0); fix ke baad pass.

---

## 2026-10-14 — Frontend pe sports odds nahi dikh rahe the (`frontend/.env.local` missing)
**Kya toota tha:** Backend workers odds la rahe the (gateway `:4700` pe `cricket/all-data` aur `get-match-private-data` dono me odds the), lekin `/sports` page khaali tha aur sidebar me "No sports right now" aa raha tha.
**Wajah:** `frontend/.env.local` tha hi nahi. Isliye `NEXT_PUBLIC_API_BASE` khaali tha aur fixtures ON the. Exchange ki calls same origin (`localhost:5190/api/...`) pe ja rahi thi, aur wahan Next ka catch-all route JSON ki jagah HTML page de raha tha.
**Fix:** `frontend/.env.local` banaya: `NEXT_PUBLIC_USE_FIXTURES=false`, `NEXT_PUBLIC_API_BASE=http://127.0.0.1:4700`. Gateway ka `CORS_ORIGIN` pehle se `localhost:5190` allow karta hai. Env build time pe inline hota hai, isliye frontend dev server restart karna zaroori hai.
**Files:** `frontend/.env.local` (gitignored)
**Check kaise kiya:** `curl :5190/api/v1/sports/user/cricket/all-data` se HTML aaya, aur `:4700` se JSON (20 events, odds ke saath). Frontend restart ke baad page dobara dekhna hai.

---

## 2026-10-14 — Fancy bets kabhi settle nahi hoti thi (`public.fanwins`)
**Kya toota tha:** Har fancy bet (Normal, khado, meter waghera) settle hote waqt fail hoti thi aur 20 second baad dobara queue me chali jaati thi, hamesha ke liye. Player ko jeet ka paisa kabhi nahi milta tha. Paisa adha update nahi hota tha, kyunki poora kaam ek transaction me rollback ho jaata tha.
**Wajah:** Settlement worker fancy jeet ka record `public.fanwins` me likhta hai, aur us table ke do columns sports code se match nahi karte the:
- `runsodds` INTEGER tha, jabki worker ka `FanWin` model (TENEXCH jaisa) `DECIMAL(10,4)` hai aur `"74.0000"` likhta hai. Postgres ka error: `invalid input syntax for type integer: "74.0000"`.
- `userid` NOT NULL tha, jabki worker `user_id` likhta hai (migration 094 ne add kiya tha) aur `userid` khaali chhodta hai. Error: `null value in column "userid" of relation "fanwins" violates not-null constraint`.

Migration 094 ne sportsbook move karte waqt `fanwins` me `user_id` add kiya tha, par in dono columns ko nahi chheda.
**Fix:** Migration `096-fanwins-sports-columns.js`: `runsodds` → `NUMERIC(10,4)` (purana data safe rehta hai) aur `userid` → nullable. Idempotent hai, aur `down` me wapas jaata hai.
**Files:** `backend/packages/db/migrations/096-fanwins-sports-columns.js`
**Check kaise kiya:** Local DB pe migration chalaya. Jo fancy jobs queue me atke the, wo agle retry pe ~3 second me settle ho gaye. Live feed ki bet pe check kiya: YES jeeta → `credits.inr` +200 (stake 100 + jeet 100); NO haara → kuch nahi. Settled fancy market ka void karne pe dono players bet se pehle wale balance pe wapas aaye.
