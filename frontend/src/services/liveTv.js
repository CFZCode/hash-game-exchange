import { request } from './client';
import { PLATFORM } from './endpoints';

/**
 * May the signed-in player watch a match's live stream? The site's rule (Site config → Features →
 * Live TV): by default a balance of at least the minimum AND a bet within the set hours.
 * `{ allowed, reason, message, minBalance, inactiveHours }`; `message` says what is missing
 * (recharge, play, or both). Fixtures: always allowed.
 */
export const getLiveTvAccess = () =>
  Promise.resolve(request(PLATFORM.user.liveTv.access, { live: true, fixture: { allowed: true, reason: null, message: null } }));
