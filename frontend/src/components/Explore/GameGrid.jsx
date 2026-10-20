import GameTile from '../shared/GameTile';
import ProviderLogo from '../shared/ProviderLogo';
import EmptyPlaceholder from '../shared/EmptyPlaceholder';
import { assetFor, assetExact } from '../../utils/gameArt';

/* `Oh` in Enter-MsmOuq5R.js — the wrapping grid the Explore results use, as opposed to the
 * home page's horizontally scrolling strip. Same preset, same aspect ratio, no overflow:
 *
 *   <div class="mt-4 grid gap-2 grid-col-3" style="--grid-gap:.5rem;--aspect-ratio:0.75">
 *
 * and the same spacer-div-per-card structure, which is not cosmetic — `.grid-col-3 > div` is
 * what turns a column width into a 3:4 height and `> div > *` is what stretches the tile
 * over it. A tile placed straight into the grid collapses.
 *
 * The original lazy-mounts rows through an IntersectionObserver (`Mn`, rootMargin 100px) and
 * shows a skeleton until each is in view. With a 118-game catalogue held in memory there is
 * nothing to wait for, so every tile is rendered.
 */

/* `ks`, the site's Empty, now `components/shared/EmptyPlaceholder` — lifted the day the quest
   page became its second call site, under the same rule `Select` and `GameTile` moved under.
   It used to be this file's own copy WITHOUT the illustration, because the image map the
   bundle assembles at bootstrap (`const oh = {}`, filled by `eb`) left nothing to read; the
   file it names, `/assets/empty-6mO-ndW8.png`, came off hash.game and is local now, so the
   crocodile draws here too. `text-secondary` is passed down rather than baked in because `ks`
   sets no colour on the message — see the note in the shared component. */
export function Empty({ children, className = '' }) {
  return (
    <EmptyPlaceholder className={`text-secondary ${className}`}>{children}</EmptyPlaceholder>
  );
}

/* `exactArt` switches artwork resolution from `assetFor` to `assetExact`.
 *
 * assetFor never returns nothing — it falls back to a keyword guess, then to a hash of the
 * slug. That existed to keep the Explore grid looking full while thirteen of its 118 games had
 * no cover, and the cost was that those thirteen silently wore another game's art. All 118 now
 * have their own file (the covers came from the captured feed's own `iconThreeFour` URLs on
 * imgxcut.com), so the fallback has nothing left to cover for and every remaining trigger of it
 * would be a bug rendered as a plausible-looking lie.
 *
 * The Poker tab is the other reason it exists: its two Amusnet games point at the site's shared
 * `common.png` placeholder, so there is no cover of their own to download, and the fallback
 * handed them Evolution's Poker art. With `exactArt` they resolve to nothing and GameTile draws
 * the BC brand placeholder, which is the truth. */
export default function GameGrid({ games, exactArt = false, loading = false }) {
  /* Still reading the tab's page: pulse tiles in the grid's own shape, not the "Stay tuned"
     empty state (which used to show for the seconds a slow page took and read as "no games"). */
  if (loading && !games.length) {
    return (
      <div className="mt-4 grid gap-2 grid-col-3" style={{ '--grid-gap': '.5rem', '--aspect-ratio': 0.75 }} aria-busy="true">
        {Array.from({ length: 24 }, (_, i) => (
          <div key={i}>
            <div className="aspect-[3/4] w-full animate-pulse rounded-lg bg-layer4" />
          </div>
        ))}
      </div>
    );
  }
  if (!games.length) return <Empty />;

  const art = exactArt ? assetExact : assetFor;

  return (
    <div
      className="mt-4 grid gap-2 grid-col-3"
      style={{ '--grid-gap': '.5rem', '--aspect-ratio': 0.75 }}
    >
      {games.map((game, i) => (
        <div key={game.slug}>
          <GameTile
            slug={game.slug}
            name={game.name}
            image={game.image ?? art(game.slug)}
            players={game.players}
            index={i}
          />
        </div>
      ))}
    </div>
  );
}

/* `_t` — the Providers tab. Each button holds the provider's logo, exactly as on the original;
   the grid, the h-16 layer4 button and the /provider/<name> target are all its own.
   This used to print the provider's NAME instead, because `providerList` is empty in both
   captured feeds and no logo was available. Seventeen of the twenty-four now resolve through
   shared/ProviderLogo, and the seven with no known URL still fall through to the name — so the
   fallback is now the exception rather than the whole grid. */
export function ProviderGrid({ providers }) {
  if (!providers.length) return <Empty />;

  /* `gap-2` AT EVERY WIDTH — back to the chunk's own value. It went 8 -> 6 -> 4 on a misread:
     "the gap is still more" was about the space ABOVE the grid, not between its cells, and the
     8px responsible for that was the `pt-2` below rather than anything here.

     `pt-0` below `sm` is that fix and it stays. The `pt-2` is PADDING rather than margin, so it
     never collapses into the gap above the grid and simply added — which is the whole reason
     this tab sat lower than Themes. `sm:pt-2` keeps the desktop grid and the Explore panel
     byte-identical to what they were. */
  return (
    <div className="grid w-full grid-cols-2 gap-2 pt-0 sm:pt-2 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))]">
      {providers.map((name) => (
        <a
          key={name}
          href={`/provider/${encodeURIComponent(name)}`}
          /* `h-17` BELOW `sm`, AND IT IS A REM VALUE FOR A REASON. The target was measured at
             69.58px, which is neither a Tailwind step nor a round number — but below 640 this
             build scales the root font-size with the viewport (`clientWidth / 430 * 16`), so a
             px measurement means nothing without the width it was taken at. The width came out
             of a second reading: `h-20` rendered 81.85px, so the root was 81.85 / 5 = 16.37px,
             which is a 440px viewport. At that root the target is 69.58 / 16.37 = 4.2505rem —
             `h-17`, which renders 69.57.

             Do NOT pin `h-[69.58px]`. It would freeze this one card at 69.58 while every rem
             around it kept scaling, so it would be correct at 440 and wrong at every other
             width — which is the trap the responsive note in CLAUDE.md is about. `h-17` is
             right at 440 and proportionally right everywhere else.

             `h-17` is not in Tailwind's stock scale; v4 generates the spacing scale on demand,
             which is the same behaviour the dropped `w-30` in the signed-in header documents —
             there it was a hazard, here it is what makes an odd step available at all.

             `sm:h-16` keeps the 64px the desktop grid and the Explore panel were built at. */
          className="button h-17 overflow-hidden rounded-xl bg-layer4 p-0 text-center font-extrabold text-secondary sm:h-16"
        >
          {/* The mark grows with the card. `h-17` left the default `w-24` image — 38.4px of a
              uniform 200x80 — floating in a 69.57px box with half of it empty. `w-32` puts the
              rendered height at 51.2px, and the box has to go to `h-14` with it or the extra is
              clipped by its own `overflow-hidden`; see the note on the component. Both revert to
              the defaults from `sm`, so the desktop grid and the Explore panel are unchanged. */}
          <ProviderLogo
            name={name}
            className="h-auto w-32 sm:w-24"
            boxClassName="h-14 sm:h-10"
          />
        </a>
      ))}
    </div>
  );
}
