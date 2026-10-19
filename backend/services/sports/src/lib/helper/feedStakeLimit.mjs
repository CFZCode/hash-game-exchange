// helper/feedStakeLimit.mjs — the feed's per-bet stake cap when the admin set none (2026-10-19).
// The feed's own `max` comes first; maxb / umaxbof only fill in when max is missing (football
// ships max 0, maxb 100000). A value of 1 or less is the provider's "no per-bet cap" flag, never
// a cap of 1 — Match Odds ships max 2000, maxb 1, umaxbof 10000 and must take a 2000 stake.
// Mirror: frontend/src/utils/exchange/oddsHelpers.js feedMaxStake().
var feedMaxStake = (market) => [market?.max, market?.maxb, market?.umaxbof].map(Number).find((v) => v > 1) || 0;
export { feedMaxStake };
