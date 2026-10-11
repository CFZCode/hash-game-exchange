import React from 'react';
import { Link } from 'react-router-dom';
import Skeleton from '../Skeleton';
import { assetExact, formatOnlineUsers } from '../../../utils/gameArt';
import placeholderArt from '../../../assets/game-placeholder.png';

/* One 3:4 game card — `yt` in Enter-MsmOuq5R.js.
 *
 * It started life inside GameSection and moved here when the Explore results grid became a
 * second consumer. The two use it identically: the home carousel and the explore grid are
 * the same `grid-col-3` preset at `--aspect-ratio: .75`, one overflowing horizontally and
 * one wrapping.
 *
 * The mount stagger belongs to the card, not to the caller: `io` sets
 *
 *   index > 0 && "game-tile-animate"
 *   `--game-tile-animation-delay: ${Math.min(index, 11) * 15}ms`
 *
 * for every grid it appears in, so the 118-tile Explore grid gets the same ramp as a
 * ten-tile home row — the cap just means everything past the eleventh starts together.
 */

const MAX_STAGGER = 11;

const PlayIcon = ({ className = '' }) => (
  <svg viewBox="0 0 32 32" className={className}>
    <path d="M24.9106 13.9439L13.964 6.44441C13.5849 6.18474 13.1412 6.03268 12.681 6.0047C12.2209 5.97673 11.7617 6.07391 11.3534 6.28572C10.945 6.49753 10.603 6.81589 10.3645 7.2063C10.1259 7.59671 9.99987 8.04429 10 8.50052V23.4995C9.99987 23.9557 10.1259 24.4033 10.3645 24.7937C10.603 25.1841 10.945 25.5025 11.3534 25.7143C11.7617 25.9261 12.2209 26.0233 12.681 25.9953C13.1412 25.9673 13.5849 25.8153 13.964 25.5556L24.9106 18.0561C25.2467 17.8261 25.5214 17.5189 25.7111 17.1608C25.9009 16.8027 26 16.4044 26 16C26 15.5956 25.9009 15.1973 25.7111 14.8392C25.5214 14.4811 25.2467 14.1739 24.9106 13.9439Z" />
  </svg>
);

const PlayersIcon = ({ className = '' }) => (
  <svg viewBox="0 0 32 32" className={className}>
    <path d="M26.1137 20.6693C26.6674 23.8341 24.4618 26.132 21.3885 26.6484C18.4196 27.1469 13.5818 27.1469 10.6138 26.6484C7.5397 26.132 5.3341 23.8349 5.88853 20.6702C6.35798 17.9846 8.63481 16.3107 11.4143 16.4548C13.4451 16.56 14.6923 16.8239 16.1371 16.8239C17.5981 16.8239 18.5718 16.5592 20.588 16.4548C23.3674 16.3091 25.6443 17.9838 26.1137 20.6693ZM16.1007 4.66211C19.021 4.66211 21.3885 7.02959 21.3885 9.9499C21.3885 12.8702 19.021 15.2377 16.1007 15.2377C13.1804 15.2377 10.8121 12.8694 10.8121 9.9499C10.8121 7.0304 13.1796 4.66211 16.1007 4.66211Z" />
  </svg>
);

/* `Mr` and `Hr` — the two corner badges, transcribed whole. Each is ONE path holding a glyph
   subpath and a disc subpath, so the default `nonzero` fill rule is what makes the glyph read
   against the disc; do not split them into two paths or add a `fill-rule`, and do not give
   either a `fill` of its own (CLAUDE.md: icons carry none, the class supplies it). */
const FavoriteBadgeIcon = ({ className = '' }) => (
  <svg viewBox="0 0 32 32" className={className}>
    <path d="M11.6211 21.4017C11.622 22.0831 12.2717 22.4646 12.8477 22.1671C13.7546 21.6991 14.6581 21.2243 15.5564 20.74C15.8581 20.578 16.141 20.578 16.4359 20.7366C16.7916 20.9277 17.149 21.1137 17.5065 21.3023C18.0594 21.5937 18.6122 21.886 19.1651 22.1766C19.4583 22.3309 19.7506 22.3189 20.018 22.126C20.2914 21.9289 20.4029 21.658 20.342 21.316C20.1654 20.3183 19.9966 19.3197 19.8226 18.322C19.7626 17.9783 19.8329 17.6869 20.0951 17.4357C20.8272 16.7329 21.5498 16.0189 22.2767 15.31C22.5244 15.0683 22.6264 14.7811 22.5132 14.446C22.4052 14.1254 22.1755 13.9446 21.8344 13.8966C20.8537 13.7603 19.8757 13.6086 18.8942 13.48C18.4982 13.4277 18.2231 13.2537 18.0482 12.8869C17.6282 12.0091 17.1885 11.1409 16.7625 10.2649C16.6039 9.94 16.3742 9.72229 15.9979 9.71886C15.6181 9.71629 15.3944 9.93915 15.2367 10.2649C14.8158 11.1331 14.3718 11.9911 13.9629 12.8654C13.7803 13.2554 13.5001 13.4294 13.0852 13.4826C12.0951 13.6094 11.1085 13.762 10.1211 13.9043C9.84935 13.9437 9.65392 14.0911 9.53048 14.3329C9.35819 14.6714 9.42077 15.01 9.71992 15.3057C10.4365 16.0146 11.1557 16.7191 11.8757 17.4237C12.0909 17.6337 12.2323 17.872 12.1792 18.1831C12.0814 18.7609 11.9751 19.3369 11.8749 19.9137C11.7857 20.428 11.6991 20.9431 11.6211 21.4017ZM4 15.9906C4.00257 9.36657 9.38305 3.99401 16.009 4.00001C22.6384 4.00601 28.0026 9.37857 28 16.0086C27.9974 22.6334 22.6161 28.0069 15.991 28C9.36248 27.9931 3.99657 22.6197 4 15.9906Z" />
  </svg>
);

