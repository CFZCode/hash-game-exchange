# bc-games

A React (Next.js) rebuild of the bc.game front-end UI, matched to the original layout at
the pixel level across every target breakpoint.

## Getting started

```bash
npm install
npm run dev        # dev server with HMR
```

## Scripts

| command | what it does |
| --- | --- |
| `npm run dev` | Next.js dev server with HMR on port 5190 |
| `npm run build` | production build into `.next/` |
| `npm run start` | serve the production build on port 5190 |
| `npm run lint` | ESLint over the source (reference mirrors excluded) |

There is no test suite yet.

## Layout of the repo

```
src/
  index.css                  Tailwind entry, @theme colour tokens, global helpers, fonts
  layouts/MainLayout/        the app shell: Header, Sidebar, Tabbar + per-component CSS
  pages/, context/           placeholders for the next pieces of work
  assets/                    fonts, logos and the two icon sprite sheets
bc.game/                     saved copy of the live site — reference only, not built
bc images/                   the image assets from that same save
```

`bc.game/` and `bc images/` are reference material used to look up exact values while
building. Nothing in `src/` imports from them, and both are excluded from linting and
from Tailwind's class scanning.

## Notes for contributors

The UI hardcodes measured pixel values per breakpoint (320 / 375 / 425 / tablet /
desktop) rather than scaling fluidly, so fractional values in the CSS are deliberate.
Colour tokens live in the `@theme` block in `src/index.css` and are the single source
of truth — component CSS should not redeclare them.

See `CLAUDE.md` for the fuller architecture write-up, and `docs/` for the per-page notes it indexes.
