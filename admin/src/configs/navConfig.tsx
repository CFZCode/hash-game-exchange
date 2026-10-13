// Third-party Imports
import {
  ArrowDownToLineIcon,
  ArrowLeftRightIcon,
  ArrowUpFromLineIcon,
  BellIcon,
  BellRingIcon,
  BookOpenIcon,
  CircleDollarSignIcon,
  CoinsIcon,
  CreditCardIcon,
  CrownIcon,
  DicesIcon,
  Disc3Icon,
  FileBarChartIcon,
  GiftIcon,
  GlobeIcon,
  GoalIcon,
  HandCoinsIcon,
  HandshakeIcon,
  ImageIcon,
  KeyRoundIcon,
  LandmarkIcon,
  LayoutDashboardIcon,
  LinkIcon,
  LockKeyholeIcon,
  MegaphoneIcon,
  NetworkIcon,
  NewspaperIcon,
  RepeatIcon,
  ScrollTextIcon,
  Settings2Icon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  TicketIcon,
  TrendingUpIcon,
  TrophyIcon,
  UserCogIcon,
  UsersIcon,
  VaultIcon,
  WalletIcon,
  type LucideIcon
} from 'lucide-react'

/**
 * The sidebar's icons, imported by name.
 *
 * Indexing `import * as Icon from 'lucide-react'` by a string pulled the WHOLE
 * icon set (~5 MB in dev, ~1,500 modules) into the shell chunk every page
 * loads — the bulk of the slow first load. Add an icon here to use it below.
 */
export const navIcons = {
  ArrowDownToLine: ArrowDownToLineIcon,
  ArrowLeftRight: ArrowLeftRightIcon,
  ArrowUpFromLine: ArrowUpFromLineIcon,
  Bell: BellIcon,
  BellRing: BellRingIcon,
  BookOpen: BookOpenIcon,
  CircleDollarSign: CircleDollarSignIcon,
  Coins: CoinsIcon,
  CreditCard: CreditCardIcon,
  Crown: CrownIcon,
  Dices: DicesIcon,
  Disc3: Disc3Icon,
  FileBarChart: FileBarChartIcon,
  Gift: GiftIcon,
  Globe: GlobeIcon,
  Goal: GoalIcon,
  HandCoins: HandCoinsIcon,
  Handshake: HandshakeIcon,
  Image: ImageIcon,
  KeyRound: KeyRoundIcon,
  Landmark: LandmarkIcon,
  LayoutDashboard: LayoutDashboardIcon,
  Link: LinkIcon,
  Megaphone: MegaphoneIcon,
  Network: NetworkIcon,
  Newspaper: NewspaperIcon,
  Repeat: RepeatIcon,
  ScrollText: ScrollTextIcon,
  Settings2: Settings2Icon,
  ShieldAlert: ShieldAlertIcon,
  ShieldCheck: ShieldCheckIcon,
  Ticket: TicketIcon,
  LockKeyhole: LockKeyholeIcon,
  TrendingUp: TrendingUpIcon,
  Trophy: TrophyIcon,
  UserCog: UserCogIcon,
  Users: UsersIcon,
  Vault: VaultIcon,
  Wallet: WalletIcon,
} satisfies Record<string, LucideIcon>

type IconName = keyof typeof navIcons

export type MenuLeafSubItem = {
  label: string
  href: string
  activePath?: string
  badge?: string
  badgeClassName?: string
  target?: '_blank' | '_self' | '_parent' | '_top'

  /** Any one of these grants shows the entry. Absent = everyone signed in. */
  permission?: string | string[]

  /** Hidden when this operator flag is off (`sports`, `casino`, …) or the owner left it out of the plan. */
  flag?: string

  /**
   * Hidden only when the OWNER left this flag out of the plan (`entitlements.flags[x] === false`).
   * The operator's own switch is ignored, so a screen that turns the flag back on stays reachable.
   */
  ownerFlag?: string

  /** Hidden when the owner left this feature (`vault`, `gift_cards`, …) out of the plan. */
  feature?: string

  /** Shown only to this kind of session (`marketing` = a marketing sub-login). */
  account?: 'marketing'

  /** A promotions screen (or the vault, or swap history): hidden from agent-tree logins (staff levels 4–6 and their executives). */
  promotions?: boolean
}

export type MenuGroupSubItem = {
  label: string
  childItems: MenuLeafSubItem[]
  permission?: string | string[]
  flag?: string
  ownerFlag?: string
  feature?: string
  account?: 'marketing'
  promotions?: boolean
}

export type MenuSubItem = MenuLeafSubItem | MenuGroupSubItem

