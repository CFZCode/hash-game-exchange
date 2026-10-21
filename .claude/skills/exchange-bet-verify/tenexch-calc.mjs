#!/usr/bin/env node
// TENEXCH formulas, written INDEPENDENTLY of our frontend code, from the reference server
// (/Users/apple/Developer/cfz/tenexch-new/server/sportsbet/sportbetscontroller.js STEP 5) and
// frontend calcPL. Our numbers (page + API) must equal these.
//
//   node tenexch-calc.mjs '<json bets>'      → book / exposure / per-bet slip for those bets
//   node tenexch-calc.mjs --test             → self-check
//
// A bet: {market, kind, runners?, sel, side, odds, stake, size?}
//   kind: 'mo' (decimal; MATCH_ODDS, Over/Under, racecards, cricketcasino),
//         'bm' (percent; Bookmaker/Bookmaker 2/match1 — server books normalizeOdds, FLOORED),
//         'tied' (Tied Match: stake × odds/100),
//         'session' (Normal / Ball By Ball / Over By Over / khado: line = odds, rate = size),
//         'oddeven' / 'fancy1' (decimal, two-bucket min), 'line' (fancy2 "... Overs Line": evens).

const r2 = (n) => Math.round(n * 100) / 100;
// sportbetscontroller.js normalizeOdds — BM rate → decimal, floored to 2 dp.
export const normalizeOdds = (o) => (o > 100 ? Math.floor((o / 100 + 1) * 100) / 100 : o < 100 ? Math.floor((1 + o / 100) * 100) / 100 : 2);
const isBack = (s) => s === 'back' || s === 'yes';

/** Slip figures TENEXCH prints (calcPL): back profit s(o−1) [BM s·o/100]; lay profit = s, liability s(o−1);
 *  session: yes liability s, no liability s·rate/100, Normal/BBB/OBO profit printed 0; line: evens. */
export function slip(b) {
  const s = b.stake;
  if (b.kind === 'session') {
    const atRate = r2((s * b.size) / 100);
    const zero = /normal|ball by ball|over by over/i.test(b.market);
    return { profit: zero ? 0 : isBack(b.side) ? atRate : s, liability: isBack(b.side) ? s : atRate };
  }
  if (b.kind === 'line') return { profit: s, liability: s };
  // TENEXCH FancyBlock passes marketType 'FANCY' for fancy1 / khado / meter rows: calculateSingleBetPLValue
  // prints stake × odds / 100 and loss = stake on BOTH sides (its server books fancy1 at stake × (odds − 1)).
  if (b.kind === 'fancy1' || b.kind === 'khado') return { profit: r2((s * b.odds) / 100), liability: s };
  const win = b.kind === 'bm' || b.kind === 'tied' ? r2((s * b.odds) / 100) : r2(s * (b.odds - 1));
  const zero = b.kind === 'oddeven' || b.horse;
  return isBack(b.side) ? { profit: zero ? 0 : win, liability: s } : { profit: zero ? 0 : s, liability: win };
}

/** Per-runner book of one runner-market (calculateRunnerExposure). */
export function runnerBook(bets, runners) {
  const book = Object.fromEntries(runners.map((n) => [n, 0]));
  for (const b of bets) {
    const o = b.kind === 'bm' ? normalizeOdds(b.odds) : b.kind === 'tied' ? 1 + b.odds / 100 : b.odds;
    const amt = r2(b.stake * (o - 1));
    for (const n of runners) book[n] = r2(book[n] + (n === b.sel ? (isBack(b.side) ? amt : -amt) : isBack(b.side) ? -b.stake : b.stake));
  }
  return book;
}

/** Session ladder worst case (yes wins at runs >= line, no wins below). */
export function sessionWorst(bets) {
  const legs = bets.map((b) => ({ line: b.odds, yes: isBack(b.side), win: isBack(b.side) ? (b.stake * b.size) / 100 : b.stake, lose: isBack(b.side) ? b.stake : (b.stake * b.size) / 100 }));
  const pnl = (r) => legs.reduce((t, l) => t + ((l.yes ? r >= l.line : r < l.line) ? l.win : -l.lose), 0);
  const pts = [Math.min(...legs.map((l) => l.line)) - 1, ...legs.map((l) => l.line)];
  return r2(Math.min(...pts.map(pnl)));
}

