/* Bet History → Type = Sports: one exchange bet (mssports `GET /cricket/sports-bets/user`, already
 * through `normaliseBet`) as the row the pane draws. Pure, so the P&L and status rules are tested
 * (sportsBets.test.js); every amount here is INR, the exchange's only currency — the component
 * prints them in the selected coin.
 *
 * The presentation follows TENEXCH's account statement (reference only): the remark is the
 * arrow-joined "League -> Match -> Market" (`buildBreadcrumb` there, which drops a segment the feed
 * does not carry and the literal "NULL" some bets store in `fancy_name`), and the date is
 * `dd/mm/yyyy hh:mm:ss (UTC±hh:mm)` in the viewer's zone.
 */
import { sportIconOf } from '../../Exchange/model';
import { getSportsBets } from '../../../services/exchange/history';
import { clampStatementWindow, getSportsStatement, getStatementKind } from '../../../services/sportsStatement';
import { resolveRange } from '../../../services/transaction';
import { isFiatCode } from '../../../utils/currency';

const SPORT_NAMES = { 1: 'Football', 2: 'Tennis', 4: 'Cricket', 10: 'Horse Racing', 65: 'Greyhound Racing' };

/* A real value, not empty and not the stored "NULL". */
const present = (v) => {
  const s = v == null ? '' : String(v).trim();
  return s && s.toLowerCase() !== 'null' ? s : '';
};

/* MATCH_ODDS → "Match Odds", OVER_UNDER_15 → "Over/Under 1.5". */
export const marketLabel = (type) => {
  const ou = /^OVER_UNDER_(\d)(\d)$/i.exec(present(type));
  if (ou) return `Over/Under ${ou[1]}.${ou[2]}`;
  return present(type)
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
};

export const isBackSide = (side) => side === 'back' || side === 'yes';

