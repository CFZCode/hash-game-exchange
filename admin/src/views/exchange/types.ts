/**
 * Exchange section — `admin/exchange/*` ke response types.
 * Sabka balance `credits` table me hai: owner, staff aur player (migration 099).
 */

/** Ek staff/owner ka wallet (`credits` row). */
export type ExchangeWallet = {
  staffId: number
  userType: 'OWNER' | 'STAFF'
  balance: string
  creditLimit: string
  credit: string
  allPoint: string
}

export type CountAndBalance = { count: number; balance: string }

export type ExchangeTransfer = {
  id: string
  from: { type: string; id: string }
  to: { type: string; id: string }
  amount: string
  direction: string | null
  transferType: string | null
  note: string | null
  createdAt: string
}

/** `GET admin/exchange/dashboard` */
export type ExchangeDashboard = {
  isOwner: boolean
  myWallet: ExchangeWallet
  staff: CountAndBalance
  players: { child: CountAndBalance; direct: CountAndBalance | null }
  ownerTopups: { total: string } | null
  recent: ExchangeTransfer[]
}

/** `GET admin/exchange/owner/wallet` */
export type OwnerWallet = { wallet: ExchangeWallet }

/** `GET admin/exchange/accounts` — ek direct child (zip `users/all-details` ki row). */
export type AccountRow = {
  accountType: 'staff' | 'user'
  accountId: string
  walletId: string | null
  username: string
  role: string
  percentage: number | null

  /** CR — parent ne ab tak net kitna diya */
  credit: string

  /** pts — all_point */
  allPoint: string

  /** Client(P/L) = all_point − credit */
  settlementPoints: string

  /** Available pts — abhi ka balance (inr) */
  available: string
  exposure: string
  betLocked: boolean
  userLocked: boolean
  hasChildren: boolean

  /** Owner ka direct user (koi parent nahi) — owner ka wallet iske len-den me nahi aata */
  isDirectUser: boolean

  /** More modal (zip "Additional Information") */
  phone: string | null
  city: string | null
  createdAt: string | null
  sportsPts: string
  upperPoint: string
  downPoint: string
}

/** `GET admin/exchange/credit-history` — ek row (zip Credit History) */
export type CreditHistoryRow = {
  id: string
  superUser: string | null
  user: string
  transferFrom: string | null
  amount: string
  balance: string | null
  createdAt: string
}

export type AccountsResponse = {
  rows: AccountRow[]
  me: ExchangeWallet & { username: string }
  pagination: { page: number; limit: number; total: number }
}
