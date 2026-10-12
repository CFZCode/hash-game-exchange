# Region restriction

Which countries the site serves. Set by the platform owner only, in the owner panel. Players get a
popup, and in `block` mode the backend also refuses their registration and login.

## Where it is set

Owner panel → **Features & plan** → Policies → **Region restriction** (`region_restriction`):

| Field | Values | Stored as |
|---|---|---|
| Mode | `Off` (default), `Notice only`, `Block` | the policy variant, `variants.region_restriction` = `none` / `notice` / `block` (the API says `off` for `none`) |
| List type | `Blocklist` (default: the listed countries are restricted), `Allowlist` (only the listed countries are allowed) | `region.listType` |
| Countries | ISO 3166-1 alpha-2, upper-case (`US, GB`); the 249 assigned codes plus `XK` | `region.countries` |

- Save validation (`owner-panel/src/lib/entitlements/region.ts` `regionProblem`): an unknown or
  lower-case code, an unknown list type or an extra field answers `422 VALIDATION_ERROR` naming it.
  Audit change kind `region` (plus `variant` for the mode).
- It travels in the signed entitlements document like everything else; admin-service's poller keeps
  `region` (cleaned by `regionPolicy.cleanRegion`) and applies the mode to `site_features` as a
  policy (`updated_by 'owner'`).
- Site admin: Site Config → Features shows the mode, and under it the list type and countries,
  read-only. `PUT /api/v1/admin/features/region_restriction` changing the variant → `403 OWNER_MANAGED`.
  `GET /api/v1/admin/entitlements` (staff) also carries `region`.

## Who is restricted

`restricted` = mode is not off AND the visitor's country is known AND
(blocklist: it is listed / allowlist: it is not listed). Never restricted: a private or loopback
address, an address the offline GeoIP file cannot place, an empty country list (either list type).
Code: `backend/packages/common/src/regionPolicy.js`, `backend/services/user/src/modules/region/`.

The country comes only from the offline DB-IP file (`services/user/src/modules/auth/geoip.js`,
`backend/data/geoip/dbip-city-lite.mmdb`, refreshed by `npm run geoip:update`). **Without that file
every visitor's country is unknown, so nobody is restricted.** Install it on any host where the
setting must bite. `GEOIP_DEV_IP` is ignored here.

## Endpoint

`GET /api/v1/user/region`: public, no auth, no query (any query key → `422`), rate-limited
(60 a minute per address), `cache-control: no-store`.

```json
{ "success": true, "data": { "restricted": false, "mode": "off", "areaCode": "US", "ip": "8.8.8.8", "rayId": "f268545a-…" } }
```

- `mode`: `off` | `notice` | `block`
- `areaCode`: ISO country code or `null` (private, loopback, unknown)
- `ip`: the client address as every route reads it (`req.ip`, the `TRUST_PROXY` rules; the
  gateway appends to `x-forwarded-for`)
- `rayId`: this request's id (`x-request-id`, set by the gateway)

The country list itself is never sent to the visitor.

## Enforcement (`block` only)

`403 REGION_RESTRICTED` (`details: { areaCode }`) before any credential check, from
`AuthService.login` and `AuthService.register`, which covers `POST /user/auth/login`,
`POST /user/auth/register` and the socket events `LOGIN_USER` / `REGISTER_USER` (they answer
`{ status: <message>, error: { code: 'REGION_RESTRICTED' } }`). Google sign-in is not ported (it
already refuses) and email OTP mints no session, so there is no other login path. Not refused:
token refresh of an existing session, and staff / admin login (admin-service `staff-auth`).

## Frontend (done, commit 97c3b8f)

- `frontend/src/services/region.js` `getRegion()` calls `GET /api/v1/user/region` once on load in live mode; with fixtures on it returns null.
- `frontend/src/App.jsx`: in fixture mode the dialog keeps the captured visitor's `showable && areaAlert` gate (so the pixel check still sees the original); in live mode it opens only when the answer says `restricted`.
- `frontend/src/components/modals/RegionBlock`: takes `region` (country, IP and Ray ID shown from the live answer) and `dismissible`. In `block` mode the close button is hidden, which is the one visual change; `notice` looks exactly like the original.
- Desktop only, as before (the original shows it from 1024 up). In `block` mode the backend refuses sign-up and sign-in on every width anyway.

Nobody is restricted until the offline GeoIP file is installed: `cd backend && npm run geoip:update`.
