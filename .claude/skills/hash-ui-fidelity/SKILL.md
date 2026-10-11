---
name: hash-ui-fidelity
description: The UI rule for hash-game-exchange — the frontend is an exact copy of the hash-games (bc.game rebuild) UI and must stay pixel-identical through every change (the Next.js migration, backend wiring, rebranding). Read before touching anything in frontend/, before migrating or moving a file, and before wiring a page to the backend. Covers the reference copy, the pixel-compare check, what may and may not change, and the Next.js migration rules.
---

# hash-ui-fidelity

**The one rule: the client gets the hash-games UI exactly as it is. No change may move a pixel unless the user asked for that specific change.** Data may change (fixtures → the real backend); markup, CSS, class lists, assets, breakpoints, animations and copy may not.

## Where things are

| what | path |
|---|---|
| This project (repo `CFZ-Technologies/hash-game-exchange`) | `/Users/apple/Developer/cfz/client-projects/hash-game-exchange` |
| Its frontend | `frontend/` |
| **The reference UI** (never edit it) | `/Users/apple/Developer/cfz/hash-games` (Vite + React), copied at commit `ed2bece109e1dfde2ada15f4773466b8d8411ad2` |
| The page-by-page notes | `frontend/CLAUDE.md` and `frontend/docs/*.md` — they record which values are evidence from bc.game and which are invention. Read the page's doc before touching that page. |
| The pixel check | `tools/ui-compare.mjs` |

The copy was made with everything except `node_modules`, `dist`, `admin`, `backend`, `backend copy`, `.git` and `.env.local`, and checked identical with `diff -rq`. Dependencies come from the same `package-lock.json` (`npm ci`).

## Proving nothing broke

Run the reference and the build under test side by side, then compare:

```bash
cd /Users/apple/Developer/cfz/hash-games && npx vite --port 5191 --strictPort        # reference
cd <this repo>/frontend && <its dev command on 5190>                                   # under test
node /Users/apple/Developer/cfz/admins/agents/qa-browser.mjs start                     # shared QA Chrome
node tools/ui-compare.mjs http://localhost:5191 http://localhost:5190
```

- It checks ~19 routes at 1440×900 and 390×844 with animations frozen, prints the share of differing pixels, saves both shots for anything over 0.5 %, and exits 1 on a difference.
- **Both sides must use the same data source.** Either both on fixtures (`VITE_USE_FIXTURES` unset) or both on the same backend. Otherwise you are comparing data, not UI.
- `/help/*` is a federated remote served live by hash.game and can show its region pop-up on one load and not the next: compare it by eye.
- A difference is a bug in the change, not in the reference. Fix the change. Never "fix" it by editing the reference.
- Also check signed-in screens (wallet, settings, header) once the backend is wired. They aren't in the default route list because they need a session.

Port 5174 on this machine is another project (PageBook admin), not hash-games. Don't compare against it.

## What may change

- `src/services/` and `.env`: where data comes from (fixtures → backend), endpoints and response mapping. Keep the shape each component already receives.
- Branding values the owner panel supplies (title, logo file), when the user asks for them.
- Build tooling (Vite → Next.js), as long as the rendered output is identical.

## What may not change without the user asking

- JSX structure, class names, CSS (`src/**/*.css`, Tailwind `@theme`, `@layer` placement). The cascade-layer placement is load-bearing, see `frontend/CLAUDE.md`.
- Assets in `public/` and `src/assets/`, fonts, icon sprites.
- Breakpoints, including the deliberate 640 vs 1024 `mobile` split on `/vip-detail`.
- Copy and i18n strings.
- Route paths and which routes open as dialogs.

## Next.js migration rules

1. **First make it run unchanged.** Mount the existing React Router app client-only in Next.js: an App Router optional catch-all `app/[[...slug]]/page.tsx` that renders the existing `<App/>` inside `BrowserRouter` with `ssr: false`, and the same global CSS imported once in `app/layout`. This is the official incremental path from Vite. Pass the pixel check before doing anything else.
2. `import.meta.env.VITE_*` → `process.env.NEXT_PUBLIC_*` (`VITE_API_BASE`, `VITE_USE_FIXTURES`, `VITE_FIXTURE_DELAY`). Keep the same defaults: fixtures stay ON unless set to `"false"`.
3. `import.meta.glob(...)` is Vite-only and is used for art (`utils/gameArt.js`, `coinArt.js`, `channelArt.js`, `pages/**`). Replace each one with an explicit generated import map (a small script that writes the same keys → URLs) so every key resolves to the same file. Check the keys match one for one.
4. `index.html` head content (fonts, meta, theme colour, favicon) moves to `app/layout` metadata and `<head>` unchanged.
5. Tailwind 4: `@tailwindcss/vite` → `@tailwindcss/postcss`, same CSS entry, same `@theme`.
6. Moving a route to a real Next page (server-rendered) is a later, per-page step, and each one passes the pixel check on its own.
7. Keep the Vite setup until the Next.js build passes the check on every route, then remove it in its own commit.

## Hand-over

Before the client gets it:
- run the pixel check on all routes, plus the signed-in screens by eye;
- run `npm run build`;
- leave no bc.game trademarks the client may not ship. The bc.game name and logo are in the copied UI; whether to rebrand is the user's call, so ask.
