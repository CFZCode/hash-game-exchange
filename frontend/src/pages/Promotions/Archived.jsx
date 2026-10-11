import React from 'react';
import PopCenter from '../../components/shared/PopCenter';
import { Empty } from '../../components/Explore/GameGrid';
import { getPromotions } from '../../services/promotions';
import { useResource } from '../../hooks/useResource';
import { PromotionCard } from './index';
import Loading from '../../components/shared/Loading';

/* THE ARCHIVED LIST — what the title bar's action opens, and it is the page's own list with one
 * flag flipped rather than a second feature. The chunk (`index-CMExrEqM.js`) is three lines:
 *
 *   const Ze = () => n(he, { title: b("Archived"), class: "!bg-layer1 sm:!w-[480px]",
 *                            children: n(le, { inProgress: !1 }) })
 *   const ae = () => { te.push(() => n(Ze, {})); re.emit("track", {event: "promotion_archive_button_click"}) }
 *
 * `le` is the same list component the page renders, and `inProgress: false` is what becomes
 * `archived: true` in the request body. `he` is the popup shell — `components/shared/PopCenter`
 * here — pushed onto the global stack, which this build has no equivalent of, so the open state
 * lives on the page instead. The `track` event is not reproduced: there is no analytics seam.
 *
 * IT RENDERS EMPTY, AND THAT IS THE CORRECT RENDERING rather than a stub. `/home/main/event-pageList/`
 * answers 403 to everyone (probed with `archived` both ways), so no archived row was ever
 * capturable, and the site's own empty state is what a shut feed produces — the same call the
 * transaction, rollover and bet-history panes each document.
 */
export default function ArchivedPromotions({ open, onClose, env }) {
  const read = React.useCallback(() => getPromotions({ archived: true, env }), [env]);
  const { data, loading } = useResource(read);
  const promotions = data?.promotions ?? [];

  return (
    <PopCenter open={open} onClose={onClose} title="Archived" className="!bg-layer1 sm:!w-[480px]">
      {/* `bonus-scope @container` is the chunk's own wrapper inside the popup — the scope
          re-declares `--card`, `--quarterary` and `--secondary-light`, which the cards read. */}
      <div className="bonus-scope @container">
        {/* The archived list answers 403 like the main one, so the empty state is what lands —
            a beat later now. One card's worth of placeholder, since the popup is a single
            column at `sm:!w-[480px]`. */}
        {loading ? (
          <div className="center h-44">
            <Loading />
          </div>
        ) : promotions.length === 0 ? (
          <Empty />
        ) : (
          <div className="grid grid-cols-1 gap-y-4">
            {promotions.map((promo) => (
              <PromotionCard key={promo.id} promo={promo} />
            ))}
          </div>
        )}
      </div>
    </PopCenter>
  );
}
