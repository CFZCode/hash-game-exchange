/* The Global room's messages.
 *
 * THIS IS THE ONE FIXTURE IN THIS FEATURE WITH NO BETTER SOURCE, AND THE REASON IS STRUCTURAL
 * RATHER THAN A GAP IN THE CAPTURE. The chat feed is a WEBSOCKET: the store joins a room and
 * receives protobuf frames (`Ct("chat", handler)` in `Enter-MsmOuq5R.js`), so there is no history
 * endpoint that could be probed and no response that could ever have been saved. `/chat/room/list/`
 * and `/chat/room/<id>/pinned-msg/` both answer unauthenticated and are real (see data/chatRooms.js);
 * the messages are not among them. So these six rows are read off the reference capture — the
 * project's documented last resort, taken only after the mirror, `hash.game/assets/` and the live
 * API had each been tried.
 *
 * WHAT IS READ AND WHAT IS DERIVED:
 *
 *   name, time, text   read directly off the capture.
 *   level              DERIVED from the badge, not read. The badge prints its tier's suffix, so a
 *                      roman IV over the Bronze glyph is Bronze IV, which `data/vipConfig.js` puts
 *                      at level 4. The capture shows IV / II / IV / III / II / II and those are the
 *                      levels below. Anything past the suffix (the exact XP) is not on screen and
 *                      is not invented.
 *   userId             INVENTED, and it is the one field here that is. Nothing prints it; it is a
 *                      React key and the target of the profile link on a name. Kept small and
 *                      obviously synthetic rather than dressed up as a real account.
 *   avatar             the capture's avatars are real images the CDN would serve from
 *                      `img2.distributedresourcestorage.com/avatar/<userId>/s`, but that path needs
 *                      the real ids, which are exactly what is not recoverable. So each row points
 *                      at an avatar ALREADY IN THIS REPO (the weekly raffle pulled thirteen), which
 *                      keeps the rows visually distinct without inventing a CDN identity.
 *
 * `chat` IS AN ARRAY OF PARTS, NOT A STRING, and that is the shape the renderer actually takes:
 * `yt` walks it and switches on each entry — a bare string is text (split on newlines), and an
 * object is `{type: 'user' | 'gif' | 'link' | 'img', args: [...]}`. The server does the parsing, so
 * storing the parsed form is what a real frame would arrive as, not a convenience.
 */

import avatar1 from '../../assets/raffle/avatars/105522617.png';
import avatar2 from '../../assets/raffle/avatars/103273025.png';
import avatar3 from '../../assets/raffle/avatars/40744851.png';
import avatar4 from '../../assets/raffle/avatars/22565662.png';
import avatar5 from '../../assets/raffle/avatars/6911253.png';
import avatar6 from '../../assets/raffle/avatars/95113725.png';

/* The capture was taken at 18:03 with every visible row inside the same minute — which is what a
   busy global room looks like, and is reproduced rather than spread out to look tidier. Built
   from LOCAL parts for the reason the notification drawer's one row is: the row prints
   `HH:MM` off `createTime` in the VIEWER's zone, so a pinned UTC instant would only reproduce the
   capture for a reader in the same zone as whoever took it. */
const at = (hours, minutes) => {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.getTime();
};

export const GLOBAL_MESSAGES = [
  {
    id: 1,
    userId: 9000001,
    name: 'AMaria56',
    level: 4,
    createTime: at(18, 3),
    avatar: avatar1,
    type: 1,
    /* The capture's first row is a photograph pasted into the room, which the renderer treats as
       an `img` part: an `<a target=_blank>` around `<img class="inline-block h-44 w-auto">`. The
       PHOTOGRAPH ITSELF IS DELIBERATELY NOT REPRODUCED — it is a third party's uploaded image, it
       is not an asset of the site, and inventing a stand-in would put a picture in a stranger's
       mouth. The part is kept with the upload path the original builds (`d1(src, "pfile")`
       resolves it against the site's own host) so the row renders as the broken-image state the
       live page would show for a since-deleted upload, which is honest about what is missing. */
    chat: [{ type: 'img', args: ['/upload/chat/2026/08/17/not-captured.png'] }],
  },
  {
    id: 2,
    userId: 9000002,
    name: 'Zaddi_Girl123',
    level: 2,
    createTime: at(18, 3),
    avatar: avatar2,
    type: 1,
    chat: [{ type: 'user', args: [9000007, 'Mr_Lolo_0147NG'] }, ' New bonus'],
  },
  {
    id: 3,
    userId: 9000003,
    name: 'Berger_alt',
    level: 4,
    createTime: at(18, 3),
    avatar: avatar3,
    type: 1,
    chat: ['\u{1F601}'],
  },
  {
    /* The masking is the SITE's, not ours: `R.userName` runs every name through the same masker
       that produces `****` elsewhere in this project, and a name that arrives already masked is
       what a privacy-enabled account looks like in chat. Kept exactly as captured. */
    id: 4,
    userId: 9000004,
    name: 'BC_____714____CJP',
    /* THE ONE ROW WHOSE LEVEL IS UNDER-DETERMINED, and it is worth stating rather than smoothing
       over. This badge reads as III in the capture, and NO LEVEL IN THE CAPTURED LADDER CAN
       RENDER A III: every third step is named with a raw newline ("Bronze
III", "Silver
III",
       and so on for Gold and Platinum), `splitLevelName` splits on the last SPACE, so those names
       yield no suffix and no tier family — which means no glyph, so the badge does not draw at
       all. That is the site's own quirk, already documented in data/vipConfig.js, not a porting
       slip. So either the deploy has since corrected those names or the numeral is a II misread
       at this resolution. Recorded as II, the renderable neighbour, so the row matches the
       capture; revisit if `/game/support/vip-v2/config/` is ever captured again. */
    level: 2,
    createTime: at(18, 3),
    avatar: avatar4,
    type: 1,
    chat: ['Friends, be happy forever.'],
  },
  {
    id: 5,
    userId: 9000005,
    name: 'Bcloverscoco',
    level: 2,
    createTime: at(18, 3),
    avatar: avatar5,
    type: 1,
    chat: [{ type: 'user', args: [9000006, 'Bendchof'] }, ' very nice'],
  },
  {
    id: 6,
    userId: 9000006,
    name: 'Bendchof',
    level: 2,
    createTime: at(18, 3),
    avatar: avatar6,
    type: 1,
    chat: [{ type: 'user', args: [9000005, 'Bcloverscoco'] }, ' o'],
  },
];

export default GLOBAL_MESSAGES;
