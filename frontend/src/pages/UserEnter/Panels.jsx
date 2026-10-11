import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSession } from '../../context/session';
import { amount2usd, getAlias, printCurrency } from '../../utils/currency';
import { VIP_LEVELS, vipTier, vipTypeNum } from '../../data/vipConfig';
import { getInvitationCode } from '../../services/referral';
import useResource from '../../hooks/useResource';
import SOCIALS from '../../components/modals/RegionBlock/icons';
import DisturbSetting from '../../layouts/MainLayout/Header/AfterLogin/DisturbSetting';
import {
  IconArrow,
  IconBetHistory,
  IconFreePlays,
  IconLogOut,
  IconReferral,
  IconRollover,
  IconSettings,
  IconTransaction,
  IconVaultPro,
  IconWithdraw,
} from '../../layouts/MainLayout/Header/AfterLogin/icons';
import {
  IconAnnualReport,
  IconAttention,
  IconBuy,
  IconCopy,
  IconCurrency,
  IconDarkMode,
  IconDeposit,
  IconEmail,
  IconLanguage,
  IconLightMode,
  IconLiveSupport,
  IconNotice,
  IconReferEarn,
  IconSwap,
  IconTheme,
} from './icons';
import CopyInput from '../../components/shared/CopyInput';
import { useSettings } from '../../context/settings';
import avatarImg from '../../assets/avatars/105522617.png';
import balanceCoin from '../../assets/user-enter/balance_coin.png';
import referArt from '../../assets/user-enter/refer.png';

/* Everything inside `/user/enter`'s scroller. The dialog shell around it is index.jsx.
 *
 * `S6`, the default export of `Enter-LgsyJFjc.js`, is six components stacked in one
 * `<div class="bg-layer2 pt-4">` under the profile header:
 *
 *   <PageLayout class="scroll-noheader-dialog">
 *     <ProfileHeader/>                                   <- $2
 *     <div class="bg-layer2 pt-4">
 *       <VipCard/>                                       <- M2
 *       <BalanceCard/>                                   <- W2
 *       <SettingsCards/>                                 <- X2
 *       <Show when={!isOfflineAgent}><ReferBanner/></Show>   <- l6
 *       <SupportBlock/>                                  <- O2
 *     </div>
 *   </PageLayout>
 *
 * `scroll-noheader-dialog` generates nothing — not in the mirror's six stylesheets, not in the
 * account remote's own, and not in the current deploy's. Kept like `page-main` on the wallet and
 * `header-nav-item` in the account dropdown.
 */

/* ------------------------------------------------------------------------------------------ */
/* The profile header — `$2`.                                                                   */
/* ------------------------------------------------------------------------------------------ */

/* Two things here look like mistakes and are not.
 *
 * `L2` — `<div class="absolute left-0 top-0 -z-10 h-[60vh] w-full">` — is returned alongside the
 * header and is never given a background, a child or a class of its own. It paints nothing. It is
 * the slot a tier backdrop would fill and it is empty on this deploy; kept as written.
 *
 * `box-content` on the header is the second. It is inert as the markup now stands — nothing pads
 * this box — but it is the class that would make a `padding-top` here behave: with
 * `box-sizing: content-box` the declared `h-18` is the CONTENT height, so padding would grow the
 * box rather than eat into it and the `absolute bottom-0` child would stay pinned to the bottom
 * edge. See the note on the dead `h-22` inside it, which is NOT inert and had to go.
 *
 * The avatar's purple ring is part of the PNG, not a VIP frame — the same finding the desktop
 * header records. `h1` wraps the image in the federated `Frame` component keyed off
 * `userAvatarFrameList`, and this account's list is empty, so `Frame` renders its child alone.
 */
