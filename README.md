# hash-game-exchange

The client build of the Hash Games site.

| folder | what |
|---|---|
| `frontend/` | The hash-games (bc.game rebuild) UI, copied exactly from `cfz/hash-games` at `ed2bece`. Being migrated to Next.js with the UI unchanged. |
| `tools/ui-compare.mjs` | The pixel check against the reference UI. |
| `.claude/skills/hash-ui-fidelity` | The rules that keep the UI identical. Read it first. |

The backend, the site admin and the owner panel (from the SmartBet platform) are added next and wired to the frontend.

```bash
cd frontend && npm ci && npm run dev
```
