---
name: admin-luno-redesign
description: Restyle the Parker567 site admin (admin/, Next + Tailwind 4 + shadcn) page by page into the Luno template's look and motion (wrraptheme.com/templates/luno) WITHOUT changing behaviour — token map, component map, motion rules, per-page checklist, and the CDP page audit (before/after screenshots at 360/768/1280 light+dark, controls, API calls, console errors, NaN) with a diff. Use when the user says "admin ko Luno jaisa bana", "redesign continue kar", "next group redesign kar", "Luno look", "admin ka UI template jaisa chahiye", "page audit before/after", or when touching admin styling during the redesign.
---

# Admin redesign — Luno look

Plan: `admin/docs/luno-redesign-plan.md`. Icons: skill `luno-icons`. Reference measurements: `logs/qa/redesign/luno-spec.json`
(computed styles, motion, charts), `foundation-luno-rules.json`, screenshots `logs/qa/redesign/luno-*-1280.png` / `-390.png`.

## Ground rules
- **Look only.** Change `className`, design tokens, layout wrappers (a `div` / card around existing children) and animation.
  Never change props, API calls, hooks, state, query keys, permissions (`<Can>`, `RouteGate`, `permission:` in navConfig),
  validation, labels, copy, `aria-*`, routes, or the order of fields in a form.
- **Legally pixel-same.** Never copy Luno's CSS files, images or SVG paths (paid ThemeForest template). Use what Luno
  itself uses from free sources: Nunito (next/font), Bootstrap Icons / Font Awesome 4 npm packages, ApexCharts
  (`react-apexcharts`), our own two-tone icons (`admin/src/components/icons/luno`). Measure, never copy.
- **Tokens, not hex.** Pages use the CSS variables / Tailwind colours below. A hex value in a page `className` is a bug.
- **Shared first.** If a pattern repeats, restyle the shadcn component (`components/ui`) or shared component
  (`components/shared`) once — never fork a page-local copy. Keep component props identical.
