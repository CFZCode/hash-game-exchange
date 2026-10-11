import React from 'react';
import { getLobbyEvents } from '../../services/sports';
import { useResource } from '../../hooks/useResource';
import { SportIcon, GlobeIcon, ShirtIcon, StatsIcon, ChevronIcon } from './icons';
import { hasSportIcon } from './sportArt';
import Skeleton from '../../components/shared/Skeleton';

/* The event grid — three columns of fixture cards, then the pager.
 *
 * A card is four stacked bands: the country/tournament line, the kickoff line with its feed
 * markers, the two competitors, and the market name over its outcome buttons.
 *
 * THE OUTCOME ROW SIZES FROM THE DATA, not from a hardcoded three. Eleven of the twelve cards
 * on page one lead with 1x2 and show `1 / draw / 2`; FC CFR 1907 Cluj leads with a two-way
 * Total and shows `over 3.5 / under 3.5`. Both end with the same fixed-width chevron button
 * that opens the rest of the markets. Assuming three would have rendered that card wrong, and
 * it is the only one of its kind in the capture — exactly the sort of single counterexample
 * that gets designed away.
 *
 * COMPETITOR CRESTS ARE NOT AVAILABLE. The live cards show club badges; BetBy serves them from
 * an internal competitor id (`.../competitors/images/normal/medium/<id>.png`) that is not in
 * the mirror and not derivable from anything that is — the same wall
 * `pages/Home/Highlights/matches.js` documents for its four football clubs. So each side falls
 * back to the sport icon where one exists and to an empty disc otherwise, and the disc keeps
 * the row's geometry honest so the rest of the card can still be checked.
 *
 * The pager is BetBy's own and is NOT `components/shared/Pagination`. That component is
 * bc.game's — a prev button, an editable page field, "of", the total — and this is a range
 * readout ("1 - 12 of 15") between two round arrow buttons. Different control, different
 * markup; reusing the shared one would have meant overriding almost all of it.
 */

const FEED_GLYPHS = { lineups: ShirtIcon, stats: StatsIcon };

function Competitor({ competitor, sport }) {
  return (
    <div className="sports-event-team">
      <span className="sports-event-crest">
        {hasSportIcon(sport) && <SportIcon sport={sport} className="sports-event-crest-icon" />}
      </span>
      <span className="sports-event-name">{competitor.name}</span>
    </div>
  );
}

/* A selection's id has to survive a re-render and be unique across the grid, so it is the event
   and the outcome rather than an index — two cards can both offer a "draw". NOT exported: this
   file exports a component, and `react-refresh/only-export-components` forbids it carrying a
   plain function too. The same rule keeps `useSession` out of `SessionContext.jsx` and the art
   lookups out of `icons.jsx`; the slip only ever receives ids, so nothing outside needs it. */
const pickId = (event, outcome) => `${event.id}:${outcome.name}`;

