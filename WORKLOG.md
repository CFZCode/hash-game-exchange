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
