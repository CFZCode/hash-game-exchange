import React from 'react';
import { useNavigate } from 'react-router-dom';
import SectionHeader from '../../../components/shared/SectionHeader';
import { Controller } from '../GameSection';
import { flagFor } from './matches';
import Skeleton from '../../../components/shared/Skeleton';
import { getHighlights } from '../../../services/home';
import { useResource } from '../../../hooks/useResource';
import soccerIcon from '../../../assets/sports/sport-soccer.svg?raw';
import tennisIcon from '../../../assets/sports/sport-tennis.svg?raw';
import cricketIcon from '../../../assets/sports/sport-cricket.svg?raw';
import '../GameSection/GameSection.css';
import './Highlights.css';

/* The sports Highlights row.
 *
 * Source: `Dt` (header), `Ut` (skeleton) and `kt` (the match card) in
 * bc.game/bc.game/assets/Com-8gtZ7Cmm.js. The chunk that mounts it on the home page,
 * index-BtKBYw3-.js, is NOT in the mirror — it was lazy-loaded and never saved — so the
 * section shell here is assembled from the pieces that are, plus the live page's geometry.
 */

/* Measured off the live page at 1.25x: cards 480px wide with 20px gaps, i.e. 384 / 16 CSS.
   384px is exactly w-96, and the height is the skeleton's own h-[13.375rem] (214px). The
   cards are a fixed width rather than a fraction of the row — a fourth is left peeking at
   the right edge, which is what makes the strip read as scrollable.
 *
 * That peek is the DESKTOP behaviour only. `qt` in Com-8gtZ7Cmm.js sizes the strip's columns
 *
 *   style: { "--grid-gap": "1rem", "grid-auto-columns": E.mobile ? "100%" : "24rem" }
 *
 * so off-desktop a card is the full width of the scrollport and exactly one is on screen at a
 * time. Its skeleton says the same thing from the other direction — `E.mobile ? [1] : [1,2,3]`
 * placeholders. 24rem is w-96, and 100% is w-full; only the desktop value was carried over
 * here, which is why a sliver of the next card was showing on a phone.
 *
 * The switch is at `sm`, not `lg`, because it has to move with `--grid-padding` in
 * GameSection.css — that is the strip's 1rem gutter, it switches at sm for this same
 * `m.mobile` flag, and a 100% card is only one-per-screen-with-margins while the gutter is
 * still there. Splitting them would give 640-1023 a full-bleed card with no gutter at all.
 * The width resolves against the scroller's CONTENT box, so `w-full` is viewport - 32 and the
 * next card starts a whole gap beyond the right edge. */
const CARD = 'h-[13.375rem] w-full flex-none sm:w-96';

const SPORT_ICONS = { soccer: soccerIcon, tennis: tennisIcon, cricket: cricketIcon };

/* Inlined rather than an <img src>: these SVGs ship with no fill of their own, so they
   render black unless they are in the document where `fill-tertiary` can reach them. The
   original does the same thing — it fetches the file and assigns innerHTML. */
const SportIcon = ({ sport }) => (
  <div
    className="[&_svg]:h-6 [&_svg]:w-auto [&_svg]:fill-tertiary"
    dangerouslySetInnerHTML={{ __html: SPORT_ICONS[sport] ?? '' }}
  />
);

/* `Qe` -> `ee` -> `Je`: competitor image, else country flag, else the sport icon.
   The exchange feed carries neither crests nor countries, so a live competitor shows its NAME in
   the badge's place instead (user's request, 2026-10-16) — see `hasArt`. */
const hasArt = (competitor) => Boolean(competitor.image ?? flagFor(competitor.countryCode));

function CompetitorBadge({ competitor, sport }) {
  const src = competitor.image ?? flagFor(competitor.countryCode);

  if (!src && competitor.countryCode === undefined) {
    return (
      <div className="flex h-12 min-w-0 items-center justify-center">
        <p className="line-clamp-2 text-center text-sm font-semibold leading-tight text-primary">{competitor.name}</p>
      </div>
    );
  }

  return (
    <div className="sports-banner-match-icon flex h-12 items-center">
      {src ? <img alt={competitor.name} src={src} /> : <SportIcon sport={sport} />}
    </div>
  );
}

const LiveBadge = () => (
  <div className="absolute right-2 top-2 flex h-6 items-center rounded-md bg-brand/10 px-1.5 text-brand">
    <svg width="7" height="8" viewBox="0 0 7 8">
      <path
        className="fill-brand"
        d="M6.00976 3.14495L1.51853 0.42138C0.852092 0.0172424 0 0.497043 0 1.27644V6.72358C0 7.50297 0.852091 7.98278 1.51852 7.57864L6.00976 4.85507C6.65173 4.46577 6.65173 3.53425 6.00976 3.14495Z"
      />
    </svg>
    <span className="ml-0.5">Live</span>
  </div>
);

