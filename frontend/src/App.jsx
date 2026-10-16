import React, { useState } from 'react';
import { CHAT_AVAILABLE } from './services/availability';
import { referralCodeFromPath, savePendingReferral } from './services/referralCapture';
import { Link, Navigate, Route, Routes, matchPath, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import MainLayout from './layouts/MainLayout/MainLayout';
import Home from './pages/Home';
import Casino from './pages/Casino';
import GamePage from './pages/Game';
import ExplorePage from './pages/Explore';
import ChatPublicPage from './pages/ChatPublic';
/* `/sports` is the native sports EXCHANGE now (pages/Exchange) — a deliberate departure the user
   asked for; the BetBy-style lobby in pages/Sports is no longer routed and its files stay. */
import ExchangeLobby from './pages/Exchange/Lobby';
import ExchangeMyBets from './pages/Exchange/MyBets';
import ExchangeStatement from './pages/Exchange/Statement';
import Promotions from './pages/Promotions';
import DepositOffer from './pages/DepositOffer';
import Blog from './pages/Blog';
import BlogPost from './pages/Blog/Post';
import Deposit from './pages/Deposit';
import DepositPanels from './pages/Deposit/Panels';
import DailyContest from './pages/DailyContest';
import VIP from './pages/VIP';
import Referral from './pages/Referral';
import ReferralDashboard from './pages/Referral/Dashboard';
import Quests from './pages/Quests';
import { Favorites, Recent } from './pages/GameCollection';
import SettingsLayout from './pages/Settings';
import SettingsMenuPage from './pages/Settings/MenuPage';
import SettingsDialog from './pages/Settings/Dialog';
import { SectionPage, GameListRoute, TagPage, RelatedPage, ProviderPage } from './pages/GameList';
import GameListDialog from './pages/GameList/Dialog';
import UserActionDialog from './components/modals/UserAction';
import WhitelistAddressDialog from './components/modals/WhitelistAddress';
import AntiPhishingDialog from './components/modals/AntiPhishing';
import PasskeyDialog from './components/modals/Passkey';
import VerificationDialog from './components/modals/Verification';
import VerifyEnterDialog from './components/modals/VerifyEnter';
import EditProfileDialog from './components/modals/EditProfile';
import DepositDetailDialog from './components/modals/DepositDetail';
import WithdrawDetailDialog from './components/modals/WithdrawDetail';
import SettingsAccountInfo from './pages/Settings/AccountInfo';
import SettingsSecurity from './pages/Settings/Security';
import SettingsPreferences from './pages/Settings/Preferences';
import SettingsVerification from './pages/Settings/Verification';
import SettingsPayment from './pages/Settings/Payment';
import SettingsWhitelist from './pages/Settings/Whitelist';
import Bonus from './pages/Bonus';
import Help from './pages/Help';
import Responsible from './pages/Responsible';
import WalletLayout from './pages/Wallet';
import Balance from './pages/Wallet/Balance';
import WithdrawPanels from './pages/Wallet/Withdraw';
import Swap from './pages/Wallet/Swap';
import VaultPro from './pages/Wallet/VaultPro';
import Transaction from './pages/Wallet/Transaction';
import Rollover from './pages/Wallet/Rollover';
import BetHistory from './pages/Wallet/BetHistory';
import UserEnter from './pages/UserEnter';
import WithdrawDialog from './pages/Wallet/Withdraw/Dialog';
import BonusDialog from './pages/Bonus/Dialog';
import VipDialog from './pages/VIP/Dialog';
import HelpDialog from './pages/Help/Dialog';
import ReferralDialog from './pages/Referral/Dialog';
import PromotionsDialog from './pages/Promotions/Dialog';
import PromotionDetail from './pages/PromotionDetail';
import PromotionDetailDialog from './pages/PromotionDetail/Dialog';
import DailyContestDialog from './pages/DailyContest/Dialog';
import PageDialog from './components/shared/PageDialog';
import NotificationDialog from './components/Notification/Dialog';
import Auth from './components/modals/Auth';
import FreePlay from './components/modals/FreePlay';
import Profile from './components/modals/Profile';
import ProfileMedals from './components/modals/Profile/Medals';
import ProfileStatistics from './components/modals/Profile/Statistics';
import RegionBlock from './components/modals/RegionBlock';
import { getRegion } from './services/region';
import { USE_FIXTURES } from './services/client';
import useMediaQuery, { useIsDesktop } from './hooks/useMediaQuery';
import { SessionProvider } from './context/SessionContext';
import { SettingsProvider } from './context/SettingsContext';
import { GatesProvider, RouteGate } from './context/GatesContext';
import { useSession } from './context/session';
import { FREE_PLAYS_ENABLED, PASSKEY_ENABLED } from './config/hiddenFeatures';

/* DEV ONLY — the exchange component kit's preview (`/dev/exchange-kit`). Lazy so the preview and
   its sample data never enter the production bundle's main chunk; the route itself is only
   registered outside production (see the <Route> above the catch-all). */
const IS_DEV = process.env.NODE_ENV !== 'production';
const ExchangeKitPreview = React.lazy(() => import('./components/exchange/preview/ExchangeKitPreview'));

/* The match page is the heaviest exchange screen (markets, slip, polling at 300ms), so it is its
   own chunk. A chunk that fails to load (deploy rotated it, network dropped) must not take the
   shell down: the boundary below draws a way back to the lobby instead, and is keyed on the
   path so moving to another match tries again. */
const ExchangeMatch = React.lazy(() => import('./pages/Exchange/Match/index.jsx'));

class LazyRouteBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="px-4 py-16 text-center sm:px-0">
        <p className="text-sm text-secondary">This match could not be opened.</p>
        <Link to="/sports" className="button button-m button-second mx-auto mt-4 inline-flex px-6">
          Back to sports
        </Link>
      </div>
    );
  }
}