const HistoryBadgeIcon = ({ className = '' }) => (
  <svg viewBox="0 0 32 32" className={className}>
    <path d="M22.7308 18.9308L22.3314 18.9497C22.28 18.9523 22.2302 18.9548 22.1822 18.9583C22.0759 18.9643 21.9654 18.9711 21.8522 18.972C20.515 18.9728 19.1786 18.9737 17.8413 18.9737C16.9156 18.9737 15.9898 18.9737 15.064 18.9728C13.7088 18.972 13.077 18.3366 13.077 16.975C13.0761 15.0431 13.077 13.1122 13.077 11.1803V7.94601H16.3652V15.5756H22.7308V18.9308ZM15.9178 4.00002C9.337 4.01202 3.98375 9.41654 4.00004 16.0335C4.01632 22.6796 9.40043 28.0181 16.0695 28.0009C22.6297 27.9838 28.0155 22.5716 28.0009 16.0112C27.9864 9.34537 22.5963 3.98802 15.9178 4.00002Z" />
  </svg>
);

/* Shared with the View All tile. `group` is what the hover overlay hooks into, and
   `hover:-translate-y-2` is the lift. */
export const TILE_CLASS =
  'game-item group relative flex size-full flex-col items-center overflow-hidden rounded-lg transition-all hover:-translate-y-2';

/* `overlay` is the hover scrim, not the hover lift — the two are separate on purpose. The lift
   lives on TILE_CLASS and always applies; this only controls the darkened panel with the name
   and the play circle. The casino page's Poker variant panels turn it off: their cards rise on
   hover and nothing covers the artwork. */
