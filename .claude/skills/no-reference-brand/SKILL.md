---
name: no-reference-brand
description: The Parker567 player site (frontend/) and site admin (admin/) must never show the reference site's name — hash.game / Hash Game / hashgame — and must never link, redirect, frame or load anything from its domains (hash.game, bc.game, bcgame.*). Static scan of the code (comments stripped) plus a CDP crawl of the rendered pages (text, title, alt/aria/placeholder, every link, frame, form and loaded file). Run before pushing anything in frontend/ or admin/, and when the user says "hash.game ka naam kahin nahi dikhna chahiye", "koi link hash game pe redirect na kare", "reference ka naam hatao".
---

# No reference brand on screen

The UI is a rebuild of the reference site, so its name sits all over the code **comments** (provenance notes). Comments are fine. What must never happen:

- the name on screen: page text, `<title>`, a tooltip, `alt`, `aria-label`, `placeholder`, an admin hint or label, an API label the UI prints;
- a link, redirect, iframe, form or loaded file (image, script, font, API call) on the reference's domains: `hash.game`, `bc.game`, `bcgame.*`.

The repo's own folder name `hash-game-exchange` is not UI text and is ignored.

## 1. Static scan (always)

```bash
node .claude/skills/no-reference-brand/scan.mjs
```

Scans `frontend/src`, `admin/src`, `owner-panel/src` with comments blanked out and prints each line that can reach the screen. Exit 1 on a hit. Also check backend strings the UI prints (setting labels, error messages, public API labels) by pointing `ROOTS` at `backend/services/*/src` and `backend/packages`.

## 2. CDP crawl (rendered pages)

Chrome with CDP on :9333 (see `live-qa`). The crawler opens a new tab in the **default** context, so a signed-in admin there is used.

```bash
# player site, local and live
node .claude/skills/no-reference-brand/crawl.mjs http://localhost:5190 / /casino /sports /bonus /vip-detail /referral /quests /help/faq /wallet/deposit /game/mines
node .claude/skills/no-reference-brand/crawl.mjs https://parker567.com / /casino /sports /bonus /vip-detail /help/faq /game/mines
# site admin (sign in at http://localhost:3080 in the default context first)
node .claude/skills/no-reference-brand/crawl.mjs http://localhost:3080 /dashboard /users /bonus /vip /site-config/limits /site-config/branding /site-config/features /casino/providers /reports/players
```

`WAIT_MS` (default 6000) sets how long each page settles. A page that lands on `/login` was not checked — say so.

## 3. Fix

- Visible text → reword without the name ("Welcome Shield", "Standard ladder", "the original UI").
- A link / asset on the reference's domains → serve it from our own origin or drop it.
- Keep provenance in comments; never put an explanation on screen.

## Owner panel too (user, 2026-10-29)

The owner panel follows the same rule: the default template is labelled **"Default"** (key `hash_game` unchanged — it is stored data, never shown), "Site UI" replaces "bc.game UI", and the `siteName` fallback is "Parker567". Crawl it as well: `node crawl.mjs http://localhost:3085 /overview /entitlements /branding /coins`.

## Text that comes from the API

A label the backend sends (e.g. the VIP ladder's `label` on `user/vip/levels`) shows on the LIVE admin until the backend is deployed — the local admin talks to the live API. Fix it in `backend/`, and re-crawl after the deploy.

## Report

Say which scans ran (static: hit count; crawl: base + pages, any that landed on login) and what was changed. Never claim a page was checked when it redirected to sign-in.
