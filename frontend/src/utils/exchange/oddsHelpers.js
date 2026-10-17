/* Ported from TENEXCH frontend/src/utils/oddsHelpers.js. Changes: isSectionSuspended also suspends on
 * ball running (status text only, not section.br) — see the note on it. Addaplay's display formatter is
 * addaplay.formatOddAddaplay (integers bare, else 2 dp) — use it for odds cells; formatOdd here is
 * TENEXCH's (as-is). classifyMarket is UI-only — never send it as market_type (spec §3.3). */

export function formatOdd(val) {
  if (val === null || val === undefined || val === 0 || val === '--') return '--';
  const n = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(n)) return '--';
  // Render the feed value EXACTLY as-is (9.5 stays 9.5, not 9.50) — the
  // reference never pads decimals. String(n) drops trailing zeros.
  return String(n);
}

export function formatSize(size) {
  if (!size || size === 0) return '';
  const n = typeof size === 'number' ? size : Number(size);
  if (isNaN(n) || n === 0) return '';
  if (n >= 100000) { const v = n / 100000; return (v % 1 === 0 ? v.toString() : v.toFixed(2)) + 'L'; }
  if (n >= 1000) { const v = n / 1000; return (v % 1 === 0 ? v.toString() : v.toFixed(2)) + 'K'; }
  return String(n);
}

export function formatMax(val) {
  if (!val || val === 0) return '0';
  const n = typeof val === 'number' ? val : Number(val);
  if (isNaN(n) || n === 0) return '0';
  if (n >= 100000) { const v = n / 100000; return (v % 1 === 0 ? v.toString() : v.toFixed(2)) + 'L'; }
  if (n >= 1000) { const v = n / 1000; return (v % 1 === 0 ? v.toString() : v.toFixed(2)) + 'K'; }
  return String(n);
}

// MATCH_ODDS bettable limit depends on match state, never on the raw fields
// alone: pre-match (iplay false) -> umaxbof (the provider's pre-match cap);
// in-play -> maxb. Every sport, racing included — see the long note inside.
// maxb is folded into `max` so the header shows a single Max and the
// stake-validation chain picks the same number. Markets that never quote
// umaxbof (all-data summaries) are returned untouched.
// eslint-disable-next-line no-unused-vars -- `sid` kept in the TENEXCH signature (see note below)
export function applyMatchOddsLimits(market, sid) {
  // Keyed on `gtype`, not on `mname`. The reference applies this to EVERY
  // gtype:"match" market — its Market4 header reads
  //     size: marketDataNew.iplay ? marketDataNew.maxb : marketDataNew.umaxbof
  // with no mention of the market's name — and only the `match1` branch
  // (Bookmaker, BM_*) takes the plain min/max instead. Ours checked
  // `mname === 'MATCH_ODDS'`, so a sibling like HALF_TIME on the same event
  // skipped the rule and printed maxb (25K) while pre-match, where the
  // reference prints umaxbof.
  //
  // The gtype gate matters in the other direction too: the feed ships these
  // fields under match1 as well, and folding umaxbof into `max` there would
  // cap Bookmaker at the pre-match sentinel and kill betting on it.
  if (market?.gtype !== 'match') return market;
  if (market?.umaxbof === undefined) return market;

  /* RACING IS NOT SPECIAL — it takes the same branch as everything else, and
     the special case that used to sit here was built on a measurement error.
     Leaving this note because the wrong version looked perfectly reasonable.

     It read: racing always takes `umaxbof`, justified as "umaxbof is 10000
     pre-race and 1 once the race is off". That second half is simply not true.
     Measured across 16 live racecards (8 horse + 8 greyhound), one of them
     in-play:

         state              iplay   max    maxb   umaxbof
         pre-race (x15)     false   2000      1     10000
         in-play  (x1)      true    2000      1     10000

     All three fields are CONSTANT — 2000 / 1 / 10000 on every race, in both
     states. Nothing in the feed moves at the off except `iplay`. So umaxbof
     never becomes 1, and a rule pinned to umaxbof can never produce the
     "Max: 1" the reference shows on an in-play race (gmid 666812815, off+6m:
     reference 1, ours 10K — the bug this replaced).

     The real origin of the original "Max: 1 everywhere" complaint was that
     racing never called this helper at all, so the racecard printed the raw
     `maxb` (1) in every state. Wiring the call up was the whole fix; the extra
     racing branch then broke the in-play half back again.

     The shared rule below reproduces the reference exactly for racing:
         pre-race  iplay false -> umaxbof 10000  -> "Max: 10K"
         in-play   iplay true  -> maxb    1      -> "Max: 1"
     which is `iplay ? maxb : umaxbof`, the reference's own line, verbatim.

     Consequence worth knowing: `max` drives stake validation as well as the
     label, so an in-play race caps at 1 and is effectively shut for betting.
     That IS the reference's behaviour. The server disagrees — for racing
     sportbetscontroller.js:223 caps on `max` (2000) and never reads maxb or
     umaxbof — so it would still accept up to 2000. Reported, owned separately.

     `sid` stays in the signature: every call site passes it, and it is what a
     future per-sport rule would key on. */

  /* EVERY SPORT — racing included.
     In-play -> maxb (>0), else max. Pre-match -> umaxbof. This is what the
     server enforces (sportbetscontroller.js:223, `maxb > 0 ? maxb : max`), so
     header and panel agree and nothing is advertised that would be refused.

     Worth keeping the reason the maxb branch has to stay: live football gmid
     582288513 ships `max: 0, maxb: 100000, umaxbof: 1`. Reading `max` there
     printed "Max: 0" while usePlaceBetPanel treats `rawMax <= 0` as "no
     ceiling" and would have taken 100000. With maxb it shows 1L and accepts
     100000. */
  const inPlayMax = Number(market.maxb) > 0 ? market.maxb : market.max;
  const effectiveMax = Number(market.iplay ? inPlayMax : market.umaxbof) || 0;
  return { ...market, max: effectiveMax, maxb: 0 };
}

