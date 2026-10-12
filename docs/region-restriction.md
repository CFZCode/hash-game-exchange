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

## Frontend change (apply after the Next.js migration)

The frontend is not edited by this change. Apply these three edits once the migration lands.

### 1. `src/services/endpoints.js`: the path

```js
USER_REGION: '/api/v1/user/region',
```

(Use whatever key style the file has; the call site must not write the path out.)

### 2. `src/context/account.js`: the fixture keeps `areaAlert` for fixture mode only

`VISITOR` stays exactly as it is (`areaAlert: true`, `areaCode: 'US'`, the captured `ip` and
`rayId`): that is the fixture-mode picture. Add one mapper beside it:

```js
/* GET /user/region → the four fields the region popup reads. Live mode only; the fixture keeps
   VISITOR's captured values. `mode` rides along so the popup can tell notice from block. */
export const regionFields = (r) => ({
  areaAlert: Boolean(r?.restricted),
  areaCode: r?.areaCode ?? '',
  ip: r?.ip ?? '',
  rayId: r?.rayId ?? '',
  areaMode: r?.mode ?? 'off',
});
```

And add `areaMode: 'off'` to `ACCOUNT_DEFAULTS` (next to `areaAlert: false`), so every account
shape has it.

### 3. Ask once on load, in live mode (`src/services/auth.js` or wherever the visitor session is built)

```js
import { request, USE_FIXTURES } from './client';
import { ENDPOINTS } from './endpoints';
import { VISITOR, regionFields } from '../context/account';

/** Live: the backend decides. Fixture: VISITOR's captured values, untouched. */
export async function loadRegion() {
  if (USE_FIXTURES) return {};
  try {
    return regionFields(await request(ENDPOINTS.USER_REGION, { live: true, fixture: null }));
  } catch {
    return regionFields(null); // unreachable = not restricted, never a blocked site
  }
}
```

Call it once when the session provider mounts (one request per page load, not per render), and
merge the result onto the account: `setSession(s => ({ ...s, account: { ...s.account, ...region } }))`.
It applies to a signed-in account too: `SIGNED_IN` keeps `areaAlert: false` only in fixture mode.

In live mode the account must start with `areaAlert: false` (not VISITOR's `true`) until the answer
arrives, so a non-restricted visitor never sees the popup flash. Then `App.jsx` cannot read the gate
once in a `useState` initialiser any more; open it when the answer arrives:

```js
const [dismissed, setDismissed] = useState(false);
const blocked = session.showable && session.areaAlert && !dismissed;
// …
{blocked && isDesktop && (
  <RegionBlock onClose={session.areaMode === 'block' ? undefined : () => setDismissed(true)} />
)}
```

The popup itself (`src/components/modals/RegionBlock`) needs no change and stays visually identical:
it already prints `areaCode`, `ip` and `rayId` from the session.

### `block` mode: not dismissible

This fits without a visual change in one way only: the close button stays where it is and does
nothing (`onClose` undefined, as above; the button's `onClick={onClose}` is then a no-op). Hiding the
X would be a visual change, so it is not done. If an inert X is unwanted, the alternative is to hide
it in block mode, which changes the popup's look. The backend refuses sign-up and login in block mode
either way, so dismissing the popup gains a restricted visitor nothing.
