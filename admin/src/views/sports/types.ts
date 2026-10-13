/** Row shapes for the sports area. `GAME_TYPE` is MO (match odds), BM (bookmaker), FAN (fancy). */

export const GAME_TYPES = ['MO', 'BM', 'FAN'] as const
export type GameType = (typeof GAME_TYPES)[number]

export const GAME_TYPE_LABELS: Record<string, string> = { MO: 'Match odds', BM: 'Bookmaker', FAN: 'Fancy' }

/** The platform's own three: a bet is open, settled manually, or closed. */
export const BET_STATUSES = ['open', 'manual', 'closed'] as const

export type SportsBet = Record<string, unknown> & {
  id: number
  userId?: number | string
  username?: string
  matchId?: string
  matchTitle?: string
  marketType?: string
  gameType?: string
  selectionName?: string
  side?: string
  odds?: string | number
  stake?: string
  liability?: string
  payout?: string
  status?: string
  resultStatus?: string
  createdAt?: string
  placedAt?: string
}

export type Exposure = Record<string, unknown> & {
  userId?: number | string
  username?: string
  exposure?: string
  liability?: string
  openBets?: number
}

/**
 * A market with open bets, from the sports service's manual-settle routes
 * (`admin/sports/internalsettle/momatches | fanmatches`) — camelCase there.
 */
export type SettlementMatch = Record<string, unknown> & {
  match_id?: string
  matchId?: string
  eventid?: string
  eventId?: string
  match_title?: string
  matchTitle?: string
  market_type?: string
  marketType?: string
  game_type?: string
  gameType?: string
  openBets?: number
  totalBets?: number
  selectionName?: string
  runners?: unknown[] | null
}

/** `admin/sports/internalsettle/settled-markets` — one row per match + market settled in the last 24 h. */
export type SettledMarket = SettlementMatch & {
  settledAt?: string
  settled_at?: string
  totalEntries?: number
  totalUsers?: number
  totalNetAmount?: number
}