// Book/exposure display — en-IN comma grouping (99800 → "99,800",
// 200000 → "2,00,000"), same style the per-runner P&L uses
export function formatBookValue(val) {
  const n = Number(val);
  if (!Number.isFinite(n)) return '';
  const abs = Math.abs(n);
  const formatted = abs >= 1000 ? abs.toLocaleString('en-IN') : String(Math.round(abs * 100) / 100);
  return n < 0 ? `-${formatted}` : formatted;
}

// Projected book for ONE runner, in the shape the row prints:
// { value, className } — or null for "print nothing".
//
// Market2Block, Market4Block and Market13Block each carry their own identical
// copy of this. They are deliberately left alone (they work, and this is not
// the change to risk them on); new callers import this one and the three can be
// collapsed onto it later.
export function formatPL(val) {
  if (val === undefined || val === null) return null;
  const n = Number(val);
  if (Number.isNaN(n)) return null;
  // Zero is a REAL book value (0.00 after offsetting bets) — the reference
  // prints a plain "0" with NO book-green/book-red class.
  if (n === 0) return { value: '0', className: '' };
  const abs = Math.abs(n);
  const formatted = abs >= 1000 ? abs.toLocaleString('en-IN') : String(Math.round(abs * 100) / 100);
  return { value: n > 0 ? formatted : `-${formatted}`, className: n > 0 ? 'book-green' : 'book-red' };
}

// Stake display for a bet row: the API sends "100.00" (2-decimal string) but
// the player typed 100 — drop decimals that are not real ("100.50" stays
// "100.5"). No comma grouping: the reference prints the raw API number here.
export function formatStake(v) {
  if (v === null || v === undefined || v === '') return '';
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? String(n) : String(v);
}

