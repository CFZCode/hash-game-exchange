export type PlayerRow = {
  id: string
  name: string
  avatar: string | null
  level: number
  status: string

  /** Lifetime bets (stake rows on the wallet ledger), every product. */
  gamesPlayed: number
  referralCode: string
  channel: 'direct' | 'agent'
  agentId: number | null
  balance: string
  totalDeposited: string
  totalWithdrawn: string
  wager: string

  /** House-only: null for agent-tree accounts. */
  vip: { level: number; card: string; nextLevel: number; wagerToNextLevel: string; progressPct: string } | null
}

/** `GET admin/reports/ip-tracker` — one login event. */
export type IpLoginRow = {
  id: string
  user: { id: string; name: string }
  ipAddress: string | null
  isPrivate: boolean
  countryCode: string | null
  country: string | null
  region: string | null
  city: string | null
  isp: string | null
  org: string | null
  asn: string | null
  isProxy: boolean | null
  isHosting: boolean | null
  source: string | null
  userAgent: string | null
  createdAt: string
}

/** `GET admin/reports/ip-tracker/shared` — an address two or more accounts used. */
export type SharedIpRow = {
  ipAddress: string
  isPrivate: boolean
  accounts: number
  logins: number
  firstSeen: string
  lastSeen: string
  proxyOrHosting: boolean
  countryCodes: string[]
  countries: string[]
  isp: string | null
  users: { id: string; name: string; logins: number; lastSeen: string }[]
}
