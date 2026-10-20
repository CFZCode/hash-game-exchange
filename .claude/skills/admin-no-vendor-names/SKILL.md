---
name: admin-no-vendor-names
description: The Parker567 admin panel (admin/) must never show WHICH casino vendor or aggregator runs a feed — no JSGames / JS games / jsGames v2, GIS / Gis games, Slotegrator, in-house / inhouse, Seamless, ibitplay, huidu, xgames, GamingHub360, SoftSwiss, gis-static — in any label, filter, column, description, toast or API value shown raw. Game studios (Evolution, Ezugi, NetEnt…) are fine. Run the scan before pushing anything in admin/, and when the user says "admin me provider ka naam nahi dikhna chahiye", "JSGames/GIS/inhouse kahin na dikhe", "vendor names hide karo".
---

# No vendor / aggregator names in the admin

The operator sees **what** a bet or game is (Originals, Original Games, third-party casino, a studio
name), never **whose feed** carries it. Staff screenshots travel; the feed names are ours.

## The rule

- Show feed sources through `admin/src/lib/casinoSource.ts` → `casinoSourceLabel(source)`:
  `inhouse` → Originals, `og` → Original Games, `gis` → Casino feed 1, `jsgames`/`jsgamesv2` →
  Casino feed 2, `seamless` → Casino feed 3, unknown → Casino. Never print `r.source` raw.
- Write descriptions as "the casino catalogue", "third-party casino", not a vendor name.
- Keys, API paths, type names and comments may keep the real names (`'gis'`, `admin/casino/js-games/…`,
  `GisGame`) — only text a person reads is checked.
- Studio names in data (Evolution, Hacksaw, Ezugi…) are allowed: they are game makers, not our feed.
- Backend error codes that leak a vendor (`GIS_NOT_CONFIGURED`) must reach staff as plain words; if a
  live scan shows one, map it in the screen's error text.

## The check (both must pass before a push touching admin/)

```bash
# 1. static: every string literal / JSX text in admin/src (comments, imports, keys, paths skipped)
node .claude/skills/admin-no-vendor-names/scripts/scan.mjs static

# 2. live: seed admin sign-in (backend/.env SEED_ADMIN_*), every navConfig page + every tab,
#    on-screen text + title/placeholder/aria-label — catches names that come from API data
npm i --no-save --prefix <scratchpad> playwright-core@1.56.1   # once
PW_DIR=<scratchpad> node .claude/skills/admin-no-vendor-names/scripts/scan.mjs live [https://admin.parker567.com]
```

Exit 1 lists `file:line  text` (static) or `route [tab]  text` (live). A page that will not open is
reported but does not fail the run. Build + `pm2 restart parker-admin` before the live scan, or it
checks the old build.

The forbidden list is `FORBIDDEN` in `scripts/scan.mjs`; add a new vendor there the day it is integrated.
