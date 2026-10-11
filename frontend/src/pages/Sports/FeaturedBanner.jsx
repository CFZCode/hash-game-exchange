import { getFeatured } from '../../services/sports';
import { useResource } from '../../hooks/useResource';
import { flagFor } from '../Home/Highlights/matches';
import { SportIcon } from './icons';
import { hasSportIcon } from './sportArt';
import Skeleton from '../../components/shared/Skeleton';

/* The featured fixture — the big banner between the tabs and the bets feed.
 *
 * A carousel: three slides, the third active, with a dot row at the bottom-left whose active
 * dot is a stretched green bar rather than a circle. Only the active slide's content survives
 * a screenshot, so lobby.js carries three ids and one slide, and the other two render as
 * unloaded. Inventing two fixtures to sit behind the dots would be fabricating data the
 * capture never showed.
 *
 * Classes are `sports-feature-*`, NOT `sports-banner-*`. The latter prefix is already taken:
 * `.sports-banner-match-icon` in Highlights.css is lifted verbatim from the original's own
 * stylesheet (index-DxOqNczA.css), and reusing the prefix here would make a later reader think
 * these rules came from there too. They did not — they were measured off a screenshot.
 *
 * THE ARTWORK IS NOT HERE. The live banner is a photographic promo image behind a dark purple
 * wash, served by BetBy at `/api/v2/promo/banners/brand/{brand}/{lang}` (Com-8gtZ7Cmm.js). It
 * is remote, not in the mirror, and a licensed photograph — so this renders the wash alone.
 * That is a deliberate hole, not an oversight: the layout, the type and the outcome buttons
 * all sit on the wash and can be checked without it, and a stand-in photo would be the only
 * invented pixel on the page. Set `--sports-feature-art` to a url() to fill it.
 *
 * The competitor badges use the same fallback chain Home's Highlights row does (`Qe` -> `ee`
 * -> `Je` in Com-8gtZ7Cmm.js): competitor image, else country flag, else the sport icon. Both
 * players here are internationals and ESP and FRA are among the flags already saved, so this
 * one resolves all the way — unlike the club sides in the grid below.
 */
function Badge({ competitor, sport }) {
  const flag = flagFor(competitor.countryCode);

  if (flag) {
    return <img className="sports-feature-flag" alt={competitor.name} src={flag} />;
  }
  if (hasSportIcon(sport)) {
    return <SportIcon sport={sport} className="sports-feature-flag" />;
  }
  return <span className="sports-feature-flag" />;
}

export default function FeaturedBanner() {
  const { data: featured, loading } = useResource(getFeatured);
  const { slides = [], activeIndex, slide } = featured ?? {};

  /* `.sports-feature` is 17.125rem tall (342 image px at dpr 1.25), so this is the biggest single
     box on the lobby and its absence moves everything under it by that much. While the read is
     out it keeps its box as a skeleton; SETTLED with no slide it still renders nothing, which is
     the arm the comment below describes and is a different state. Inferred rather than read —
     Sports has no bc.game chunk to transcribe a pending arm from; see EventGrid.jsx. */
  if (loading) {
    return (
      <Skeleton className="block h-[17.125rem] w-full rounded-xl" radius={0}>
        <div className="size-full" />
      </Skeleton>
    );
  }

  /* The banner is one slide's worth of content; with nothing loaded there is nothing to
     lay out, so it renders no box rather than an empty purple wash. */
  if (!slide) return null;

  return (
    <section className="sports-feature">
      {/* A fixed-width column inset from the left edge, not a full-bleed row: on the capture
          the head, the teams, the market and the odds all share one 30rem measure and the
          artwork occupies everything to its right. */}
      <div className="sports-feature-content">
        <div className="sports-feature-head">
          <span className="sports-feature-meta">
            {hasSportIcon(slide.sport) && (
              <SportIcon sport={slide.sport} className="sports-feature-sport" />
            )}
            <span>{slide.category}</span>
            {/* The same middot the Highlights card puts between category and tournament, so
                the two read identically. */}
            <span className="sports-dont" />
            <span className="sports-feature-tournament">{slide.tournament}</span>
          </span>
          <span className="sports-feature-start">{slide.startLabel}</span>
        </div>

        <div className="sports-feature-teams">
          <div className="sports-feature-side">
            <Badge competitor={slide.home} sport={slide.sport} />
            <span className="sports-feature-name">{slide.home.name}</span>
          </div>

          <div className="sports-feature-side is-away">
            <span className="sports-feature-name">{slide.away.name}</span>
            <Badge competitor={slide.away} sport={slide.sport} />
          </div>
        </div>

        <p className="sports-feature-market">{slide.marketName}</p>

        <div className="sports-feature-odds">
          {slide.outcomes.map((outcome) => (
            <button key={outcome.name} type="button" className="sports-feature-odd">
              <span className="sports-feature-odd-name">{outcome.name}</span>
              <span className="sports-feature-odd-value">{outcome.value}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="sports-feature-dots">
        {slides.map((id, i) => (
          <span key={id} className={`sports-feature-dot ${i === activeIndex ? 'is-active' : ''}`} />
        ))}
      </div>
    </section>
  );
}