- **Proved unchanged.** Every page: audit before, audit after, `--diff` clean (see checklist).
- Dark is the default theme (owner's call, 2026-10-22), light via the header toggle (`next-themes`, `localStorage.theme`, class `.dark`).
- No vendor names anywhere (skill `admin-no-vendor-names`).

## Token map (Luno theme-blue → our variable in `admin/src/app/globals.css`)
| Luno (light / dark) | Our variable | Tailwind |
|---|---|---|
| body bg `#f4f7f6` / `#1d1f20` | `--background` | `bg-background` |
| text `#363535` / `#e0e0e0` | `--foreground` | `text-foreground` |
| heading `#181818` | `--heading` | `text-heading` |
| card `#fff` / `#212324` | `--card`, `--popover` | `bg-card`, `bg-popover` |
| card border 1px **dashed** `#e9e6e1` / `#353535` | `--border` (+ `--border-style-card: dashed`) | `border border-dashed` |
| `.text-muted` `#9399a1` (we use `#7d848c` for contrast) | `--muted-foreground` | `text-muted-foreground` |
| subtle surface | `--muted`, `--secondary` (neutral) | `bg-muted` |
| primary blue `#2794eb` | `--primary`, `--ring`, `--chart-1` | `bg-primary`, `text-primary` |
| teal secondary `#00ac9a` / `#00c894` | `--brand-secondary`, `--icon-accent`, `--sidebar-primary`, `--chart-5` | `text-brand-secondary` |
| soft blue hover / active surface | `--accent`, `--accent-foreground` | `bg-accent` |
| danger `#e01b4f` | `--destructive`, `--danger`, `--danger-soft` | `text-danger bg-danger-soft` |
| success / warning / info | `--success(-soft)`, `--warning(-soft)`, `--info(-soft)` | `text-success bg-success-soft` … |
| chart colours 1–5 `#2794eb #6382d8 #8d61a5 #90476f #00ac9a` | `--chart-1`…`--chart-5` (6–8 extras) | `fill-chart-1` |
| radius: card 12px, badge 6px, input/button ≈6px | `--radius` (= `rounded-lg`), card = `rounded-xl` | `rounded-xl`, `rounded-md` |
| sidebar 280px (260 ≤1440px), bg = page | `--sidebar*`, `[data-slot=sidebar-wrapper]` | — |
| font Nunito 15px body, 16px menu | `--font-nunito` → `font-sans` | — |

Measured sizes to aim for: header 74px, padding 8px 24px · toolbar padding 16px 24px, title 20px/500 `--heading`,
subtitle 13px muted, breadcrumb link teal · card header/body padding 24px · stat value 24px/500, stat bottom bar 4px ·
table th 12px/700 UPPERCASE, padding 8px 16px, dashed top/bottom border; td 15px, padding ~13px 16px · input 15px,
padding 6px 12px, solid 1px `--input` border · dropdown padding 8px, item 4px 16px · pills active = primary bg white text ·
tabs active = primary underline · alert dashed border on its soft bg · badge 12px bold, padding 4px 8px, radius 6px.

## Component map (Luno pattern → ours)
| Luno | Ours |
|---|---|
| `.sidebar` menu groups (TITLE + small subtitle), tree line, teal active, bottom icon row | `components/layout/Sidebar.tsx` + `ui/sidebar.tsx` (done in wave 1) |
| `.page-header` (search, icons, avatar) | `layout/Header.tsx`, `ModeToggle`, `shared/ProfileDropdown` (done) |
| `.page-toolbar` breadcrumb + title + subtitle + right actions | `shared/PageHeader` (done) — pages pass props, never their own `<h1>` bar |
| `.card` / `.card-header` / `.card-body` | `ui/card.tsx` (`Card`, `CardHeader`, `CardTitle`, `CardContent`) |
| stat card (CAPS title, icon, big number, bottom progress) | `shared/StatCard`, `shared/charts/KpiCard` |
| chart card (title, expand + "…" buttons) | `shared/charts/ChartCard` / `ChartFrame` / `Charts` (ApexCharts, done) |
| `.table` (striped/hover, dashed rules) | `ui/table.tsx`, `shared/DataTable` |
| filters row / date range | `shared/charts/FilterBar`, `ui/date-picker`, `ui/select`, `ui/combobox` |
| `.btn` / `.btn-outline-*` / button groups | `ui/button`, `ui/button-group`, `ui/toggle-group` |
| `.badge` (soft bg) | `ui/badge`, `shared/StatusBadge` |
| `.form-control` / `.form-select` / `.form-check` / `.form-switch` | `ui/input`, `ui/input-group`, `ui/textarea`, `ui/select`, `ui/checkbox`, `ui/radio-group`, `ui/switch`, `ui/field`, `shared/FormField` |
| `.nav-tabs` / `.nav-pills` | `ui/tabs`, `shared/TabbedPage`, `shared/ChannelTabs` |
| `.modal` centred | `ui/dialog`, `shared/FormDialog`, `shared/ConfirmDialog` |
| `.modal-dialog-vertical` (side slide) | `ui/sheet` |
| `.dropdown.morphing.scale-left` | `ui/dropdown-menu`, `ui/popover` (`origin-morph animate-morph-in`) |
| `.pagination` | `ui/pagination` (DataTable's pager) |
| `.toast` | `ui/sonner` |
| `.alert` | `ui/alert` |
| `.progress` | `ui/progress`, `ui/circular-progress` |
| placeholder-wave | `ui/skeleton` (`skeleton-shimmer`) |
| `.bg-primary-gradient` highlight card | `Card` + `bg-gradient-to-r from-primary to-brand-secondary text-white` |
| empty / error | `shared/ErrorState` |
| money, dates | `shared/Money`, `ReportMoney`, `DateTime` — never restyle their number format |

## Motion (from `luno-spec.json` → `globals.css`)
- Page enter: `animate-page-in` (fade + 12px rise, 1s ease) on the page's content wrapper — once per route, not per card.
- Dropdowns / popovers: `origin-morph animate-morph-in` (scale 0→1 from top-right, .2s ease-in-out).
- Side sheets: `animate-sheet-in-right|left` (.3s ease-out). Submenus: height .35s ease.
- Cards: `hover-lift` only on clickable cards. Skeletons: `skeleton-shimmer`. Whole-number stats: `count-up` (integers only).
- Everything is off under `prefers-reduced-motion` (bottom of globals.css) — add any new animation class there too.
- No motion on tables, form fields, or anything that moves while a user types.

## Page audit (`page-audit.mjs`) — read-only, never clicks
Needs a CDP Chrome (`CDP_PORT`, default 9333; a private headless one is fine:
`"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --remote-debugging-port=9335 --user-data-dir=<scratch>/chrome-audit`).
It opens and closes its own tab. If it lands on `/login` it signs in with `STAFF_EMAIL` / `STAFF_PASSWORD` from the env
(the live Superadmin; take them from `CREDENTIALS.local.md` / the owner at run time — never into a file, commit or log).
```bash
node .claude/skills/admin-luno-redesign/page-audit.mjs /users logs/qa/redesign/after          # one route
node .claude/skills/admin-luno-redesign/page-audit.mjs --all .claude/skills/admin-luno-redesign/pages.txt logs/qa/redesign/before
node .claude/skills/admin-luno-redesign/page-audit.mjs --diff logs/qa/redesign/before/users.json logs/qa/redesign/after/users.json
node .claude/skills/admin-luno-redesign/page-audit.mjs --diff logs/qa/redesign/before logs/qa/redesign/after   # every page
```
Per route `<slug>.json`: `finalPath`, `title`, `controls[]` (kind tab/input/button/link, zone sidebar/header/page/dialog,
label, type, href, disabled, active), `api[]` (method, path, query keys, status; `error: canceled` is a navigation abort),
`consoleErrors`, `badText` (NaN / undefined / Invalid Date / [object Object] / Infinity lines), `sideScroll360`, `blank`,
`errorOverlay`, `retried`; PNGs `<slug>-<360|768|1280>-<light|dark>.png` (full page, capped 6000px). `--all` adds `summary.json`.
The diff ignores numbers in labels and ids in API paths (live data moves); it flags controls gone/new, API calls
gone/new/status class change, new console errors, new bad text, new side-scroll, blank, error overlay, different landing path.
`pages.txt`: every route in group order (dynamic `/users/<id>` uses a live id; event detail is opened by hand).

## Per-page checklist
1. Before audit exists in `logs/qa/redesign/before/<slug>.json` (re-run that route if the page changed since).
2. Restyle: layout wrappers + classNames only, tokens from the map, shared components from the map.
3. After audit into `logs/qa/redesign/after/`, then `--diff` → **same** (or every line explained: e.g. a control that is
   now inside a collapsed menu is a regression, not an explanation).
4. No new console error, no NaN / undefined, no side-scroll at 360, renders in light and dark.
5. Look at the after PNGs next to the matching `luno-*.png` (table → `luno-table`, form → `luno-form`, tabs → `luno-tabs`…).
6. Per group: `cd admin && npx tsc --noEmit -p . && npx eslint <changed files>`; click-through of tabs / dialogs open+close
   (never save); the `no-regression` skill before any push; commit the group.

## Do not touch
- Data, API calls, query keys, polling, sockets, mutations, `onClick` / `onSubmit` handlers, form schemas and validation.
- Permissions and gates: `<Can>`, `RouteGate`, navConfig `permission` / `feature` / `flag` / `ownerFlag` / `direct` / `promotions`.
- Labels, copy, column order, which columns exist, `aria-*`, `data-testid`, routes and URLs.
- Money / date formatting (`Money`, `ReportMoney`, `DateTime`, `DefaultCurrency`), transaction-password flow (`TxnCodeInput`).
- The live API: audits and click-throughs are read-only — never submit, approve, save, toggle, delete or bet.
- The owner panel (`owner-panel/`) and the player site (`frontend/`).
