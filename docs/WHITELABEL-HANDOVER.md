# Whitelabel: handover for another codebase

Reference implementation: **hash-game-exchange (parker567)**, commits `04a69941` → `469d1fdd` →
`83cf5d89` → `77bdab7e` → `7d88ad60` → `21977251` (2026-10-30). About 5,000 lines in total, tests
included. This file covers what was built, the contracts between the two sides, the
order to build it in, and the traps already hit, so that another session can rebuild the
same feature in a different codebase on a different server. The target codebase will not
match this one file for file. Where a name below belongs to parker567 (e.g. `staff_balances`,
`credits`), find the equivalent in the target code.

---

## 1. The idea in one paragraph

The **parent** site (parker567) sells copies of itself. Its Super Admin opens
**Whitelabel → Whitelabels → New** and enters a brand (name, logo, icon, colours, poster), three
domains (site / admin / api) and a company login. A **setup worker** on the same machine then
builds a complete, independent copy of the stack: its own folder, database, ports, Redis DB, pm2
apps, Apache vhosts and SSL. The copy runs with `WHITELABEL_MODE=true`. Its top account is the
**company**, a level-1 staff account in the Super Admin's place, which **cannot create money**. All
of its money comes from the parent's transfers. The parent controls each live copy over a small
keyed HTTP **link API** that the copy exposes on localhost. Through it the parent sees the copy's
figures, sends balance, resets the company password, switches the copy on or off (maintenance),
changes its colours and logo, opens a read-only preview of its admin, and deletes it.

```
                 same machine
┌─────────────── PARENT ───────────────┐          ┌─────────── COPY  /var/www/main/<slug> ──────────┐
│ admin UI  /whitelabels               │          │ WHITELABEL_MODE=true, own DB wl_<slug>,         │
│   │                                  │          │ own ports 61xx, own REDIS_DB 8-15               │
│ admin-svc modules/whitelabels ───────┼─ HTTP ──▶│ admin-svc modules/whitelabel-link               │
│   tables: whitelabels, _jobs,        │ 127.0.0.1│   x-whitelabel-key + NO X-Forwarded-For         │
│           _transfers, _assets        │ :<admin  │   tables: whitelabel_settings,                  │
│        ▲                             │  port>   │           whitelabel_inbound_credits            │
│        │ polls whitelabel_jobs       │          │ gateway: maintenance gate (polls /status 5 s)   │
│ setup worker (pm2, root) ────────────┼─ builds ▶│ company = level-1 staff, no self-funding        │
│   git archive HEAD → copy folder     │ / removes│                                                 │
└──────────────────────────────────────┘          └─────────────────────────────────────────────────┘
```

Two flags gate everything, so **the parent's own behaviour does not change**:
- backend: `WHITELABEL_MODE` (bool, default false) + `WHITELABEL_LINK_KEY` (secret, unset = keyed link routes 401)
- admin / player frontend builds: `NEXT_PUBLIC_WHITELABEL_MODE=true` (baked in at build time)

The parent's panel refuses to run on a copy (`WHITELABEL_NOT_ON_A_COPY`), and so does the worker,
which exits if the parent's .env has `WHITELABEL_MODE=true`. Copies cannot make copies.

---

## 2. Decisions the owner made (keep them unless the new owner says otherwise)

| Topic | Decision |
|---|---|
| Top role in the copy | "company" = level 1. Its role **label** is the hierarchy name typed in at create time. |
| Self-funding | Company can **not** mint money. Blocked: owner add-balance (both wallets) and coin credits to players that nothing pays for. Debits and INR deposits that are paid from the company's own balance still work. |
| Money path | Parent Super Admin **Direct balance → company Direct balance** only. The company then moves Direct → Agent System itself (a new one-way move) and funds agents the normal way (with deduction). |
| First login | Company signs in with the parent-chosen password, is forced to change it, and **chooses its own 6-digit transaction code** on the same screen (instead of the random code parker567 normally issues). |
| Off | Off means **maintenance mode**: no logins and no bets, while settlement, feeds, crons and provider callbacks keep running. **Not** `pm2 stop`. |
| Preview | Read-only single sign-on into the copy's admin as the company. **Not logged** (owner's call). |
| Delete | The copy must be off, the name typed exactly, and a warning shown if it still holds balances. A final `pg_dump` is kept in `/var/www/main/whitelabel-archive/`. |
| Visibility | Parent Super Admin sees each copy's figures and can reset the company password. |
| Vendor keys | Sports feed + JSGames v2 keys are **shared** (copied from the parent). GIS casino / JSGames v1 / payment gateways / SMTP / Telegram are **left blank**, because their callbacks are registered vendor-side to the parent's domain and each copy needs its own keys. |
| Copy art | A copy never shows the parent's brand art. With no poster, the home hero draws the copy's logo on its brand colours. |

