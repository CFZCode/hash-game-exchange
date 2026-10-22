---
name: luno-icons
description: Draws the admin's icons in the Luno template's two-tone line style as our own SVG React components (admin/src/components/icons/luno), from a spec of simple shapes, with a preview sheet to compare against Luno. Also inventories the icons on Luno pages (which are Font Awesome 4 / free libraries, which are Luno's own drawings). Use when the admin redesign needs an icon, when a lucide icon must be replaced by a Luno-style one, or "icons bhi same chahiye Luno jaise".
---

# Luno-style icons

Part of the admin redesign (`admin/docs/luno-redesign-plan.md`, skill `admin-luno-redesign`).

## What Luno does (measured 22 Oct 2026)
- **Font icons (most of them):** Font Awesome 4 (`fa fa-*`), plus Line Awesome, Bootstrap Icons, simple-line-icons and
  Weather Icons — all free libraries. Use the npm package, never Luno's files.
- **Two-tone menu / header / card icons (~26 per page):** Luno's OWN drawings (their paths match no library glyph), so
  we draw ours in the same style; we never copy their path data.
  - viewBox `0 0 16 16`, shown at 18×18 (sidebar, header) and 26×26 (stat cards).
  - Body: a ~1px rounded outline in the text colour (`#363535` light theme).
  - Accent: ONE small part (needle, dot, inner bar, line, second sheet) in the theme's secondary colour — teal
    `#00ac9a`-like on theme-blue (`--secondary-color`).
  - Round caps and joins, generous corner radii, no fill on the body.

## Files
- `cdp.mjs` — tiny CDP client (attach to YOUR page by target id; port 9333).
- `icon-inventory.mjs` — `node icon-inventory.mjs <target-id> logs/qa/redesign/luno-icons.json <luno-url>…`
  lists every icon on the pages: zone (sidebar/header/body), the text it sits next to, size, Font Awesome class or
  "own drawing", which path is the accent. Keeps no Luno path data.
- `icons.spec.mjs` — OUR drawings: `{ Name: [shape, …] }`, a shape is `['path', d, tone?]`, `['rect', x, y, w, h, rx, tone?]`,
  `['circle', cx, cy, r, tone?]`, `['line', x1, y1, x2, y2, tone?]`; `tone` is `'base'` (default, outline) or
  `'accent'` (accent stroke) or `'accentFill'` (accent fill). Coordinates on the 16 grid; keep strokes ≥ 1px from the edge.
- `make-icons.mjs` — `node make-icons.mjs` writes `admin/src/components/icons/luno/<Name>.tsx` + `index.ts` and the
  preview `logs/qa/redesign/icon-preview.html` (every icon at 18, 26 and 96px, light + dark).
- `icon-map.md` — admin lucide icon → Luno icon name (the redesign swaps by this map).

## Component contract (drop-in for lucide)
`<LunoGauge className="size-4" />` — props are `SVGProps<SVGSVGElement>`; base uses `currentColor`, accent uses
`var(--icon-accent, var(--secondary))`, so dark mode and theme colours just work. Default size 18.

## Workflow for a new icon
1. Find it in the inventory (what Luno draws for that meaning) or pick the nearest meaning.
2. Add its shapes to `icons.spec.mjs` in the style above (one accent part only).
3. `node make-icons.mjs`, open the preview next to the Luno screenshot, adjust until it reads the same at 18px.
4. Add the row to `icon-map.md`.
5. `cd admin && npx tsc --noEmit -p . && npx eslint src/components/icons/luno`.
