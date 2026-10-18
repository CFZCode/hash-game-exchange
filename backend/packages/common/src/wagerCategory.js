'use strict';

/**
 * The four kinds of bet hash.game prices differently (Referral → Rate & Rules, /bonus info
 * popups): commission game rate, bonus wager contribution and house edge all key on these.
 * Every stake counted in `wager_activity` carries one (migration 132).
 */
const CATEGORIES = Object.freeze(['originals', 'slots', 'live', 'sports']);

/**
 * House edge when the game's RTP is unknown — hash.game: "House Edge: 1 − RTP, capped at 4%";
 * originals are ~1% (99% RTP), slots run at the cap, live tables ~2%, sports ~2%.
 * Fractions, not percents. Admin-editable defaults live in siteconfig (`wager_house_edges`).
 */
const DEFAULT_HOUSE_EDGE = Object.freeze({ originals: '0.01', slots: '0.04', live: '0.02', sports: '0.02' });
const MAX_HOUSE_EDGE = '0.04';

/** Settlement paths whose every bet is one category, whatever the game. */
const SOURCE_CATEGORY = Object.freeze({
  inhouse: 'originals',
  'original-games': 'originals',
  sports: 'sports',
});

/** A catalogue `type` / `game_type` string → category (`Live Casino`, `live`, `slot`, `crash`…). */
function categoryFromType(type) {
  const t = String(type ?? '').toLowerCase();
  if (!t) return null;
  if (t.includes('sport')) return 'sports';
  // The catalogue files dealer tables by game (`blackjack`, `baccarat`, `roulette`…), not as `live`.
  if (/live|dealer|baccarat|blackjack|roulette|poker|table|sic ?bo|dragon/.test(t)) return 'live';
  return 'slots';
}

/** The category a stake counts as: explicit > source rule > catalogue type > slots. */
function resolveCategory({ category, source, type } = {}) {
  if (CATEGORIES.includes(category)) return category;
  return SOURCE_CATEGORY[source] ?? categoryFromType(type) ?? 'slots';
}

/** `1 − RTP` capped, from an RTP in percent (96.5) or fraction (0.965); null when unusable. */
function houseEdgeFromRtp(rtp) {
  const n = Number(rtp);
  if (!Number.isFinite(n) || n <= 0) return null;
  const fraction = n > 1 ? n / 100 : n;
  if (fraction >= 1) return '0';
  return String(Math.min(1 - fraction, Number(MAX_HOUSE_EDGE)).toFixed(6));
}

module.exports = {
  CATEGORIES,
  DEFAULT_HOUSE_EDGE,
  MAX_HOUSE_EDGE,
  SOURCE_CATEGORY,
  categoryFromType,
  resolveCategory,
  houseEdgeFromRtp,
};