function AppShell() {
  const { session } = useSession();
  const navigate = useNavigate();

  /* `showable && areaAlert`, which is the original's own gate — Enter-MsmOuq5R.js reads
     exactly that pair before firing `block_page_view`, and its inverse
     (`!login && showable && !areaAlert`) is what lets one-tap sign-in run instead. Both are
     true in the captured session, so the dialog opens on first load exactly as it did on the
     visit the mirror was taken from. It was hardcoded `true` here before.

     Initialiser form, not a plain value: the close button dismisses it for the session, so
     this must not re-derive on every render. */
  const [blocked, setBlocked] = useState(() => USE_FIXTURES && session.showable && session.areaAlert);

  /* Live: the owner panel's region restriction decides, per visitor (`services/region.js`).
     Off by default, so nobody sees the dialog until the owner switches it on. */
  const [region, setRegion] = useState(null);
  React.useEffect(() => {
    let alive = true;
    getRegion().then((r) => {
      if (alive && r?.restricted) { setRegion(r); setBlocked(true); }
    });
    return () => { alive = false; };
  }, []);

  /* Desktop only, at the same 1024 line the rest of the project uses for the original's
     `m.mobile`. Gated in JS rather than with `hidden lg:*` so the dialog is not in the DOM at
     all below lg — a hidden overlay would still be a focusable subtree over the page.
     `useIsDesktop` seeds its state from matchMedia synchronously, so on a phone this is false
     for the first render too and the modal never flashes. */
  const isDesktop = useIsDesktop();

  /* `sm`, the 640 line — used by exactly one route, `/vip-detail`, whose own arms flip there
     rather than at 1024. Everything else on this page tests `isDesktop`. */
  const isWide = useMediaQuery('(min-width: 640px)');

  /* The auth dialog is a ROUTE on the original — `/login/signin` and `/login/regist`, which is
     where its header buttons navigate — but it renders OVER whatever page you were on rather
     than replacing it. Matching on the path here rather than putting it in <Routes> is what
     keeps a page mounted underneath; which page that is, is the background-location note
     below. */
  const location = useLocation();
  /* `action: r` off the original's own router context — see the stack-depth note below. */
  const navigationType = useNavigationType();
  const { pathname } = location;
  const authMode = pathname.startsWith('/login/') ? pathname.slice('/login/'.length) : null;
  /* `forgot` (Sign In's "Forgot your password?") and `reset` (the emailed link, `?token=`) are
     two more screens of the same dialog. */
  const showAuth = ['signin', 'regist', 'forgot', 'reset'].includes(authMode);

  /* A referral link (`/i-<code>-n/`, or the platform's `/referal/<code>`): keep the code for
     the Sign Up form and open it. A signed-in visitor already has an account, so they just
     land on the home page. */
  const referralFromLink = referralCodeFromPath(pathname);
  React.useEffect(() => {
    if (!referralFromLink) return;
    if (session.login) {
      navigate('/', { replace: true });
      return;
    }
    savePendingReferral(referralFromLink);
    /* Home replaces the link first and the dialog is pushed over it, so closing the dialog (or
       signing up, which closes it) steps back to Home — not past the link to whatever was
       before this site in the tab. */
    navigate('/', { replace: true });
    navigate('/login/regist');
  }, [referralFromLink, session.login, navigate]);

  /* `/deposit` is a DIALOG ROUTE on the original — `info.dialog = { size: [30, 44] }` — so it
     renders over whatever page you were on rather than replacing it, exactly as the auth
     dialog does, and is matched here for the same reason. Its first guard is
     `() => !b.login && "/login/regist"`, reproduced below: a logged-out visitor who lands on
     the path gets the sign-up dialog instead. */
  const showDeposit = pathname === '/deposit' && session.login;
  const depositNeedsAuth = pathname === '/deposit' && !session.login;

  /* `/user/enter` — the mobile account page, and a dialog route like the two above:
     `info.dialog = { behavior: "transparent-title" }`, inside a group carrying
     `{ dialog: !0, guards: [ce] }`. It is what the MOBILE header's avatar navigates to; a desktop
     gets the account dropdown instead and never comes here.

     BOTH guards are reproduced, and they fail in different directions:

       `() => !m.mobile && "/"`   the route's own, read as the 1024 line as everywhere else.
       `ce` = `authGuard`         `!login && "/login/signin?redirect=" + pathname` — so a
                                  logged-out visitor gets the SIGN-IN dialog, not a redirect
                                  home. That is the same shape `/deposit` already takes one line
                                  up, whose guard names the sign-up tab instead. The `?redirect=`
                                  round-trip is not reproduced: `signIn()` here swaps a fixture
                                  rather than routing.

     `isDesktop` is declared above and seeds from matchMedia synchronously, so a phone never
     paints the desktop branch for a frame and a desktop never paints the dialog at all. */
  const userEnterRoute = pathname === '/user/enter';
  const showUserEnter = userEnterRoute && session.login && !isDesktop;
  const userEnterNeedsAuth = userEnterRoute && !session.login;

  /* `/wallet/withdraw` carries `info: { dialog: m.mobile }` — a DEVICE test, so the same component
     is the wallet's pane on a desktop and a full-screen dialog on a phone. Below lg it is matched
     here like any other dialog route; from lg up it stays the nested `<Route>` under `/wallet`
     and nothing about this line applies.

     The wallet LAYOUT carries the same flag, so on the original every pane is a dialog on a phone
     and the rail never renders there. Only Withdraw is lifted so far — it is what the account
     page's own button reaches. See pages/Wallet/Withdraw/Dialog.jsx. */
  const withdrawDialog = pathname === '/wallet/withdraw' && !isDesktop;

  /* `/referral` carries the same `info.dialog = m.mobile` — see pages/Referral/Dialog.jsx. Its
     four children (`""`, `/my-rewards/:tab`, `/refer/:tab`, `/rules`) are tabs of the one page and
     ride the one dialog, so the whole prefix matches rather than the bare path. `startsWith` on
     `/referral/` with the slash, so `/referral-exhibition` and `/referral-terms` — real sibling
     routes, not children — are not swept up.

     Gated on `login` because the route's guard sends a logged-out visitor to
     `/referral-exhibition`; the dashboard performs that redirect itself, and letting it fall
     through to the plain route means redirecting from a page rather than from inside a dialog. */
  const referralDialog =
    (pathname === '/referral' || pathname.startsWith('/referral/')) && !isDesktop && session.login;

  /* `/bonus` carries `dialog: m.mobile ? {behavior: "no-title"} : !1` — the same DEVICE test as
     `/wallet/withdraw` and `/referral`, with a behavior attached: no title bar at all, because the
     page's own tab strip carries the back arrow. See pages/Bonus/Dialog.jsx.

     Gated on `login` for the reason `referralDialog` is: the route's guard sends a logged-out
     visitor to `/`, and the page performs that redirect itself, so it is cleaner to let it fall
     through to the plain route than to redirect from inside a dialog. */
  const bonusDialog = pathname === '/bonus' && !isDesktop && session.login;

  /* THE PROMOTIONS FAMILY, and these two are the first of a LIST rather than one-offs. Every
     route below carries `info: { dialog: m.mobile }` in `Enter-MsmOuq5R.js`, which is in the
     mirror — so on a phone the original shows each of them as a full-screen dialog with the
     `.appbar` title bar, never as a page under the site header:

       /promotions/promotion   /promotions/daily-contest   /promotions/weekly-raffle
       /promotions/exclusive-promo   /deposit-offer   /referral-exhibition   /quests
       /responsible   /responsible/:responsibleId   /vip-detail   /vip   /wallet (the layout)
       /themes   /providers   /provider/:provider   /bingo   /mybets   /favourite

     Only the two here are wired, and the reason is the TITLE rather than the mechanism: the bar's
     string is the page's own `PageLayout title`, and these two are the built pages that already
     print that heading in their markup, so nothing is invented. The rest either open on a hero
     with no heading (weekly raffle, deposit offer, VIP) or carry dialog CONFIG rather than a bare
     flag, and both of those want their chunk read before the title is written. `/bonus` above and
     `/wallet/withdraw` are the two already done, each with its own note. */
  const promotionsDialog = pathname === '/promotions/promotion' && !isDesktop;
  const dailyContestDialog = pathname === '/promotions/daily-contest' && !isDesktop;
  /* `/promotion/:segment/:slug` — one promotion, the card's destination (built on request,
     2026-10-16). bc.game's own is `/promotion/:id` with `info: { dialog: m.mobile, keepAlive: !1 }`,
     so it joins this family: a page on a desktop, the sheet below `lg`, titled with the
     promotion's own title (pages/PromotionDetail/Dialog.jsx). */
  const promotionDetailMatch = matchPath('/promotion/:segment/:slug', pathname);
  const promotionDetailDialog = Boolean(promotionDetailMatch) && !isDesktop;

  /* THE REST OF THE `dialog: m.mobile` ROUTES, and every one of these titles is sourced rather
     than chosen — see components/shared/PageDialog for the table and how each was settled.
     `/quests` is gated on `login` for the reason `/bonus` and `/referral` are: its route guard
     sends a logged-out visitor to `/`, the page performs that redirect itself, and redirecting
     out of a dialog is worse than letting it fall through to the plain route. */
  const depositOfferDialog = pathname === '/deposit-offer' && !isDesktop;
  const questsDialog = pathname === '/quests' && !isDesktop && session.login;
  const referralExhibitionDialog = pathname === '/referral-exhibition' && !isDesktop;
  const responsibleDialog = pathname.startsWith('/responsible') && !isDesktop;

  /* `/favorite` and `/recent` — the Casino group's two signed-in rows, and the same
     `info: { dialog: m.mobile, guards: [ce] }` pair. Both arms are built, so the flags below are
     three states rather than two: the page (desktop, signed in), the sheet (below lg, signed in)
     and the SIGN-IN DIALOG, which is what `ce` — `!login && "/login/signin?redirect=" + pathname`
     — raises for a logged-out visitor at either width. That last one is the shape `/user/enter`
     already takes and is threaded into the same `Auth` mount below.

     Gated on `login` for the reason `/quests` and `/bonus` are: the page redirects itself when
     the session goes away, and redirecting out of a mounted dialog is worse than letting the
     route fall through. */
  const favoriteRoute = pathname === '/favorite' || pathname === '/favorite/';
  const recentRoute = pathname === '/recent' || pathname === '/recent/';
  const collectionRoute = favoriteRoute || recentRoute;
  const collectionDialog = collectionRoute && !isDesktop && session.login;
  const collectionNeedsAuth = collectionRoute && !session.login;

  /* The exchange's two account pages, `/sports/my-bets` and `/sports/statement`: signed out they
     raise the SIGN-IN dialog over the page you came from, the `ce` shape `/favorite` takes above
     (a page at every width signed in, so there is no sheet arm). */
  const sportsAccountRoute = /^\/sports\/(my-bets|statement)\/?$/.test(pathname);
  const sportsAccountNeedsAuth = sportsAccountRoute && !session.login;

  /* `/settings/*` — Global Settings, and the same `{ dialog: m.mobile, guards: [ce] }` pair the two
     rows above carry. The whole prefix matches rather than the bare path, because the six panes are
     children of one layout route and ride one dialog.

     THE BARE `/settings` IS TWO DIFFERENT THINGS and the split is the child's own guard,
     `!mobile && "/settings/account-info"`: a desktop is redirected onto the first pane, a phone
     gets the menu list. That redirect is in the route table below rather than here, since it is a
     route's own default rather than an overlay decision. */
  /* `/settings/verify/:levelName` — `DialogVerificationCockpit`, and a dialog at EVERY width: its
     entry carries no `dialog` key of its own, so it inherits the group's `dialog: !0` and takes
     the manager's DEFAULT size — `{size: "s"}` in `y3`, which `v3` maps to no class and no inline
     style, i.e. `.pc .dialog-list`'s own 30rem x 40rem. The six settings panes take the
     `dialog: m.mobile` DEVICE test instead. So it is matched first and held OUT of
     `settingsRoute` below, which would otherwise claim the path and render the pane layout with
     no pane under it on a desktop. Its sibling `/settings/verify/enter/:levelName` is the
     country picker and is not built; see components/modals/Verification. */
  /* `/settings/edit-profile` — `DialogEditProfile`, a dialog at every width like its two
     `/settings/edit-*` siblings. Held out of `settingsRoute` for the reason the verify pair is:
     the pane layout would otherwise claim the path. `/settings/edit-avatar` is the frame picker
     and is not built, so it is not matched here either — it keeps its URL and renders the pane
     shell, which is what the catch-all does with every unbuilt route. */
  const editProfileRoute = pathname === '/settings/edit-profile';
  const editProfileDialog = editProfileRoute && session.login;

  /* `/wallet/deposit-detail?orderId=…` — `DialogTransactionDepositDetail`, and the destination
     every deposit row in the Transaction pane has always linked to. It is a dialog at every width
     (`info: {keepAlive: !1}` inside the wallet's dialog group) and is held out of the `/wallet`
     layout below, which would otherwise claim the path and draw the rail with no pane. Its
     `/wallet/withdraw-detail` sibling is the same shape and is NOT built: the platform's
     withdrawal rows have no detail read to fill one. */
  const depositDetailRoute = pathname === '/wallet/deposit-detail';
  const depositDetailDialog = depositDetailRoute && session.login;

  /* `/wallet/withdraw-detail` — `DialogTransactionWithDrawDetail`, the deposit detail's sibling
     and the second of the two links the Transaction pane has always carried. */
  const withdrawDetailRoute = pathname === '/wallet/withdraw-detail';
  const withdrawDetailDialog = withdrawDetailRoute && session.login;

  const verifyRoute = pathname.startsWith('/settings/verify/');
  /* `/settings/verify/enter/:levelName` is the country picker and `/settings/verify/:levelName`
     the cockpit, so the more specific prefix has to be tested FIRST — otherwise "enter" is read
     as a level name and the form opens where the picker should. */
  const verifyEnterRoute = pathname.startsWith('/settings/verify/enter/');
  const verifyDialog = verifyRoute && !verifyEnterRoute && session.login;
  const verifyEnterDialog = verifyEnterRoute && session.login;
  const verifyNeedsAuth = verifyRoute && !session.login;

  /* `/settings/whitelist/add` and `/settings/whitelist/edit` — `DialogAddWhite` and
     `DialogEditWhite`, in the same `{ dialog: !0, guards: [ce] }` group as `/user-action/:action`,
     so a dialog at EVERY width rather than the `dialog: m.mobile` device test the pane behind
     them takes. Held out of `settingsRoute` for the reason the verify pair and edit-profile are:
     the settings layout would otherwise claim the path, and on a desktop draw the pane rail with
     the whitelist pane under a dialog that is also the whitelist pane.

     The two share one component, which is the shape the chunks themselves have — the edit one
     imports its currency-token hook out of the add one. See components/modals/WhitelistAddress. */
  /* `/settings/phishing/enter|create|detail` and `/settings/passkey` — four more members of the
     same `{ dialog: !0, guards: [ce] }` group, so dialogs at every width, and held out of
     `settingsRoute` for the reason the verify pair and the whitelist forms are: the settings
     layout would otherwise claim the path. See components/modals/AntiPhishing and .../Passkey. */
  const phishingStep = pathname.startsWith('/settings/phishing/')
    ? pathname.slice('/settings/phishing/'.length)
    : null;
  const phishingRoute = ['enter', 'create', 'detail'].includes(phishingStep);
  const phishingDialog = phishingRoute && session.login;
  const phishingNeedsAuth = phishingRoute && !session.login;

  /* Off on this platform (config/hiddenFeatures.js): the path then belongs to the settings layout
     like any unknown pane, and the dialog never mounts. */
  const passkeyRoute = PASSKEY_ENABLED && pathname === '/settings/passkey';
  const passkeyDialog = passkeyRoute && session.login;
  const passkeyNeedsAuth = passkeyRoute && !session.login;

  const whitelistAddRoute = pathname === '/settings/whitelist/add';
  const whitelistEditRoute = pathname === '/settings/whitelist/edit';
  const whitelistFormRoute = whitelistAddRoute || whitelistEditRoute;
  const whitelistFormDialog = whitelistFormRoute && session.login;
  const whitelistFormNeedsAuth = whitelistFormRoute && !session.login;

  const settingsRoute =
    !verifyRoute &&
    !editProfileRoute &&
    !whitelistFormRoute &&
    !phishingRoute &&
    !passkeyRoute &&
    (pathname === '/settings' || pathname.startsWith('/settings/'));
  const settingsDialog = settingsRoute && !isDesktop && session.login;
  const settingsNeedsAuth = settingsRoute && !session.login;

  /* `/user-action/:action` — the account's verification-and-change flows, in a group closed with
     `{ dialog: !0, guards: [ce] }`, so a login-guarded dialog route. `ce` is the same guard the
     `/settings` group carries, and it is reproduced the same way: signed out, the path raises the
     sign-in dialog instead. Two of its eight actions are built; see components/modals/UserAction,
     which decides that from the segment rather than this file, because the arm list is the
     component's business and the route's shape is this one's. */
  const userActionRoute = pathname.startsWith('/user-action/');
  const userActionDialog = userActionRoute && session.login;
  const userActionNeedsAuth = userActionRoute && !session.login;

  /* THE FOUR LIST ROUTES — `/section/:section`, `/gamelist/:type`, `/tagname/:tag` and
     `/game-related`, each carrying `info: { dialog: m.mobile }` and nothing else. No guard: these
     are public pages, which is why they are the one dialog group here with no `needsAuth` twin. */
  const listRoute = ['section', 'gamelist', 'tagname', 'game-related'].includes(
    pathname.split('/')[1],
  );
  const listDialog = listRoute && !isDesktop;

  /* `/notification` — the row on the mobile account page, and the one route in this group whose
     flag is `dialog: !0` rather than `m.mobile`: it is a dialog at every width on the original.
     Matched below `lg` all the same, because at `lg` and up the header's bell opens the
     right-hand drawer instead and the panel would otherwise be reachable two ways at once. See
     components/Notification/Dialog.jsx, which is the shell over the panel the drawer already
     renders. */
  const notificationDialog = pathname.startsWith('/notification') && !isDesktop;
  /* `/vip-detail` is NOT in this list: it was already wired, with its own Dialog.jsx and at the
     640 line rather than 1024 — see the note beside `vipDialog` below, which records why that one
     route flips there. */

  /* `/vip-detail` carries `dialog: m.mobile ? {behavior: "transparent-title"} : !1` — the bar
     floats over the hero and fades its own background in as the content passes under it.

     GATED AT 640 RATHER THAN 1024, and alone among the dialog routes here. The VIP page reads
     the original's one `mobile` flag as `sm` for a markup reason it documents at length (its
     hero cancels a `px-4 sm:px-0` gutter), and the route's flag is that same flag on the
     original — so the dialog has to flip where the page's own arms do. See pages/VIP/Dialog.jsx.

     No login guard: this route has none, and the page renders signed-out on purpose. */
  const vipDialog = (pathname === '/vip-detail' || pathname === '/vip-detail/') && !isWide;

  /* `/help` and `/help/:helpId` — `{ component: h("Layout"), path: "/help",
     info: { dialog: m.mobile } }`. The flag is on the LAYOUT, so both children ride one sheet and
     the whole prefix matches here rather than the bare path. A bare `dialog` with no `behavior`,
     so it takes the ordinary opaque title bar. See pages/Help/Dialog.jsx.

     `startsWith('/help/')` WITH THE SLASH, and the bare `/help` is deliberately left out. It is a
     redirect on the original too — the chunk runs `pathname === "/help" && navigate(
     "/help/provably-fair", {replace: !0})` from inside itself — and letting the plain route below
     answer it means the redirect happens first and the sheet opens on a path that names its topic,
     rather than opening on `/help` and redirecting underneath itself. The slash also keeps
     `/help-page/:id`, a real sibling route there, from being swept up. */
  const helpDialog = pathname.startsWith('/help/') && !isDesktop;

  /* `/free-plays` — the third dialog route here, and the one with the least attached to it:
     `{ path: "/free-plays", component: c(() => L.FreePlay()), info: { dialog: !0 } }`, inside a
     group that is spread flat into the route table with no guards. So NO login guard is
     reproduced, because there is none: the account dropdown's row carries `needLogin` and the feed
     behind the dialog simply does not fetch when logged out, which renders the same empty dialog
     either way. `dialog: !0` with no `size` means the manager's own 30rem x 40rem default; see
     Auth.css. */
  const showFreePlay = FREE_PLAYS_ENABLED && pathname === '/free-plays';

  /* THE PROFILE FAMILY — three dialog routes that STACK, which is new here. `/user/profile/:userId`
   * is what the account dropdown's My Profile row opens; its two Details links push
   * `/user/medals/:userId` and `/user/statistics` on top of it, and each of those draws the
   * manager's back arrow rather than a second close button.
   *
   * All four live in the `account` federated remote (`w = zt(vo)` in Enter-MsmOuq5R.js), inside a
   * group whose entries carry no `info` at all beyond `keepAlive` — so no size, no guard, and the
   * manager's own 30rem x 40rem default, as `/free-plays` takes. `/user/medals/item` is the fourth
   * and is not built.
   *
   * The back arrow is the DIALOG STACK's depth on the original (`FS` shows it when
   * `stacks.index() !== 1`). This build has no stack, but all three are real routes, so one step of
   * history lands in the same place — see components/shared/DialogShell.
   *
   * Note `/user/statistics` takes its account from the QUERY STRING, not from the path. That is the
   * route's own shape, and it is why it needs no `:userId` segment here. */
  const profileRoute = pathname.startsWith('/user/profile/');
  const medalsRoute = pathname.startsWith('/user/medals/') && pathname !== '/user/medals/item';
  const statisticsRoute = pathname === '/user/statistics' || pathname === '/user/statistics/';

  /* THE PAGE UNDER A DIALOG ROUTE HAS TO BE THE PAGE YOU CAME FROM, and getting that right
   * takes more than mounting the dialog outside <Routes>.
   *
   * `/login/*` and `/deposit` are real paths on the original with no page of their own — the
   * router installs them as dialogs and leaves whatever was rendered underneath in place. Here
   * they are matched on the pathname above and mounted beside the layout, which keeps a page
   * mounted but not the RIGHT one: <Routes> still sees `/deposit`, matches nothing, and falls
   * to the catch-all — so the deposit dialog opened over Home no matter where you clicked
   * Deposit from, and the URL you came from was gone from the outlet.
   *
   * So the outlet is driven by the last NON-dialog location rather than by the current one.
   * React Router calls this a background location and normally threads it through
   * `navigate(to, { state })`; tracked here instead so that every existing call site keeps
   * working and a link typed into the address bar behaves the same as one clicked.
   *
   * Assigned during render rather than in an effect — the dialog and the page under it have to
   * agree on the FIRST render or the page flashes. This is the "adjust state when a prop
   * changes" pattern React documents: the extra pass is discarded before commit and no child
   * re-renders. The guard is what makes it terminate, and it is also what holds the value: on
   * the render where a dialog path arrives, `isOverlayRoute` is already true, so the previous
   * page is kept rather than overwritten. */
  const isOverlayRoute =
    showAuth ||
    showDeposit ||
    depositNeedsAuth ||
    userEnterRoute ||
    showFreePlay ||
    withdrawDialog ||
    referralDialog ||
    bonusDialog ||
    vipDialog ||
    helpDialog ||
    promotionsDialog ||
    dailyContestDialog ||
    promotionDetailDialog ||
    depositOfferDialog ||
    questsDialog ||
    referralExhibitionDialog ||
    responsibleDialog ||
    collectionDialog ||
    collectionNeedsAuth ||
    sportsAccountNeedsAuth ||
    settingsDialog ||
    settingsNeedsAuth ||
    whitelistFormDialog ||
    whitelistFormNeedsAuth ||
    phishingDialog ||
    phishingNeedsAuth ||
    passkeyDialog ||
    passkeyNeedsAuth ||
    verifyDialog ||
    verifyEnterDialog ||
    editProfileDialog ||
    depositDetailDialog ||
    withdrawDetailDialog ||
    verifyNeedsAuth ||
    userActionDialog ||
    userActionNeedsAuth ||
    listDialog ||
    notificationDialog ||
    profileRoute ||
    medalsRoute ||
    statisticsRoute;
  const [pageLocation, setPageLocation] = useState(location);
  if (!isOverlayRoute && pageLocation !== location) setPageLocation(location);

  /* SCROLL TO THE TOP WHEN THE PAGE UNDERNEATH CHANGES, which is the router's own behaviour and
   * became visible the moment the home page's "All" pills stopped being full page loads. A reload
   * resets the scroll for free; a client-side navigation does not, so clicking All two thirds of
   * the way down the home page opened the list page already scrolled two thirds down — usually
   * past its end, since a list page is shorter.
   *
   * `Bh` in index-BsFv7ByC.js is the original's, and it is two lines:
   *
   *   const n = t && document.getElementById(t);
   *   n ? n.scrollIntoView() : e && window.scrollTo(0, 0);
   *
   * so a hash wins and everything else goes to the top. The bundle also sets
   * `history.scrollRestoration = "manual"` at bootstrap, which is what stops the browser from
   * restoring a position on top of that; `main.jsx` does the same.
   *
   * KEYED ON THE PAGE LOCATION RATHER THAN ON EVERY NAVIGATION, and that is this build's one
   * departure from `Bh`: `pageLocation` only moves for a real page change, so opening a dialog
   * over a page — the auth form, a wallet pane on a phone, a settings sheet — leaves the page
   * behind it exactly where it was. Scrolling it would be visible through the scrim and would
   * lose the reader's place for the sake of a page they did not navigate to.
   *
   * An effect is the right shape here rather than the render-time adjustment the two states above
   * use: the scroll position is an EXTERNAL system being synchronised to React state, which is
   * what effects are for.
   *
   * KEYED ON THE HISTORY ENTRY, not on the location object. Closing a dialog goes BACK to the
   * page's own entry, and React Router hands that entry over as a NEW object, so keying on the
   * object scrolled the page to the top every time a phone sheet (VIP, Promotions, …) closed —
   * the page jumped out from under the reader. The same entry (same `key`, same URL) is the
   * same page: it keeps its place. */
  const pageEntry = `${pageLocation.key}|${pageLocation.pathname}${pageLocation.search}${pageLocation.hash}`;
  const scrolledEntry = React.useRef(null);
  React.useEffect(() => {
    if (scrolledEntry.current === pageEntry) return;
    scrolledEntry.current = pageEntry;
    const hash = pageLocation.hash ? document.getElementById(pageLocation.hash.slice(1)) : null;

    if (hash) hash.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pageEntry, pageLocation.hash]);

  /* THE CROSS CLOSES THE WHOLE STACK; THE BACK ARROW POPS ONE. Both are the same helper on the
   * original with a different depth, which is what makes the pair unambiguous:
   *
   *   close  `_3()` = () => Bd(navigate, stacks.list[0], stacks.index(), navDepth())
   *   back   `o()`  = () => Bd(navigate, stacks.list[index() - 1], 1, navDepth())
   *
   *   function Bd(navigate, target, n, r) {
   *     const i = Math.min(n, Math.max(r, 0));
   *     navigate(-i);                                     // one jump, by the stack's own depth
   *     if (!target) return;
   *     for (let o = 0; o < Math.min(mS, r - i); o++) {    // then verify, a step at a time
   *       if (!(await …) || location.pathname === target.pathname && … ) return;
   *       navigate(-1);
   *     }
   *   }
   *
   * So closing from `/user/medals/:id` does not land on `/user/profile/:id` — it goes back as far
   * as the stack is deep and leaves you on the page you opened the stack over. The loop after it is
   * a safety net for history entries the stack does not account for; not reproduced, since the
   * counter below cannot drift the way a real router's `navDepth` can.
   *
   * THE DEPTH IS TRACKED, because a jump of -N needs N and this build has no dialog stack. It is
   * `stacks.index()`, derived from the same two facts the original has: whether the new location is
   * an overlay route, and the navigation ACTION — which React Router spells `useNavigationType()`
   * and the original reads as `action: r` off its own router context. Without the action a POP
   * would count upward and the arrow would deepen the stack it just popped.
   *
   * Adjusted during render, keyed on location identity so it runs once per entry — the same
   * "adjust state when a prop changes" pattern `pageLocation` above uses, and for the same reason:
   * an effect here is the cascading render `react-hooks/set-state-in-effect` forbids. */
  /* `enter` rides along in the same state because IT IS A PROPERTY OF THE TRANSITION, not of the
   * location — and getting that wrong is what made the profile dialog flash on the way back. The
   * manager runs three separate animations and picks by transition, not by dialog:
   *
   *   `N()`  scrim + card   only when the route TYPE changes BASE <-> DIALOG (`if (W === H) return`)
   *   `BS`   slide  0 -> 1  a PUSH onto a dialog:  translateX(100%) -> 0
   *          slide  2 -> 1  a POP  onto a dialog:  translateX(-17%) -> 0
   *
   * So dialog -> dialog never re-runs the open animation in either direction: the scrim stays lit
   * and the card stays put while one item slides over or out from under the other. Deriving it from
   * "does this dialog have a back arrow" cannot express that, because the dialog you POP back TO has
   * no arrow and would have looked like a first open — a fading scrim and a card scaling up from
   * 0.92, which reads exactly as closing and reopening.
   *
   * `prev === 0` is the BASE <-> DIALOG test, and it covers the browser-Back-into-a-closed-dialog
   * case as the original does: re-entering the stack from a page is an open, whichever direction
   * the history moved. */
  const [stack, setStack] = useState(() => ({
    location,
    depth: isOverlayRoute ? 1 : 0,
    enter: isOverlayRoute ? 'open' : 'none',
  }));
  if (stack.location !== location) {
    const prev = stack.depth;
    const next = !isOverlayRoute
      ? 0
      : navigationType === 'POP'
        ? Math.max(1, prev - 1)
        : navigationType === 'REPLACE'
          ? Math.max(1, prev)
          : prev + 1;
    setStack({
      location,
      depth: next,
      /* `BS`'s test is on WHERE YOU CAME FROM, not on a depth comparison:

           x === "POP" && E ? c(S, 2, 1) : (!ee.mobile && !E ? <no slide> : c(S, 0, 1))

         `E` is "the previous route was already a dialog" — `prev !== 0` here. So every dialog ->
         dialog transition that is not a POP slides in from 100%, and that INCLUDES A REPLACE:
         the country picker hands off to the verification form with `{replace: true}` and the
         original slides, where a depth comparison called it `none` and animated nothing at all
         because a replace leaves the depth where it was. Depth is still right for the stack; it
         is just the wrong thing to read the animation off. */
      enter: !isOverlayRoute
        ? 'none'
        : prev === 0
          ? 'open'
          : navigationType === 'POP' && next < prev
            ? 'pop'
            : 'push',
    });
  }
  const current = stack.location === location ? stack : { depth: 1, enter: 'open' };
  const { depth, enter: dialogEnter } = current;

  /* Closing goes BACK rather than to a fixed path, so you land where you opened it from with
     the scroll position intact. The one case that cannot go back is a dialog reached directly —
     a pasted /deposit link, where `pageLocation` was seeded with the dialog's own location and
     there is no page behind it to return to. */
  /* THE FALLBACK IS NOT ALWAYS `/`, AND THE RELOAD IS WHY. `pageLocation === location` means
     "this render is the first this app has seen", which happens for a pasted link AND for a
     refresh — and those are not the same situation. A refresh keeps the tab's history, so the
     page you were on a moment ago is still one entry behind; sending you to Home instead threw
     it away, which is the whole of the "the back arrow takes me to the home page" symptom (and
     it bit hardest in development, where an edit triggers a full reload on whatever dialog you
     happen to have open).

     React Router's `history.state.idx > 0` is the test (see below), standing in for `navDepth()`,
     which is what the original clamps its jump by and which a reload likewise resets. Note the
     original clamps to `max(navDepth, 0)`, so a refreshed dialog's arrow there does nothing at
     all; going back one is the better answer here, and `/` stays as the answer when there is
     genuinely nothing behind (a link opened in a fresh tab). */
  /* `history.length` COUNTS ENTRIES THAT ARE NOT THIS APP'S, and that sent visitors off-site.
     A tab opened straight on `/login/signin` (a new tab, an external link, a test harness's
     `about:blank`) has length 2, so a successful sign-in closed the dialog with `navigate(-1)`
     and the tab went back to the page BEFORE the app: about:blank ~300ms after sign-in, the
     dialog's exit timer. React Router keeps its own position in `history.state.idx` — 0 on the
     first entry this app wrote, and it survives a reload with the entry — so `idx > 0` is
     exactly "there is a page of ours behind this one". The hash-games reference has the same
     bug; this is a deliberate behavioural divergence, no pixel moves. */
  const historyFallback = () =>
    (window.history.state?.idx ?? 0) > 0 ? navigate(-1) : navigate('/');

  const closeOverlay = () =>
    pageLocation === location ? historyFallback() : navigate(-Math.max(1, depth));

  /* THE BACK ARROW IS NOT THE CROSS, and the pair above spells out why: `_3()` jumps by the
     stack's whole depth and `o()` jumps by exactly 1. A dialog opened over another dialog —
     `/wallet/withdraw` reached from `/user/enter`, which is depth 2 — has to return to the one
     underneath it, and `closeOverlay` was walking straight past it to the page the stack was
     opened over. That is the whole of the "back from Withdraw leaves the profile" symptom.

     The direct-link fallback is the same as close's and for the same reason: a dialog reached by
     a pasted URL has nothing behind it to pop to. */
  const backOverlay = () => (pageLocation === location ? historyFallback() : navigate(-1));

  return (
    <>
      {/* The layout is OUTSIDE the routes, not repeated inside each one. That is how the
          original is built — its header, sidebar, tabbar and footer are mounted once by the
          shell and only the page under them swaps, which is also why the footer lives in
          MainLayout rather than on the Home page.

          `["/", "/casino"]` is the original's own pair — the list `ks()` tests before it lets
          the mobile header fade with scroll — but they are two DIFFERENT pages there, and now
          they are here too: /casino used to be a stand-in rendering Home and is now the real
          casino page. It takes an optional tab segment, `path: "/casino/:tab?"` in
          Enter-MsmOuq5R.js:8669, which React Router spells as a second route.

          The catch-all is still a stand-in — every href in the sidebar, tabbar and footer is
          a real route on the live site and most of those pages are not built, so anything
          else would 404 the moment you touched the chrome. It renders Home and keeps the URL,
          so the header's route-dependent behaviour is still exercised. */}
      <MainLayout>
        <RouteGate pathname={(isOverlayRoute ? pageLocation : location).pathname}>
        <Routes location={isOverlayRoute ? pageLocation : location}>
          <Route path="/" element={<Home />} />
          <Route path="/casino" element={<Casino />} />
          <Route path="/casino/:tab" element={<Casino />} />
          {/* `/game/:gameUnique` — the original's own path and param, and where every game tile
              points. See pages/Game for what is and is not on it. */}
          <Route path="/game/:gameUnique" element={<GamePage />} />
          {/* The Casino group's two signed-in rows — `/favorite` and `/recent`, the original's
              own paths out of the sidebar menu module. One component behind both; the pages are
              near-copies on the original too. See pages/GameCollection.

              Null while the sheet or the sign-in dialog is up, for the reason `/bonus` is: a
              dialog reached by URL has ITSELF as the background location, so the page arm would
              otherwise render underneath at a width it is not built for. */}
          {/* THE FOUR LIST PAGES, and every link into them was already written — the "All" pills on
              the home page and the casino lobby, and the Recommended Games row under /favorite and
              /recent, have always pointed here because these are the feed's and the chunks' own
              paths. They landed on the catch-all until the pages existed. See pages/GameList.

              `/section/hot_games?label=Recommended` and `/tagname/bingo?label=All%20Bingo%20Games`
              are why the title is a fallback chain rather than a map: a link may carry its own. */}
          <Route path="/section/:section" element={listDialog ? null : <SectionPage />} />
          <Route path="/gamelist/:type" element={listDialog ? null : <GameListRoute />} />
          <Route path="/tagname/:tag" element={listDialog ? null : <TagPage />} />
          <Route path="/game-related" element={listDialog ? null : <RelatedPage />} />
          {/* A provider's games, the Providers grid's own link. Live only: with fixtures on the path
              falls through to the catch-all exactly as before. */}
          {!USE_FIXTURES && <Route path="/provider/:name" element={<ProviderPage />} />}
          <Route
            path="/favorite"
            element={collectionDialog || collectionNeedsAuth ? null : <Favorites />}
          />
          <Route
            path="/recent"
            element={collectionDialog || collectionNeedsAuth ? null : <Recent />}
          />
          {/* Explore's mobile half. `guards: [() => !m.mobile && "/"]` on the original, and
              the redirect lives inside the page rather than here because it depends on a live
              matchMedia subscription — see pages/Explore. Above `lg` the same component is the
              header's portalled overlay instead. */}
          <Route path="/explore" element={<ExplorePage />} />
          {/* Global chat's mobile half, and the same shape as Explore's above: a page route
              carrying `guards: [() => !m.mobile && "/"]`, with the redirect inside the component
              because it depends on a live matchMedia subscription. Above `lg` the same panel is
              the right-hand drawer's `chat` arm instead. The tabbar's fifth button links here. */}
          <Route path="/chat-public" element={CHAT_AVAILABLE ? <ChatPublicPage /> : <Navigate to="/" replace />} />
          {/* THE SPORTS EXCHANGE (pages/Exchange, docs/exchange.md). The original's `/sports/*` was
              one mounted BetBy widget; it is replaced, at the user's request, by the native
              exchange — lobby, match page, My Bets, Statement — kept to hash.game's tokens and
              sports icons. The `sports` gate still covers the whole prefix (RouteGate above).
              `/sports/live` is the footer's link and lands on the lobby's In-Play view; any other
              `/sports/...` keeps its URL and shows the lobby, the catch-all's own trade. */}
          <Route path="/sports" element={<ExchangeLobby />} />
          <Route path="/sports/live" element={<Navigate to="/sports?sport=inplay" replace />} />
          <Route
            path="/sports/match/:sid/:gmid"
            element={
              <LazyRouteBoundary key={location.pathname}>
                <React.Suspense fallback={null}>
                  <ExchangeMatch />
                </React.Suspense>
              </LazyRouteBoundary>
            }
          />
          {/* Null while the sign-in dialog is up — see `sportsAccountNeedsAuth`. */}
          <Route path="/sports/my-bets" element={sportsAccountNeedsAuth ? null : <ExchangeMyBets />} />
          <Route path="/sports/statement" element={sportsAccountNeedsAuth ? null : <ExchangeStatement />} />
          <Route path="/sports/*" element={<ExchangeLobby />} />
          {/* `/promotions/promotion` is the original's own path — it is what the footer links
              to. Its siblings there (`/promotions/daily-contest`, `/promotions/weekly-raffle`,
              `/promotions/exclusive-promo`, `/promotion/:id`) are the individual promotion
              pages behind each card and are not built, so they still fall to the catch-all. */}
          <Route path="/promotions/promotion" element={promotionsDialog ? null : <Promotions />} />
          {/* One promotion — bc.game's `/promotion/:id`, with the platform's segment in the path
              because its slug is unique per segment. See `promotionDetailDialog`. */}
          <Route
            path="/promotion/:segment/:slug"
            element={promotionDetailDialog ? null : <PromotionDetail />}
          />
          {/* `/deposit-offer` is the original's own path too — a sibling of the promotions
              routes rather than a child of them, which is why it is not under /promotions
              despite being the sidebar's "Deposit Bonus" row under that group. Its
              `info: { dialog: m.mobile }` is the same flag the promotions page carries: a
              page on desktop, a full-screen dialog on a phone. */}
          <Route path="/deposit-offer" element={depositOfferDialog ? null : <DepositOffer />} />
          {/* `/blog` and `/blog/:slug` — this build's own pages (bc.game's Blog is an external
              site), on the user's request. Pages at every width, never dialogs; gated by the
              owner's `blog` feature through the RouteGate above (services/gates.js ROUTES). */}
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          {/* `/promotions/daily-contest` — the original's own path, loading
              Contest-Uqb1GQAo.js. Unlike /deposit-offer this one IS under the promotions
              family, so the footer already drops its prose band here and the sidebar group
              already opens itself. */}
          <Route path="/promotions/daily-contest" element={dailyContestDialog ? null : <DailyContest />} />
          {/* `/promotions/weekly-raffle` is not routed: removed on the user's request (2026-10-16),
              this platform runs no raffle. The page stays on disk in pages/WeeklyRaffle; the URL
              falls to the catch-all like the other removed products. */}
          {/* The VIP Club. `/vip-detail` is the page; `/vip` is the original's own alias for
              it, carrying `guards: [() => "/vip-detail"]` — a guard that returns a path is a
              redirect there, so both land on the same component. Its chunk was missing from
              the mirror and was recovered from the deploy's second origin; see
              services/vip.js. `/vip-level` and `/vip-offer` are siblings there and are not
              built. */}
          {/* Null while the sheet is up, for the reason `/bonus` is — a dialog reached by URL
              has itself as the background location, and the page arm would render underneath. */}
          <Route path="/vip-detail" element={vipDialog ? null : <VIP />} />
          <Route path="/vip" element={<Navigate to="/vip-detail" replace />} />
          {/* The Quest Hub. `/quests` is the original's own path and one of the two rows the
              sidebar only shows once you are signed in. Its route carries
              `guards: [() => !b.login && "/"]` and `dialog: !!m.mobile` — the guard is
              reproduced inside the page, the device test is not: only the desktop page arm is
              built, as on /wallet/withdraw. `/quests/sendemail`, `/quests/bind2fa` and
              `/quests/bindemail` are dialog siblings there and are not built. */}
          <Route path="/quests" element={questsDialog ? null : <Quests />} />
          {/* The Bonus page, the Quest Hub's sibling — the other sidebar row that only appears
              signed in. Same route shape: `guards: [() => b.login ? !1 : "/"]` reproduced inside
              the page, and `dialog: m.mobile ? {behavior: "no-title"} : !1` not, since only the
              desktop arm is built. `/free-plays` is a dialog sibling in the same group and IS
              built now — it is mounted below rather than here, for the reason every dialog route
              is. `/claimable-bonus` and `/v5` are the other two and are not. */}
          {/* Null while the dialog above is mounted, and that is not belt-and-braces: `<Routes>`
              renders the BACKGROUND location, which is the page you came from — except when the
              dialog is reached by URL, where background and current are the same `/bonus`. The
              desktop arm would then render underneath at phone width, where its two panels'
              `min-w-[22rem]` + `min-w-[18.75rem]` come to 664px and give the document a
              horizontal scrollbar behind a sheet that cannot use it. */}
          <Route path="/bonus" element={bonusDialog ? null : <Bonus />} />
          {/* The referral programme, and it is TWO PAGES that swap on sign-in. The router
              carries a matched pair of guards — `/referral` has
              `guards: [() => !b.login && "/referral-exhibition"]` and `/referral-exhibition` has
              `guards: [() => b.login && "/referral"]` — so each bounces to the other. Both are
              reproduced, inside the pages rather than here, because each needs the session.

              `/referral` used to redirect onto the exhibition page unconditionally, since
              `AffiliatePage` was not built and implementing the real guard would have sent a
              signed-in visitor to the catch-all. It is built now, so the stand-in is gone.

              `/referral/*` is one route rather than the original's layout-plus-children,
              because only the Dashboard child is built: `:section` is what lights the right tab
              for `/referral/my-rewards/commission` and friends, and the other three panes render
              the site's empty state. `/affiliate` is the original's own alias and still
              redirects onto `/referral`, one hop behind. */}
          <Route path="/referral-exhibition" element={referralExhibitionDialog ? null : <Referral />} />
          <Route path="/referral" element={<ReferralDashboard />} />
          <Route path="/referral/:section/*" element={<ReferralDashboard />} />
          <Route path="/affiliate" element={<Navigate to="/referral" replace />} />
          {/* The Help Center. `/help/:helpId` is the original's own shape, and bare `/help`
              redirects to `/help/provably-fair` there rather than rendering an index — the
              chunk does that itself (`pathname === "/help" && navigate("/help/provably-fair",
              { replace: true })`), so it is a real redirect and not a default route.

              Unusually for this project the page is not in the main bundle at all: it is two
              Module Federation remotes, `/modules/static/` for the shell and `/modules/games/`
              for the Provably Fair pane. See pages/Help/topics.js. Only the Provably Fair pane
              has its documents bundled; the other rail rows route but render empty. */}
          <Route path="/help" element={<Navigate to="/help/provably-fair" replace />} />
          {/* Null while the sheet is up, for the reason `/bonus` and `/vip-detail` are. */}
          <Route path="/help/:helpId" element={helpDialog ? null : <Help />} />
          {/* Responsible Gambling — `ResponsibleLayout` in the same `/modules/static/` remote
              as the Help Center, and routed the same way there: `/responsible/:responsibleId`
              plus a bare `/responsible` that renders the layout on its first row. The footer
              already links to `/responsible/faq`. `/gambling-limits` is the one rail row that
              is NOT under this path — a sibling route on the original, not built. */}
          <Route path="/responsible" element={responsibleDialog ? null : <Responsible />} />
          <Route path="/responsible/:responsibleId" element={responsibleDialog ? null : <Responsible />} />
          {/* The wallet. A LAYOUT ROUTE with children, which is the original's own shape:
              `{ path: "/wallet", component: WalletLayout, children: [{ path: "/balance" }, ...] }`
              in Enter-MsmOuq5R.js. The rail lives in the parent and the pane is the child, so
              moving down the rail swaps only the pane — which is what `replace` on each rail link
              is for.

              Nine children, and they are the deploy's own nine rather than every path under
              `/wallet`: see pages/Wallet/menu.js, where the profile table that picks them is
              recorded. all nine are built
              route, light their rail row and render the empty pane.

              `/wallet` itself has no index component on the original — the rail's first row is
              `/wallet/balance` and that is where the account dropdown and the sidebar both point,
              so a bare `/wallet` redirects onto it here rather than rendering a blank pane.

              Two guards are NOT reproduced, both documented at their call sites: the layout's own
              `guards: [ce]` (sign-in required — this build has no auth to gate on) and
              `/balance`'s `guards: [() => (mobile || isFiat) && "/deposit"]`, which sends a phone
              to the deposit dialog. `/deposit` is not built, so redirecting there would be worse
              than rendering the page. */}
          {/* GLOBAL SETTINGS — a LAYOUT ROUTE with six children, which is the original's own shape
              (`{ path: "/settings", component: PageSettingLayout, children: [...] }`). The rail
              lives in the parent and the pane is the child, so moving down the rail swaps only the
              pane — `replace` on each rail link, as on the wallet.

              THE INDEX CHILD IS THE DEVICE SPLIT. Its guard on the original is
              `!m.mobile && "/settings/account-info"`, so a desktop never sees it; a phone gets
              `DialogPageSetting`, the list of the six rows. Both arms are here, decided by the same
              1024 line everything else uses.

              `whitelist` is spelled lowercase where the router spells it `/whiteList` — see
              pages/Settings/menu.js; React Router matches case-insensitively by default, so the
              original's own href and its own route path both resolve.

              Blanked while the sheet is up, for the reason `/bonus` and `/favorite` are: a dialog
              reached by URL has itself as the background location.

              AN EMPTY FRAGMENT AND NOT `null`, WHICH IS THE ONE PLACE THAT DISTINCTION MATTERS.
              React Router picks a route's children with `match.route.element ? element : outlet`
              — a TRUTHY test, so `element={null}` does not render nothing, it renders the
              OUTLET. On the seventeen leaf routes above that is the same thing, because a leaf
              has no outlet; on this one, the only route here with children, it rendered the
              matched PANE with no layout around it. So on a phone every `/settings/*` pane was
              mounted TWICE — once invisibly under the sheet and once inside it — each with its
              own reads, its own dialog state and its own event subscriptions. Found by hit-
              testing the whitelist row's three-dot button and getting two of them, 18px apart.
              A fragment is an object, so the truthy test takes it and renders nothing at all. */}
          <Route
            path="/settings"
            element={settingsDialog || settingsNeedsAuth ? <></> : <SettingsLayout />}
          >
            <Route
              index
              element={isDesktop ? <Navigate to="/settings/account-info" replace /> : <SettingsMenuPage />}
            />
            <Route path="account-info" element={<SettingsAccountInfo />} />
            <Route path="security" element={<SettingsSecurity />} />
            <Route path="preferences" element={<SettingsPreferences />} />
            <Route path="verification" element={<SettingsVerification />} />
            <Route path="payment" element={<SettingsPayment />} />
            <Route path="whitelist" element={<SettingsWhitelist />} />
          </Route>
          <Route path="/wallet" element={<WalletLayout />}>
            <Route index element={<Navigate to="/wallet/balance" replace />} />
            <Route path="balance" element={<Balance />} />
            {/* The SAME component as the `/deposit` dialog below — `DialogChannelDeposit` is
                mounted by both routes, and the only difference is that this one carries no
                `dialog` flag in `info`, so the router provides no dialog context and the
                component renders its page arm: filled tabs instead of an underline, six coin
                chips instead of four, and wider card padding from `lg` up. All three branches
                are in context/dialogRoute.js. No provider is needed here — the context
                defaults to false, which IS the page case. */}
            <Route path="deposit" element={<DepositPanels />} />
            {/* Like `deposit` above, the same component both routes mount: `/withdraw` is in the
                dialog group (`{dialog: !0}` on the group in Enter-MsmOuq5R.js) and this one
                carries `info.dialog = mobile`, a device test that is false here. Only the pane
                is routed today; `WithdrawPanels` is split out of a shell it does not yet have
                for the day the dialog is added. Its own guard,
                `Pe.isFiat && !H.bcmx && "/deposit?type=withdraw"`, never fires on this deploy. */}
            <Route path="withdraw" element={<WithdrawPanels />} />
            {/* `DialogBuyCrypto`, and unlike deposit and withdraw this component has only ONE
                route — there is no top-level `/buy` dialog path. The parent's `info.dialog` is
                `m.mobile`, so on a desktop it is always the pane; its own guard,
                `Pe.isFiat && "/deposit"`, never fires on this deploy. */}
            {/* Buy Crypto is switched off on this site: old links land on Deposit. */}
            <Route path="buy" element={<Navigate to="/wallet/deposit" replace />} />
            {/* `DialogSwap`, one route like Buy Crypto and the same never-firing
                `Pe.isFiat` guard. */}
            <Route path="swap" element={<Swap />} />
            {/* `DialogVault`. The page is spread over three chunks rather than one —
                see the note at its head. */}
            <Route path="vault" element={<VaultPro />} />
            {/* `DialogTransaction` — five history lists behind one Type filter. Its
                filter state is seeded from the search params, which is what makes the Vault
                card's History link (`?type=bill&billType=Vault`) land pre-filtered. */}
            <Route path="transaction" element={<Transaction />} />
            {/* `DialogTurnover` — and `DialogTurnover2` resolves to the same chunk; only
                this one is routed. It shares the transaction pane's card shell, filter store
                and table. */}
            <Route path="rollover" element={<Rollover />} />
            {/* `DialogBetHistory`, and the last of the nine rail rows to be built. Cursor
                paging rather than offset: page one hits `bet-history-first/` and every page
                after it carries the previous response's `minDistributeId`. */}
            <Route path="bet-history" element={<BetHistory />} />
          </Route>
          {IS_DEV && (
            <Route
              path="/dev/exchange-kit"
              element={
                <React.Suspense fallback={null}>
                  <ExchangeKitPreview />
                </React.Suspense>
              }
            />
          )}
          {/* Two links that pointed at pages this build never had: the sidebar's Casino › Bingo
              and the home page's Racing card. Bingo is the bingo tag list (the home page's own
              "All Bingo Games" row); racing lives in the sports exchange. */}
          <Route path="/bingo" element={<Navigate to="/tagname/bingo?label=All%20Bingo%20Games" replace />} />
          <Route path="/racing" element={<Navigate to="/sports" replace />} />
          <Route path="*" element={<Home />} />
        </Routes>
        </RouteGate>
      </MainLayout>
      {/* The dialog routes are mounted beside <Routes>, so the page's RouteGate never sees them:
          `/bonus`, `/referral`, `/deposit`, `/free-plays`… opened as dialogs (every phone, and
          `/deposit` / `/free-plays` at any width) mounted for an agent-tree player and fired the
          reads the backend refuses (403 /user/bonus, /user/affiliate…). Gated on the CURRENT path:
          one dialog path matches at a time, and ungated ones (sign-in, profile) pass through. */}
      <RouteGate pathname={pathname}>
      {/* `/deposit`'s guard names the sign-up tab, `/user/enter`'s the sign-in one; on
          `/login/*` the path itself is the tab. */}
      {(showAuth ||
        depositNeedsAuth ||
        userEnterNeedsAuth ||
        collectionNeedsAuth ||
        sportsAccountNeedsAuth ||
        settingsNeedsAuth ||
        whitelistFormNeedsAuth ||
        phishingNeedsAuth ||
        passkeyNeedsAuth ||
        verifyNeedsAuth ||
        userActionNeedsAuth) && (
        <Auth
          mode={
            depositNeedsAuth
              ? 'regist'
              : userEnterNeedsAuth ||
                collectionNeedsAuth ||
                sportsAccountNeedsAuth ||
                settingsNeedsAuth ||
                whitelistFormNeedsAuth ||
                phishingNeedsAuth ||
                passkeyNeedsAuth ||
                userActionNeedsAuth ||
                verifyNeedsAuth
                ? 'signin'
                : authMode
          }
          onClose={closeOverlay}
          enter={dialogEnter}
        />
      )}
      {withdrawDetailDialog && (
        <WithdrawDetailDialog onClose={closeOverlay} onBack={backOverlay} enter={dialogEnter} />
      )}
      {depositDetailDialog && (
        <DepositDetailDialog onClose={closeOverlay} onBack={backOverlay} enter={dialogEnter} />
      )}
      {editProfileDialog && (
        <EditProfileDialog onClose={closeOverlay} onBack={backOverlay} enter={dialogEnter} />
      )}
      {verifyEnterDialog && (
        <VerifyEnterDialog onClose={closeOverlay} onBack={backOverlay} enter={dialogEnter} />
      )}
      {verifyDialog && (
        <VerificationDialog onClose={closeOverlay} onBack={backOverlay} enter={dialogEnter} />
      )}
      {phishingDialog && (
        <AntiPhishingDialog
          step={phishingStep}
          onClose={closeOverlay}
          onBack={backOverlay}
          enter={dialogEnter}
        />
      )}
      {passkeyDialog && (
        <PasskeyDialog onClose={closeOverlay} onBack={backOverlay} enter={dialogEnter} />
      )}
      {whitelistFormDialog && (
        <WhitelistAddressDialog
          mode={whitelistEditRoute ? 'edit' : 'add'}
          onClose={closeOverlay}
          onBack={backOverlay}
          enter={dialogEnter}
        />
      )}
      {userActionDialog && (
        <UserActionDialog
          action={pathname.split('/')[2] ?? ''}
          onClose={closeOverlay}
          onBack={backOverlay}
          enter={dialogEnter}
        />
      )}
      {showDeposit && <Deposit onClose={closeOverlay} />}
      {showFreePlay && <FreePlay onClose={closeOverlay} />}
      {/* The profile family. Only one can match at a time, so they are three lines rather than a
          switch, and each is mounted here rather than inside <Routes> for the reason every dialog
          route is. Note that costs them `useParams`: it resolves against a MATCHED <Route> and
          there is none, so the two that take a `:userId` read it off the pathname themselves. */}
      {profileRoute && <Profile onClose={closeOverlay} enter={dialogEnter} />}
      {medalsRoute && <ProfileMedals onClose={closeOverlay} enter={dialogEnter} />}
      {statisticsRoute && <ProfileStatistics onClose={closeOverlay} enter={dialogEnter} />}
      {/* Both of these draw a BACK arrow rather than a close cross — the phone arm of the
          title bar has no cross at all — so they take `onBack`. `onClose` is still threaded for
          Escape, which is a desktop affordance the shell keeps either way. */}
      {showUserEnter && <UserEnter onClose={closeOverlay} onBack={backOverlay} enter={dialogEnter} />}
      {withdrawDialog && <WithdrawDialog onClose={closeOverlay} onBack={backOverlay} enter={dialogEnter} />}
      {referralDialog && <ReferralDialog onClose={closeOverlay} onBack={backOverlay} enter={dialogEnter} />}
      {bonusDialog && <BonusDialog onClose={closeOverlay} onBack={backOverlay} enter={dialogEnter} />}
      {vipDialog && <VipDialog onClose={closeOverlay} onBack={backOverlay} enter={dialogEnter} />}
      {helpDialog && <HelpDialog onClose={closeOverlay} onBack={backOverlay} enter={dialogEnter} />}
      {promotionsDialog && (
        <PromotionsDialog onClose={closeOverlay} onBack={backOverlay} enter={dialogEnter} />
      )}
      {promotionDetailDialog && (
        <PromotionDetailDialog
          segment={promotionDetailMatch.params.segment}
          slug={promotionDetailMatch.params.slug}
          onClose={closeOverlay}
          onBack={backOverlay}
          enter={dialogEnter}
        />
      )}
      {dailyContestDialog && (
        <DailyContestDialog onClose={closeOverlay} onBack={backOverlay} enter={dialogEnter} />
      )}
      {/* `/favorite` and `/recent` below `lg`. BOTH TITLES ARE THE PAGES' OWN — each chunk's root
          is `<PageLayout title={t("…")}>`, and `w3` pushes that string into the router's dialog
          context, so it is the same word the desktop heading prints. Nothing here is chosen: the
          sidebar row says "Recent" and the page says "Continue Playing", and that difference is
          the original's.

          `pageGutter` because the page carries the inset itself at every width below `lg` — see
          the note on its root. */}
      {collectionDialog && (
        <PageDialog
          title={favoriteRoute ? 'Favorites' : 'Continue Playing'}
          onClose={closeOverlay}
          onBack={backOverlay}
          enter={dialogEnter}
        >
          {favoriteRoute ? <Favorites /> : <Recent />}
        </PageDialog>
      )}
      {/* `/settings/*` below `lg`. THE TITLE IS THE PANE'S OWN `PageLayout title`, which on a
          desktop is nothing at all: `w3` pushes it into the router's dialog context and returns
          bare children, so the same string is a title bar here and an invisible prop there. The
          bare path's own title is the layout's, "Global Settings" — the one string the rail also
          prints. Nothing here is chosen; see pages/Settings/menu.js.

          `pageGutter` because each pane carries its own `py-4 sm:py-0` and the cards inside bring
          their own horizontal padding — the shell's 1rem would be a second inset. */}
      {settingsDialog && (
        <SettingsDialog onClose={closeOverlay} onBack={backOverlay} enter={dialogEnter} />
      )}
      {listDialog && (
        <GameListDialog onClose={closeOverlay} onBack={backOverlay} enter={dialogEnter} />
      )}
      {/* THESE THREE TITLES ARE THIS BUILD'S, AND THE ORIGINAL SHOWS NONE — a deliberate
          departure, requested, and worth knowing before anyone "corrects" it back. Each of these
          chunks was fetched and read: `index-BLT5gN04.js`, `index-DcrUJi8K.js` and the static
          remote's `index-CdxGH7-n.js` mount no dialog wrapper and push no title, so on bc.game
          the bar over these pages really is a bare back arrow. (Promotions and Quests do push
          one, which is why theirs are transcribed rather than chosen.)

          Three of the four are the original's own name for the route, out of the sidebar menu
          module `index-DuwOs_Mv.js`, which is in the mirror:
          `label: () => e("Weekly Raffle"), link: "/promotions/weekly-raffle"`, and Referral's is
          corroborated twice over — the menu says `label: () => e("Referral")` and the exhibition
          chunk itself carries a lone `get title(){return c("Referral")}`. Responsible Gambling is
          the page's own heading and an i18n value in `index-Dn9m_cUp.js`.

          "DEPOSIT OFFER" IS CHOSEN, NOT SOURCED, and it is the one string here that is nobody's
          but ours — requested, over the menu's own `label: () => e("Deposit Bonus"),
          link: "/deposit-offer"`. It matches the route and the component instead, and it also
          keeps the bar clear of the page's own "Monthly Deposit Bonus" card, which the menu label
          reads as a heading for. Worth knowing the sidebar row that reaches this page still says
          Deposit Bonus, so the two now differ on purpose.

          `/vip-detail` is deliberately NOT given one: its route carries
          `behavior: "transparent-title"`, so the bar is clear and floats over the hero artwork,
          and a title there would print across the banner. */}
      {depositOfferDialog && (
        <PageDialog
          title="Deposit Offer"
          onClose={closeOverlay}
          onBack={backOverlay}
          enter={dialogEnter}
        >
          <DepositOffer />
        </PageDialog>
      )}
      {questsDialog && (
        <PageDialog
          title="Quests"
          onClose={closeOverlay}
          onBack={backOverlay}
          enter={dialogEnter}
          /* `class: "dialog-item bg-layer1 [&_.dialog-title]:bg-transparent
             [&_.scroll-y]:[scrollbar-width:none]"` — the quest chunk's own, and the first two are
             reproduced. They carry `!` because the shell's `.dialog-overlayer` fill and
             `.dialog-title` fill are both UNLAYERED, so a plain utility would lose the cascade;
             an important one wins. The scrollbar-width half is left off for the reason the
             promotions dialog leaves it off. */
          className="[&_.dialog-overlayer]:!bg-layer1 [&_.dialog-title]:!bg-transparent"
        >
          <Quests />
        </PageDialog>
      )}
      {referralExhibitionDialog && (
        <PageDialog
          title="Referral"
          onClose={closeOverlay}
          onBack={backOverlay}
          enter={dialogEnter}
        >
          <Referral />
        </PageDialog>
      )}
      {/* `pageGutter={false}` — the exception among these mounts, and the page is what decides
          it: `/responsible` carries NO `px-4` of its own on either arm (its desktop root is
          `page-main flex flex-wrap gap-x-4`, inset by the layout container instead), and the
          chunk's mobile arm carries none either — it leaves the inset to `.dialog-content`'s own
          `padding-inline: 1rem`, exactly as the Help Center's does. Zeroing the shell's half here
          would put the Select and the card flush against the sheet's edges. */}
      {/* THE ONE ROUTE WHOSE "NOTHING BEHIND IT" IS NOT THE HOME PAGE. `closeOverlay` and
          `backOverlay` both fall back to the browser's own previous entry when
          `pageLocation === location`, and to `/` when there is not one — the
          dialog-reached-directly case: a link opened in a fresh tab, where `pageLocation` was
          seeded with the dialog's own location and this app has never rendered a page under it.
          That pair is right for `/deposit` and the profile dialogs, which the header and the
          chrome open from anywhere.

          It is wrong here. On a phone this panel has exactly one entry point in this build — the
          Notification row on `/user/enter` — so the page it was opened over is the account page,
          and Home is a destination the visitor never came from. Reproduced as the original's `Bd`
          behaves: back as far as the stack goes, and failing that, the page the stack was opened
          over. Note the ordinary case is untouched — with a real history entry behind it both
          handlers still go back one, and this branch never runs. */}
      {notificationDialog && (
        <NotificationDialog
          onClose={() => (pageLocation === location ? navigate('/user/enter') : closeOverlay())}
          onBack={() => (pageLocation === location ? navigate('/user/enter') : backOverlay())}
          enter={dialogEnter}
        />
      )}
      {responsibleDialog && (
        <PageDialog
          title="Responsible Gambling"
          pageGutter={false}
          onClose={closeOverlay}
          onBack={backOverlay}
          enter={dialogEnter}
        >
          <Responsible />
        </PageDialog>
      )}

      </RouteGate>

      {/* The desktop arm of `/user/enter`'s own guard. A redirect rather than a dialog, so the
          URL does not sit on a path that renders nothing — and `replace` so the back button does
          not walk straight into it again. */}
      {userEnterRoute && isDesktop && <Navigate to="/" replace />}
      {blocked && isDesktop && (
        <RegionBlock onClose={() => setBlocked(false)} region={region} dismissible={region?.mode !== 'block'} />
      )}
    </>
  );
}

/* The provider wraps the shell rather than living inside it, so `useSession` is available to
   everything the shell renders — including the dialog above, which reads the same session for
   the Ray ID and IP it prints. */
function App() {
  return (
    /* SETTINGS OUTSIDE SESSION, and that ordering is the original's. `setting` and `account` are
       two independent persisted stores, but the dependency runs one way: the account dropdown
       and the mobile account page both offer the theme control, so a settings reader sits inside
       the session tree and never the reverse. Signing out must not reset the theme. */
    <SettingsProvider>
      <SessionProvider>
        <GatesProvider>
          <AppShell />
        </GatesProvider>
      </SessionProvider>
    </SettingsProvider>
  );
}

export default App;
