import { request } from './client';
import ENDPOINTS from './endpoints';
import { QUEST_LIST, COMPLETED_QUESTS, EXPIRED_QUESTS } from '../pages/Quests/quests';

/* The Quest Hub's three reads — `/quests`.
 *
 * One page, three independent resources, exactly as `quest-service-Cob0DDxX.js` has it: the
 * store calls `Promise.all([refetch, refetch, refetch])` and each tab reads its own. They are
 * kept apart here rather than merged into one call for that reason, and because the tabs are
 * genuinely three endpoints on the live site.
 *
 * ALL THREE ARE LOGIN-GATED and answer 403 to a logged-out request, so the fixtures are the
 * page's rendered state rather than a captured response — see the long note at the top of
 * `pages/Quests/quests.js` for exactly which parts of them are evidence and which one field is
 * inferred. The service's own logged-out fallbacks are the empty object and two empty arrays,
 * which is what these become the moment the flag flips and nobody is signed in.
 *
 * `verificationComplete` is the fourth path and has no read: it is a fire-and-forget POST the
 * verification quest makes, and that handler is not built.
 */

export const getQuests = () => request(ENDPOINTS.quest.list, { fixture: QUEST_LIST });

export const getCompletedQuests = () =>
  request(ENDPOINTS.quest.completed, { fixture: COMPLETED_QUESTS });

export const getExpiredQuests = () => request(ENDPOINTS.quest.expired, { fixture: EXPIRED_QUESTS });

export default getQuests;
