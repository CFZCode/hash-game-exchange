# Whitelabel: product plan + Casino Hub

Status (2026-11-01): everything planned is built and tested on a test DB — Part A (plan incl.
payments), Part B (casino hub), Part C (gateways incl. CCPayment), Part D (settings + GGR reports).
Migrations 169 + 170 are on the live DB; 171, 172 are not. Not yet tried against the real
providers (F2Pay, CCPayment, Slotegrator, original games) or on a real whitelabel.

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
  features: { branch_management, bonus, affiliate, vip, promotions }, // bool each
  payments: { manual, gateways: { ccpayment, f2pay, apay, waypay, cricpay, upi } } // manual or a gateway
}
```

| Plan key | On the copy |
|---|---|
| `products.casino` | flag `casino` |
| `products.sports` | flags `sports`, `sportsexchange`, `sportsbook` |
| `products.originals` | flag `originals` |
| `features.bonus / affiliate / vip / promotions` | feature of the same key (vip also flag `vipclub`) |
| `features.branch_management` | policy `branch_management` on/off |
| `payments.gateways.<g>` off | flag `gateway_<g>` off |
| `payments` | policies `deposit_mode` / `withdrawal_mode`: manual + gateway = both, gateway only = automatic, manual only = manual |
| always | policy `whitelabel` off |

- Parent: `whitelabels.plan` (migration 169), required on create, `PUT /admin/whitelabels/:id/plan`
  changes it (pushed live over the link).
- Copy: `whitelabel_settings.plan`. The setup writes it; link `PUT /plan` changes it.
- Copy enforcement: admin-service's entitlements store (`WHITELABEL_MODE` only) reads the plan
  and forces every key the plan leaves out to `false` on top of the owner document. Every
  service and the player site read entitlements from there, so a product off in the plan is
  hidden and its APIs answer `403 NOT_ENTITLED`. The two policies are written to `site_features`.
- A copy with no stored plan (made before this change) is unchanged.

## Part B: Casino Hub (built)

Built as below with one simplification: no API of games of its own — the copy's Slotegrator and
original-games clients are replaced on a copy by hub stand-ins (wl-hub/hubProvider, ogHubProvider)
that send each provider call to the parent (`POST /api/v1/casino/wl-hub/gis/provider`, `/og/provider`,
allow-listed: open a game, demo, lobby, catalogue reads). The parent writes `wl<id>_<player>` into
the player id; the providers' callbacks with that id are passed on (wl-hub/forward.js) to the copy's
`/in/gis` / `/in/og`, settled by the copy's own code, answered back unchanged, and recorded in
`whitelabel_casino_rounds`. Freespins / vouchers are not offered to copies.

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

## Part C: Payment gateways through the parent (psp gateways built; CCPayment next)

Built: user-service `modules/wl-hub` (routes, hubCredentials, hubGateway, hubOrders, companyWallet,
delivery + job `wl-hub:deliver`), payment-orders `hubDeposit` / `hubPayout` and hub mode in
`#gateway`, psp whitelabel branches + `applyHubEvent`, admin `POST /whitelabels/:id/hub-key`, link
`PUT /hub`, setup writes PARENT_HUB_*. End-to-end test: wl-hub/__tests__/wlHub.test.js (F2Pay).

Checked 2026-11-01 against `services/user/src/modules/{payment-orders,psp,crypto}`:

| Gateway | Deposit for a copy | Withdrawal for a copy | Why |
|---|---|---|---|
| F2Pay INR (fiat) | yes | yes (BANK_INR payout) | every order carries our `notifyUrl` and our `mchOrderNo` |
| F2Pay crypto | yes | no (F2Pay crypto has no payout) | same |
| CCPayment (crypto) | yes (built) | yes (built) | webhook URL is the parent's; routed by `orderId`. Withdrawals: staff press "CCPayment" in the crypto review queue → `Sending` → `ApiWithdrawal` (confirmed with `getAppWithdrawRecord`) → Sent / Rejected + refund. Deposits credit what ARRIVED (`settled_amount`, may come in parts) |
| UPI (EkQR) | same pattern, possible | — | per-order notify / our reference |
| A-Pay / WayPay / CricPay | **never** | **never** | not integrated on the parent (owner, 2026-11-01): always off on copies |

Only the parent holds gateway keys and is allowlisted; a copy's `F2PAY_*` / `CCPAYMENT_*` stay blank.

```
Player (copy) ─deposit─▶ copy user-svc ─key + HMAC─▶ PARENT pay-hub ─▶ F2Pay / CCPayment (parent's account)
Gateway ─callback─▶ PARENT (reference "wl<id>-…") ─signed forward─▶ copy ─▶ credit player, debit company
```

Money on the copy (owner confirmed 2026-11-01). The company's Direct balance is the money the
parent holds for it: the parent's transfers in, gateway money collected for it in, gateway money
paid out for it out, gateway charges out.

| Event (example: company had 1,00,000) | Player | Company Direct balance | Statement rows |
|---|---|---|---|
| Gateway deposit 10,000, deposit charge 4% | +10,000 | +9,600 → 1,09,600 | `gateway_deposit` +10,000, `gateway_charge` −400 |
| Gateway withdrawal 10,000, withdrawal charge 5% | −10,000 (held at request) | −10,500 on success; nothing on failure (player refunded) | `gateway_withdrawal` −10,000, `gateway_charge` −500 |
| Manual deposit / withdrawal | as today | as today | no charge |

- Charges are set **per gateway** (deposit % and withdrawal %) in the parent's `whitelabels.terms`;
  the rate used is stored on each order, so a later change never re-prices old ones.
- A withdrawal is refused up front if the company balance cannot cover amount + charge; the
  amount + charge is reserved while the payout is pending.
- **CCPayment withdrawals get connected** (crypto payout via CCPayment's withdraw API), on the
  parent and for copies. Until then crypto withdrawals stay a manual review queue.
- Parent ledger: `whitelabel_gateway_orders` (copy, gateway, flow, reference, amount, charge %,
  charge, status) and the copy's statement rows above.

## Part D: Super Admin control + GGR revenue share (built)

Reports built: common/whitelabelReport (ledgerFigures + assemble + toCsv, shared by both sides);
parent `GET /admin/whitelabels/report[.csv]`, `/:id/report[.csv]`; copy link `GET /ggr` (its P&L,
in INR); parent user-service hub `GET /report`; copy `GET /admin/whitelabel-statement[/csv]`.
Admin pages: whitelabel detail "Revenue share" card, /whitelabels/report, copy /revenue-share.
Monthly (calendar month, UTC); share on positive GGR per product only.

Per whitelabel, Super Admin only (built 2026-11-01 as `plan.payments` + `whitelabels.terms`):
- Payments in the plan: manual on/off and each gateway on/off — CCPayment, F2Pay, UPI (at least one route). Off gateways
  are `NOT_ENTITLED` on the copy; deposit/withdrawal mode follows (manual / automatic / both).
- Terms (parent only): deposit % and withdrawal % per gateway; GGR revenue share % per product.

GGR = stakes − wins on settled bets per copy, per product (casino, original games, sports), per
period. **Reported only, not collected** (owner, 2026-11-01). Reports:
- Super Admin: per whitelabel and all together — GGR by product, share % and share amount,
  gateway deposits / withdrawals / charges, balance transfers. Downloadable (CSV / PDF).
- Whitelabel company: its own statement (same rows except the parent's settings), downloadable.
