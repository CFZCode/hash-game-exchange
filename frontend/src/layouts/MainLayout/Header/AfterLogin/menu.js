import {
  IconWallet,
  IconWithdraw,
  IconTransaction,
  IconFreePlays,
  IconBetHistory,
  IconRollover,
  IconVipClub,
  IconVaultPro,
  IconReferral,
  IconProfile,
  IconSettings,
  IconLogOut,
} from './icons';

/* The account dropdown's rows — `k1(a)` in AfterLogin-Xr01UEkM.js, verbatim down to the order.
 *
 * The original builds the array with a flag in front of most entries and `.filter(t => !!t)`
 * behind it, so a row that is switched off leaves no gap:
 *
 *   [ !s.isFiat && { Wallet }, (!s.isFiat && !s.isOfflineAgent || !!j.bcmx) && { Withdraw },
 *     ... !G.app.isTgWebapp && { Log Out } ].filter(t => !!t)
 *
 * All three flags are DEPLOYMENT flags, not session state: `isFiat` and `isOfflineAgent` are
 * white-label build switches (`aK` on the shared store) and `isTgWebapp` says the page is
 * running inside Telegram. On bc.game's own web deploy all three are false, which is how the
 * capture renders — so every row below is live and `gated` records what each one hangs off
 * rather than dropping the information.
 *
 * `dot: J` on Free Plays is the original's `FreePlayDot` — a lazily loaded unread badge
 * (`free-play-dot-CKuMPKja.js`) that renders into `<span class="absolute end-1 top-1/2 z-200">`.
 * The chunk is recovered now and it is 1.1 KB: a `<Badge value={0} type="dot"/>` behind
 * `!license.bcmx && totalCount > 0`, reading the SAME shared resource the Free Plays dialog does,
 * which is why the badge and the dialog's tab counts can never disagree. `totalCount` is 0 here
 * (see services/freePlay.js — the feed answers 403 and there is no `initialValue`), so the correct
 * rendering is nothing at all. The slot stays empty because the count is zero, not because the
 * feed is unknown; the markup that would hold it is in index.jsx.
 *
 * Two `link`s are worth reading twice. VIP Club is `/vip`, NOT `/vip-detail` — the alias, which
 * this build already redirects (see the VIP note in CLAUDE.md), so it lands correctly either
 * way. Referral is `/referral`, which redirects to `/referral-exhibition` here because the
 * signed-in affiliate dashboard is not built.
 *
 * `refer` is the one row that is not a route at all: the original does
 * `d.link === "refer" ? T.emit("open-refer") : ...`, an event that opens a dialog. Nothing
 * below uses it today, but the branch is kept in index.jsx so the value has somewhere to go.
 */
export const ACCOUNT_MENU = [
  { label: 'Wallet', link: '/wallet/balance', icon: IconWallet, gated: '!isFiat' },
  { label: 'Withdraw', link: '/wallet/withdraw', icon: IconWithdraw, gated: '!isFiat && !isOfflineAgent' },
  { label: 'Transactions', link: '/wallet/transaction', icon: IconTransaction },
  /* THIS BUILD'S: opens the Send Tip dialog (components/shared/SendTip), behind the `tips` gate. */
  { label: 'Send Tip', link: '', action: 'tip', icon: IconTransaction, gate: 'tips' },
  { label: 'Free Plays', link: '/free-plays', icon: IconFreePlays, dot: true },
  { label: 'Bet History', link: '/wallet/bet-history', icon: IconBetHistory },
  /* A demo account has no wallet pages: its bets are the exchange's own My Bets (index.jsx shows it only to one). */
  { label: 'Bet History', link: '/sports/my-bets', icon: IconBetHistory, demoOnly: true },
  { label: 'Rollover Overview', link: '/wallet/rollover', icon: IconRollover },
  { label: 'VIP Club', link: '/vip', icon: IconVipClub },
  { label: 'Vault Pro', link: '/wallet/vault', icon: IconVaultPro, gated: '!isFiat && !isOfflineAgent' },
  { label: 'Referral', link: '/referral', icon: IconReferral, gated: '!isOfflineAgent' },
  /* The one row whose link is built from the account: `/user/profile/${a}`. It opens the profile
     dialog family — see components/modals/Profile. */
  { label: 'My Profile', link: '/user/profile/:userId', icon: IconProfile, userprofile: true },
  { label: 'Global Settings', link: '/settings', icon: IconSettings },
  /* An empty `link` is the original's own value — Log Out signs out rather than navigating. */
  { label: 'Log Out', link: '', icon: IconLogOut, gated: '!isTgWebapp' },
];
