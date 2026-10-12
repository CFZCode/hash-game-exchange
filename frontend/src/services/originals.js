import { request, USE_FIXTURES } from './client';
import ENDPOINTS, { PLATFORM } from './endpoints';
import { publicGates } from './gates';
import { ORIGINAL_GAMES } from '../pages/Casino/originalGames';

/* BC Originals, against the platform's own in-house catalogue.
 *
 * ── WHY THIS IS THE ONE TAB THAT GOES LIVE ────────────────────────────────────────────────────
 *
 * The platform has THREE game catalogues and only one of them is populated, which is the same
 * split bc.game itself has:
 *
 *   in-house      `js_games`, GET /casino/js-games/v1/games   -> 20 active games. SEEDED.
 *   GIS           `gisgamesnew`, GET /casino/games            -> 0. `GIS_MERCHANT_ID` and
 *                                                                 `GIS_MERCHANT_KEY` are unset.
 *   Casino Hub    GET /casino/catalogue/*                     -> `CATALOGUE_NOT_CONFIGURED`.
 *
 * So the aggregator halves are UNPROVISIONED rather than unseeded — the same shape as CCPayment
 * and the five PSPs — and no amount of seeding fills them; they need a sync against real merchant
 * credentials. bc.game's own split is identical: BC Originals are the house's games and Slots,
 * Live Casino and Game Shows are third-party. **So BC Originals is exactly the half the platform
 * has**, and it is the half that goes live. Every other tab keeps its transcribed set, because the
 * platform holds nothing to replace it with and twenty coverless tiles under "Slots" would be
 * worse than the real list.
 *
 * ── THE ARTWORK IS LOCAL AND THE LIST IS NOT, WHICH IS THE TRADE ──────────────────────────────
 *
 * `game_icon` is NULL on all twenty rows — there is no artwork anywhere in the delivery — so a
 * cover has to come from this project's own 615 files. Most of the uids are bc.game originals we
 * already hold art for, and the join is by slug with five aliases where the two spell the same
 * game differently. What is deliberately NOT done is a fuzzy match: `assetFor`'s keyword fallback
 * would hand `single_keno` the Keno cover and `magic_wheel` the Wheel one, which reads as correct
 * and is not — the same reason the Explore grid passes `exactArt`. A game with no cover of its own
 * renders the tile's own no-art state.
 *
 * `hash_dice`, `diamond`, `goal`, `highlow`, `magic_wheel`, `single_keno` and `videopoker` are
 * where the two catalogues genuinely disagree, and each is recorded below rather than forced.
 */

/* Their uid -> this build's slug, for the five that differ. Every one is the SAME GAME under two
   spellings, checked against the local art and the transcribed tab rather than guessed:

     mine       -> mines          bc.game's plural
     tower      -> tower-legend   bc.game's own name for it
     videopoker -> video-poker    hyphenation only
     classic_dice / hash_dice     underscore for hyphen, which `normalise` handles

   NOT aliased, and each for a reason: `single_keno` and `highlow` and `magic_wheel` would take
   Keno's, Hilo's and Wheel's covers — three tiles wearing another game's artwork — and `diamond`
   and `goal` have no bc.game original of that name at all. They come through with a real name and
   no cover, which is the honest rendering of a game this project has never seen. */
const SLUG_ALIAS = {
  mine: 'mines',
  tower: 'tower-legend',
  videopoker: 'video-poker',
};

const normalise = (uid) => String(uid ?? '').replace(/_/g, '-');
export const slugFor = (uid) => SLUG_ALIAS[uid] ?? normalise(uid);

/* The transcribed tab is still the source for everything the platform does not carry: a name it
   would otherwise print as a raw uid, the studio the Providers filter groups on, and the player
   count. Matched on the resolved slug, so an aliased game finds its row too. */
const TRANSCRIBED = new Map(ORIGINAL_GAMES.map((game) => [game.slug, game]));

/* `game_name` is the platform's and wins — an operator can rename a game there and the grid should
   follow. `players` is NOT carried over from the transcription: it is a snapshot of the live site's
   own counter, and printing a number from a different casino beside a game list from this one
   would be inventing traffic. The platform has no online-player figure at all, so the tile prints
   none. */
function toGame(row) {
  const slug = slugFor(row.game_uid);
  const known = TRANSCRIBED.get(slug);

  return {
    slug,
    name: row.game_name || known?.name || slug,
    players: 0,
    badge: known?.badge,
    /* `vendor` is the literal "in-house" on every row, which is not a studio name any filter here
       knows. The transcription's own attribution is used when it has one — BC.GAME or Croco Gaming
       — and BC.GAME is the fallback, which is what an in-house game is. */
    provider: known?.provider ?? 'BC.GAME',
    category: 'Originals',
    sections: [],
    tags: ['BC Originals'],
    /* Kept so a call site can tell a game this project has art and provenance for from one it has
       only a name for. `GameGrid` passes `exactArt`, so a slug with no file renders the tile's own
       no-art state rather than borrowing a neighbour's cover. */
    gameType: row.game_type,
    known: Boolean(known),
    /* The platform's own id, which the launch and the favourite store key on (`mine`, not
       `mines`). */
    uid: row.game_uid,
  };
}

/* `is_active` is filtered SERVER-side already (the route returns 20 of the table's 22), so this is
   belt and braces rather than a second filter — and it is what stops a deactivated game appearing
   if that route is ever changed to return everything. */
export function toOriginals(rows) {
  return (rows ?? []).filter((row) => row.is_active !== false).map(toGame);
}

export function getOriginals() {
  if (USE_FIXTURES) return request(ENDPOINTS.games, { fixture: ORIGINAL_GAMES });
  /* Originals switched off (the owner's plan or the site admin's flag): not even asked for — the
     backend would refuse it anyway — and every surface reads an empty list. */
  return publicGates().then((gates) => (gates.on('originals') ? readLive() : []));
}

function readLive() {
  return Promise.resolve(
    /* The SmartBet backend keeps the imported provider catalogue in the same `js_games` table
       (paged 20 at a time), so ask for the house's own rows only, all of them on one page. */
    request(PLATFORM.casino.inHouseGames, { live: true, fixture: [], params: { vendor: 'in-house', per_page: 100 } }),
  ).then(toOriginals);
}

export default getOriginals;
