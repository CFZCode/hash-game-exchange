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

const SPORT_NAMES = { 1: 'Football', 2: 'Tennis', 4: 'Cricket', 10: 'Horse Racing', 65: 'Greyhound Racing' };

/* A real value, not empty and not the stored "NULL". */
const present = (v) => {
  const s = v == null ? '' : String(v).trim();
  return s && s.toLowerCase() !== 'null' ? s : '';
};

/* MATCH_ODDS → "Match Odds". */
const marketLabel = (type) =>
  present(type)
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');

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
  if (status === 'won') return back ? stake * Math.max(0, (Number(bet.odds) || 0) - 1) : stake;
  if (status === 'lost') return back ? -stake : -betLiability(bet);
  if (status === 'void') return 0;
  return null;
}

export function toSportsBet(bet) {
  const raw = bet.raw ?? {};
  const sid = Number(bet.sportId ?? raw.sport_id) || null;
  const fancy = present(bet.fancyName);
  const status = betStatus(bet);
  return {
    id: bet.id,
    at: bet.createdAt,
    time: Date.parse(bet.createdAt ?? '') || 0,
    sportName: SPORT_NAMES[sid] || present(raw.sport_name) || 'Sports',
    sportIcon: sid ? sportIconOf(sid, SPORT_NAMES[sid]) : null,
    breadcrumb: [present(raw.league_name ?? raw.leagueName), present(bet.matchTitle), fancy || marketLabel(bet.marketType)]
      .filter(Boolean)
      .join(' -> '),
    selection: present(bet.selection) || present(bet.matchTitle),
    side: bet.side || 'back',
    back: isBackSide(bet.side),
    odds: Number(bet.odds) || 0,
    stake: Number(bet.stake) || 0,
    liability: betLiability(bet),
    status,
    pnl: betPnl(bet, status),
  };
}