export type MenuItem = {
  icon: IconName
  label: string
  permission?: string | string[]
  flag?: string
  ownerFlag?: string
  feature?: string
  account?: 'marketing'
  promotions?: boolean
} & (
  | {
      href: string
      badge?: string
      badgeClassName?: string
      childItems?: never
      target?: '_blank' | '_self' | '_parent' | '_top'
    }
  | {
      href?: never
      badge?: string
      badgeClassName?: string
      childItems: MenuSubItem[]
    }
)

export type NavItem = {
  groupLabel?: string
  items: MenuItem[]
}

/**
 * The operator menu. Permissions are the platform's `resource:action` grants
 * (see ADMIN-FEATURE-INVENTORY.md); the sidebar hides what the current role
 * cannot reach and the page still refuses server-side, so this is a courtesy,
 * not the guard. Each `permission` is the backend guard of the GET the page
 * loads first — most promotion reads (bonus, codes, gift cards, wheel, VIP,
 * affiliate, races, vault) are `reports:read`, P2P reads are `config:write`.
 */
export const navItems: NavItem[] = [
  {
    items: [{ icon: 'LayoutDashboard', label: 'Dashboard', href: '/dashboard', permission: 'reports:read' }]
  },
  {
    groupLabel: 'Users',
    items: [
      // Either grant opens the list: reports:read reads `admin/reports/players` (balances, deposits,
      // wagers); users:read alone falls back to the player directory `admin/user/directory`.
      { icon: 'Users', label: 'Users', href: '/users', activePath: '/users', permission: ['reports:read', 'users:read'] } as MenuItem,
      { icon: 'Globe', label: 'IP tracker', href: '/ip-tracker', permission: 'reports:read' },
      { icon: 'ShieldCheck', label: 'KYC', href: '/kyc', permission: 'users:read', feature: 'kyc' },
      { icon: 'Landmark', label: 'Bank details', href: '/bank-details', permission: 'config:read' }
    ]
  },
  {
    groupLabel: 'Finance',
    items: [
      {
        icon: 'ArrowDownToLine',
        label: 'Deposits',
        permission: 'deposits:read',
        childItems: [
          { label: 'Fiat', href: '/deposits/fiat' },
          { label: 'Crypto', href: '/deposits/crypto' },
          { label: 'Payment orders', href: '/deposits/orders' }
        ]
      },
      {
        icon: 'ArrowUpFromLine',
        label: 'Withdrawals',
        permission: 'withdrawals:read',
        childItems: [
          { label: 'Fiat', href: '/withdrawals/fiat' },
          { label: 'Crypto', href: '/withdrawals/crypto' }
        ]
      },
      { icon: 'Wallet', label: 'Wallets', href: '/wallets', permission: 'wallet:read' },
      { icon: 'ArrowLeftRight', label: 'Transfers', href: '/transfers', permission: 'staff:read' },
      { icon: 'Coins', label: 'Exchange rates', href: '/exchange-rates', permission: 'config:read' },

      // House only: `promotions` is the mark that hides a screen from agent-tree logins.
      { icon: 'CircleDollarSign', label: 'Coins', href: '/coins', permission: 'config:read', promotions: true },
      { icon: 'Vault', label: 'Vault', href: '/vault', permission: 'reports:read', promotions: true, feature: 'vault' },
      {
        icon: 'Repeat',
        label: 'Swap history',
        href: '/swap',
        permission: 'wallet:read',
        promotions: true,
        feature: 'swap'
      },

      // Player-to-player tips (read-only). Hidden when the owner left `tips` out of the plan.
      { icon: 'HandCoins', label: 'Tips', href: '/tips', permission: 'reports:read', feature: 'tips' },
      // Hidden when the owner left `p2p` out of the plan (the /admin/p2p routes refuse it too).
      { icon: 'Handshake', label: 'P2P trading', href: '/p2p', permission: 'config:write', feature: 'p2p' }
    ]
  },
  {
    groupLabel: 'Promotions',
    items: [
      { icon: 'Gift', label: 'Bonus', href: '/bonus', permission: 'reports:read', promotions: true, flag: 'bonus', feature: 'bonus' },
      { icon: 'Ticket', label: 'Redeem codes', href: '/redeem-codes', permission: 'reports:read', promotions: true },

      // Tree-scoped by the backend (like player data), so not house-only.
      // `admin/user/bonus-balance` and its stats answer any of reports:read, users:read, wallet:read.
      { icon: 'LockKeyhole', label: 'Bonus balances', href: '/bonus-balances', permission: ['reports:read', 'users:read', 'wallet:read'] },
      { icon: 'CreditCard', label: 'Gift cards', href: '/gift-cards', permission: 'reports:read', promotions: true, flag: 'giftcards', feature: 'gift_cards' },
      { icon: 'Disc3', label: 'Spin wheel', href: '/spin-wheel', permission: 'reports:read', promotions: true, flag: 'wheelspin', feature: 'spin_wheel' },
      { icon: 'Crown', label: 'VIP & club', href: '/vip', permission: 'reports:read', promotions: true, flag: 'vipclub', feature: 'vip' },
      { icon: 'Link', label: 'Affiliate', href: '/affiliate', permission: 'reports:read', promotions: true, flag: 'affiliate', feature: 'affiliate' },
      { icon: 'Trophy', label: 'Races', href: '/races', permission: 'reports:read', promotions: true, feature: 'races' }
    ]
  },
  {
    groupLabel: 'Casino',
    items: [
      {
        icon: 'Dices',
        label: 'Casino',
        permission: ['casino:read', 'reports:read'],
        flag: 'casino',
        childItems: [
          { label: 'Game catalogue', href: '/casino/games', permission: 'casino:read' },
          { label: 'Curation & priority', href: '/casino/curation', permission: 'casino:read' },
          { label: 'Providers', href: '/casino/providers', permission: 'casino:read' },

          // The house-games and bet-history admin reads are guarded by reports:read, not casino:read.
          { label: 'In-house games', href: '/casino/in-house', permission: 'reports:read' },
          { label: 'Bet history', href: '/casino/bets', permission: 'reports:read' },

          // Like bet history: `GET admin/reports/wager-stats` is reports:read and tree-scoped.
          { label: 'Wager report', href: '/casino/wager-report', permission: 'reports:read' }
        ]
      }
    ]
  },
  {
    groupLabel: 'Sports',
    items: [
      {
        icon: 'Goal',
        label: 'Sports',
        permission: ['sports:read', 'reports:read'],
        flag: 'sports',
        childItems: [
          { label: 'Bets', href: '/sports/bets', permission: 'sports:read' },
          { label: 'Settlement', href: '/sports/settlement', permission: 'sports:settle' },
          { label: 'Catalogue & locks', href: '/sports/catalogue', permission: 'sports:read' },

          // The wager report reads `admin/reports/wager-stats` (reports:read, tree-scoped), so a
          // master — reports:read without sports:read — gets it, as the API already answers.
          { label: 'Wager report', href: '/sports/wager-report', permission: 'reports:read' }
        ]
      }
    ]
  },
  {
    groupLabel: 'Team',
    items: [
      { icon: 'Network', label: 'Staff & agents', href: '/staff', activePath: '/staff', permission: 'staff:read' } as MenuItem,
      { icon: 'KeyRound', label: 'Executives', href: '/access/executives', permission: 'staff:read' },
      { icon: 'Megaphone', label: 'Marketing', href: '/marketing', account: 'marketing' },
      { icon: 'ScrollText', label: 'Activity log', href: '/audit', permission: 'audit:read' }
    ]
  },
  {
    groupLabel: 'Content',
    items: [
      { icon: 'Image', label: 'Banners', href: '/content/banners', permission: 'config:read', feature: 'banners' },
      { icon: 'Newspaper', label: 'Blogs', href: '/content/blogs', permission: 'config:read', feature: 'blog' },

      // The device list and per-user history are users:read; sending (gated on the page) is config:write.
      { icon: 'Bell', label: 'Notifications', href: '/content/notifications', permission: ['users:read', 'config:write'], feature: 'notifications' },
      {
        /*
         * OneSignal web push. Hidden when the owner left `push_notifications` out of the plan —
         * every page would only say "Not in your plan". The routes still open from a direct link.
         */
        icon: 'BellRing',
        label: 'Push notifications',
        permission: 'config:read',
        feature: 'push_notifications',
        childItems: [
          { label: 'Compose', href: '/push/compose' },
          { label: 'Campaigns', href: '/push/campaigns' },
          { label: 'Push templates', href: '/push/templates' },
          { label: 'Prompt & settings', href: '/push/settings' }
        ]
      }
    ]
  },
  {
    groupLabel: 'Reports',
    items: [
      { icon: 'FileBarChart', label: 'User reports', href: '/reports/players', permission: 'reports:read' },
      { icon: 'TrendingUp', label: 'Profit & loss', href: '/reports/pnl', permission: 'reports:read' },

      // The transfer list is `admin/accounts/statement` (users:read); the drill-down is `admin/statements` (reports:read).
      { icon: 'BookOpen', label: 'Statements', href: '/reports/statements', permission: ['users:read', 'reports:read'] },
      { icon: 'ShieldAlert', label: 'Risk', href: '/reports/risk', permission: 'reports:read' }
    ]
  },
  {
    groupLabel: 'Settings',
    items: [
      {
        icon: 'Settings2',
        label: 'Site config',
        permission: 'config:read',
        childItems: [
          { label: 'Features', href: '/site-config/features' },
          { label: 'Branding', href: '/site-config/branding' },
          { label: 'Feature flags', href: '/site-config/flags' },
          { label: 'Limits and policy', href: '/site-config/limits' },
          { label: 'Affiliate rates', href: '/site-config/affiliate', feature: 'affiliate', promotions: true },
          { label: 'Welcome bonuses', href: '/site-config/welcome-bonuses', promotions: true },
          { label: 'Email (SMTP)', href: '/site-config/email' },
          { label: 'Sports switch', href: '/site-config/sports', ownerFlag: 'sports' }
        ]
      },
      { icon: 'UserCog', label: 'My account', href: '/account' }
    ]
  }
]

