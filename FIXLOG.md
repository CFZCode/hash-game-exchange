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