export function formatBetDate(value) {
  const d = new Date(value);
  if (!value || Number.isNaN(d.getTime())) return '-';
  const p = (n) => String(n).padStart(2, '0');
  const offset = -d.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(
    d.getSeconds(),
  )} (UTC${sign}${p(Math.floor(Math.abs(offset) / 60))}:${p(Math.abs(offset) % 60)})`;
}

/* open | won | lost | void — `result_status` decides once settled; a bet still `open` (or
   `pending`) has no result. A cancelled bet reads as void: it moved no money. */
export function betStatus(bet) {
  const result = String(bet.resultStatus ?? '').toLowerCase();
  if (result === 'won' || result === 'win') return 'won';
  if (result === 'lost' || result === 'lose' || result === 'loss') return 'lost';
  if (result === 'void' || /delete|cancel|void/.test(String(bet.status ?? ''))) return 'void';
  return 'open';
}

/* What the bet risks while open: a back stakes its stake, a lay its liability. */
export function betLiability(bet) {
  const stake = Number(bet.stake) || 0;
  if (isBackSide(bet.side)) return stake;
  const liability = Number(bet.liability);
  return Number.isFinite(liability) && liability > 0 ? liability : stake * Math.max(0, (Number(bet.odds) || 0) - 1);
}

/* INR P&L: won = back stake×(odds−1), lay stake; lost = back −stake, lay −liability; void 0;
   open null (no result yet). */
export function betPnl(bet, status = betStatus(bet)) {
  const stake = Number(bet.stake) || 0;
  const back = isBackSide(bet.side);
  // A fancy YES pays on its rate (55 @ 100 → stake × 100/100), not on the run line in `odds`.
  const rate = bet.side === 'yes' ? Number(bet.size) || 0 : 0;
  if (status === 'won') return back ? (rate > 0 ? (stake * rate) / 100 : stake * Math.max(0, (Number(bet.odds) || 0) - 1)) : stake;
  if (status === 'lost') return back ? -stake : -betLiability(bet);
  if (status === 'void') return 0;
  return null;
}

/* The key one market goes by in both feeds: the statement row's (matchId, eventId, fancyName) and
   a bet's (match_id, eventid, fancy_name — only for a fancy market). */
export const marketKey = (matchId, eventId, fancy) => `${matchId ?? ''}:${eventId ?? ''}:${present(fancy)}`;

const fancyOf = (bet) => (String(bet.gameType ?? '').toUpperCase() === 'FAN' ? present(bet.fancyName) : '');
const betMarketKey = (bet) => marketKey(bet.raw?.match_id ?? bet.matchId, bet.raw?.eventid ?? bet.eventId, fancyOf(bet));

/** A coin code as the feeds send it (`INR`, `usdt`) → bare upper-case (`INR`, `USDT`). */
export const bareCode = (code) => String(code ?? '').trim().toUpperCase().replace(/FIAT$/, '') || 'INR';

/** One bet from the bets feed. `kind` is `open`, or `settled` when the statement is unavailable
 *  and the computed figures stand in for the ledger's. */
export function toSportsBet(bet) {
  const raw = bet.raw ?? {};
  const sid = Number(bet.sportId ?? raw.sport_id) || null;
  const fancy = fancyOf(bet);
  const status = betStatus(bet);
  const side = isBackSide(bet.side) ? 'back' : 'lay';
  return {
    key: `bet:${bet.id}`,
    id: bet.id,
    kind: status === 'open' ? 'open' : 'settled',
    at: bet.createdAt,
    time: Date.parse(bet.createdAt ?? '') || 0,
    currency: bareCode(raw.original_currency),
    sportName: SPORT_NAMES[sid] || present(raw.sport_name) || 'Sports',
    sportIcon: sid ? sportIconOf(sid, SPORT_NAMES[sid]) : null,
    breadcrumb: [present(raw.league_name ?? raw.leagueName), present(bet.matchTitle), fancy || marketLabel(bet.marketType)]
      .filter(Boolean)
      .join(' -> '),
    selection: present(bet.selection) || present(bet.matchTitle),
    side: bet.side || side,
    sides: [side],
    back: side === 'back',
    odds: Number(bet.odds) || 0,
    stake: Number(bet.stake) || 0,
    liability: betLiability(bet),
    status,
    pnl: betPnl(bet, status),
    market: marketKey(raw.match_id ?? bet.matchId, raw.eventid ?? bet.eventId, fancy),
    drill: raw.match_id && raw.eventid ? { matchId: raw.match_id, eventId: raw.eventid, fancyName: fancy || null } : null,
  };
}

/* won / lost / void off the money that moved: the ledger's VOID line, or nothing moved. */
const statementStatus = (st, pnl) => {
  if (String(st.eventType ?? '').toUpperCase() === 'VOID' || /\bvoid\b/i.test(String(st.description ?? ''))) return 'void';
  if (pnl > 0) return 'won';
  if (pnl < 0) return 'lost';
  return 'void';
};

const amount = (v) => {
  if (v == null || v === '' || v === '-') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * One statement line (a settled market) as a row. P&L is the LEDGER's — credit minus debit, the
 * money actually moved — never recomputed from odds. The bets feed's bets on the same market
 * (`bets`) only fill in what the ledger does not carry: league, selection, side(s), stake.
 */
export function statementRow(st, bets = []) {
  const live = bets.filter((b) => betStatus(b) !== 'void' || bets.every((x) => betStatus(x) === 'void'));
  const first = bets[0];
  const raw = first?.raw ?? {};
  const sid = Number(st.sportId ?? raw.sport_id) || null;
  const pnl = amount(st.credit) - amount(st.debit);
  const sides = [...new Set(bets.map((b) => (isBackSide(b.side) ? 'back' : 'lay')))];
  const selections = [...new Set(bets.map((b) => present(b.selection)).filter(Boolean))];
  const fancy = present(st.fancyName);
  const status = statementStatus(st, pnl);
  return {
    key: `st:${marketKey(st.matchId, st.eventId, fancy)}:${bareCode(st.currency)}:${st.betId ?? st.date}`,
    id: st.betId ?? null,
    kind: 'settled',
    at: st.date,
    time: Date.parse(st.date ?? '') || 0,
    currency: bareCode(st.currency),
    sportName: SPORT_NAMES[sid] || 'Sports',
    sportIcon: sid ? sportIconOf(sid, SPORT_NAMES[sid]) : null,
    breadcrumb:
      [present(raw.league_name), present(first?.matchTitle), fancy || marketLabel(st.marketType ?? first?.marketType)]
        .filter(Boolean)
        .join(' -> ') || present(String(st.description ?? '').trim()),
    selection: selections.join(', ') || present(String(st.description ?? '').split('/')[0]) || '—',
    side: sides.length === 1 ? sides[0] : sides.length ? 'mixed' : null,
    sides,
    back: sides[0] !== 'lay',
    odds: live.length === 1 ? Number(live[0].odds) || 0 : null,
    stake: live.reduce((sum, b) => sum + (Number(b.stake) || 0), 0),
    liability: live.reduce((sum, b) => sum + betLiability(b), 0),
    status,
    pnl,
    market: marketKey(st.matchId, st.eventId, fancy),
    drill: st.matchId && st.eventId ? { matchId: st.matchId, eventId: st.eventId, fancyName: fancy || null } : null,
  };
}

/**
 * The rows the view lists: the statement's settled markets plus the feed's OPEN bets (the ledger
 * only knows markets that settled). With no statement (`statement === null`: the route failed)
 * the feed's settled bets stand in, with their computed figures.
 */
export function buildRows({ statement, bets }) {
  const open = bets.filter((b) => betStatus(b) === 'open').map(toSportsBet);
  if (!Array.isArray(statement)) return [...open, ...bets.filter((b) => betStatus(b) !== 'open').map(toSportsBet)];
  const byMarket = new Map();
  for (const b of bets) {
    const k = betMarketKey(b);
    if (!byMarket.has(k)) byMarket.set(k, []);
    byMarket.get(k).push(b);
  }
  const settled = statement.map((st) => statementRow(st, byMarket.get(marketKey(st.matchId, st.eventId, st.fancyName)) ?? []));
  return [...open, ...settled];
}

/** status: all|open|won|lost|void · side: all|back|lay · currency: bare code or '' · window ms. */
export function filterRows(rows, { status = 'all', side = 'all', currency = '', from, to } = {}) {
  const coin = currency ? bareCode(currency) : '';
  return rows
    .filter(
      (r) =>
        (status === 'all' || r.status === status) &&
        (side === 'all' || r.sides.includes(side)) &&
        (!coin || r.currency === coin) &&
        (!from || r.time >= from) &&
        (!to || r.time <= to),
    )
    .sort((a, b) => b.time - a.time);
}

export const STATUS_OPTIONS = [
  { label: 'All statuses', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'Won', value: 'won' },
  { label: 'Lost', value: 'lost' },
  { label: 'Void', value: 'void' },
];

export const SIDE_OPTIONS = [
  { label: 'Back & Lay', value: 'all' },
  { label: 'Back', value: 'back' },
  { label: 'Lay', value: 'lay' },
];

const FEED_LIMIT = 100;

/** Every sports row for a Time filter (Type = Sports, and merged into Type = All). */
export async function loadSportsHistory(time) {
  const [begin, end] = resolveRange(time);
  const window = clampStatementWindow(begin, end);
  const [kind, feed] = await Promise.all([getStatementKind().catch(() => null), getSportsBets({ page: 1, limit: FEED_LIMIT, status: 'all' })]);
  // A statement that cannot be read is `null`: the feed's settled bets stand in (buildRows).
  const statement = await getSportsStatement({ kind: kind ?? 'direct', from: window.from, to: window.to }).catch(() => null);
  return { window, kind, statementOk: Array.isArray(statement), rows: buildRows({ statement, bets: feed.rows }) };
}

/** A sports row as a casino-table row (Bet History → All). Payout is the casino rows' own rule,
 *  (stake + profit) / stake x 1e4, so a loss and a still-open bet read 0x. */
export const toCasinoRow = (r) => ({
  distributeId: r.key,
  type: 'Sports',
  time: r.time,
  payout: r.stake > 0 && r.pnl != null ? Math.max(0, ((r.stake + r.pnl) / r.stake) * 1e4) : 0,
  profit: r.pnl ?? 0,
  currencyName: isFiatCode(r.currency) ? `${r.currency}FIAT` : r.currency,
});
