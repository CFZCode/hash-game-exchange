import { request, USE_FIXTURES } from './client';
import ENDPOINTS, { PLATFORM } from './endpoints';
import { publicGates } from './gates';
import { ORIGINAL_GAMES } from '../pages/Casino/originalGames';

/* BC Originals. Live list = the Original Games Aggregator's catalogue (backend `og_games`, filled by
   scripts/sync-original-games.js). Artwork, studio name and badge come from this project's own
   transcribed list (pages/Casino/originalGames.js), matched by slug. */

/* Their code -> this build's slug, where the two spell the SAME game differently. No fuzzy matching:
   `single_keno` / `highlow` / `magic_wheel` would wear Keno's / Hilo's / Wheel's cover by mistake. */
const SLUG_ALIAS = {
  mine: 'mines',
  tower: 'tower-legend',
  videopoker: 'video-poker',
};

const normalise = (uid) => String(uid ?? '').replace(/_/g, '-');
export const slugFor = (uid) => SLUG_ALIAS[uid] ?? normalise(uid);

/* The originals this site offers outside the live list (sidebar flyout, /casino/brand, latest bets),
   by slug (user's request, 2026-10-16). */
export const SHOWN_ORIGINALS = new Set(['bow', 'diamonds', 'diamond', 'keno', 'limbo', 'mines', 'plinko']);
export const isShownOriginal = (slug) => SHOWN_ORIGINALS.has(slug);

/* PARKER567'S OWN ORIGINALS, the reference for a blank answer. These are the six rows the live
   platform's `og_games` serves (GET /casino/original-games/games on api.parker567.com, checked
   2026-11-19), in its order. Every one has local art under assets/games (bow.webp,
   diamonds.webp, keno/limbo/mines/plinko.avif), which GameTile resolves by slug. Used only when
   Originals are switched on and the local catalogue answers nothing, so the row is never empty. */
export const PARKER_ORIGINALS = [
  { game_code: 'bow', name: 'Arrow Bow' },
  { game_code: 'diamonds', name: 'Diamonds' },
  { game_code: 'keno', name: 'Keno' },
  { game_code: 'limbo', name: 'Limbo' },
  { game_code: 'mines', name: 'Mines' },
  { game_code: 'plinko', name: 'Plinko' },
];
const TRANSCRIBED = new Map(ORIGINAL_GAMES.map((game) => [game.slug, game]));

/* One catalogue row -> the tile shape the grids use. The platform's name wins; no player count
   (we have no real figure, and copying another casino's would be made up). */
function toGame(row) {
  const slug = slugFor(row.game_uid);
  const known = TRANSCRIBED.get(slug);

  return {
    slug,
    name: row.game_name || known?.name || slug,
    players: 0,
    badge: known?.badge,
    /* The tile prints this under the name: in-house games read "Originals" (Jack55 reference),
       never the reference site's studio name. */
    provider: 'Originals',
    /* The catalogue's own cover when the DB row carries one; otherwise undefined and GameTile
       falls back to this build's art for the slug. */
    image: row.image || undefined,
    category: 'Originals',
    sections: [],
    tags: ['BC Originals'],
    gameType: row.game_type,
    known: Boolean(known), // false = we have a name but no art for it
    uid: row.game_uid, // what the launch sends, as the aggregator spells it
  };
}

export function getOriginals() {
  if (USE_FIXTURES) return request(ENDPOINTS.games, { fixture: PARKER_ORIGINALS.map((row) => toGame({ game_uid: row.game_code, game_name: row.name })) });
  /* Originals off (owner's plan or site admin's flag): don't even ask, every surface gets []. */
  return publicGates().then((gates) => (gates.on('originals') ? readLive() : []));
}

/* Every game the aggregator offers, in its order. The backend also answers [] while Originals are off. */
function readLive() {
  return Promise.resolve(request(PLATFORM.casino.originalsGames, { live: true, fixture: [] })).then((rows) =>
    (rows?.length ? rows : PARKER_ORIGINALS).map((row) => toGame({ game_uid: row.game_code, game_name: row.name, image: row.image })),
  );
}

export default getOriginals;
