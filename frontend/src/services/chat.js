import { request, USE_FIXTURES } from './client';
import ENDPOINTS from './endpoints';
import CHAT_ROOMS from '../data/chatRooms';
import GLOBAL_MESSAGES from '../components/Chat/messages';
import RICH_LIST from '../data/richList';

/* The global chat drawer's reads.
 *
 * Two of the three are REAL responses and the third cannot be one — see `ENDPOINTS.chat` for the
 * probe results and why the message list is a transcription.
 */

/* `GET /chat/room/list/`, and the response is captured verbatim in `data/chatRooms.js`.
 *
 * Note the store's own fallback is a HARDCODED list inside `Enter-MsmOuq5R.js` whose ids are the
 * live ones minus 100 (Global 0 against 100, Português 8 against 108) — it is what renders when
 * the call fails. That matters for one thing only, below. */
export const getChatRooms = () =>
  request(ENDPOINTS.chat.roomList, { fixture: { roomList: CHAT_ROOMS } });

/* `a` in the channel picker: `roomId === 0 ? t("Global") : roomId === 14 ? t("Sports") : label`.
 *
 * THOSE TWO IDS BELONG TO THE OFFLINE FALLBACK, NOT TO THE FEED, which is what makes this
 * function look like dead code and stops it being so. The live rows are 100 and 114, so neither
 * test ever matches a fetched room and every label comes from the feed's own `language`. It is
 * reproduced because it is not INERT — it is the site's translation seam: with the fallback list
 * in play those two rooms print through i18n while the rest keep their native names, which is
 * also why "Global" and "Sports" are the only two names in that list that are English words
 * rather than endonyms. In en-US against the live feed both arms agree, so nothing renders
 * differently either way. */
export const roomLabel = (room) => {
  if (!room) return '';
  if (room.roomId === 0) return 'Global';
  if (room.roomId === 14) return 'Sports';
  return room.language;
};

/* `V1`'s board — the three biggest winners of the day, which the header's trophy toggles open.
 *
 * A live response rather than a capture, and the provenance is at the fixture. Note the original
 * fetches it inside the panel, so it is requested the first time the trophy is pressed and not
 * before; `Mn`, the keep-alive `Show` it sits behind, is then what stops a second press
 * refetching it. Reproduced by mounting the component on the flag — the resource is synchronous
 * here, so the difference is invisible today and will not be the day a real fetch lands. */
export const getRichList = () => request(ENDPOINTS.chat.richList, { fixture: RICH_LIST });

/* THE ONE READ HERE THAT DOES NOT GO THROUGH `request`, and deliberately so: there is no path to
   give it. On the original the room's backlog and every new line arrive over the WEBSOCKET the
   store joins, so the seam this will be replaced by is a subscription, not a call — handing
   `request` an invented path would look like the rest of this file and would start fetching a
   404 the moment `VITE_USE_FIXTURES` is turned off.
   Only the Global room has a transcription behind it; every other room correctly renders the
   empty state rather than being handed Global's messages. */
/* The seed rows are a screenshot of OTHER PEOPLE'S messages on bc.game ("BC_____714____CJP",
   "Bcloverscoco", …) — fixture-only, never shown on the live site. */
export const getChatMessages = (roomId) => (USE_FIXTURES && roomId === 100 ? GLOBAL_MESSAGES : []);

export default getChatRooms;
