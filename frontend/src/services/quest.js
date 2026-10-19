import { emptyIfAgentBlocked, request, USE_FIXTURES } from './client';
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

/* LIVE: `GET /user/quests` (user-service `quests` module) answers today's daily quests —
   `{dailyQuest: {second: 'dailyquest', first: {endsAt, quests: [{key, title, description, unit,
   target, progress, completed}]}}}`, progress off the daily race board. There is no quest payout,
   so nothing is ever completed-and-claimed: the Completed and Expired reads stay the service's
   own empty fallbacks. A failed read settles the page on its empty state, not a spinner. */
export const getQuests = () =>
  USE_FIXTURES
    ? request(ENDPOINTS.quest.list, { fixture: QUEST_LIST })
    : Promise.resolve(request('/api/v1/user/quests', { live: true }))
        .catch(emptyIfAgentBlocked({}));

export const getCompletedQuests = () =>
  USE_FIXTURES
    ? request(ENDPOINTS.quest.completed, { fixture: COMPLETED_QUESTS })
    : Promise.resolve([]);

export const getExpiredQuests = () =>
  USE_FIXTURES
    ? request(ENDPOINTS.quest.expired, { fixture: EXPIRED_QUESTS })
    : Promise.resolve([]);

export default getQuests;
