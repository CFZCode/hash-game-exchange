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

/** `GET admin/reports/user-risk/:id` — the parts the Risk tab reads. */
export type RiskIp = {
  ipAddress: string
  isPrivate: boolean
  uses: number
  country: string | null
  city: string | null
  isp: string | null
  region?: string | null
  firstSeen: string
  lastSeen: string
}
export type RiskBet = {
  id: string | number
  ipAddress: string | null
  createdAt: string
  stakeAmount: string
  currency: string
  status: string | null
  resultStatus: string | null
}
export type PlayerRisk = {
  registration: {
    ip: string | null
    source: 'signup' | 'first_login' | null
    isPrivate: boolean
    countryCode: string | null
    country: string | null
    region: string | null
    city: string | null
    isp: string | null
    registeredAt: string | null
    declaredCountry: string | null
  }
  locks: { isLocked: boolean; lockTargetx: boolean; sportsBetlocked: boolean; casinoLocked: boolean }
  financials: {
    reward: {
      currency: string
      totalDeposit: string
      totalWithdrawal: string
      net: string
      depositCount: number
      withdrawalCount: number
      unconverted: string[]
    }
  }
  activity: {
    distinctIpCount: number
    publicIpCount: number
    countries: { countryCode: string; country: string | null; logins: number }[]
    ipBreakdown: RiskIp[]
    recentBets: RiskBet[]
  }
  sharedIps: { total: number; accounts: { id: string; name: string; ips: string[]; lastSeen: string }[] }
  riskFlags: Record<string, boolean>
}

/** `GET admin/reports/geo-stats`. */
export type GeoStats = {
  totalPlayers: number
  registration: {
    located: number
    unknown: number
    bySource: { signup: number; firstLogin: number }
    countries: { countryCode: string; country: string; players: number }[]
    cities: { city: string; countryCode: string; country: string; players: number }[]
  }
  login: { players: number; countries: { countryCode: string; country: string; players: number; logins: number }[] }
}