---

## 3. Build order

Build it in three phases. Each phase can be shipped and tested on its own.

1. **Copy side ("company mode")**: env flags, migration A, link API module, maintenance gate,
   read-only token, no-self-funding guards, Direct → Agent System move, chosen transaction code,
   palette on the player site and admin. Test it by running one stack with `WHITELABEL_MODE=true` and
   calling the link with curl.
2. **Parent panel**: migration B, `whitelabels` module (list / create / detail / transfers /
   password / maintenance / palette / branding / poster / preview / retry / delete), link client,
   and the admin UI pages. Until phase 3 exists, a created row just sits at `queued`.
3. **Setup worker**: pure `lib` (names, ports, Redis, env, vhost, pm2 file), `steps` (create /
   remove, with every side effect going through an injected `ctx` so it is testable on a fake machine),
   and `worker` (claims jobs, runs them, and writes the step and log to the job row).

---

## 4. Database

### 4a. Copy side (created on every site; only a copy writes it)

```sql
-- one row; maintenance = parent switched the copy off; palette = 13 colour tokens or NULL
CREATE TABLE whitelabel_settings (
  id          SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  maintenance BOOLEAN NOT NULL DEFAULT false,
  palette     JSONB,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO whitelabel_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- one row per parent transfer applied; the parent's transfer id is the PK → retries never pay twice
CREATE TABLE whitelabel_inbound_credits (
  transfer_id       VARCHAR(64) PRIMARY KEY,
  amount            NUMERIC NOT NULL CHECK (amount > 0),
  staff_id          INTEGER NOT NULL,
  staff_transfer_id BIGINT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4b. Parent side (created on every site; only the parent writes it)

```sql
CREATE TABLE whitelabels (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(30) NOT NULL,                -- folder, pm2 prefix, DB name; ^[a-z][a-z0-9-]{2,28}[a-z0-9]$
  name VARCHAR(60) NOT NULL, title VARCHAR(70), description VARCHAR(300),
  site_domain VARCHAR(253) NOT NULL, admin_domain VARCHAR(253) NOT NULL, api_domain VARCHAR(253) NOT NULL,
  template VARCHAR(40) NOT NULL, palette JSONB,
  logo BYTEA, logo_type VARCHAR(40), icon BYTEA, icon_type VARCHAR(40),
  company_role_name VARCHAR(40) NOT NULL, company_name VARCHAR(80) NOT NULL, company_email VARCHAR(190) NOT NULL,
  company_password_hash TEXT,               -- bcrypt only; NULLed once the copy is live
  link_key TEXT NOT NULL,                   -- the copy's WHITELABEL_LINK_KEY, sealed with the site secret box
  admin_port INTEGER,                       -- the copy's admin-SERVICE port (not the Next admin)
  ports JSONB,                              -- {gateway,user,admin,...,redisDb}; written by the worker at once
  status VARCHAR(10) NOT NULL DEFAULT 'queued'
         CHECK (status IN ('queued','creating','live','failed','deleting','deleted')),
  maintenance BOOLEAN NOT NULL DEFAULT false,
  created_by INTEGER, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- unique among non-deleted rows, so a deleted copy's names can be reused
CREATE UNIQUE INDEX whitelabels_slug_live         ON whitelabels (LOWER(slug))         WHERE status <> 'deleted';
CREATE UNIQUE INDEX whitelabels_site_domain_live  ON whitelabels (LOWER(site_domain))  WHERE status <> 'deleted';
CREATE UNIQUE INDEX whitelabels_admin_domain_live ON whitelabels (LOWER(admin_domain)) WHERE status <> 'deleted';
CREATE UNIQUE INDEX whitelabels_api_domain_live   ON whitelabels (LOWER(api_domain))   WHERE status <> 'deleted';

CREATE TABLE whitelabel_jobs (
  id SERIAL PRIMARY KEY,
  whitelabel_id INTEGER NOT NULL REFERENCES whitelabels(id),
  kind   VARCHAR(10) NOT NULL CHECK (kind IN ('create','delete')),
  status VARCHAR(10) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','failed')),
  step VARCHAR(120), log TEXT NOT NULL DEFAULT '',
  created_by INTEGER, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
);
CREATE INDEX whitelabel_jobs_queued ON whitelabel_jobs (id) WHERE status = 'queued';

CREATE TABLE whitelabel_transfers (
  id BIGSERIAL PRIMARY KEY,
  whitelabel_id INTEGER NOT NULL REFERENCES whitelabels(id),
  amount NUMERIC NOT NULL CHECK (amount > 0), note VARCHAR(200),
  status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done','refunded')),
  uncertain BOOLEAN NOT NULL DEFAULT false,  -- some attempt got NO answer → never auto-refund
  attempts INTEGER NOT NULL DEFAULT 0, error TEXT,
  staff_id INTEGER NOT NULL, staff_transfer_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX whitelabel_transfers_wl ON whitelabel_transfers (whitelabel_id, id DESC);

-- home-page posters (later migration)
CREATE TABLE whitelabel_assets (
  whitelabel_id INTEGER NOT NULL REFERENCES whitelabels(id),
  slot VARCHAR(20) NOT NULL CHECK (slot IN ('poster','poster_mobile')),
  content_type VARCHAR(40) NOT NULL, bytes BYTEA NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (whitelabel_id, slot)
);
```

New ledger / transfer-type labels added to the existing wallet code: `whitelabel_topup` (copy:
parent sent), `direct_to_agent` / `to_agent_system` (copy: company moved Direct → Agent System),
`to_whitelabel` (parent: sent to a copy), `whitelabel_refund` (parent: the copy refused, money came back).

---

## 5. Copy side (Phase 1)

### 5a. Link API: `admin-service /api/v1/admin/whitelabel-link/*`

| Method + path | Auth | Does |
|---|---|---|
| `GET /status` | none | `{ maintenance }`. The gateway polls it. `Cache-Control: no-store`. |
| `GET /theme` | none | `{ palette }` for the player site and the copy's admin. |
| `POST /preview/redeem` `{code}` | none, rate-limited 20/min | one-time code → read-only company session token |
| `GET /summary` | key | company, balances `{direct, agentSystem, staff, players}`, counts `{staff, directUsers, clientUsers, playersWithBalance}`, `received`, `maintenance` |
| `POST /credit` `{transferId, amount, note?}` | key | parent transfer into the company Direct balance; **idempotent** |
| `POST /company-password` `{password}` | key | reset + `must_change_password` + `token_version++` (all company sessions end) |
| `PUT /maintenance` `{on}` | key | flip the flag |
| `PUT /palette` `{palette \| null}` | key | 13 `#RRGGBB` tokens, all required, or null |
| `PUT /branding` `{slot: logo\|mark, type, data(base64)}` | key | writes through the existing branding store (it validates the bytes) |
| `PUT /poster` `{placement: home\|home_mobile, type, data}` | key | writes through the existing banners service |
| `POST /preview` | key | `{ code, expiresInSeconds: 60 }` |

**Key guard** (all routes after the three open ones):

```js
router.use((req, _res, next) => {
  const direct = !req.get('x-forwarded-for');            // gateway / Apache always add one
  next(direct && keyMatches(req.get('x-whitelabel-key'), config.WHITELABEL_LINK_KEY)
    ? undefined : new UnauthorizedError('Bad whitelabel key'));
});
// keyMatches: sha256 both sides, crypto.timingSafeEqual; unset secret → never matches
```

So only a process on the same machine that calls the admin-service port directly gets in. The key
is the real guard and the XFF check is defence in depth. Bind the copy's services to 127.0.0.1 or
firewall them.

**Credit is idempotent.** Keep this exact shape:

```js
// one DB transaction
INSERT INTO whitelabel_inbound_credits (transfer_id, amount, staff_id) VALUES (...)
  ON CONFLICT (transfer_id) DO NOTHING RETURNING transfer_id;
// no row returned → it is a replay:
//    same amount  → return { replayed: true, balance }   (no money moves)
//    other amount → 409 WHITELABEL_TRANSFER_MISMATCH
// row returned → credit the company's Direct balance + staff_transfers row (whitelabel_topup)
//              → UPDATE inbound row SET staff_transfer_id
```

The amount validator accepts **at most 2 decimals** (`^\d+(\.\d{1,2})?$`, > 0). See trap #2.

"Company" = the copy's first level-1 staff row (`JOIN roles WHERE level = 1 ORDER BY id LIMIT 1`).
If the target codebase can have several level-1 rows, store the company id explicitly instead.

`playersWithBalance` counts players with any coin > 0. It reads the numeric columns of `credits`
from `information_schema` and skips non-money columns (limits / points). Adapt that skip list to the
target schema.

### 5b. Maintenance gate (gateway, only when `WHITELABEL_MODE`)

Mount it after the legacy rewriter and before routing. It polls `GET {ADMIN_SERVICE_URL}/…/whitelabel-link/status`
every 5 s with a 3 s timeout. **If the flag can't be read, it keeps the last value.** When on,
everything gets `503 SITE_MAINTENANCE` **except**:
- `/health*`
- `/api/v1/admin/whitelabel-link/*`
- provider callbacks / payment webhooks (`/callback|webhook/i` + the provider prefix list, so open
  casino rounds and deposits still settle)
- `GET /api/v1/admin/branding/(public|asset/)` (so the logo shows on the maintenance screen)
- staff tokens with `ro: true` (the parent's preview)

Workers call the services directly, not through the gateway, so settlement, feeds and crons keep running.

### 5c. Read-only preview session

- `signAdminToken({ …, readOnly })` adds `ro: true` to the JWT.
- The gateway's `verifyToken` passes `readOnly: payload.ro === true` into `req.identity` (for the maintenance gate).
- The auth middleware: if `ro` and the method is not GET/HEAD/OPTIONS and the path is not logout →
  `403 READ_ONLY_PREVIEW`. `ro` also **skips the must-change-password gate** (the parent can view a
  company that hasn't set its password yet).
- `StaffAuthService.previewSession(staffId)` issues the token without a password check (only reachable via redeem).
- Codes: 24 random bytes base64url. The store keeps sha256(code) → `{staffId, expires: now+60s}`,
  deleted on first redeem. `shortcut:` the store is an in-process Map, so a restart loses codes (the
  parent just clicks Preview again).
- Admin UI: page `/preview?code=` (public route, blank layout) calls redeem → sets the session
  cookie the same way login does → full page load to `/dashboard`. Use a `useRef` guard so React
  dev's double effect doesn't spend the code twice. A yellow "Read-only preview" bar shows when `actor.readOnly`
  (`/api/auth/me` returns `readOnly: claims.ro === true`). Add `/preview` and the redeem API to the
  Next proxy's public lists.

### 5d. No self-funding + the money moves

- `ownerAddBalance`, `ownerAddDirectBalance`: when `WHITELABEL_MODE` → `403 WHITELABEL_NO_SELF_FUNDING`.
- User-service wallet adjust: when `WHITELABEL_MODE`, a **non-INR `operation: 'credit'`** → 403
  (nothing debits for it). INR adjust and direct-wallet adjust already debit the company's Direct
  balance, so they stay as they are. **In the target codebase, list every route that creates balance
  from nothing** and gate each one.
- New `POST /admin/exchange/owner/move-to-agent-system` `{amount, note?, transactionPassword}`.
  It is owner-only, copy-only (`403 WHITELABEL_ONLY` on the parent) and needs the transaction
  password. In **one DB transaction** it runs a guarded debit of Direct (`UPDATE … WHERE balance >= amount`;
  if no row → `INSUFFICIENT_FUNDS`, nothing written), then credits Agent System and writes a
  staff_transfers row `direct_to_agent` plus the usual point-ledger "Credit" row.
- Admin UI: in a copy the header's "Add Balance" popup becomes **"Move to Agent System"**, its only
  option, with "Direct Users balance" as the current value.

If the target codebase has **one** owner wallet instead of two (Direct + Agent System), drop the
move and let the parent credit that single wallet.

### 5e. First login chooses the transaction code

- `PATCH admin/staff/password` accepts an optional `transactionPassword` (`^\d{6}$`). On a forced
  change (`must_change_password`) it is used instead of `randomInt(100000, 1000000)`. A chosen code
  is **not echoed back** (`transactionPasswordSet: true` instead).
- Copy env: `TXN_PASSWORD_MODE=separate`. The setup sets the company's `transaction_password = NULL`,
  `must_change_password = true` and `first_login = true`.
- The ChangePassword screen (copy builds only) adds "Transaction code (6 digits)" + "Repeat" fields.

### 5f. Colours (player site and copy admin)

- 13 tokens: `bg s1 s2 s3 border text muted primary ink accent live hi lo` (player CSS vars `--p-*`).
- Player site (copy build only): the public gates read `GET whitelabel-link/theme`. A **complete,
  valid** palette is set inline on `<html>` (`--p-*`) with `data-theme="custom"`, and it beats the
  owner's template until cleared. An invalid one is ignored and never half-applied. It is cached in
  localStorage (`hge.palette`), and the `<head>` boot script repaints it before first paint
  (every key and value is regex-checked there). `html[data-theme='custom'] …` joins the existing
  template selector lists in `palettes.css`. Icon sprites keep the default colours under custom.
- Copy admin: `<WhitelabelTheme>` (copy build only) maps the palette, or else the template's own
  13 colours, onto the admin's tokens. Brand colour applies in both modes, dark surfaces only in dark
  mode. Only `#RRGGBB` values reach the `<style>`. Add `whitelabel-link/theme` + `features/public`
  to the Next proxy's public API list so the login page is themed too.
- Changing the template on a live copy: the template is fixed at build time, so the panel sends the
  chosen template's 13 colours **as a palette** and shows it back as that template.

---

## 6. Parent side (Phase 2)

### 6a. API: `admin-service /api/v1/admin/whitelabels/*`

Every route: `403 WHITELABEL_NOT_ON_A_COPY` if `WHITELABEL_MODE`, and level-1 owner only
(`canIssueFunds`). Permissions: read = `reports:read`, write = `staff:write`, money =
`wallet:adjust`. Audit log on writes, but **never** log passwords, the transaction password or
image bytes.

```
GET    /                         list ?search&status&limit&offset   (never returns link_key / hash / bytes)
POST   /                         create → row 'queued' + whitelabel_jobs 'create' (one transaction)
GET    /:id                      row + last 5 jobs (step, log) + last 25 transfers + live copy's /summary
GET    /:id/logo | /:id/icon     image (CSP sandbox, nosniff)
PUT    /:id/branding             { logo?, icon? }  → stored + pushed live (no icon = logo also goes to 'mark')
PUT    /:id/poster               { desktop?, mobile? } → stored + pushed live
GET    /:id/poster/:which        poster | poster_mobile
POST   /:id/transfers            { amount, note?, transactionPassword }
POST   /:id/transfers/retry      resend every pending transfer now
PUT    /:id/company-password     { password }  live → link; queued/failed → just re-hash for the setup
PUT    /:id/maintenance          { on }  (live only) → link, then mirror the flag in the row
PUT    /:id/palette              { palette | null }
POST   /:id/preview              → { url: https://<admin_domain>/preview?code=…, expiresInSeconds }
POST   /:id/retry-setup          only from 'failed', and NOT if the last job was a delete (409 DELETE_FAILED)
DELETE /:id                      { confirmName, acknowledgeBalances? }
```

Create validation: slug regex, three **different** domains (`422 SAME_DOMAIN`), unique among
non-deleted rows (pre-check plus a unique-index catch → `409 TAKEN`), text fields with no `<>` or control
characters, password 8–72 (bcrypt limit), logo/icon PNG/WebP/safe-SVG ≤ 256 KB (byte-checked by the
existing branding rules), poster PNG/JPEG/WebP ≤ 600 KB (sniffed signature must equal the declared type).
The company password is stored **only as a bcrypt hash**. The link key is 32 random bytes hex,
**sealed** with the site's secret box.

### 6b. Link client

It always calls `http://127.0.0.1:<admin_port>/api/v1/admin/whitelabel-link<path>` with
`x-whitelabel-key: open(row.link_key)` and an 8 s timeout. It never goes through the copy's gateway or Apache.
- 2xx → `payload.data`
- **4xx → `LINK_REFUSED`**: the copy answered and refused, so nothing changed on it.
- **network error / timeout / 5xx → `LINK_UNREACHABLE`**: it may have acted part-way, so callers moving money treat it as **unknown**.

### 6c. Transfer state machine (this is the part to get right)

```
transfer():
  check transaction password
  ONE TRANSACTION:
    guarded debit of the Super Admin's Direct balance (none → INSUFFICIENT_FUNDS, nothing written)
    staff_transfers row  to_whitelabel
    whitelabel_transfers row  status='pending'
  deliver()

deliver(t):
  POST /credit { transferId: "p<t.id>", amount: twoDecimals(t.amount), note }
  ok           → status='done' (WHERE status='pending')
  LINK_REFUSED and NOT t.uncertain → refund()
  otherwise    → attempts++, error, uncertain = uncertain OR (not refused), stays 'pending'

refund(t):  ONE TRANSACTION
  UPDATE … SET status='refunded' WHERE id=… AND status='pending' AND uncertain=false RETURNING *
  (no row → someone else won, do nothing)
  credit the Direct balance back + ledger whitelabel_refund + staff_transfers whitelabel_refund
```

Retries: opening the detail page resends pending transfers whose `updated_at` is older than 15 s,
and the "Send pending again" button resends all of them. Because the copy's `/credit` is idempotent on
`p<id>`, resending is always safe. **An uncertain transfer is never auto-refunded**: the copy
may already hold the money. `shortcut:` there is no background retry. Pending transfers only move
when someone opens the page or presses resend. Add a cron if the owner wants it.

### 6d. Delete rules

- `creating` / `deleting` → `409 BUSY`. Name must match exactly → else `422 NAME_MISMATCH`.
- `queued` (never started) → cancel the queued job, row → `deleted`, hash cleared. Nothing exists on disk.
- `live` → must be in maintenance (`409 MUST_BE_OFF`) with no pending transfers (`409 TRANSFERS_PENDING`).
  Then read `/summary`. Any non-zero balance or `playersWithBalance > 0`, **or an unreadable summary**,
  → `409 BALANCES_REMAIN` unless `acknowledgeBalances: true` ("Delete it anyway").
- Then the row → `deleting` and a `delete` job is queued.

### 6e. Admin UI (Super Admin, parent build only)

Sidebar group **Whitelabel → Whitelabels** (`/whitelabels`), hidden when `NEXT_PUBLIC_WHITELABEL_MODE`.
- `/whitelabels`: list with status chips.
- `/whitelabels/new`: brand (name, slug, title, description), logo + optional square icon,
  posters (desktop/phone), three domains (typing the site domain pre-fills `admin.` / `api.`),
  template + custom colours with a live preview, company (hierarchy name, name, email, password).
- `/whitelabels/:id`: job step + log (refreshes every 3 s while running), the copy's figures,
  Send balance (needs the transaction password), transfers list with "Send pending again",
  company password, Switch off/on, **Preview admin** (opens the URL in a new tab), colours/template,
  logo & icon, home poster, Delete (type the name; second confirm for balances). "Run setup again"
  appears only after a failed **create**.

---

## 7. Setup worker (Phase 3)

`scripts/whitelabel/{lib,steps,worker}.mjs`, run by pm2 `parker-whitelabel-worker` **as root**
(it writes Apache sites and runs certbot, pm2 and `sudo -u postgres`).

### 7a. Worker loop

- It reads the parent's `backend/.env` for its own DB and secret box. It **exits if
  `WHITELABEL_MODE=true`**.
- On start, any job left `running` → `failed` ("the setup script restarted mid-way") and its row → `failed`.
- Every 5 s it claims one job:
  `UPDATE whitelabel_jobs SET status='running' … WHERE id = (SELECT id … WHERE status='queued' ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *`.
  It runs one job at a time.
- `ctx.step(name)` writes `step` and `ctx.log(line)` appends `[hh:mm:ss] line` to `log`
  (capped at the last 200 KB). The panel shows both.
- **Child processes get only `PATH`, `HOME`, `LANG`.** The parent's DB env must never leak into a copy's
  migrate/build. Commands are spawned without a shell (args are not parsed), with a 30 min timeout and
  **64 MB output cap that fails loudly** (see trap #3). SQL that carries a password goes in on
  **stdin** (`psql -v ON_ERROR_STOP=1`), never on the command line. Command output is logged only on failure.
- All side effects go through a `ctx` object (`run`, `pipe`, `fs`, `resolve4`, `serverIp`,
  `httpOk`, `sleep`, `envFiles`, `parent.query`, `copyDb`, `secrets`, `log`, `step`). The whole
  create/delete sequence is unit-tested against a fake ctx. Keep that design.

### 7b. Create, step by step

1. **DNS**: all three domains must resolve (A record) to this server's IPv4 (`WHITELABEL_SERVER_IP`
   or `hostname -I`). If not → fail with "add an A record and run setup again".
2. **Machine check**: if `/var/www/main/<slug>` exists, it must carry the marker `.whitelabel.json`
   with this row's id. Then it holds leftovers of an earlier attempt, so run remove(archive=false) first.
   With any other marker → refuse and touch nothing. Any existing vhost file for a domain → refuse.
   If DB `wl_<slug>` exists → refuse.
3. **Ports + Redis**: port blocks start at 6100 in steps of 20, and a copy uses `base+0…9`
   (gateway, user, admin, casino, sports, sportsWorker, userWorker, siteAdmin, ownerPanel,
   frontend). Take the first block where no port is listening (`ss -ltnH`) or recorded for another
   whitelabel. For Redis, take the first DB in **8–15** that has no keys (`INFO keyspace`), is not
   named by any site's env (`REDIS_DB=` / `REDIS_URL=…/N`) and is not recorded. **Write `ports` + `redisDb` to the row
   immediately** so a failed setup's cleanup knows exactly what it took.
4. **Code**: mkdir, write the marker, `git -C <parent> archive --format=tar HEAD | tar -x -C <target>`.
   **Only committed code goes into a copy.**
5. **Config**: generate the copy's `stack.config.mjs` + `ecosystem.config.cjs` (`<slug>-*` apps,
   bound to 127.0.0.1), run the repo's own `make-env.mjs` (fresh JWT/internal secrets), then **patch** the
   four env files (backend, frontend, admin, owner-panel), keeping comments and order and appending
   missing keys. Backend env gets:
   - from the parent, **by allowlist only** (a secret the parent adds later never leaks to copies):
     sports feed / AVRKHUB, `JSGAMES_V2_{BASE_URL,API_KEY,API_SECRET}`, limits, timings, currency
     settings, rate limits, JWT TTLs, DB pool settings, log level…
   - forced blank: Telegram, SMTP, per-service DB users/passwords.
   - its own: `DB_NAME=DB_USER=wl_<slug>`, random DB password, `REDIS_DB`, `REDIS_PREFIX=<slug>`,
     CORS/socket origins = its site + admin, public URLs on its domains, `JSGAMES_CALLBACK_URL`
     on its api domain, new `API_ENCRYPTION_KEY` (the frontend gets the same one), `MAIL_DRY_RUN=true`,
     `TXN_PASSWORD_MODE=separate`, `WHITELABEL_MODE=true`, `WHITELABEL_LINK_KEY=<opened key>`.
   - frontends: API base = api domain, fixtures off, `NEXT_PUBLIC_WHITELABEL_MODE=true`, stream /
     scorecard hosts copied from the parent's frontend env.
6. **Install**: `npm ci --no-audit --no-fund --prefer-offline` in each app, retried with
   `--legacy-peer-deps` if the first run fails (an admin peer dependency clash needs it).
7. **Database**: `CREATE ROLE wl_<slug> LOGIN PASSWORD '<hex>'; CREATE DATABASE wl_<slug> OWNER wl_<slug>;`
   via stdin. Identifiers come only from the validated slug.
8. **Migrate + seed**: the repo's own migrate, seed and seed-data scripts, run in the copy folder.
9. **Company + data**, run directly on the copy DB:
   - the seeded level-1 staff **becomes the company**: name, email, the parent-stored **bcrypt hash**
     (same algorithm on both sides), `must_change_password=true`, `first_login=true`,
     `transaction_password=NULL`, `token_version+1`. The level-1 role name = hierarchy name.
   - the parent's `default_currency` + `reward_currency` (the seed default was USDT) and exchange rates.
   - logo → `logo` slot, icon (or the logo again) → `mark` slot (favicon), stored the way the
     branding store stores them (content-hash filename).
   - posters → `banners` placements `home` / `home_mobile`.
   - `site_branding_meta` with **owner_meta = the store's "no owner" value**, not NULL (trap #1).
   - `whitelabel_settings.palette`.
10. **Build** admin, owner-panel and frontend (`npm run build`).
11. **Start**: `pm2 start <target>/ecosystem.config.cjs` + `pm2 save`. Wait up to 3 min for
    gateway `/health`, then check that the copy's `whitelabel-link/status` answers.
12. **Apache + SSL**: three `:80` vhosts (site → frontend, admin → `/owner` ownerPanel + `/` siteAdmin,
    api → gateway), each starting with the marker comment `# Whitelabel copy — written by scripts/whitelabel.`,
    with a WebSocket rewrite to the `/` port and `ProxyPass /.well-known !`. Then `a2ensite`, `apache2ctl configtest`,
    reload, and `certbot --apache --non-interactive --agree-tos --redirect -d <domain>` for each.
13. Row → `live`, `admin_port` = the copy's admin-SERVICE port, `company_password_hash = NULL`.

On any failure: job `failed`, row `failed`, error on the last log line. "Run setup again" cleans up
its own leftovers first (step 2), then rebuilds.

### 7c. Remove

Each part is removed only if it is **this** whitelabel's, and parts already gone are skipped, so the
remove can be rerun:
1. Folder exists → its marker id must match, or refuse everything.
2. (real delete only) `sudo -u postgres pg_dump --no-owner --no-privileges wl_<slug> | gzip -9 >
   /var/www/main/whitelabel-archive/<slug>-<YYYYMMDD-HHMMSS>.sql.gz` (mode 600).
3. pm2: `pm2 jlist` → delete apps whose name starts with `<slug>-` **and** whose `pm_cwd` is inside the target folder, then `pm2 save`.
4. Apache: only vhosts whose first line is the marker comment → a2dissite, rm both the `.conf` and the `-le-ssl.conf`,
   `certbot delete --cert-name <domain>`, then configtest + reload.
5. `DROP DATABASE IF EXISTS wl_<slug> WITH (FORCE); DROP ROLE IF EXISTS wl_<slug>;`
6. `redis-cli -n <recorded db> FLUSHDB`, only if the recorded number is within 8–15.
7. rm the folder, after re-checking that `dirname(target) === /var/www/main`.

Then the row → `deleted`, `admin_port = NULL`, hash cleared.

---

## 8. Traps already hit (each one cost a live test copy)

1. **Copy showed the parent's logo.** The setup wrote `site_branding_meta.owner_meta = NULL`. The
   branding store only shows the Super Admin's name when `owner_meta` equals the owner's current meta
   (`metaOf(null)` on a copy with no owner document), so the site read as "unbranded" and the frontend
   fell back to the parent's art. Fix: write the store's own "no owner" value, with a test that compares
   it to the store. **In the target codebase, audit every fallback that shows the parent's default brand
   when a branding field is empty**: favicon, hero/poster, login mark, `<title>`, email sender, and
   the TOTP issuer (set it to the copy's name).
2. **Transfers refunded with 422.** The parent sent the stored amount at the platform scale
   (`"10000.00000000"`), while the copy's validator allows at most 2 decimals. Fix: format to 2
   decimals before sending, and the **parent's tests run every link body through the copy's own
   validators** (exported `schemas`), so the two sides can't drift.
3. **Delete failed with "Unterminated string in JSON".** The worker cut command output at 1 MB, and
   `pm2 jlist` is ~1.5 MB on a box with 145 pm2 apps. Fix: 64 MB cap, and anything larger fails
   loudly instead of being silently cut.
4. **Copy defaulted to USDT.** The seed default coin was USDT. Copy the parent's default/reward
   currency + exchange rates.
5. **A failed delete must never be "set up again"**, or it would rebuild a half-deleted copy.
   The panel hides the button and the backend refuses (`DELETE_FAILED`). Press Delete again instead.
6. **Unprefixed Redis keys.** In parker567 the sports service keys carry no prefix, so each copy
   **needs its own Redis DB number**; a prefix alone is not enough. That caps a box at 8 copies (DB 8–15).
   Check whether the target codebase prefixes every key. If it does, a prefix may be enough.
7. **Test fixtures re-levelled real roles.** An early parent test set two roles of another suite
   to level 1. Use ids far outside every other suite's range (parker uses 7,100,000+).

---

## 9. Known gaps / not built

- **No "update a copy's code"**. A copy is a `git archive HEAD` snapshot. Shipping a fix to existing copies
  means building an update job (archive → rsync over the folder keeping `.env*`/uploads → `npm ci` →
  migrate → build → `pm2 restart <slug>-*`), or delete + recreate.
- No background retry for pending transfers (only on page open or button press).
- Preview codes are in memory (lost on restart). Preview is not logged (owner's decision).
- Per-copy vendor keys (GIS casino, JSGames v1, payment gateways) have no UI. They stay blank until
  someone fills them into the copy's `backend/.env` and restarts it.
- Parent and copies **must be on the same machine** (the link is localhost-only and the worker runs
  locally). For copies on other servers, replace the transport with HTTPS + HMAC-signed requests
  (timestamp + nonce) and a remote agent instead of the local worker.
- DNS must be pointed **before** setup; certbot needs it.

---

## 10. Tests that exist (rebuild their equivalents)

- copy link: credit idempotency (same id same amount → replay, other amount → 409, concurrent
  same id → one credit), key guard (no key / wrong key / XFF present → 401), summary, preview code
  single use + expiry, palette validation.
- auth: `ro` token → GET ok, POST/PUT/PATCH/DELETE 403 `READ_ONLY_PREVIEW`, logout ok, skips the password gate.
- gateway maintenance: on → 503 for player/staff, open for health/link/callbacks/branding GET/ro;
  an unreadable flag keeps the last value.
- wallet: non-INR credit adjust 403 in copy mode, unchanged on the parent.
- parent whitelabels: create validation + uniqueness race, transfer debit → done / refused → refunded /
  unanswered → uncertain and never refunded, delete guards, link bodies pass the copy's validators.
- worker: lib (slug/domain guards, port and Redis picking, env patching, allowlist, vhost text), steps
  (the full create and remove on a fake ctx: secrets never on a command line or in the log, remove touches
  only marker-matched / prefix-matched / marker-commented things, leftovers cleaned before a retry).
- frontend: applyPalette (complete palette applied, partial ignored, null restores the template).

Reference files in hash-game-exchange, if the target is the same ibitplay-family monorepo:
`backend/services/admin/src/modules/{whitelabel-link,whitelabels}/`, `backend/gateway/src/middleware/maintenance.js`,
`backend/packages/db/migrations/16{3,4,5,6}-*.js`, `scripts/whitelabel/`, `admin/src/views/whitelabels/`,
`admin/src/views/auth/Preview.tsx`, `admin/src/components/shared/WhitelabelTheme.tsx`, `frontend/src/theme/applyTheme.js`.
Flow notes (Hinglish): `PROJECT-FLOW.md` §3g.
