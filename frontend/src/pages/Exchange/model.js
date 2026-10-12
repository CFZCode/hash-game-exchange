/* View-model helpers for the exchange screens (lobby, My Bets, Statement). Pure functions only —
 * no React, no fetching — so they are unit-tested beside the data layer's (model.test.js) and
 * `react-refresh/only-export-components` stays happy in the page files.
 *
 * Feed shapes are the data layer's: services/exchange/feed.js `EventRow`, docs/exchange.md. */

/** The three lobby boards, in tab order. `sid` is mssports' sport id (etid), `icon` the BetBy
 *  sport-art key the kit's SportIcon resolves (src/assets/sports/sport-<icon>.svg). */
export const LOBBY_SPORTS = [
  { id: 'cricket', sid: 4, label: 'Cricket', icon: 'cricket' },
  { id: 'soccer', sid: 1, label: 'Football', icon: 'soccer' },
  { id: 'tennis', sid: 2, label: 'Tennis', icon: 'tennis' },
];

/** The In-Play view: live matches of all three boards. Uses BetBy's own live glyph. */
export const INPLAY_TAB = 'inplay';

const SPORT_ICON = { 4: 'cricket', 1: 'soccer', 2: 'tennis', 7: 'horseracing', 8: 'tabletennis' };
/** sid → sport-art key, or undefined when the asset set has none (the caller draws nothing). */
export const sportIconOf = (sid) => SPORT_ICON[Number(sid)];

/** `/sports/match/:sid/:gmid`, with the price the visitor clicked as query so the match page can
 *  preselect it: `?market=<mid>&runner=<section sid>&side=back|lay`. */
export function matchPath(sid, gmid, pick) {
  const base = `/sports/match/${sid}/${gmid}`;
  if (!pick) return base;
  const q = new URLSearchParams();
  if (pick.market != null) q.set('market', String(pick.market));
  if (pick.runner != null) q.set('runner', String(pick.runner));
  if (pick.side) q.set('side', pick.side);
  const s = q.toString();
  return s ? `${base}?${s}` : base;
}

/* "10/9/2026 10:30:00 AM" — the provider's M/D/YYYY wall clock. Read as the wall clock it is
   (not through `Date.parse`, whose handling of that format is engine-defined), so the lobby
   shows the time the feed printed. */
const STIME = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i;
export function parseFeedTime(value) {
  if (value == null || value === '') return null;
  const m = STIME.exec(String(value).trim());
  if (!m) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  let hour = Number(m[4]) % 12;
  if (!m[7]) hour = Number(m[4]);
  else if (m[7].toUpperCase() === 'PM') hour += 12;
  return new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]), hour, Number(m[5]), Number(m[6] || 0));
}

/* "A v B", "A vs B", "A - B" (tennis doubles use " / " inside a side, so it is not a separator). */
export function splitTeams(ename) {
  const name = String(ename ?? '').trim();
  const parts = name.split(/\s+(?:v|vs\.?|-)\s+/i);
  if (parts.length >= 2) return [parts[0].trim(), parts.slice(1).join(' - ').trim()];
  return [name, ''];
}

const isDraw = (nat) => /^(the\s+)?draw$/i.test(String(nat ?? '').trim());
const live = (status) => {
  const s = String(status ?? '').toUpperCase();
  return s === '' || s === 'ACTIVE' || s === 'OPEN';
};

/* Best back / lay of a runner. `oname` arrives as `back1` or `BACK1` depending on the board, and a
   0 price means "no price" (OddsCell renders it as "—"). */
function bestOf(section) {
  const odds = Array.isArray(section?.odds) ? section.odds : [];
  const find = (side) => {
    const o =
      odds.find((x) => String(x.oname).toLowerCase() === `${side}1`) ??
      odds.find((x) => String(x.otype).toLowerCase() === side);
    return o ? { price: Number(o.odds) || 0, size: Number(o.size) || 0 } : { price: 0, size: 0 };
  };
  return { back: find('back'), lay: find('lay') };
}

