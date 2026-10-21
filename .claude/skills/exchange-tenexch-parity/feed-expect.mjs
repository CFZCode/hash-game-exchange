#!/usr/bin/env node
// What TENEXCH would print for one match, straight off the live feed — compare with dom-read.js.
// Usage: node .claude/skills/exchange-tenexch-parity/feed-expect.mjs <sid> <gmid> [apiBase]
// Read-only: one POST to get-match-private-data (a public read). No bets, no writes.
import { applyMatchOddsLimits } from '../../../frontend/src/utils/exchange/oddsHelpers.js';
import { compactAmount } from '../../../frontend/src/components/exchange/utils.js';

const [sid, gmid, base = 'https://api.parker567.com'] = process.argv.slice(2);
if (!sid || !gmid) {
  console.error('usage: feed-expect.mjs <sid> <gmid> [apiBase]');
  process.exit(2);
}
const res = await fetch(`${base}/api/v1/sports/user/cricket/get-match-private-data`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ gmid: Number(gmid), sid: Number(sid) }),
});
const body = await res.json();
const markets = body?.data?.data;
if (!Array.isArray(markets)) {
  console.error('no markets:', JSON.stringify(body).slice(0, 300));
  process.exit(1);
}
const shown = String(sid) === '10' ? markets.filter((m) => [12, 15].includes(Number(m.dtype))) : markets;
for (const raw of shown) {
  const m = applyMatchOddsLimits(raw, sid);
  const head = [Number(m.min) > 0 && `Min: ${compactAmount(m.min)}`, Number(m.max) > 0 && `Max: ${compactAmount(m.max)}`]
    .filter(Boolean)
    .join(' · ');
  const racecard = Number(m.dtype) === 12;
  console.log(`\n${m.mname}  [gtype ${m.gtype}, dtype ${m.dtype}, status ${m.status}${racecard ? ' — racecard: status ignored' : ''}]  header: ${head || '(none)'}`);
  for (const s of (m.section || []).slice(0, 4)) {
    const best = (side) => (s.odds || []).filter((o) => o.otype === side).sort((a, b) => a.tno - b.tno)[0];
    const cell = (o) => (o && o.odds > 0 ? `${o.odds}/${o.size ? compactAmount(o.size) : ''}` : '—');
    const lim = s.min || s.max ? `  Min: ${compactAmount(s.min)} · Max: ${compactAmount(s.max)}` : '';
    console.log(`  ${s.nat}  [${s.gstatus || '""'}]  back ${cell(best('back'))}  lay ${cell(best('lay'))}${lim}`);
  }
}