function ProfileHeader() {
  const { session } = useSession();
  const navigate = useNavigate();

  const copyId = (event) => {
    event.stopPropagation();
    navigator.clipboard?.writeText(String(session.userId)).catch(() => {});
  };

  return (
    <>
      <div className="absolute left-0 top-0 -z-10 h-[60vh] w-full" />

      {/* NO PADDING HERE — the chunk's own class list, and the arithmetic is worth writing down
          because this element and the back arrow pull against each other.

          The arrow is pinned to the title bar's BOTTOM (`bottom: B`) and the content starts at
          `--safe-header`, so the visible gap between them is exactly `B + this padding` and
          `--safe-top` cancels out of it entirely: raising the inset moves the bar and the content
          down together. The arrow is at the top of its bar (`B: 2rem`, its ceiling), which already
          spends 32px of that gap, and a `pt-4` here was adding 16 more on top — 48px against the
          original's 12. Dropped, so the gap is the arrow's own 32.

          If it needs to be tighter still, the only remaining lever is lowering the arrow: reducing
          `--safe-top` moves both ends and changes nothing. */}
      <div className="relative box-content h-18 w-full flex-none bg-layer2">
        {/* `h-22` IS DROPPED, AND IT IS THE `w-30` TRAP A THIRD TIME — the one class of bug where
            Tailwind v4 diverges from the original by ADDING a rule rather than missing one.

            The chunk writes this div `h-22 absolute bottom-0 z-[1] w-full`, and `.h-22` is in NONE
            of the stylesheets this deploy ships: v3's height scale steps 20 -> 24, and the account
            remote's own sheet carries `.h-20`, `.h-24`, `.h-25` and `.h-28` but no 22. So on the
            live site the class resolves to nothing and the box is AUTO height — exactly its `h-16`
            child, 64px — which pins the avatar row flush to the header's bottom edge.

            Tailwind v4 generates the spacing scale on demand, so writing it emitted 88px: 24px
            taller than its content, and since the box is `bottom-0` the whole row was pushed 24px
            UP off the header's bottom. That is the gap that read as too large between the avatar
            and the VIP card — it was never padding, it was a phantom class. Compare the note on
            `w-30` in AfterLogin/index.jsx, and the counter-example in Vault Pro's file where
            `h-18` really is in the original's sheet and must be kept. */}
        <div
          className="absolute bottom-0 z-[1] w-full"
          onClick={() => navigate(`/user/profile/${session.userId}`)}
        >
          <div className="flex h-16 w-full items-center px-4">
            <div className="size-16 rounded-full bg-layer5 p-1">
              <div className="center h-full w-full rounded-full">
                <img alt="avatar" className="h-full w-full rounded-full" src={avatarImg} />
              </div>
            </div>

            <div className="ml-3">
              <p className="whitespace-nowrap text-xl font-extrabold">{session.name}</p>
              <div className="mt-1 flex items-center">
                <span className="font-semibold text-secondary">ID: {session.userId}</span>
                {/* `onClick` with `stopPropagation` first, so copying the ID does not also open
                    the profile the whole block navigates to. */}
                <IconCopy className="size-5 fill-secondary" onClick={copyId} />
              </div>
            </div>

            <IconArrow className="ml-auto size-5 rotate-180 fill-secondary" />
          </div>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* The VIP card — `M2`.                                                                          */
/* ------------------------------------------------------------------------------------------ */

/* `S1` out of `Tool-iuNkSQmo.js`, and it is NOT `compactXp` from the bonus page's level card:
 * this one pins two decimals at every magnitude, which is what makes the capture read
 * "1.00K XP to BRONZE I" rather than "1K". Both are the original's, in different chunks. */
const compactXp = (value) =>
  value < 1e3
    ? value
    : value < 1e6
      ? `${(value / 1e3).toFixed(2)}K`
      : value < 1e9
        ? `${(value / 1e6).toFixed(2)}M`
        : `${(value / 1e9).toFixed(2)}B`;

const MAX_LEVEL = VIP_LEVELS[VIP_LEVELS.length - 1].level;

function VipCard() {
  const { session } = useSession();

  const tier = vipTier(session.vipLevel);
  const num = vipTypeNum(session.vipLevel);
  const atMax = session.vipLevel >= MAX_LEVEL;

  /* `d()` verbatim, including the fact that it is NOT clamped: the original divides straight
     through and only substitutes 100 at the top of the ladder. */
  const span = session.levelEndXP - session.levelStartXP;
  const percent = atMax ? 100 : ((session.currXP - session.levelStartXP) / span) * 100;
  const width = `${percent.toFixed(2)}%`;

  /* The next tier's NAME comes from the ladder rather than from the account: the card looks up
     the row whose `minXp` equals this account's `levelEndXP`. See pages/Bonus/LevelCard.jsx —
     a mismatch there prints the original's own `--`, and the account fixture was corrected onto
     a real band because of it. */
  const nextRow = VIP_LEVELS.find((row) => row.minXp === session.levelEndXP);

  return (
    <div className="relative z-[11] px-4">
      <div className={`relative rounded-xl bg-layer4 p-3 user-vip-${num}-bg`}>
        <div className="flex h-5 items-center">
          <span className="mr-2 text-base font-extrabold uppercase">{tier.fullName}</span>
        </div>

        {/* THE XP LINE IS ON THE PROGRESS ROW, NOT UNDER THE TIER NAME. `t(u, <Show .../>, null)`
            appends it to the `mt-3 flex h-5 w-full items-center` row, so the bar takes `flex-1`
            and the text sits beside it on the right — which is what the capture shows. */}
        <div className="mt-3 flex h-5 w-full items-center">
          <div className="relative mt-1 flex-1 pr-2">
            <div className="relative h-2 w-full rounded-lg bg-black_alpha20">
              <div className={`h-full rounded-lg user-vip-${num}-progress`} style={{ width }} />
              {/* Three concentric discs, all pinned to the same `left` and pulled back half
                  their own width — the knob at the head of the bar. */}
              <div
                className={`absolute -top-2 ml-px h-6 w-6 -translate-x-1/2 rounded-full user-vip-${num}-c1`}
                style={{ left: width }}
              />
              <div
                className={`absolute -top-[3px] ml-px h-3.5 w-3.5 -translate-x-1/2 rounded-full user-vip-${num}-c2`}
                style={{ left: width }}
              />
              <div
                className={`absolute top-[0px] ml-px h-2 w-2 -translate-x-1/2 rounded-full user-vip-${num}-c3`}
                style={{ left: width }}
              />
            </div>
          </div>

          {!atMax && (
            <div className="ml-2 flex h-5 flex-none items-center">
              <span>{compactXp(session.levelEndXP - session.currXP)} XP</span>
              <span className="mx-1">to</span>
              <span className="uppercase text-secondary">
                {nextRow ? vipTier(nextRow.level).fullName : '--'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Not built: the VIP host row under a hairline, gated on
          `hostCard?.userProfile === 2` from `/game/support/vip-v2/get/`. No captured response
          carries a `hostCard` and no endpoint here answers for one, so both of its arms would be
          inventing an account relationship — the same call the bonus page's VIP panel makes. */}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Total Balance, the two buttons and the tile grid — `W2`.                                      */
/* ------------------------------------------------------------------------------------------ */

/* `p()` verbatim, `show` and all. `Annual Report` is `show: !1` on this deploy — the same tenth
   entry the wallet rail filters out through its route profile — and is kept for that reason: the
   list's ORDER is what lays the grid out, so a deleted row would silently reflow it the day the
   flag turns on. The one this build cannot draw is `dot`, `FreePlayDot`'s unread count, which
   needs a claimable-bonus feed. */
const TILES = [
  { label: 'Buy', Icon: IconBuy, link: '/wallet/buy', show: true },
  { label: 'Swap', Icon: IconSwap, link: '/wallet/swap', show: true },
  { label: 'Vault Pro', Icon: IconVaultPro, link: '/wallet/vault', show: true },
  { label: 'Transaction', Icon: IconTransaction, link: '/wallet/transaction', show: true },
  { label: 'Rollover', Icon: IconRollover, link: '/wallet/rollover', show: true },
  { label: 'Bet History', Icon: IconBetHistory, link: '/wallet/bet-history', show: true },
  { label: 'Free Plays', Icon: IconFreePlays, link: '/free-plays', show: true, dot: true },
  { label: 'Annual Report', Icon: IconAnnualReport, link: '/wallet/annual-report', show: false },
];

function BalanceCard() {
  const { session, balances } = useSession();
  const navigate = useNavigate();

  /* `Object.values(x1).reduce((g, a) => g.add(convertCurrency(a.amount, a.currencyName)))` —
     the whole wallet converted coin by coin and then summed, which is the same figure the
     wallet's Balance pane prints in its first cell. Adding raw amounts across coins would be
     meaningless. */
  const total = printCurrency(
    balances.reduce((sum, coin) => sum + amount2usd(coin.amount, coin.currencyName), 0),
    'USDFIAT',
    { settings: session.setting },
  );

  return (
    <div className="mt-4 px-4">
      <div className="flex items-center px-2 py-1">
        <img alt="balance" className="mr-1 h-6 w-6" src={balanceCoin} />
        <span className="font-semibold text-secondary">Total Balance</span>
        <span className="ml-auto text-base font-extrabold">{total}</span>
      </div>

      <div className="rounded-lg bg-layer4 p-3">
        <div className="flex w-full items-center justify-between gap-3">
          {/* `size: "m"` is passed EXPLICITLY on these two, and that matters on this page: `ot`
              derives it as `size || !mobile && "m"`, so on a phone — which is the only place
              this page renders — every button that does NOT name a size gets none. The eight
              tiles below are that case and correctly carry no `button-m`.

              Neither icon names a fill. They get one from `.icon`'s `currentColor`, which on
              `.button-brand` is the black `primary_brand` and on `.button-second` the pale
              `button_bright` text — so the mark always matches the label beside it. The `icon`
              class has to be written at the call site here because this project's icon
              components are the bare <svg> without the original's wrapper. */}
          <button
            type="button"
            className="button button-m button-brand flex-1"
            onClick={() => navigate('/wallet/deposit')}
          >
            <IconDeposit className="icon size-6" />
            <span className="ml-2 font-semibold">Deposit</span>
          </button>
          <button
            type="button"
            className="button button-m button-second flex-1"
            onClick={() => navigate('/wallet/withdraw')}
          >
            <IconWithdraw className="icon size-6" />
            <span className="ml-2 font-semibold">Withdraw</span>
          </button>
        </div>

        <div className="mt-1 flex w-full flex-wrap">
          {TILES.filter((tile) => tile.show).map(({ label, Icon, link }) => (
            <button
              key={label}
              type="button"
              onClick={() => navigate(link)}
              className="button center relative mt-2 h-14 w-1/4 flex-none flex-col overflow-hidden px-0 py-0"
            >
              <Icon className="size-6 flex-none fill-secondary" />
              <span className="mt-1 line-clamp-2 w-full break-words px-1 text-center text-xs font-semibold leading-tight">
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* The two settings cards — `X2`.                                                                */
/* ------------------------------------------------------------------------------------------ */

/* The chevron every row ends in. `setting-button` is the raised square (index.css); `size-4.5`
   is 18px, and the arrow points left in the file, so every one of them is `rotate-180`.

   `className` exists because the chunk puts `ml-auto` on the BUTTON in the rows that have nothing
   else on the right, and on a `ml-auto flex items-center` WRAPPER in the three that do (a count
   badge, a value, a status mark). Both spellings are reproduced rather than normalised onto a
   wrapper: they are the same pixels here, and the difference is what tells you at a glance which
   rows the original expected to grow a second element. */
const Chevron = ({ className = '' }) => (
  <button type="button" className={`setting-button center size-6 rounded-md ${className}`}>
    <IconArrow className="size-4.5 rotate-180 fill-secondary" />
  </button>
);

const RowLabel = ({ children }) => (
  <span className="ml-3 whitespace-nowrap text-base font-semibold">{children}</span>
);

/* `z1` out of `Status-DpPfKxTy.js`, in its `withImg` arm: a green tick when the account's
 * security status is strong and the amber attention mark otherwise. `u()` is the status hook in
 * `Tools-DlgQcNJh.js` and it reads the account's 2FA / email / phone bindings, none of which this
 * build models — so only the not-strong arm is drawn, which is also the arm the capture shows.
 *
 * `fill-setting-yellow` is `#ff9820` in the remote's own bootstrap CSS; this project already
 * carries that value as `warning`. */
const SecurityStatus = () => <IconAttention className="size-5 fill-warning" />;

function SettingsCards({ onRefer, onLanguage, onCurrency, confirm }) {
  const { session } = useSession();

  /* `O.langs[R.lang]?.[0] ?? "English"`. There is no language store in this build — the
     language/currency modal keeps its choice in its own state — so this is the fallback the
     original prints for an unrecognised locale, and it is the right string for the one locale
     that ships. */
  const language = 'English';

  /* `enableLocaleCurrency ? getAlias(localeCurrencyName).replace(/FIAT$/, "") : t("None")`.
     `getAlias` is the catalogue lookup rather than a suffix strip — KLAY prints KAIA — and the
     strip after it is what turns USDFIAT into USD. */
  const currency = session.setting.enableLocaleCurrency
    ? getAlias(session.setting.localeCurrencyName).replace(/FIAT$/, '')
    : 'None';

  return (
    <div className="px-4">
      <div className="mt-3 w-full rounded-lg bg-layer4 py-2">
        {/* The SAME component the desktop account dropdown's last row is — a federated child out
            of `Disturb-CUKXIk9c.js`, rendered by both. Its `max-sm:` arms are dead in the
            dropdown (desktop-only) and live here, which is where its bottom hairline comes
            from. */}
        <DisturbSetting confirm={confirm} />

        <Link
          to="/notification"
          className="btn-like flex h-11 w-full items-center px-3"
        >
          <IconNotice className="size-6 fill-secondary" />
          <RowLabel>Notification</RowLabel>
          <div className="ml-auto flex items-center">
            {/* `Badge` in its default `type: "number"` arm — the green count pill, which renders
                nothing at zero and caps at `99+`. The desktop header uses the same component's
                OTHER arm, the bare dot. */}
            {session.redDot.systemNotice !== 0 && (
              <div className="badge mr-2">
                {session.redDot.systemNotice > 99 ? '99+' : session.redDot.systemNotice}
              </div>
            )}
            <Chevron />
          </div>
        </Link>

        {/* `J.emit("open-refer")` — the same event the sidebar's Refer and Earn row emits, and
            the same dialog it opens. */}
        <div
          className="btn-like mt-1 flex h-11 w-full items-center px-3"
          onClick={onRefer}
        >
          <IconReferEarn className="size-6 fill-secondary" />
          <RowLabel>Refer and Earn</RowLabel>
          <Chevron className="ml-auto" />
        </div>

        {/* `/referral` and NOT `/referral-exhibition`: this row can only be reached signed in,
            which is the side of that pair the dashboard serves. */}
        <Link to="/referral" className="btn-like mt-1 flex h-11 w-full items-center px-3">
          <IconReferral className="size-6 fill-secondary" />
          <RowLabel>Referral</RowLabel>
          <Chevron className="ml-auto" />
        </Link>
      </div>

      <div className="mt-3 w-full rounded-lg bg-layer4 py-2">
        <Link to="/settings" className="btn-like mt-1 flex h-11 w-full items-center px-3">
          <IconSettings className="size-6 fill-secondary" />
          <RowLabel>Global Setting</RowLabel>
          <div className="ml-auto flex items-center">
            <SecurityStatus />
            <Chevron className="ml-2" />
          </div>
        </Link>

        <div
          className="btn-like mt-1 flex h-11 w-full items-center px-3"
          onClick={onLanguage}
        >
          <IconLanguage className="size-6 fill-secondary" />
          <RowLabel>Language</RowLabel>
          <div className="ml-auto flex items-center">
            <p className="mr-3 text-secondary">{language}</p>
            <Chevron />
          </div>
        </div>

        {/* `f.$$click = () => !r && J.emit("open-fiat")`, where `r` is `isFiat` — a fiat-only
            white label, false on this deploy, so both the handler and the chevron render. */}
        <div
          className="btn-like mt-1 flex h-11 w-full items-center px-3"
          onClick={onCurrency}
        >
          <IconCurrency className="size-6 fill-secondary" />
          <RowLabel>Currency</RowLabel>
          <div className="ml-auto flex items-center">
            <p className="mr-3 text-secondary">{currency}</p>
            <Chevron />
          </div>
        </div>

        {/* The one row with no `btn-like` and no handler — the control is the whole of it. */}
        <div className="mt-1 flex h-11 w-full items-center px-3">
          <IconTheme className="size-6 fill-secondary" />
          <RowLabel>Theme</RowLabel>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}

/* `I2` — a two-cell segmented control with a sliding pill behind it. The pill is positioned by
 * an inline `left` (`0.125rem` dark, `2.25rem` light) rather than by a transform, so the
 * transition is `transition-all` on the element itself.
 *
 * IT IS LIVE NOW. The note that used to sit here said it was inert because the light palette did
 * not exist; it does (see the block in index.css), so the whole of the chunk's own behaviour is
 * reproduced. `Enter-LgsyJFjc.js` gives it in full, so none of the below is inferred:
 *
 *   o.$$click = () => i1("theme","dark")
 *   t(o, l(M1, { class: `size-4 ${R.darken ? "fill-alw_white" : "fill-tertiary"}` }))
 *   g.$$click = () => i1("theme","light")
 *   t(g, l(j1, { class: `size-4 ${R.darken ? "fill-tertiary" : "fill-alw_white"}` }))
 *   W(a => q(p, "left", R.darken ? "0.125rem" : "2.25rem"))
 *
 * Note the two cells SET a theme rather than toggling one — clicking the cell you are already on
 * is a no-op, not a switch. That is what makes it a segmented control rather than a switch, and
 * it is why there is no single `onClick` here.
 *
 * `fill-alw_white` on the ACTIVE icon in both themes, which is not the slip it looks like: the
 * pill is `bg-tab_selected`, and that token inverts rather than lightening — #3A4142 in the dark
 * theme and #1B1A1A, a near-black, in the light one. So the active cell is a dark pill either
 * way and white is right on both.
 *
 * ONE LINE OF `I2` IS DELIBERATELY NOT PORTED. It opens with
 * `g1(() => document.documentElement.classList.toggle("dark", R.darken))` — a SECOND application
 * of the class, onto `<html>`, on top of the one the app's own boot already makes onto
 * `.app-root`. Harmless there because both are driven by the same flag and Tailwind v3's class
 * strategy accepts either ancestor. Here it would be actively wrong: this build's `dark` variant
 * is `&:where(.dark, .dark *)`, so a `.dark` on `<html>` makes EVERY element in the document a
 * `.dark` descendant and every `dark:` utility would keep applying in the light theme. One
 * writer, `applyTheme` in context/settings.js, and nothing else touches the class.
 */
function ThemeToggle() {
  const { darken, setTheme } = useSettings();

  return (
    <div className="ml-auto flex flex-none items-center">
      <div className="relative flex rounded-lg bg-layer2 p-0.5">
        <div
          className="absolute top-0.5 size-8 rounded-lg bg-tab_selected transition-all ease-out"
          style={{ left: darken ? '0.125rem' : '2.25rem' }}
        />
        <div className="center relative size-8" onClick={() => setTheme('dark')}>
          <IconDarkMode className={`size-4 ${darken ? 'fill-alw_white' : 'fill-tertiary'}`} />
        </div>
        <div className="center relative ml-0.5 size-8" onClick={() => setTheme('light')}>
          <IconLightMode className={`size-4 ${darken ? 'fill-tertiary' : 'fill-alw_white'}`} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* The referral banner — `l6`.                                                                   */
/* ------------------------------------------------------------------------------------------ */

/* `printCurrency(new Decimal(1e3))` — a literal 1000 in the account's display currency, the same
 * figure the Refer and Earn dialog's headline prints through its `__number__` slot.
 *
 * `p()` is the commission rate and it comes off `/agent/invitation/code/custom/` as `ratio`,
 * DEFAULTING TO .15 when the response omits it. The capture reads 25%, so the live response
 * carried `ratio: 0.25` for that account — but `ratio` is per-account, this build's fixture is an
 * invented account, and the Refer dialog already prints the chunk's own 15%. Two surfaces reading
 * one rate matters more than matching a figure that cannot be derived, so the default stands.
 */
const REFERRAL_REWARD = 1000;

function ReferBanner() {
  const { session } = useSession();
  const { data } = useResource(getInvitationCode);

  const link = data?.invitationUrl ?? '';
  const ratio = data?.ratio ?? 0.15;

  return (
    <div className="mt-3 px-4">
      <div className="flex items-center rounded-lg bg-layer4 px-3 py-2">
        <img alt="refer" className="w-16 flex-none" src={referArt} />
        <div className="ml-1.5 flex-1 overflow-hidden">
          <p className="font-semibold text-secondary">
            <span>Referral &amp; get</span>
            <span className="mx-1 text-primary">
              {printCurrency(REFERRAL_REWARD, 'USDFIAT', { settings: session.setting })} +{' '}
              {ratio * 100}%
            </span>
            <span>commission</span>
          </p>
          <CopyInput value={link} className="mt-1.5" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Live Support, Leave Feedback, the community card and Sign Out — `O2`.                         */
/* ------------------------------------------------------------------------------------------ */

function SupportBlock({ onSignOut }) {
  const navigate = useNavigate();

  return (
    <div className="mb-6 mt-3 w-full px-4">
      {/* `J.emit("live_support", !0)` opens the support widget, which is not built. Inert. */}
      <div className="btn-like flex h-11 w-full items-center rounded-lg bg-layer4 px-3">
        {/* The one icon on the page whose fill differs between themes — `fill-secondary
            dark:fill-brand`, and both arms are written now that `dark:` keys off the class. */}
        <IconLiveSupport className="size-6 fill-secondary dark:fill-brand" />
        <RowLabel>Live Support</RowLabel>
        <Chevron className="ml-auto" />
      </div>

      {/* `/user/enter/feedback` is a dialog sibling of this route and is not built, so this
          lands on the catch-all. Left navigating rather than made inert because the path is the
          original's own — the trade the sidebar's rows were converted under. */}
      <div
        className="btn-like mt-3 flex h-11 w-full items-center rounded-lg bg-layer4 px-3"
        onClick={() => navigate('/user/enter/feedback')}
      >
        <IconEmail className="size-6 fill-secondary" />
        <RowLabel>Leave Feedback</RowLabel>
        <Chevron className="ml-auto" />
      </div>

      {/* THE SQUARE IS NOT `components/shared/CommunityItem`. That component is
          `CommunityItem-DguQXLpB.js`, a 40px `btn-like … rounded-lg` button in `text-secondary`
          which the footer and the sidebar card share; this list is written inline in the account
          page's own chunk as `center h-10 w-10 rounded-md bg-layer3` with no text colour, so its
          marks take the page's white rather than the footer's grey. Different radius, different
          colour, different file — they are not the same square and are not merged.

          The eight entries ARE the same `Kk` list, so the data is shared and only the icon's
          class is replaced. `target="_black"` is the chunk's own typo; kept like `f-ull` and
          `texxt-sm`, with `rel` added because an unnamed target on a live link is a real
          risk this build does not have to reproduce. */}
      <div className="mt-3 w-full rounded-lg bg-layer4 px-3 py-4">
        <p className="w-full text-center text-base font-semibold">Join Our Community</p>
        <div className="mt-3 flex items-center justify-center gap-2">
          {SOCIALS.map((social) => (
            <a
              key={social.label}
              className="center h-10 w-10 rounded-md bg-layer3"
              href={social.href}
              target="_black"
              rel="noreferrer"
              aria-label={social.label}
            >
              {React.cloneElement(social.icon, { className: 'icon size-6' })}
            </a>
          ))}
        </div>
      </div>

      {/* `y1.push(() => l(T1, {}))` — the Signing Out confirm, `Signout-CdJMMBfB.js`. */}
      <div className="center mt-3 h-10 w-full">
        <div className="flex items-center" onClick={onSignOut}>
          <IconLogOut className="icon size-6" />
          <span className="ml-1 text-base font-extrabold">Sign Out</span>
        </div>
      </div>
    </div>
  );
}

export default function UserEnterPanels(props) {
  return (
    <>
      <ProfileHeader />
      {/* Back to the chunk's own `pt-4`, and with the phantom `h-22` above gone this really is
          the WHOLE gap between the avatar row and the VIP card: the row now sits flush with the
          header's bottom edge, as it does on the live site, so nothing stacks underneath it.
          It was bumped to `pt-6` while the 24px of phantom space was still there and the two were
          being read as one number. */}
      <div className="bg-layer2 pt-4">
        <VipCard />
        <BalanceCard />
        <SettingsCards {...props} />
        <ReferBanner />
        <SupportBlock {...props} />
      </div>
    </>
  );
}