/**
 * EventRow (all-data board) → the kit's MatchRow `match`, plus what the lobby needs to route a
 * price click (`sid`, `marketId`, `runners`).
 *
 * Runners: section[0] is home, section[1] away, "The Draw" (wherever it sits) is X; a board with
 * no draw runner (tennis, limited-overs cricket) gets `draw: null`, which MatchRow locks as "—".
 * A suspended runner gets no prices; a suspended EVENT locks the whole row (MatchRow `status`).
 */
export function toLobbyMatch(ev, sid) {
  const sections = Array.isArray(ev?.section) ? ev.section : [];
  const drawSec = sections.find((s) => isDraw(s.nat)) ?? null;
  const teamSecs = sections.filter((s) => s !== drawSec);
  const [home, away] = splitTeams(ev?.ename);
  const sideOf = (sec) => (sec && live(sec.gstatus) ? bestOf(sec) : undefined);
  const sportSid = Number(ev?.etid ?? sid);
  return {
    id: String(ev.gmid),
    gmid: ev.gmid,
    sid: sportSid,
    sport: sportIconOf(sportSid),
    competition: ev.cname || 'Other',
    home: home || String(teamSecs[0]?.nat ?? '').trim(),
    away: away || String(teamSecs[1]?.nat ?? '').trim(),
    startTime: parseFeedTime(ev.stime),
    inPlay: Boolean(ev.iplay),
    hasTv: Boolean(ev.tv),
    hasBookmaker: Boolean(ev.bm),
    hasFancy: Boolean(ev.f || ev.f1),
    status: ev.status,
    marketId: ev.mid ?? null,
    runners: { home: teamSecs[0]?.sid ?? null, away: teamSecs[1]?.sid ?? null, draw: drawSec?.sid ?? null },
    odds: {
      home: sideOf(teamSecs[0]),
      away: sideOf(teamSecs[1]),
      draw: drawSec ? sideOf(drawSec) : null,
    },
  };
}

/** Board → { live, upcoming } lobby rows; upcoming sorted by start time (unknown times last). */
export function splitBoard(events, sid) {
  const rows = (Array.isArray(events) ? events : []).filter((e) => e && e.gmid != null).map((e) => toLobbyMatch(e, sid));
  const t = (m) => (m.startTime ? m.startTime.getTime() : Number.MAX_SAFE_INTEGER);
  return {
    live: rows.filter((m) => m.inPlay),
    upcoming: rows.filter((m) => !m.inPlay).sort((a, b) => t(a) - t(b)),
  };
}

/** A stake value's button label, the server's own convention: 1000 → "1k", 1500 → "1.5k",
 *  100000 → "1L", 500 → "500". */
export function stakeLabel(value) {
  const n = Number(value) || 0;
  const trim = (v) => String(Number(v.toFixed(2)));
  if (n >= 100000) return `${trim(n / 100000)}L`;
  if (n >= 1000) return `${trim(n / 1000)}k`;
  return String(n);
}

/* ─── Statement date range ─── */

const pad = (n) => String(n).padStart(2, '0');
/** Local calendar date → "YYYY-MM-DD" (what `<input type="date">` and the statement API take). */
export const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** The default statement window: the last 7 days including today. */
export function defaultStatementRange(now = new Date()) {
  const from = new Date(now);
  from.setDate(now.getDate() - 6);
  return { from: isoDay(from), to: isoDay(now) };
}

export const MAX_STATEMENT_DAYS = 31;

/** null when the range is usable, else the message to show. The server enforces the same 31
 *  days (maxDateRange(31)); this only saves a round trip that would 400. */
export function statementRangeError(from, to) {
  if (!from || !to) return 'Choose a start and an end date.';
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 'Choose a start and an end date.';
  if (a > b) return 'The start date must be before the end date.';
  const days = Math.round((b - a) / 86400000) + 1;
  if (days > MAX_STATEMENT_DAYS) return `The range can be at most ${MAX_STATEMENT_DAYS} days.`;
  return null;
}