function MatchCard({ match }) {
  const navigate = useNavigate();
  /* A live card with no score on the feed (the exchange's) keeps the kick-off layout. */
  const scored = match.live && match.homeScore !== undefined;
  const prematch = !scored;
  const namesInBadges = !hasArt(match.home) && match.home.countryCode === undefined;

  return (
    <div
      className={`${CARD} relative flex cursor-pointer flex-col rounded-xl bg-layer4 py-4`}
      onClick={match.href ? () => navigate(match.href) : undefined}
    >
      {match.live && <LiveBadge />}

      {/* px-14 on a live card, px-4 otherwise — the extra inset is what keeps the
          tournament name from running under the Live badge. */}
      <div
        className={`flex items-center justify-center gap-2 pb-3 ${match.live ? 'px-14' : 'px-4'}`}
      >
        <div className="flex size-6 flex-none items-center justify-center rounded-full">
          <SportIcon sport={match.sport} />
        </div>
        <p className="flex min-w-0 items-center font-semibold text-secondary">
          <span className="flex-none whitespace-nowrap">{match.category}</span>
          <span className="sports-dont ml-1.5 flex-none" />
          <span className="ml-1.5 truncate">{match.tournament}</span>
        </p>
      </div>

      {/* A 3-column grid, not three flex rows: the centre cell spans both rows so the
          time/score sits vertically centred against two badges AND two names. */}
      <div className="grid flex-1 grid-cols-[1fr_auto_1fr] content-center gap-x-2 px-4 pb-2">
        <div className="flex justify-center">
          <CompetitorBadge competitor={match.home} sport={match.sport} />
        </div>

        <div className="row-span-2 flex flex-col items-center justify-center text-center">
          {prematch ? (
            <>
              <p className="text-2xl font-extrabold text-primary">{match.live ? 'VS' : match.time}</p>
              <p className="mt-1 truncate text-xs font-semibold text-secondary">{match.live ? match.status : match.date}</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-extrabold text-primary">
                {match.homeScore} : {match.awayScore}
              </p>
              <p className="mt-1 truncate text-xs font-semibold text-secondary">{match.status}</p>
            </>
          )}
        </div>

        <div className="flex justify-center">
          <CompetitorBadge competitor={match.away} sport={match.sport} />
        </div>

        {!namesInBadges && (
          <>
            <p className="col-start-1 mt-2 min-w-0 truncate text-center text-sm font-semibold text-primary">
              {match.home.name}
            </p>
            <p className="col-start-3 mt-2 min-w-0 truncate text-center text-sm font-semibold text-primary">
              {match.away.name}
            </p>
          </>
        )}
      </div>

      <p className="truncate px-3 pb-1.5 text-center text-xs font-semibold text-tertiary">
        {match.marketName}
      </p>

      <div className="flex gap-2 px-3">
        {match.outcomes.map((o) => (
          <div
            key={o.name}
            className="flex h-10 min-w-0 flex-1 items-center justify-between rounded-lg bg-layer3_alt px-2 font-semibold transition-colors hover:bg-layer1"
          >
            <span className="min-w-0 flex-1 truncate capitalize text-secondary">{o.name}</span>
            <span className="ml-1 flex-none whitespace-nowrap font-extrabold text-brand">
              {o.value}
            </span>
          </div>
        ))}
        {match.moreMarkets > 0 && (
          <div className="flex h-10 flex-none items-center justify-center rounded-lg bg-layer3_alt px-3 font-semibold leading-none transition-colors hover:bg-layer1">
            +{match.moreMarkets}
          </div>
        )}
      </div>
    </div>
  );
}

/* `Nt` — same two-circle construction as Recent Big Wins' dot, but bg-brand rather than
   bg-success and inline-block rather than a flex child. */
const Dot = () => (
  <span className="relative mr-2 inline-block h-2 w-2">
    <span className="absolute left-0 top-0 z-10 h-full w-full rounded-full bg-brand" />
    <span className="absolute left-0 top-0 h-full w-full animate-ping rounded-full bg-brand" />
  </span>
);

export default function Highlights() {
  const { data: matches } = useResource(getHighlights);
  const scrollerRef = React.useRef(null);

  return (
    <>
      <SectionHeader
        className="px-4 sm:px-0"
        href="/sports"
        controller={<Controller scrollerRef={scrollerRef} />}
      >
        <Dot />
        Highlights
      </SectionHeader>

      {/* Same scroll primitives as the game rows (smooth-scroll / smooth-list / hide-scroll),
          but flex rather than the 3:4 grid — these cards have their own aspect. */}
      <div
        ref={scrollerRef}
        /* h-[13.375rem] belongs on the CARD, not the row. The original puts it on the row
            because its row has no top padding — the gap under the header comes from the
            section wrapper. Here pt-3 supplies that gap the same way the game rows do, so
            putting the height on the row would leave the cards 12px short.

            The sub-sm value is OURS. A flat pt-3 grows with the scaling root font-size below
            640 — 17.8px at 639 against the 12px it is from sm up — which is what put the
            header too far off the cards on a phone. 8.186px is a supplied measurement, pinned
            in px as given; note that unlike a rem value it does NOT scale with the root below
            640, so it holds at one size across that whole range. sm:pt-3 keeps the game rows'
            value everywhere the scaling has stopped. */
        className="smooth-scroll smooth-list hide-scroll relative flex snap-x snap-mandatory gap-4 overflow-x-scroll overflow-y-hidden scroll-smooth pt-[8.186px] sm:pt-3"
        style={{ '--grid-gap': '1rem' }}
      >
        {/* The row's pending arm, the same shape the game rows' is: placeholders at the CARD's
            own size (`h-[13.375rem] w-full flex-none sm:w-96`), so the strip is already the right
            height and nothing under it moves when the fixtures land. Three of them, which is what
            fits the desktop viewport — the game rows show eight because eight 3:4 tiles do. */}
        {matches
          ? matches.map((m) => <MatchCard key={m.id} match={m} />)
          : [0, 1, 2].map((slot) => (
              <Skeleton key={slot} className={`block ${CARD} rounded-xl`} radius={0}>
                <div className="size-full" />
              </Skeleton>
            ))}
      </div>
    </>
  );
}
