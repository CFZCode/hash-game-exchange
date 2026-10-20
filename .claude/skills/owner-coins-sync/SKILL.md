---
name: owner-coins-sync
description: Make the owner panel the single source of which currencies (and owner-gated features) exist, and verify over CDP that the site admin and the player site show exactly that set — no more, no less. Use when the user says "owner panel se sirf INR/BTC/USDT enable rakhna", "jo owner ne off kiya wo admin me dikhna nahi chahiye", "admin aur frontend me coins match karo", or after any change to coins, owner flags or the admin Coins / Flags pages.
---

# Owner coins → admin → player site

The owner decides the coin set. The site admin may only switch a coin the owner allowed, and the player sees only coins that are owner-allowed, site-on and not retired. Every screen must agree.

## Where each side reads it

| Side | Source | Rule |
|---|---|---|
| Owner panel | Features & plan → Site flags (Fiat / Crypto currencies) and Coins → "In the plan" | `flags.<coin>` in the owner document (`owner_entitlements`), crypto also needs `cryptocoin` |
| Backend | `currencies.owner_enabled` (applied from the document on save), `GET /admin/currencies/public` | public = owner AND site on AND not retired |
| Admin Coins (`/coins`) | `GET admin/currencies` | listed only when `ownerEnabled && !retired` (`views/finance/Coins.tsx`) |
| Admin pickers / filters | `useOwnerCodes` / `useOwnerCoinFilter` (`views/finance/useCurrencyCodes.ts`) | `enabled && !retired` |
| Admin Flags (`/site-config/flags`) | owner flag + owner feature (`FLAG_FEATURE`) + owner coin filter | a coin / feature the owner left out is not listed at all |
| Player site | socket state `currencies` + `flags` (services/liveStore.js) → header picker, wallet | changes show without a reload |

## Setting the owner's coin set (a live write — only on the user's say-so)

From a signed-in owner panel tab (`/owner` or local `:3085`), in one script: `GET /api/owner/entitlements`, copy the whole document, set every currency flag (`inr mvr aed pkr bdt npr eur cryptocoin btc eth ltc bch usdt trx doge ada xrp bnb usdp nexo mkr tusd usdc busd shib matic nc sc`) to `true` only for the chosen ones (plus `cryptocoin` when any crypto is kept), and `PUT` it back with the same `version` and the rest of the document unchanged. Expect 200 and a new version. Never switch off the Default or Reward coin (owner panel refuses it; change those policies first).

## Verify over CDP (read-only)

1. `GET https://api.parker567.com/api/v1/admin/currencies/public` → exactly the chosen codes.
2. `GET …/admin/site-config/public` → the currency flags on are exactly the chosen ones.
3. Admin `/coins` table → exactly the chosen codes (no retired BJB, no owner-off coin).
4. Admin `/site-config/flags` → Fiat / Crypto cards list only the chosen coins (+ the crypto master); Products lists no feature the owner switched off.
5. Admin pickers: a report FilterBar currency select and Exchange rates list only the chosen coins.
6. Player site (signed in): open the header currency dropdown → Cash / Cryptocurrency list exactly the chosen coins; the wallet Deposit / Withdraw coin selects agree.
7. Owner panel → Coins: "In the plan" on only for the chosen coins.

Report each step PASS / FAIL with the codes seen. A coin a player still holds a balance in is a finding to report, not something to hide.