/**
 * Every promotions route, plus the vault and swap history. Agent-tree logins (levels 4–6 and their executives) get a "not available"
 * notice on these instead of the screen, so no promotion API is called from a pasted URL either.
 */
export const PROMOTION_ROUTES = [
  '/bonus',
  '/redeem-codes',
  '/gift-cards',
  '/spin-wheel',
  '/vip',
  '/affiliate',
  '/races',
  '/vault',
  '/swap',
  '/site-config/affiliate',
  '/site-config/welcome-bonuses',

  // Not a promotion: the coin registry is house configuration, refused to the agent tree the same way.
  '/coins'
]

export const isPromotionRoute = (pathname: string) =>
  PROMOTION_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`))

/**
 * What a route needs, read off the menu entry that links to it — the same `permission`,
 * `promotions` and `account` marks the sidebar filters on, so a pasted URL is refused exactly when
 * the sidebar would have hidden the link.
 *
 * `permissions` is every level of the menu chain (the group's grant AND the leaf's), each one an
 * any-of list. Sub-routes inherit their entry (`/users/42` → Users, `/staff/7` → Staff & agents);
 * the longest matching `href` wins. A route no entry links to has no requirement here.
 */
export type RouteRequirement = {
  href: string
  permissions: Array<string | string[]>
  promotions: boolean
  account?: 'marketing'
}

type Marks = { permission?: string | string[]; promotions?: boolean; account?: 'marketing' }

const collectRoutes = (): RouteRequirement[] => {
  const out: RouteRequirement[] = []

  const walk = (entry: Marks & { href?: string; childItems?: MenuSubItem[] }, chain: Marks[]) => {
    const marks = [...chain, entry]

    if (entry.href) {
      out.push({
        href: entry.href,
        permissions: marks.map(m => m.permission).filter((p): p is string | string[] => !!p && (!Array.isArray(p) || p.length > 0)),
        promotions: marks.some(m => m.promotions),
        account: marks.find(m => m.account)?.account
      })
    }

    entry.childItems?.forEach(child => walk(child as Marks & { href?: string; childItems?: MenuSubItem[] }, marks))
  }

  navItems.forEach(group => group.items.forEach(item => walk(item as Marks & { href?: string; childItems?: MenuSubItem[] }, [])))

  return out.sort((a, b) => b.href.length - a.href.length)
}

const ROUTES = collectRoutes()

export const routeRequirement = (pathname: string): RouteRequirement | null =>
  ROUTES.find(r => pathname === r.href || pathname.startsWith(`${r.href}/`)) ?? null

/** The marks the sidebar filters an entry on (see `useNavVisible`). */
export type NavMarks = {
  permission?: string | string[]
  flag?: string
  ownerFlag?: string
  feature?: string
  account?: 'marketing'
  promotions?: boolean
}

type NavEntry = NavMarks & { href?: string; childItems?: MenuSubItem[] }

/**
 * The first page, in sidebar order, that `visible` lets through — the landing route after sign-in.
 * `/account` (My account) opens for everyone, so it is only the answer when nothing else is.
 */
export const firstNavHref = (visible: (entry: NavMarks) => boolean): string => {
  const find = (entry: NavEntry): string | null => {
    if (!visible(entry)) return null
    if (entry.href) return entry.href

    for (const child of entry.childItems ?? []) {
      const hit = find(child as NavEntry)

      if (hit) return hit
    }

    return null
  }

  for (const group of navItems) {
    for (const item of group.items) {
      const hit = find(item as NavEntry)

      if (hit && hit !== '/account') return hit
    }
  }

  return '/account'
}