/** oddeven / fancy1: two buckets, exposure row = min(layExp, backExp). */
export function twoBucket(bets) {
  let lay = 0, back = 0;
  for (const b of bets) {
    const risk = (b.stake * (b.odds - 1) * 100) / 100;
    if (b.kind === 'oddeven') { if (isBack(b.side)) { lay -= b.stake; back += risk; } else { lay += risk; back -= b.stake; } }
    else if (isBack(b.side)) { lay -= b.stake; back += risk; } else { lay += b.stake; back -= risk; }
  }
  return r2(Math.min(lay, back));
}

/** Everything for a list of bets: per-market book/worst and the total exposure (sum of each market's worst loss). */
export function evaluate(bets) {
  const groups = {};
  for (const b of bets) (groups[`${b.market}|${['mo', 'bm', 'tied'].includes(b.kind) ? '' : b.sel}`] ||= []).push(b);
  const markets = {};
  let exposure = 0;
  for (const [key, g] of Object.entries(groups)) {
    const k = g[0].kind;
    let worst, book;
    if (['mo', 'bm', 'tied'].includes(k)) { book = runnerBook(g, g[0].runners); worst = Math.min(0, ...Object.values(book)); }
    else if (k === 'session') worst = Math.min(0, sessionWorst(g));
    else if (k === 'line') worst = -g.reduce((t, b) => t + b.stake, 0); // single leg; multi-leg: ladder (see TENEXCH linePnl)
    else worst = Math.min(0, twoBucket(g));
    markets[key] = { book, worst: r2(worst) };
    exposure = r2(exposure - worst);
  }
  return { slips: bets.map((b) => ({ market: b.market, sel: b.sel, side: b.side, ...slip(b) })), markets, exposure };
}

/** TENEXCH formatBookValue: en-IN, no +, no .00 (-11 · 20 · 4,500). */
export const formatBook = (n) => Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const main = import.meta.url === `file://${process.argv[1]}`;
if (main && process.argv[2] === '--test') {
  const assert = (await import('node:assert/strict')).default;
  const R = ['A', 'B'];
  // MO back 100 @ 1.33 then lay 100 @ 1.34 on the same runner → +33-34 / -100+100
  const mo = [{ market: 'MATCH_ODDS', kind: 'mo', runners: R, sel: 'A', side: 'back', odds: 1.33, stake: 100 },
              { market: 'MATCH_ODDS', kind: 'mo', runners: R, sel: 'A', side: 'lay', odds: 1.34, stake: 100 }];
  assert.deepEqual(runnerBook(mo.slice(0, 1), R), { A: 33, B: -100 });
  assert.deepEqual(runnerBook(mo, R), { A: -1, B: 0 });
  assert.equal(evaluate(mo).exposure, 1);
  assert.deepEqual(slip(mo[1]), { profit: 100, liability: 34 });
  // BM 57.5 → floored 1.57: book +57 (slip prints 57.5)
  const bm = { market: 'Bookmaker', kind: 'bm', runners: R, sel: 'A', side: 'back', odds: 57.5, stake: 100 };
  assert.deepEqual(runnerBook([bm], R), { A: 57, B: -100 });
  assert.equal(slip(bm).profit, 57.5);
  // Normal no 44 rate 100 + yes 46 rate 100 → worst -0 in the middle? no wins <44, yes wins >=46: 44,45 lose both = -200
  const ses = [{ market: 'Normal', kind: 'session', sel: 'x', side: 'no', odds: 44, size: 100, stake: 100 },
               { market: 'Normal', kind: 'session', sel: 'x', side: 'yes', odds: 46, size: 100, stake: 100 }];
  assert.equal(sessionWorst(ses), -200);
  assert.deepEqual(slip(ses[0]), { profit: 0, liability: 100 });
  assert.deepEqual(slip({ kind: 'fancy1', side: 'lay', odds: 1.6, stake: 100 }), { profit: 1.6, liability: 100 });
  assert.equal(twoBucket([{ kind: 'oddeven', side: 'back', odds: 1.96, stake: 100 }]), -100);
  assert.equal(twoBucket([{ kind: 'oddeven', side: 'lay', odds: 1.96, stake: 100 }]), -100);
  assert.equal(formatBook(-11), '-11'); assert.equal(formatBook(4500), '4,500');
  console.log('tenexch-calc self-test ok');
} else if (main && process.argv[2]) {
  console.log(JSON.stringify(evaluate(JSON.parse(process.argv[2])), null, 2));
}
