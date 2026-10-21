import { request } from './client';
import { PLATFORM } from './endpoints';
import { exchangeRequest } from './exchange/api';

/**
 * ─── The sports statement, for the wallet's Bet History → Sports ──────────────────────────────
 *
 * Settled exchange markets come from the point ledger, one line per market with the money that
 * actually moved (sports service, modules/statement):
 *
 *   POST /sports/user/account-statement-direct   a DIRECT player — signed up on the site, no owner
 *                                                (`point_ledger_direct`, every currency, `currency`
 *                                                on each row)
 *   POST /sports/user/account-statement-v2       an AGENT-TREE player — came through an agent
 *                                                (`point_ledger`, INR)
 *   POST /sports/user/account-statement-v2/bets  one market's bets + winner (either kind)
 *
 * Both statements cap the window at 31 days (`maxDateRange(31)`).
 *
 * DIRECT OR AGENT is the backend's own rule, never a guess by trying one route: a player with ANY
 * owner (`users.parent_staff_id` set) is an agent-tree player (`isAgentPlayer`, packages/auth
 * agentPlayers.js), and `account-statement-direct` refuses exactly those (403). `/user/auth/me`
 * says it as `agentTree`. A backend from before that flag is read through the capabilities it
 * derives from the same rule — `vault`, `swap` and `tips` are off for an agent-tree player and for
 * nobody else (`promotions` is not used: a B2B site switches it off for everybody).
 */

/** true = came through an agent, false = signed up on the site, null = cannot tell. */
export function isAgentTreePlayer(me) {
  if (!me || typeof me !== 'object') return null;
  if (typeof me.agentTree === 'boolean') return me.agentTree;
  const caps = me.capabilities;
  if (!caps || typeof caps !== 'object') return null;
  return caps.vault === false && caps.swap === false && caps.tips === false;
}

export async function getStatementKind() {
  const me = await request(PLATFORM.user.auth.me, { live: true, fixture: null });
  const agent = isAgentTreePlayer(me);
  return agent === null ? null : agent ? 'agent' : 'direct';
}

/** The widest window either statement takes, in days; a longer Time filter is clamped to it. */
export const STATEMENT_MAX_DAYS = 31;
const DAY = 86_400_000;

/* `YYYY-MM-DD` in the viewer's zone — what the statement compares its rows' dates with. */
const localDay = (ms) => {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** `[from, to]` epoch ms clamped to the statement's cap; `clamped` says it was. */
export function clampStatementWindow(from, to) {
  const end = Number(to) || Date.now();
  const earliest = end - (STATEMENT_MAX_DAYS - 1) * DAY;
  const start = Number(from) || earliest;
  return start < earliest ? { from: earliest, to: end, clamped: true } : { from: start, to: end, clamped: false };
}

const PAGE = 500;
const MAX_PAGES = 5;

/**
 * Every SPORTS statement row in the window (all pages, up to PAGE × MAX_PAGES), oldest first as the
 * statement sends them. `currency` narrows a direct statement on the server.
 * @returns {Promise<object[]>} `{ date, currency?, credit, debit, closing, description, betId,
 *   sportId, eventId, matchId, marketType, gameType, fancyName, eventType? }`
 */
export async function getSportsStatement({ kind, from, to, currency }) {
  const path = kind === 'agent' ? '/account-statement-v2' : '/account-statement-direct';
  const rows = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const body = await exchangeRequest(path, {
      method: 'POST',
      auth: true,
      json: {
        fromDate: localDay(from),
        toDate: localDay(to),
        reportType: 'SPORTS',
        page,
        limit: PAGE,
        ...(kind !== 'agent' && currency ? { currency } : {}),
        // Bet History reads each settlement's P/L, not the cash the statement page shows.
        ...(kind !== 'agent' ? { view: 'pnl' } : {}),
      },
    });
    const data = Array.isArray(body?.data) ? body.data : [];
    rows.push(...data.filter((r) => !r.isOpening));
    if (page >= (Number(body?.totalPages) || 1)) break;
  }
  return rows;
}

/** One statement row's market: its bets (each with `side`, `win`, `deleted`) and the winner. */
export async function getStatementBets({ matchId, eventId, fancyName }) {
  const body = await exchangeRequest('/account-statement-v2/bets', {
    method: 'POST',
    auth: true,
    json: { matchId, eventId, ...(fancyName ? { fancyName } : {}) },
  });
  return {
    header: body?.header ?? null,
    winner: body?.winner ?? null,
    totalWin: Number(body?.totalWin) || 0,
    bets: Array.isArray(body?.bets) ? body.bets : [],
  };
}
