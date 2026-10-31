# Whitelabel: product plan + Casino Hub

Status: Part A built 2026-11-01. Part B (Casino Hub) planned, not built.

## Rules from the owner

- Only the parent's **Super Admin** creates and manages whitelabels. A whitelabel's company
  never sees the Whitelabel panel and cannot make copies.
- Creating a whitelabel needs a **plan**: at least one product (Casino, Sports, Original games)
  plus the features it gets (Branch management, Bonus, Affiliate, VIP, Promotions).
  Nothing is on by default; the Super Admin must pick.
- Casino (Slotegrator) and Original games on a whitelabel run **through the parent**: only the
  parent talks to the providers (one merchant account, one allowlisted IP). Each whitelabel calls
  the parent with its own API key + secret.

## Part A: the plan (built)

```
plan = {
  products: { casino: bool, sports: bool, originals: bool },        // at least one true
  features: { branch_management, bonus, affiliate, vip, promotions } // bool each
}
```

| Plan key | On the copy |
|---|---|
| `products.casino` | flag `casino` |
| `products.sports` | flags `sports`, `sportsexchange`, `sportsbook` |
| `products.originals` | flag `originals` |
| `features.bonus / affiliate / vip / promotions` | feature of the same key (vip also flag `vipclub`) |
| `features.branch_management` | policy `branch_management` on/off |
| always | policy `whitelabel` off |

- Parent: `whitelabels.plan` (migration 169), required on create, `PUT /admin/whitelabels/:id/plan`
  changes it (pushed live over the link).
- Copy: `whitelabel_settings.plan`. The setup writes it; link `PUT /plan` changes it.
- Copy enforcement: admin-service's entitlements store (`WHITELABEL_MODE` only) reads the plan
  and forces every key the plan leaves out to `false` on top of the owner document. Every
  service and the player site read entitlements from there, so a product off in the plan is
  hidden and its APIs answer `403 NOT_ENTITLED`. The two policies are written to `site_features`.
- A copy with no stored plan (made before this change) is unchanged.

## Part B: Casino Hub (to build)

```
Player (copy) ─launch─▶ copy casino-svc ─key + HMAC─▶ PARENT hub ─▶ Slotegrator / Originals
Provider ─callback─▶ PARENT ─signed forward─▶ copy hub-wallet (debit/credit its own player)
                        └─ hub_transactions (per-copy GGR)
```

1. **Parent hub API** (casino-svc module `casino-hub`)
   - `casino_hub_clients`: whitelabel_id, api_key, sealed secret, enabled, products (from the
     plan), GGR %, credit limit, optional IP allowlist. Keys issued by the setup worker and
     rotatable from the whitelabel detail page.
   - Auth: `x-hub-key`, `x-hub-ts`, `x-hub-nonce`, `x-hub-sign` = HMAC-SHA256(method, path, ts,
     nonce, raw body). ±30 s window, nonce kept in Redis, constant-time compare.
   - `GET /hub/v1/games`, `/providers` (catalogue, filtered by plan), `POST /hub/v1/slotegrator/launch`,
     `/launch-demo`, `POST /hub/v1/originals/launch`, `GET /hub/v1/usage`.
   - Launch writes `hub_sessions` (session_id, whitelabel_id, copy player id, currency, provider)
     and opens the game with `player_id = wl<id>_<playerId>`.
2. **Callback routing on the parent**
   - `gis.handleTransaction` / originals `callback`: numeric player id = the parent's own player
     (unchanged); `wl…` = forward to the copy's hub-wallet, signed, ~5 s timeout.
   - Copy down: bet refused (no money moves); win/refund kept pending and retried by cron.
   - `hub_transactions`: every round per copy (bet, win, status) for GGR and disputes.
3. **Copy "hub mode"** (`CASINO_HUB_URL`, `CASINO_HUB_KEY`, `CASINO_HUB_SECRET`)
   - Launch and catalogue sync go to the hub; `GIS_*` / `OG_*` stay blank on the copy.
   - `/casino/hub-wallet/{balance,bet,win,refund,rollback}`, parent-signed only, reusing the
     existing GIS / originals settle code (guarded updates, idempotent on the provider tx id).
4. **Panel + billing**: "Casino API" card on the whitelabel detail page (enable, rotate key,
   GGR %, credit limit, usage). Monthly GGR statement; over the credit limit, launches refused.

Prerequisite: Slotegrator allowlists the parent's IP (72.62.251.4).

Open decisions: billing model (GGR % / fixed / none); copies only on this server or also remote
(the HMAC design works for both; remote needs HTTPS between sites).

## Part C: Payment gateways through the parent (to build)

Checked 2026-11-01 against `services/user/src/modules/{payment-orders,psp,crypto}`:

| Gateway | Deposit for a copy | Withdrawal for a copy | Why |
|---|---|---|---|
| F2Pay INR (fiat) | yes | yes (BANK_INR payout) | every order carries our `notifyUrl` and our `mchOrderNo` |
| F2Pay crypto | yes | no (F2Pay crypto has no payout) | same |
| CCPayment (crypto) | yes | not today | webhook URL is set once in the CCPayment dashboard (the parent's); we route by `orderId`. Payout was never wired, so crypto withdrawals are a manual review queue |
| WayPay / A-Pay / CricPay / UPI | same pattern, possible | possible | per-order notify / our reference |

Only the parent holds gateway keys and is allowlisted; a copy's `F2PAY_*` / `CCPAYMENT_*` stay blank.

```
Player (copy) ─deposit─▶ copy user-svc ─key + HMAC─▶ PARENT pay-hub ─▶ F2Pay / CCPayment (parent's account)
Gateway ─callback─▶ PARENT (reference "wl<id>-…") ─signed forward─▶ copy ─▶ credit player, debit company
```

Money on the copy (owner's rule: the company cannot create money):

| Event | Player | Company Direct balance | Statement rows |
|---|---|---|---|
| Gateway deposit A, fee d% | +A | −A − A·d% | `gateway_deposit` (A), `gateway_charge` (A·d%) |
| Gateway withdrawal A, fee w% | −A (held at request) | +A − A·w% on success; nothing on failure (player refunded) | `gateway_withdrawal` (A), `gateway_charge` (A·w%) |
| Manual deposit / withdrawal | as today | as today | no charge |

- A deposit order **reserves** A + fee on the company balance when it is created (refused if the
  balance is short), released if the order fails or expires — the player has already paid when the
  callback lands, so it must never be refused then.
- The parent keeps the real money. Each copy has a **gateway settlement** figure: collected − paid out,
  i.e. cash the parent holds for that copy. Shown on its report; the Super Admin settles it.
- Parent ledger: `whitelabel_gateway_orders` (copy, gateway, flow, reference, amount, fee, status),
  and fee income per copy.

## Part D: Super Admin control + GGR revenue share (to build)

Per whitelabel (extends the Part A plan; Super Admin only):
- Payments: which gateways (CCPayment, F2Pay INR, F2Pay crypto, …), manual payments on/off,
  deposit fee %, withdrawal fee %.
- Revenue share: GGR % (per product: casino, originals, sports, or one rate).

GGR = stakes − wins on settled bets per copy per period (casino/originals from the hub ledger,
sports from the copy's settled bets via the link `/summary`). Statement per copy and period:
GGR by product, share %, amount due, gateway charges, gateway settlement, balance transfers.
Collected by debiting the company Direct balance (row `ggr_share`) — or invoiced only — owner's choice.