function EventCard({ event, selected, onToggleOutcome }) {
  return (
    <article className="sports-event">
      <p className="sports-event-league">
        <GlobeIcon className="sports-event-globe" />
        <span>{event.category}</span>
        <span className="sports-dont" />
        <span className="sports-event-tournament">{event.tournament}</span>
      </p>

      <p className="sports-event-start">
        <span>{event.startLabel}</span>
        {event.feeds?.map((feed) => {
          const Glyph = FEED_GLYPHS[feed];
          return Glyph ? <Glyph key={feed} className="sports-event-feed" /> : null;
        })}
      </p>

      <div className="sports-event-teams">
        <Competitor competitor={event.home} sport={event.sport} />
        <Competitor competitor={event.away} sport={event.sport} />
      </div>

      <p className="sports-event-market">{event.marketName}</p>

      <div className="sports-event-odds">
        {event.outcomes.map((outcome) => {
          const id = pickId(event, outcome);
          return (
            <button
              key={outcome.name}
              type="button"
              /* `is-selected` rather than a `selected` attribute: the odds button is not a form
                 control on the widget either, and the class is what Sports.css already keys the
                 rest of this row's states off. */
              className={`sports-event-odd ${selected?.has(id) ? 'is-selected' : ''}`}
              aria-pressed={Boolean(selected?.has(id))}
              onClick={() =>
                onToggleOutcome?.({
                  id,
                  sport: event.sport,
                  outcome: outcome.name,
                  /* THE SLIP LEADS WITH THE TEAM, NOT THE OUTCOME KEY. The live slip's card reads
                     "Tokyo Verdy" where the button said "1", so a 1x2 pick is resolved to the side
                     it names — 1 is the home side, 2 the away one — and anything else (draw, over,
                     under) keeps its own label, which is already the readable form. */
                  team:
                    outcome.name === '1'
                      ? event.home.name
                      : outcome.name === '2'
                        ? event.away.name
                        : outcome.name,
                  value: outcome.value,
                  market: event.marketName,
                  event: `${event.home.name} - ${event.away.name}`,
                })
              }
            >
              <span className="sports-event-odd-name">{outcome.name}</span>
              <span className="sports-event-odd-value">{outcome.value}</span>
            </button>
          );
        })}
        <button type="button" className="sports-event-more" aria-label="More markets">
          <ChevronIcon className="sports-event-more-chevron" />
        </button>
      </div>
    </article>
  );
}

/* "1 - 12 of 15". The range is computed from the page size and total the service reports, so
   it stays right whatever the backend paginates by — nothing here assumes twelve. */
function Pager({ page, pages, pageSize, total, onChange }) {
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="sports-pager">
      <button
        type="button"
        className="sports-pager-button"
        disabled={page <= 1}
        aria-label="Previous page"
        onClick={() => onChange(page - 1)}
      >
        <ChevronIcon className="sports-pager-chevron" />
      </button>

      <span className="sports-pager-range">
        {first} - {last} of {total}
      </span>

      <button
        type="button"
        className="sports-pager-button is-next"
        disabled={page >= pages}
        aria-label="Next page"
        onClick={() => onChange(page + 1)}
      >
        <ChevronIcon className="sports-pager-chevron" />
      </button>
    </div>
  );
}

export default function EventGrid({ page, onPageChange, selected, onToggleOutcome }) {
  /* The one parameterised read on this page, so it needs a stable reader — `useResource`
     memoises on the function's identity, and an inline arrow would be a new function every
     render and therefore a fetch every render once the API is live. `useCallback` is also
     where the linter can actually check the dependency list.

     Paging is the service's job now, not this component's: it returns the page it was asked
     for along with the page size and the total. Only page one exists in the fixture — the
     capture's pager shows its next arrow enabled — so page two comes back empty rather than
     repeating page one, which would read as if it had been captured. */
  const read = React.useCallback(() => getLobbyEvents({ page }), [page]);
  const { data, loading } = useResource(read);

  const shown = data?.events ?? [];
  const pageSize = data?.pageSize ?? 0;
  const total = data?.total ?? 0;
  const pages = pageSize ? Math.ceil(total / pageSize) : 1;

  return (
    <>
      <div className="sports-grid">
        {/* SPORTS HAS NO CHUNK AND NO STYLESHEET OF ITS OWN — the page is BetBy's widget inside a
            shadow root and ground truth for it is computed styles off the live lobby, so there is
            no pending arm to transcribe here the way there is for a bc.game page. This is the
            site's own convention applied instead: `.skeleton` at the card's box, six of them,
            which is two full rows at the desktop three-column step. `.sports-event` supplies the
            radius and the layer3 fill; the height is the card's own, so nothing under the grid
            moves when the events land. Flagged as inferred rather than read. */}
        {loading
          ? Array.from({ length: 6 }, (unused, i) => (
              <Skeleton key={`skeleton-${i}`} className="block h-40 rounded-xl" radius={0}>
                <div className="size-full" />
              </Skeleton>
            ))
          : shown.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                selected={selected}
                onToggleOutcome={onToggleOutcome}
              />
            ))}
      </div>

      <Pager
        page={page}
        pages={pages}
        pageSize={pageSize}
        total={total}
        onChange={onPageChange}
      />
    </>
  );
}
