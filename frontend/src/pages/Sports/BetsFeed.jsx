import { getBetsFeed } from '../../services/sports';
import { useResource } from '../../hooks/useResource';
import Skeleton from '../../components/shared/Skeleton';

/* The Bets Feed strip — other players' open tickets, scrolling horizontally.
 *
 * Fixed-width cards rather than a fraction of the row, which is what leaves the fourth card
 * half on screen at the right edge. That peek is the point: it is what tells you the strip
 * scrolls, and it is the same device the home page's game rows and Highlights row use. The
 * capture shows it at 358px a card with a 16px gap (448 and 20 image px at dpr 1.25).
 *
 * Each card is a stack of legs over a footer bar carrying the combined price. The legs grow
 * from the top and the footer is pinned to the bottom, so a two-leg ticket and a four-leg one
 * are the same height and their footers line up across the strip — visible in the capture,
 * where every `Total Odds` bar sits on one line.
 *
 * The green ring beside each leg is drawn in CSS rather than as an SVG: it is a circle with a
 * border and no fill, and the vertical rule that joins consecutive legs is the same element's
 * `::after`. See Sports.css.
 *
 * The fourth ticket's total was cut off by the edge of the capture, so `totalOdds` is null and
 * the footer renders its label with no figure. A plausible number would have been indis-
 * tinguishable from a captured one later.
 */
export default function BetsFeed() {
  const { data: tickets, loading } = useResource(getBetsFeed);

  return (
    <div className="sports-feed smooth-scroll hide-scroll">
      {/* `.sports-feed-card` is a fixed 22.375rem x 12.875rem, so the strip has a real height to
          hold and placeholders at that box keep the lobby from folding up while the feed is out.
          Three plus the peek is what the strip shows. Inferred, like every loader on this page —
          see EventGrid.jsx. */}
      {loading &&
        [0, 1, 2].map((slot) => (
          <Skeleton
            key={`skeleton-${slot}`}
            className="sports-feed-card block"
            radius={0}
          >
            <div className="size-full" />
          </Skeleton>
        ))}

      {(tickets ?? []).map((ticket) => (
        <article key={ticket.id} className="sports-feed-card">
          <div className="sports-feed-legs">
            {ticket.legs.map((leg, i) => (
              <div
                key={leg.pick}
                className={`sports-feed-leg ${i < ticket.legs.length - 1 ? 'has-next' : ''}`}
              >
                <span className="sports-feed-ring" />
                <div className="sports-feed-lines">
                  <p className="sports-feed-pick">{leg.pick}</p>
                  <p className="sports-feed-fixture">{leg.fixture}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="sports-feed-total">
            <span className="sports-feed-total-label">Total Odds</span>
            {ticket.totalOdds && (
              <span className="sports-feed-total-value">{ticket.totalOdds}</span>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
