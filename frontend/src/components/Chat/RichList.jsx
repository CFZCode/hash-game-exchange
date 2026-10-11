import useResource from '../../hooks/useResource';
import Loading from '../shared/Loading';
import { printCurrency } from '../../utils/currency';
import { getRichList } from '../../services/chat';
import star from '../../assets/chat/star.png';
import top1 from '../../assets/chat/top1.png';
import top2 from '../../assets/chat/top2.png';
import top3 from '../../assets/chat/top3.png';
import avatarDefault from '../../assets/chat/avatars/933731508656757.png';
import avatarNdtrocal from '../../assets/chat/avatars/106213295.png';

/* `V1` in index-CUBJDfzw.js — the BIGGEST WINNER TODAY board, and what the chat header's trophy
 * toggles. Three rows, a medal each, over `GET /game/support/rich-list/get/`.
 *
 * IT IS PART OF THE HEADER, NOT OF THE MESSAGE LIST, and that is what makes it overlay the room
 * rather than push it down. `q1`'s third child is a bare `<div class="relative w-full">` under
 * the header row, and this panel is `absolute` inside it — so it hangs below the bar, over the
 * messages, and the list underneath never reflows. Putting it in the scroller instead would move
 * every message down by ~200px each time the trophy is pressed.
 *
 * `bg-layer1 sm:bg-layer2` is the chunk's own pair and is the wrong way round from the header it
 * hangs off (`bg-layer4`) — the board is deliberately a step DARKER than the bar above it, which
 * is what separates it from the messages behind rather than a border.
 *
 * THE PANEL IS WHAT FETCHES, not the header, so the board is requested the first time the trophy
 * is pressed. On the original `Mn` — a keep-alive `Show` — then holds the fetched tree alive for
 * the rest of the session, so closing and reopening does not refetch. Mounting on the flag is the
 * faithful half; the keep-alive is invisible against a synchronous fixture and is not modelled.
 */

/* `t = [M1, z1, P1]`, indexed by the row's position — so the medal is decided by ORDER and not by
   anything in the payload. The feed returns exactly three rows; a fourth would render with no
   medal at all, which is the chunk's own behaviour and is left as it is. */
const MEDALS = [top1, top2, top3];

/* `R.avatar(userId)` on the original is `img2.distributedresourcestorage.com/avatar/<id>/s`, and
   both files here are that CDN's real answers for these real ids — the same host the weekly
   raffle's 47 came off. TWO OF THE THREE ARE ONE IMAGE, because most bc.game accounts keep a
   default; the reference capture shows the same pair matching. Mapped here rather than in the
   fixture so `data/richList.js` stays the response as it arrived. */
const AVATAR = {
  933731508656757: avatarDefault,
  98927269: avatarDefault,
  106213295: avatarNdtrocal,
};

/* `j1`. The amount pill is a fixed `w-36` whatever the figure, so the three right edges line up —
   the column is not `justify-end` on a shrink-to-fit box. */
function RichItem({ item, medal }) {
  return (
    <div className="mt-3 flex items-center justify-between px-4">
      <div className="center gap-2">
        {/* `alt=image` and `alt="user avatar"` are the template's own strings. */}
        <img className="w-4" alt="image" src={medal} />
        <img className="h-6 w-6 rounded-full" alt="user avatar" src={AVATAR[item.userId]} />
        <span className="font-semibold">{item.userName}</span>
      </div>
      <div className="center h-8 w-36 rounded-lg bg-layer3 font-semibold text-brand">
        {/* `se.printCurrency(new Decimal(t.ritem.upAmount))` — no currency argument, so it
            defaults to USDFIAT and `upAmount` is already the USD total. */}
        {printCurrency(item.upAmount)}
      </div>
    </div>
  );
}

export default function RichList() {
  const { data, loading } = useResource(getRichList);
  const list = data ?? [];

  return (
    <div className="absolute left-0 top-0 z-50 !h-auto w-full bg-layer1 pb-4 pt-2 sm:bg-layer2">
      <div className="w-full">
        <div className="center gap-2 font-extrabold text-secondary">
          <img className="h-4 w-4" alt="star" src={star} />
          BIGGEST WINNER TODAY
          <img className="h-4 w-4" alt="star" src={star} />
        </div>

        {/* `<Suspense fallback={<div class="center flex h-24 w-full"><Loading/></div>}>` around a
            `<Show when={data()}>` — so an empty board renders the heading and nothing under it,
            with no empty-state placeholder. Unreachable while the fixture answers synchronously,
            like every other pending arm in this project. `rich-item-wrap` is a dead class in both
            the mirror's stylesheets and the current deploy's, checked, and is kept. */}
        {loading ? (
          <div className="center flex h-24 w-full">
            <Loading />
          </div>
        ) : (
          <div className="rich-item-wrap">
            {list.map((item, index) => (
              <RichItem key={item.userId} item={item} medal={MEDALS[index]} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