// Casino table book cell: en-IN comma grouping, decimals only when the book
// really has them (up to 2) — the value every BetTable shows under a runner
// (-1200 → "-1,200", 98 → "98", 22.5 → "22.5", 250000 → "2,50,000"). Same
// grouping as formatBookValue / formatAmount so the statement and the tables
// read alike. It used to Math.round, so a decimal bet's P/L showed rounded.
export function formatBook(val) {
  let n = Math.round((Number(val) || 0) * 100) / 100;
  if (Object.is(n, -0)) n = 0;
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

// Money display: comma-grouped (en-IN) with up to 2 decimals and NO forced
// trailing zeros — 410.00 → "410", 2822.19 → "2,822.19", 1219.70 → "1,219.7".
// Accepts a number or a (possibly comma-formatted) string; a non-numeric value
// like "-"/"" comes back empty so the cell stays blank. Shared by the account
// statement and the result modals so their money columns read the same.
export function formatAmount(v) {
  if (v === null || v === undefined || v === '' || v === '-') return '';
  const n = Number(String(v).replace(/,/g, ''));
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function classifyMarket(market) {
  const gtype = (market.gtype || '').toLowerCase();
  if (gtype === 'match') return 'MATCH_ODDS';
  if (gtype === 'match1') return 'BOOKMAKER';
  if (gtype === 'fancy2') return 'LINE_MARKET';
  if (gtype === 'oddeven') return 'ODD_EVEN';
  if (gtype === 'fancy' || gtype === 'normal' || gtype === 'fancy1' || gtype === 'meter' || gtype === 'khado') return 'FANCY';
  if (gtype === 'cricketcasino') return 'CRICKET_CASINO';

  const mname = (market.mname || '').toLowerCase();
  if (mname === 'match odds' || mname === 'match_odds' || mname === 'winner') return 'MATCH_ODDS';
  if (mname.includes('bookmaker')) return 'BOOKMAKER';
  if (mname === 'tied match' || mname === 'tied_match') return 'MATCH_ODDS';
  return 'FANCY';
}

/* Market-level status. `match1` (Bookmaker family) is skipped on purpose — the feed leaves a stale
   SUSPENDED there while quoting live odds (TENEXCH spec §1.4). Addaplay instead calls a market
   suspended when ANY runner's gstatus !== 'ACTIVE' (sportsTransformer.js:329), which marks every
   football market suspended (football runners say 'OPEN'), so the TENEXCH rule is kept and the
   per-runner check is `isSectionSuspended`. */
export function isMarketSuspended(market) {
  const gtype = (market.gtype || '').toLowerCase();
  // For match1 (Bookmaker), ignore market-level status — only section.gstatus matters
  if (gtype === 'match1') return false;
  const s = (market.gstatus || market.status || '').toUpperCase();
  if (s === 'OPEN' || s === 'ACTIVE') return false;
  return s === 'SUSPENDED' || s === 'BALL RUNNING' || s === 'INACTIVE';
}

/**
 * Calculate per-runner win/loss for MATCH_ODDS / BOOKMAKER markets.
 * Given a current bet (from the open PlaceBetPanel), computes what each runner
 * would win/lose if that runner wins.
 *
 * @param {Object} currentBet - { stake, odds, betType, teamName, marketType }
 * @param {string[]} runnerNames - all runner names in the market
 * @returns {Object} { runnerName: netValue, ... }
 */
export function calculateRunnerPL(currentBet, runnerNames) {
  if (!currentBet || !runnerNames || runnerNames.length < 2) return {};
  const { stake, odds, betType, teamName, marketType } = currentBet;
  const s = Number(stake) || 0;
  const o = Number(odds) || 0;

  // Tolerate spaces/underscores: the payload and the exposure rows carry the
  // feed's mname ('Bookmaker 2'), not our internal label.
  const mt = String(marketType || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const isBook = mt === 'BOOKMAKER' || mt === 'BOOKMAKER2' || mt === 'TIEDMATCH';
  // Bookmaker/tied quotes are small percents (0.75, 1) — any positive odd is
  // valid. Decimal markets still require >= 1.01.
  if (s <= 0 || o <= 0 || (!isBook && o < 1.01)) return {};
  // EXACT mirror of the backend walk (this preview must equal what the
  // exposure API returns after placing). BM-family odds (Bookmaker + Tied
  // Match, gtype match1) are percent for EVERY quote — mult = o/100 UNFLOORED
  // (back 100 @ 1.25 → +1.25), no >=10 cutoff. A >=10 cutoff here showed +25
  // in the cell for a 1.25 tied quote while the backend booked 1.25.
  const mult = isBook ? o / 100 : o - 1;

  const results = {};
  for (const runner of runnerNames) {
    const isThisRunner = (runner || '').trim().toLowerCase() === (teamName || '').trim().toLowerCase();

    if (betType === 'back' || betType === 'yes') {
      results[runner] = isThisRunner ? mult * s : -s;
    } else {
      // lay / no
      results[runner] = isThisRunner ? -(mult * s) : s;
    }

    results[runner] = Number(results[runner].toFixed(2));
  }
  return results;
}

/* BALL RUNNING is read from the row's status text only, as TENEXCH does. `section.br` is NOT
   used: the live feed sends `br: true` on every cricket Normal / fancy1 row all the time, odds open
   or not (77 of 77 rows on 2026-10-17, while TENEXCH showed them open and taking bets), so honouring
   it closed the whole fancy board. The server still refuses a bet on a row whose status is
   BALL RUNNING / SUSPENDED. `ignoreBallRunning` is kept for older callers and changes nothing. */
export function isBallRunning(section) {
  return String(section?.gstatus || section?.status || '').toUpperCase() === 'BALL RUNNING';
}

// eslint-disable-next-line no-unused-vars
export function isSectionSuspended(section, { ignoreBallRunning = false } = {}) {
  const s = (section.gstatus || section.status || '').toUpperCase();
  // Football feeds use gstatus "OPEN" for live rows (cricket uses "ACTIVE")
  if (s === 'ACTIVE' || s === 'OPEN') return false;
  if (s && s !== '') return true;
  // No explicit status — fall back to checking if any valid odds exist
  const odds = section.odds || [];
  return !odds.some(o => (o.otype || '').toUpperCase() === 'BACK' && o.odds > 0)
      && !odds.some(o => (o.otype || '').toUpperCase() === 'LAY' && o.odds > 0);
}
