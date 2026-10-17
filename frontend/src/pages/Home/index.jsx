import { brandLabel } from '../../services/siteBranding';
import React from 'react';
import Hero from './Hero';
import RecentBigWins from './RecentBigWins';
import RecentFavorites from './RecentFavorites';
import CategoryCards from './CategoryCards';
import GameSection from './GameSection';
import PayYourWay from './PayYourWay';
import Highlights from './Highlights';
import LatestBets from './LatestBets';
import { getHomeSections } from '../../services/home';
import { useResource } from '../../hooks/useResource';
import { useGates } from '../../context/gates';
import useScrollReveal from '../../hooks/useScrollReveal';
import './Home.css';

/* Section order is the original's default `og()` ordering, [0, 9, 1, 2, 3, 4, 5, 6, 7, 8]
   applied to its section array — Originals, Hot Games, Highlights, Exclusive, Slots,
   Upcoming Lottery Draw, Live Casino, Pay Your Way, Bingo, Latest round & Race. Upcoming Lottery
   Draw is removed on the user's request (a deliberate departure; this platform has no lottery),
   so Slots is followed directly by Live Casino. */
export default function Home() {
  /* One call for all six game rows, which is how `recommend/batch/selections/` returns them.
     `?? {}` rather than a loading branch: while fixtures are on this is populated on the first
     render, and once it is not, each row falls to `games={undefined}` — which is where the
     section's skeleton will go when it is transcribed. */
  const { data: sections } = useResource(getHomeSections);
  const gates = useGates();

  /* Each card below the hero plays the site's own entrance as it reaches the fold — the
     trigger is this build's addition, the motion is `.game-tile-animate`'s; the rules and the
     reasoning are at the bottom of Home.css.

     CARDS ONLY — A HEADING NEVER MOVES. `:not(:has(> h2))` is what enforces it, and it needs
     no marker class on anything: `SectionHeader` (and Recent Big Wins' inline copy of it, and
     Latest round & Race's) is `ot`'s own row, whose first child is always the `<h2>` carrying
     the title, and nothing else on this page puts an `<h2>` directly inside a child of the
     page root. So the title rows are excluded structurally, by the one thing that makes them
     title rows.

     TWO SWEEPS OVER ONE PAGE, because a card row must not move as a slab. A GameSection
     returns a FRAGMENT — its header and its scrolling strip are separate children of this
     div — and the strip is what the original ramps card by card, 15ms apart. So every strip
     (`.smooth-list`, which the game rows, Highlights and the lottery draws all carry) is a
     target whose own children are the items; the remaining blocks reveal themselves.

     The hero is excluded by `:not(:first-child)`: it is above the fold at every width, so
     revealing it would animate the first paint rather than a scroll. THE CATEGORY BLOCK IS
     EXCLUDED FOR THE SAME REASON NOW, and the exclusion outlived the reason it was written for:
     it was there because that block ran a reveal of its own, and nesting the two would have hid
     a card inside an already-hidden parent. That block no longer animates at all — it sits at
     the bottom edge of the viewport on a first paint, which is inside the fold but under this
     sweep's own `-10%` line, so it stayed invisible until an unrelated scroll released it (see
     the note in CategoryCards). The class stays in this selector to keep it that way. */
  /* `:not(:has(> .recent-big-win))` — RECENT BIG WINS IS EXCLUDED, and it is the one block on
     this page where the reveal fought the content instead of introducing it. That panel is a
     MARQUEE: `.recent-big-win` is already translating continuously (see RecentBigWins.css), so
     the entrance rose a box whose contents were mid-slide, and the heading above it stayed put
     — which read as the title being pushed up on load. The reveal is this build's TRIGGER, not
     the original's (the motion is `io`'s; the original plays it once at mount and has no
     scroll-driven pass at all), so dropping it here moves toward the original rather than away.

     Matched on `:has(> .recent-big-win)` rather than a marker class for the same reason
     `:not(:has(> h2))` excludes the headings: the structure already identifies it, and the
     marquee child is exactly what makes this panel the wrong thing to animate. */
  const blocksRef = useScrollReveal({
    selector:
      ':scope > *:not(:first-child):not(.category-cards):not(.smooth-list):not(:has(> h2))'
      + ':not(:has(> .recent-big-win))',
    ready: sections,
  });
  /* `:scope > *` and not `.game-item`: in a `grid-col-2` / `grid-col-3` strip the child is the
     SPACER div that carries the aspect ratio and the card is stretched over it, so the spacer
     is the box to move — and it is also the one selector that fits all three kinds of strip,
     whose cards are otherwise three different components. */
  /* `ready: sections` — the six game rows ARE this payload, so the pass has to run again once it
     lands or it will have hidden eight skeletons per row and missed every real card. See the
     hook. */
  const rowsRef = useScrollReveal({
    selector: '.smooth-list',
    itemSelector: ':scope > *',
    ready: sections,
  });

  /* One node, two hooks. A wrapper div would sit between `.home-page` and its children and
     break both the `:scope >` selectors above and the page's own bottom-margin collapse. */
  const setPage = React.useCallback(
    (node) => {
      blocksRef.current = node;
      rowsRef.current = node;
    },
    [blocksRef, rowsRef],
  );

  /* The payload calls it `link`; the component's prop is `href`. Mapping here rather than
     naming the field `href` in the service keeps a view prop out of the response shape. */
  const section = (key) => ({ games: sections?.[key]?.games, href: sections?.[key]?.link });

  return (
    /* `lg:pb-2` IS THE DESKTOP CLEARANCE ABOVE THE FOOTER, and it deliberately lives here rather
       than on `.home-page`'s margin in Home.css — that rule is scoped `max-width: 1023px` for
       exactly this reason, so widening its range would be the wrong lever.

       Below 1024 the layout already supplies a gap (`.main-layout-container > :last-child` gets
       `--content-gap-y`, and this page overrides it with its own measured 2.75rem); from 1024 up
       nothing does, because the tabbar is gone and the footer is the next sibling.

       32px, arrived at by asking for more three times from 8. It is a step ABOVE `--content-gap-y`'s
       16, which is what every width below 1024 gets from `.main-layout-container > :last-child`,
       so the desktop footer now sits looser than the tablet one — deliberate, not drift. The
       casino page is INDEPENDENT and still at `lg:pb-2`; the two end on the same Latest round &
       Race card but were tuned separately.

       `lg:` IS THE DESKTOP-ONLY GUARANTEE and it is the only arm this element has. Below 1024
       the class emits nothing at all, so the gap there is untouched: `.home-page`'s own
       `margin-bottom: 2.75rem` inside `@media (max-width: 1023px)` in Home.css, which is a
       measurement off the live phone page and is not to be moved from here.

       Padding rather than margin, so no trailing margin from the last section can collapse into
       it. */
    <div ref={setPage} className="home-page lg:pb-8">
      {gates.flag('home_heroSection') && <Hero />}
      {/* ABOVE Recent Big Wins, which is where `Dn` puts it: that component is
          [wu, Iu, Ao] — the Continue Playing / Favorites block, Game of the Week (Korea only,
          not built), then Recent Big Wins — and `ng()` inserts the whole of it as the FIRST
          child of the page body, before the category cards and the ordered game rows. So the
          signed-in order is hero, this, big wins, categories, BC Originals. Renders nothing at
          all when signed out or when both its lists are empty. */}
      <RecentFavorites />
      {gates.flag('home_latestwins') && <RecentBigWins />}
      {gates.flag('home_gamingcards') && <CategoryCards />}
      {gates.on('originals') && <GameSection title={brandLabel('BC Originals')} {...section('originals')} />}
      <GameSection title="Hot Games" {...section('hotGames')} />
      {gates.flag('home_livesports') && <Highlights />}
      {/* BC.GAME's exclusive tables have no Parker567 equivalent; the live feed answers []. Drawn
          only when it has games, so an empty "Exclusive" heading never shows. */}
      {section('exclusive').games?.length !== 0 && <GameSection title={brandLabel('BC Exclusive')} {...section('exclusive')} />}
      {gates.flag('home_popularslots') && <GameSection title="Slots" {...section('slots')} />}
      {gates.flag('home_livecasino') && <GameSection title="Live Casino" {...section('liveCasino')} />}
      {/* Admin ka home_paymentbanner, aur agent ke player ko nahi (wo deposit nahi kar sakta). */}
      {gates.flag('home_paymentbanner') && gates.on('deposit') && <PayYourWay />}
      {/* compact: this row sits under Pay Your Way's fixed-height panel, which leaves empty
          space below its content on mobile — see the note in GameSection. */}
      <GameSection title="All Bingo Games" compact {...section('bingo')} />
      {gates.flag('home_leaderboard') && <LatestBets />}
    </div>
  );
}
