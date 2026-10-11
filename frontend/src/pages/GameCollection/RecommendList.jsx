import { useResource } from '../../hooks/useResource';
import GameSection from '../Home/GameSection';
import { getHomeSections } from '../../services/home';

/* `RecommendList-dzpmak7P.js` (`F`) plus the fallback it names — the "Recommended Games" row
 * under both lists. Off `hash.game/assets/`; three functions between two chunks:
 *
 *   function h(props) {                                         // RecommendList
 *     return <Show when={props.list?.length > 0} fallback={<g/>}>
 *       <GameRecommend gameInfoId={(props.list||[]).slice(0,10)
 *                        .map(t => t.gameIdentity.gameInfoId).join(",")}/>
 *     </Show>
 *   }
 *
 *   function g() {                                              // the fallback, same chunk
 *     const [data] = useSelection(() => ({sectionName: "hot_games", pageSize: 20, login: login()}))
 *     return <GameSection title={t("Recommended Games")} section_id="page_recent_favorite_recommend"
 *                         link={`/section/hot_games?label=${t("Recommended")}`} data={data()}/>
 *   }
 *
 *   function c(props) {                                         // GameRecommend-CFxPmwzF.js
 *     const [data] = useSelection(() => ({sectionName: "recommended_games", pageSize: 20,
 *                                         relatedGameIds: String(props.gameInfoId||"")}))
 *     return <Show when={props.gameInfoId}>
 *       <GameSection title={t("Recommended Games")} section_id="page_related_recommend"
 *                    link={`/game-related?game=${props.gameInfoId}`} data={data()}/>
 *     </Show>
 *   }
 *
 * SO IT IS ONE HEADING OVER TWO DIFFERENT FEEDS, and which one you get depends on whether the
 * list above it has anything in it. An empty page asks the `hot_games` selection for twenty
 * games; a populated one asks the `recommended_games` selection for twenty MORE LIKE the first
 * ten it is showing, passing their ids as `relatedGameIds`. Both print the same title, which is
 * why a screenshot cannot tell them apart — and why the distinction is written out here rather
 * than collapsed into one call.
 *
 * ONLY THE FALLBACK CAN RENDER IN THIS BUILD, and for a reason rather than as a shortcut: the
 * related arm needs a `recommended_games` selection keyed to game ids, and this platform has
 * none — `casino/games/recommended`, `/related`, `/popular` and `/hot` all answer `404`, probed
 * 2026-09-04. So there is one feed available and the original's own fallback is it.
 *
 * ── THE GUARD USED TO HIDE THE WHOLE ROW, AND FAVOURITES WORKING IS WHAT EXPOSED IT ──────────
 *
 * This file returned `null` whenever `list` was non-empty, on the reasoning that the related arm
 * was unbuilt and printing `hot_games` under its name "would print one selection's games under
 * the other's name". That was written when BOTH lists answered 6002, so `list` was always empty
 * and the branch was unreachable — the row always rendered and the guard was theory.
 *
 * Then `/favorite` started returning rows. The guard became live, and the effect was that
 * STARRING A GAME DELETED THE RECOMMENDED GAMES ROW from the page: the emptier the page, the
 * more it showed. That is backwards, and it is not what the original does either — `h` renders
 * `GameRecommend` when the list is full and `g` when it is empty, and BOTH print "Recommended
 * Games". The row is unconditional there; only the feed behind it changes.
 *
 * So the guard is gone and the fallback renders in both arms. THE DEPARTURE IS REAL AND WORTH
 * NAMING: on a page with favourites the original would show games related to them, and this
 * shows `hot_games`. What it is not is a mislabelling — the heading is the one the original
 * prints in both arms, and the alternative on the table was not "the related feed" (no endpoint)
 * but "no row at all", which is further from the original, not closer.
 *
 * `hot_games` IS ALREADY A FIXTURE HERE — `pages/Home/GameSection/sections.js`, page 1 of that
 * same selection out of the captured batch response — so the row is the site's own data rather
 * than a set chosen to look like the capture. Two differences from the live call are worth
 * knowing: the capture asks for twenty and the captured response holds ten (which is a page
 * size, not a shortfall — `go` appends its View All tile above eight either way), and the games
 * are the selection as it stood on the capture date. The live `hot_games` turns over daily, so
 * the eight tiles in any given screenshot of this page are that day's, not a fixed list.
 */
export default function RecommendList({ list }) {
  const { data } = useResource(getHomeSections);
  const hot = data?.hotGames;

  /* `link` is the fallback's own `/section/hot_games?label=Recommended`, not the home row's bare
     `/section/hot_games` — the label is what the destination prints as its heading. Neither
     route is built, so the All button falls to the catch-all like every other section link. */
  /* THE RELATED ARM IS STILL NOT BUILT and still has no endpoint to build against; what changed
     is that its absence no longer removes the row. See the note above — `list` is read only to
     record that the two arms exist, and both resolve to the same fallback here. */
  void list;

  return (
    <GameSection
      title="Recommended Games"
      games={hot?.games}
      href="/section/hot_games?label=Recommended"
    />
  );
}
