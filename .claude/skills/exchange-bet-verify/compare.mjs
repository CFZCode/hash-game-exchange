#!/usr/bin/env node
// Diff a slip-probe.tpl.js output (saved with evaluate_script filePath) against tenexch-calc.mjs.
//   node compare.mjs <probe-output-file> [stake=100]
// Prints one PASS/FAIL line per case: slip profit, liability and the projected book of the selected runner.
import fs from 'node:fs';
import { slip, runnerBook } from './tenexch-calc.mjs';

const [file, stakeArg = '100'] = process.argv.slice(2);
let raw = fs.readFileSync(file, 'utf8');
raw = raw.slice(raw.search(/[[{]/), Math.max(raw.lastIndexOf(']'), raw.lastIndexOf('}')) + 1);
let rows = JSON.parse(raw);
rows = Array.isArray(rows) ? rows : rows.out;
const stake = Number(stakeArg);
const money = (s) => (s == null ? null : Number(String(s).replace(/[₹,]/g, '')));
const kindOf = (m) => /^bookmaker/i.test(m) ? 'bm' : /^tied match$/i.test(m) ? 'tied'
  : /^(normal|ball by ball|over by over)$/i.test(m) ? 'session' : /^fancy1$/i.test(m) ? 'fancy1' : /^khado$/i.test(m) ? 'khado'
  : /^meter$/i.test(m) ? 'khado' : /^oddeven$/i.test(m) ? 'oddeven' : /^line market$/i.test(m) ? 'line' : 'mo';
let fails = 0;
for (const r of rows) {
  if (r.error) { console.log(`SKIP  ${r.M} / ${r.R} ${r.S}: ${r.error}`); continue; }
  const kind = kindOf(r.M);
  const odds = Number(r.odds);
  // session rows: the rate is the size printed next to the clicked line (row text "line | rate").
  const nums = (r.row || '').split(' | ').map(Number);
  const iOdds = nums.findIndex((n, i) => i > 0 && n === odds && (r.S === 'lay' || nums.indexOf(odds, i + 1) < 0));
  const size = kind === 'session' ? nums[iOdds + 1] : undefined;
  const exp = slip({ market: r.M, kind, side: r.S, odds, stake, size, horse: false });
  const got = { profit: money(r.profit), liability: money(r.liability) };
  const checks = [['profit', exp.profit, got.profit], ['liability', exp.liability, got.liability]];
  if (['mo', 'bm', 'tied'].includes(kind) && r.card) {
    const sel = r.R;
    const book = runnerBook([{ kind, sel, side: r.S, odds, stake }], [sel, '__other']);
    const m = r.card.match(new RegExp(`${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.? \\| (-?[\\d,.]+) \\|`));
    // The page previews TENEXCH calculateRunnerPL (BM unfloored o/100); the server books normalizeOdds (floored).
    const preview = kind === 'bm' ? (r.S === 'back' ? 1 : -1) * Math.round(stake * odds) / 100 : book[sel];
    checks.push(['projected', preview, m ? money(m[1]) : null]);
    if (kind === 'bm' && preview !== book[sel]) console.log(`NOTE  ${r.M} ${r.S} @${odds}: preview ${preview} vs server book ${book[sel]} (normalizeOdds floor — TENEXCH has the same gap)`);
  }
  const bad = checks.filter(([, e, g]) => Math.abs(e - g) > 0.005 || g == null);
  fails += bad.length ? 1 : 0;
  console.log(`${bad.length ? 'FAIL' : 'PASS'}  ${r.M} / ${r.R} ${r.S} @${odds}${size ? ` rate ${size}` : ''}: ` + checks.map(([k, e, g]) => `${k} exp ${e} page ${g}`).join(', '));
}
process.exit(fails ? 1 : 0);
