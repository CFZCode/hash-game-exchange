'use strict';

const { entitlements } = require('@ibitplay/common');

const E = require('./games.errors');
const { isProviderDisabled } = require('./providerSwitch');

/**
 * Is this game in the owner's plan? — docs/OWNER-PANEL.md §4.
 *
 * ═════════════════════════════════════════════════════════════════════════
 * EVERY LAUNCH ROUTE ASKS, NOT ONLY THE LOBBY
 *
 * The public config masks a non-entitled flag, so the frontend hides the
 * tab — but a launch is one POST with a game id, and a client running its
 * own frontend never looks at the config. Each launch route puts this guard
 * in front of its controller.
 *
 * ── WHICH FLAGS A GAME NEEDS ─────────────────────────────────────────────
 *
 *   a sports or esports BOOK   `sports` only. The sportsbook and esports are
 *                              catalogue games launched like any slot, so
 *                              without this the `sports` flag closed the
 *                              in-house feed and left the real book open.
 *                              They are also NOT casino: a site sold sports
 *                              without casino still opens its book.
 *   anything else              `casino`, plus its provider's flag and its
 *                              category's flag when the catalogue row names
 *                              one we know (Providers / Game categories in
 *                              the owner panel).
 *
 * A game we cannot find in either catalogue table still needs `casino` —
 * unknown is not a way around the plan.
 *
 * A row is looked up once per launch: a launch is already an upstream round
 * trip, and a cache here would be one more place for a stale answer.
 * ═════════════════════════════════════════════════════════════════════════
 */

/**
 * The books the frontend launches by uid (`frontend/src/lib/launch.ts` BOOKS
 * and its `.env`), whether or not the catalogue tables carry them. More via
 * `SPORTS_BOOK_GAME_UIDS` (comma-separated) in casino-service's `.env`.
 */
const KNOWN_BOOK_UIDS = [
  '8a704858d5deb4af1ddc722092ac7614', // LuckySports (js-games v2)
  '92b24e4c25107367a80e0fe1a97c24e4', // LuckySports (catalogue row)
  '4ee8e0051a035b463b47c3c473ce317d', // TFGaming esports
  'e130116fdc9bcde2dbb31735b6c365d6', // DPEsportsGaming
];

/** Catalogue `provider` / vendor → the owner panel's Providers flags. */
const PROVIDER_FLAGS = {
  spribe: ['spribe'],
  evolution: ['evolution'],
  pragmatic: ['pragmaticslots'],
  pragmaticslots: ['pragmaticslots'],
  pragmaticplay: ['pragmaticslots'],
  pragmaticlive: ['pragmaticlive'],
  ideal: ['ideal'],
  microgaming: ['microgaming'],
  pgsoft: ['pgsoft'],
  hacksaw: ['hacksawgaming'],
  hacksawgaming: ['hacksawgaming'],
  jili: ['jili', 'jilli'],
  jilli: ['jili', 'jilli'],
  netent: ['netent'],
};

const SPORTS_PROVIDERS = new Set(['sports', 'esports']);

const norm = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Catalogue `type` → the owner panel's Game categories flag, when it maps cleanly. */
function categoryFlag(type) {
  const t = String(type ?? '').toLowerCase();
  if (!t) return null;
  if (t.includes('crash')) return 'crash';
  if (t.includes('live')) return 'livegames';
  if (t.includes('slot')) return 'slotsgames';
  return null;
}

function isSportsBook({ provider, type }) {
  return SPORTS_PROVIDERS.has(norm(provider)) || /sport/i.test(String(type ?? ''));
}

/**
 * The flags a game needs, from what is known about it.
 *
 * @param {object} game  { uid?, provider?, type? } — any of them may be missing
 * @param {Set<string>} bookUids
 */
function flagsFor(game, bookUids) {
  if ((game.uid && bookUids.has(String(game.uid).toLowerCase())) || isSportsBook(game)) return ['sports'];
  const flags = ['casino', ...(PROVIDER_FLAGS[norm(game.provider)] ?? [])];
  const category = categoryFlag(game.type);
  if (category) flags.push(category);
  return flags;
}

/** The catalogue row for a uid: the GIS table first, then js-games. Null when neither has it. */
async function lookup(models, uid) {
  if (!uid) return null;
  const gis = await models.Gisgamesnew?.findOne({ where: { uuid: uid }, attributes: ['provider', 'type'], raw: true });
  if (gis) return { provider: gis.provider, type: gis.type };
  const js = await models.JsGames?.findOne({ where: { game_uid: uid }, attributes: ['vendor', 'game_type'], raw: true });
  if (js) return { provider: js.vendor, type: js.game_type };
  return null;
}

/**
 * Express guard for a launch route.
 *
 * @param {object}   deps   the container (`models`, `config`)
 * @param {Function} pick   req → { uid?, provider?, type? } from the validated body
 */
function requireGameEntitled({ models, config } = {}, pick) {
  const bookUids = new Set(
    [...KNOWN_BOOK_UIDS, ...String(config?.SPORTS_BOOK_GAME_UIDS ?? '').split(',')]
      .map((uid) => uid.trim().toLowerCase())
      .filter(Boolean)
  );

  return async function gameEntitledGuard(req, _res, next) {
    try {
      const given = pick(req) ?? {};
      const row = await lookup(models ?? {}, given.uid);
      const game = { uid: given.uid, provider: row?.provider ?? given.provider, type: row?.type ?? given.type };
      for (const flag of flagsFor(game, bookUids)) await entitlements.assertFlagEntitled(flag);
      /**
       * The site admin's own switch (Casino → Providers, migration 067), after
       * the owner's plan: the plan says what the site MAY offer, the switch
       * what it does. The lobby already hides the provider; this refuses the
       * stale tile, the bookmark and the hand-written POST.
       */
      if (game.provider && (await isProviderDisabled(models, game.provider))) {
        throw E.PROVIDER_DISABLED({ provider: game.provider });
      }
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = { requireGameEntitled, flagsFor, KNOWN_BOOK_UIDS };