export default function GameTile({
  name,
  image,
  players = 0,
  slug,
  href,
  index = 0,
  overlay = true,
  autoTag,
  isRecItem = false,
}) {
  /* `/game/${slug}` is the original's own href (`{path:"/game/:gameUnique"}`), and it is a page
     here now. `href` still wins when a caller passes one — the View All tile does — and a tile
     with neither stays inert rather than pointing at `/game/undefined`. */
  const target = href ?? (slug ? `/game/${slug}` : '#');

  /* A ROUTER LINK, NOT A BARE ANCHOR — the same correction `SectionHeader` records for the All
     pill, and it had been missed on the tile itself, which is the one every visitor clicks.

     The original's card is `Te` (`a0` out of the index chunk), the router's own link component:
     the same one behind the header logo, the View All tile (`yl`) and every Recent Big Wins
     card. `sl`'s child in `Enter-MsmOuq5R.js` is

       r(Te, { class: "game-item group relative …", href: _(), state: g(), "data-tid": f, … })

     and a bare `<a>` cannot take a `state` prop at all, so the element was never an anchor.

     WHAT IT COST: opening a game RELOADED THE WHOLE APP. A full document navigation re-boots
     React, re-runs the entrypoint, re-fetches every asset and drops all in-memory state — the
     session survives only because it is persisted to localStorage, and everything else does
     not. It was invisible for as long as `/game/:gameUnique` fell through to the catch-all,
     where a reload and a client-side navigation are indistinguishable; it stopped being
     invisible when that route became a real page (`App.jsx:582`). Exactly the trajectory the
     All pill's note describes, on the busier control.

     `<a>` IS STILL RIGHT FOR TWO CASES and both are kept: an absolute URL, which the router
     cannot own and would turn into a nonsense in-app path, and the `#` a tile with neither a
     slug nor an href falls back to, which must stay inert rather than pushing a history entry. */
  const external = /^(?:[a-z]+:)?\/\//i.test(target) || target === '#';
  const delay = index > 0 ? Math.min(index, MAX_STAGGER) * 15 : 0;

  const [loaded, setLoaded] = React.useState(false);

  /* A cover already in the browser's cache can finish before React has wired `onLoad` up, and
     `load` does not bubble — so relying on the handler alone leaves a cached tile pulsing
     forever. The ref callback asks the DOM instead: `complete` is true for an image that is
     already there, and a ref callback runs during commit, before paint, so a cached reload
     never flashes grey for even one frame. */
  const setImg = React.useCallback((node) => {
    if (node && node.complete) setLoaded(true);
  }, []);

  const Tag = external ? 'a' : Link;
  const linkProps = external ? { href: target } : { to: target };

  return (
    <Tag
      {...linkProps}
      className={`${TILE_CLASS} ${delay ? 'game-tile-animate' : ''}`}
      style={delay ? { '--game-tile-animation-delay': `${delay}ms` } : undefined}
    >
      {/* The placeholder covers BOTH ways a tile can end up without artwork: no file for the
          slug at all (`image` undefined), and a file that fails to decode. It is the site's
          own brand card — the BC mark on a green gradient at 250x333, i.e. 3:4 — so a tile
          missing its cover still reads as a game card rather than as a hole.

          This replaced a name-only panel. The trade is deliberate and worth knowing: every
          art-less tile now looks identical at rest, and the name is legible only on hover,
          where the overlay already prints it. That is how the live site behaves for a tile it
          cannot draw, and it is the whole reason the mark is on the card.

          `dataset.fallback` guards the swap. Without it a placeholder that itself 404'd would
          re-enter onError against the same src and spin. */}
      {/* THE SKELETON OVER THE COVER IS THIS BUILD'S, NOT THE ORIGINAL'S, and it is the one
          place on the home page where a skeleton is actually reachable. `services/client.js`
          answers fixtures synchronously, so nothing on this page ever has a pending DATA state
          — the only thing genuinely still arriving on a reload is the artwork, ~120 covers of
          it. The primitive underneath is the site's own (see `.skeleton` in index.css); using
          it against an image load rather than a fetch is the departure.

          A wrapper rather than an overlay sibling, which is how `Skeleton` is meant to be used:
          it covers its children, so the placeholder is the image's exact box and there is no
          second element to keep in sync with the aspect ratio. `radius={0}` because the shape
          comes from the `rounded-lg` utility beside it — the component's default 0.25rem would
          be the wrong corner.

          `loaded` also flips on ERROR, so a cover that 404s falls through to the placeholder
          art rather than pulsing forever. */}
      <Skeleton className="block w-full rounded-lg" radius={0} visible={!loaded}>
        <img
          ref={setImg}
          className="aspect-[3/4] w-full rounded-lg object-cover"
          /* `assetExact(slug)` BEFORE the placeholder, and its absence is what made the home
             page's Favorites strip draw the brand card for every game. A feed row carries a
             cover URL; a row this build resolved itself does not, and `toFavouriteGame` sets
             `icon: undefined` precisely to mean "use this build's own artwork" — its comment
             says the tile does `assetExact(slug)`, and until now the tile did not, so every
             such row fell straight past the local art to the placeholder. `assetExact` and not
             `assetFor`: no fuzzy rule here, so a game with no file still reads as missing
             rather than silently borrowing another game's cover. */
          src={image || assetExact(slug) || placeholderArt}
          alt={name}
          onLoad={() => setLoaded(true)}
          onError={(e) => {
            const img = e.currentTarget;
            if (img.dataset.fallback) {
              setLoaded(true);
              return;
            }
            img.dataset.fallback = '1';
            img.src = placeholderArt;
          }}
        />
      </Skeleton>

      {/* `r(D, { when: !isRecItem, children: [history badge, favorite badge] })` — the corner
          badge that says WHY this card is in this strip. It is not a control and not a state:
          `autoTag` is stamped onto the row by `yn` when it builds the home page's Continue
          Playing / Favorites tabs (`{ ...row, autoTag: "history" | "favorite" }`), so a card
          only wears it inside those strips and the same game elsewhere on the page does not.
          `!isRecItem` is the original's own guard — a recommendation is never tagged. */}
      {!isRecItem && autoTag === 'favorite' && (
        <FavoriteBadgeIcon className="absolute start-1.5 top-1.5 size-5 fill-alw_white" />
      )}
      {!isRecItem && autoTag === 'history' && (
        <HistoryBadgeIcon className="absolute start-1.5 top-1.5 size-5 fill-alw_white" />
      )}

      {players > 0 && (
        <div className="absolute bottom-1 end-1 flex h-5 items-center rounded-md bg-black_alpha20 px-1.5">
          <PlayersIcon className="size-4 fill-alw_white" />
          <span className="text-xs font-semibold text-alw_white">{formatOnlineUsers(players)}</span>
        </div>
      )}

      {/* The hover state: a scrim, the game's name across the top 40%, and a circle that
          grows 1.5x under the cursor. All of it is opacity-0 until the tile is hovered. */}
      {overlay && (
        <div className="absolute left-0 top-0 flex h-full w-full cursor-pointer items-center justify-center bg-[#00000099] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="absolute left-0 top-0 flex h-[40%] w-full items-center justify-center px-2 text-center font-extrabold leading-4 text-[white]">
            {name}
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white_alpha20 transition-all duration-300 group-hover:scale-150">
            <PlayIcon className="size-full fill-alw_white" />
          </div>
        </div>
      )}
    </Tag>
  );
}
