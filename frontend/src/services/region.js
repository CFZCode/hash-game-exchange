import { request, USE_FIXTURES } from './client';

/* The owner panel's region restriction, as the backend applies it to this visitor:
 * `GET /api/v1/user/region` → `{ restricted, mode, areaCode, ip, rayId }`.
 *
 *   mode   off | notice | block. `notice` is the dismissible dialog; `block` also refuses sign-up
 *          and sign-in server-side, so the dialog has no close button.
 *
 * With fixtures on this returns null and the dialog keeps the captured visitor's own
 * `showable && areaAlert` gate (account.js), so the pixel check still sees the original. */
export async function getRegion() {
  if (USE_FIXTURES) return null;
  try {
    return await request('/api/v1/user/region', { live: true, fixture: null });
  } catch {
    // An unreachable check never blocks anyone.
    return null;
  }
}

export default getRegion;
