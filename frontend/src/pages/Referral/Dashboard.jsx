import { useEffect, useRef } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { getReferral, getInvitationCode, getAffiliateDashboard } from '../../services/referral';
import { useResource } from '../../hooks/useResource';
import Loading from '../../components/shared/Loading';
import { useSession } from '../../context/session';
import { useIsDialog } from '../../context/dialogRoute';
import useMediaQuery from '../../hooks/useMediaQuery';
import { REFERRAL_AMOUNT, INVITE, DASHBOARD_COPY, TABS } from './referral';
import { fill, useRewardCurrency } from './format';
import { useSelectedCurrency } from '../../hooks/useSelectedCurrency';
import { LiveRewards, ProgramBand, Faq } from './blocks';
import EmptyPlaceholder from '../../components/shared/EmptyPlaceholder';
import { toast } from '../../components/shared/Toast/toast';
import { copyToClipboard } from '../../utils/clipboard';
import MyRewards from './MyRewards';
import ReferralCodes from './ReferralCodes';
import RateRules from './RateRules';
import { SOCIALS, socialIcon } from './socials';
import {
  IconDashboard,
  IconReferralRewards,
  IconCommissionRewards,
  IconRateRules,
} from './icons';
import { IconBuyCrypto } from '../../layouts/MainLayout/Header/AfterLogin/icons';
import * as globMaps from './Dashboard.globs.js';
import './Referral.css';

/* The SIGNED-IN referral page — `/referral`, `AffiliatePage`, `index-CgFyS3aK.js` off
 * `hash.game/assets/`.
 *
 * WHICH PAGE IS WHICH IS THE FIRST THING TO GET RIGHT, and this build had it half-wired. The
 * router carries a matched pair of guards:
 *
 *   /referral              guards: [() => !b.login && "/referral-exhibition"]
 *   /referral-exhibition   guards: [() => b.login  && "/referral"]
 *
 * — so the two pages swap on sign-in, in both directions. Until now only the exhibition page
 * existed, so `/referral` redirected onto it unconditionally and signing in changed nothing.
 * Both guards are real now and the redirect that stood in for the missing page is gone.
 *
 * `/affiliate` is the original's own alias and still redirects to `/referral`, one hop behind.
 *
 * THE THREE BANDS AT THE FOOT ARE SHARED WITH THE EXHIBITION PAGE and are the same three
 * `Questions-dsRHzmFN.js` exports — Live Rewards, the affiliate-programme card, the FAQ. Both
 * chunks import them from that module, which is why they moved to ./blocks.jsx rather than being
 * rebuilt here.
 *
 * FOUR TABS, ONE PANE BUILT. The strip is the chunk's own — the four labels, their icons and the
 * URL each one navigates to — and the Dashboard pane below it is complete. My Rewards, Referral
 * Codes & Friends and Rate & Rules are three separate features in three more chunks, every one
 * of them a table over an auth-gated feed, so they route, light their tab and render the site's
 * empty state. See the note on `TABS` in referral.js.
 *
 * NOT BUILT inside the Dashboard, each inert at its call site: the
 * `/referral-terms` route the Terms link points at exists on the original and not here, so it
 * falls to the catch-all; and the share links open a real sharer with the invite URL, where the
 * original first shortens it through `POST /game/support/share/short-link/<platform>/` for
 * Facebook, X and Telegram only.
 */

/* `k` — `<div class="center gap-1"><div>`, the icon-and-label pair each tab title is built from.
   The icon is `L("size-5", n() === i && "fill-brand")`: brand green on the ACTIVE tab and NO fill
   class at all otherwise, which is not the same as no fill — the original's icon wrapper prepends
   `icon`, and `.icon` is `fill: currentColor`, so an inactive glyph takes the button's own colour
   and turns `primary_alw` along with the label when its tab is selected. This project's icon
   components are the bare `<svg>`, so `icon` is written at the call site; the trap is documented
   at the head of AfterLogin/icons.jsx. */
function TabTitle({ Icon, label, active }) {
  return (
    <div className="center gap-1">
      <Icon className={`icon size-5${active ? ' fill-brand' : ''}`} />
      <div>{label}</div>
    </div>
  );
}

const TAB_ICON = {
  referral: IconDashboard,
  'my-rewards': IconBuyCrypto,
  refer: IconReferralRewards,
  rules: IconRateRules,
};

/* `T1` — the invite card. Two-thirds of the row on desktop, with the artwork as a background
 * image rather than an `<img>`.
 *
 * `invite-top` and `top-inner` on the two nested wrappers GENERATE NOTHING — checked against the
 * mirror's `index-DxOqNczA.css` and against the current deploy's `index-DGr5jguQ.css`, which is
 * a different file and a later build. Dead in both, so they are kept for the reason `page-main`,
 * `header-nav-item` and `not-full` are.
 *
 * The `$1,000.00` is `printCurrency(1000)` and appears twice — once as the green figure and once
 * interpolated into the sentence below it — so the two can never disagree. */
function InviteCard({ invite, amount, size }) {
  const navigate = useNavigate();
  /* `try { W(value), Q(a("Copied")) } catch {}` — the clipboard write and a bare `F("Copied")`.
     The button keeps saying "Copy"; the toast is the confirmation. */
  const copy = (value) => {
    try {
      copyToClipboard(value);
      toast('Copied');
    } catch {
      /* no-op, as the chunk's own empty catch is */
    }
  };

  return (
    <div
      className="relative flex flex-col gap-3 rounded-xl bg-layer4 bg-cover px-4 py-6 md:w-2/3"
      style={{ backgroundImage: `url(${socialBg})` }}
    >
      <div className="invite-top">
        <div className="top-inner">
          <p className="mb-2 text-xl font-extrabold">{invite.title}</p>
          <div className="flex items-center gap-6">
            <p className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <span className="text-xl font-extrabold text-brand">{amount}</span>
              <span>{invite.rewardsLabel}</span>
            </p>
            <div className="h-[30px] w-[1px] bg-secondary/10" />
            <p className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <span className="text-xl font-extrabold text-brand">{invite.commissionRate}</span>
              <span>{invite.commissionLabel}</span>
            </p>
          </div>
        </div>
      </div>

      <p className="text-secondary">{fill(invite.description, amount)}</p>

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex-1">
          <p className="mb-1 text-secondary">{invite.linkLabel}</p>
          <div className="flex items-center justify-between rounded-xl bg-layer5 py-1 pl-3 pr-1">
            <p className="ellipsis">{invite.url}</p>
            <button
              type="button"
              className="button button-s not-full rounded-lg bg-layer6 font-extrabold"
              onClick={() => copy(invite.url)}
            >
              {invite.copy}
            </button>
          </div>
        </div>
        <div className="flex-1">
          <p className="mb-1 text-secondary">{invite.codeLabel}</p>
          <div className="flex items-center justify-between rounded-xl bg-layer5 py-1 pl-3 pr-1">
            <p>{invite.code}</p>
            <button
              type="button"
              className="button button-s not-full rounded-lg bg-layer6 font-extrabold"
              onClick={() => copy(invite.code)}
            >
              {invite.copy}
            </button>
          </div>
        </div>
      </div>

      {/* `k1` — the share row. `md:flex-row` and a `center gap-3` for the marks themselves. */}
      <div className="flex flex-col items-center gap-3 md:flex-row">
        <span>{invite.share}</span>
        <div className="center gap-3">
          {SOCIALS.map((s) => (
            <a
              key={s.name}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-none"
              href={`${s.url}${encodeURIComponent(invite.url)}`}
            >
              <img className="icon size-8" alt={s.name} src={socialIcon(s.file)} />
            </a>
          ))}
        </div>
      </div>

      {/* `sm:absolute` from `top-4 right-4` — it sits inline on a phone and pins to the card's
          corner from 640 up, which is where the capture has it.

          `button-m` IS THE ORIGINAL'S AND WAS MISSING, which is why this line sat low. `ot`
          builds `Y("button", zx[type], s() && \`button-${s()}\`, t.class)` with
          `s = size || !mobile && "m"`, so a desktop gets it whether or not the call site asks —
          the same miss the Select call sites are documented for. Without it the button falls back
          to `.button`'s own 3rem, and 48px pinned at `top-4` puts the label's centre at y=40
          where the card's `py-6` + a 24px `text-xl` line box puts the heading's at y=36. With it
          the two line up exactly, which is what the capture shows. */}
      <div className="center right-4 top-4 sm:absolute">
        <button
          type="button"
          className={`button${size} font-extrabold text-brand`}
          onClick={() => navigate('/referral-terms')}
        >
          {invite.terms}
        </button>
      </div>
    </div>
  );
}

const art = globMaps.art;
const socialBg = art['../../assets/referral/invite_bg.png'];
const trophy = art['../../assets/referral/trophy.png'];
const usehead = art['../../assets/referral/usehead.png'];

/* `F1` — the stat column. One card holding two figures over a divider, then two cards that are
   ONE card below 768 and two from there up: `flex … bg-layer4 md:bg-transparent` on the wrapper
   with `md:rounded-xl md:bg-layer4` on each half, so the fill moves from the parent to the
   children rather than the boxes changing shape. */
function Stats({ dashboard, copy }) {
  const cur = useSelectedCurrency();
  const reward = useRewardCurrency();
  const money = (value) => cur.show(value, reward);
  return (
    <div className="flex flex-col gap-3 md:w-1/3">
      <div className="flex rounded-xl bg-layer4 px-4 py-6">
        <div className="center flex-1 flex-col gap-2 border-r border-third">
          <img className="mb-2 h-auto w-10" alt="trophy" src={trophy} />
          <p className="text-xs text-secondary">{copy.totalReward}</p>
          <p className="text-xl font-extrabold">{money(dashboard.rewardUsd)}</p>
        </div>
        <div className="center flex-1 flex-col gap-2">
          <img className="mb-2 h-auto w-10" alt="user avatar" src={usehead} />
          <p className="text-xs text-secondary">{copy.totalFriends}</p>
          <p className="text-xl font-extrabold">{dashboard.friendNumber}</p>
        </div>
      </div>
      <div className="flex flex-1 gap-2 rounded-xl bg-layer4 md:bg-transparent">
        <div className="flex h-full w-full flex-1 flex-col px-4 py-6 md:rounded-xl md:bg-layer4">
          <IconReferralRewards className="icon mb-2 size-6 fill-brand" />
          <p className="text-xs text-secondary">{copy.referralRewards}</p>
          <span className="text-xl font-extrabold">
            {money(dashboard.availableRewardUsd)}
          </span>
        </div>
        <div className="flex h-full w-full flex-1 flex-col px-4 py-6 md:rounded-xl md:bg-layer4">
          <IconCommissionRewards className="icon mb-2 size-6 fill-secondary" />
          <p className="text-xs text-secondary">{copy.commissionRewards}</p>
          <span className="text-xl font-extrabold">
            {money(dashboard.availableCommissionUsd)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* `Q1` — Rewards Activities. Its populated arm prints one Referral Rewards row followed by one
   Commission Rewards row per entry in `topCommissions`; with the recovered payload that list is
   empty, so what renders is the site's own empty state under the two copy lines. `activities-wrap`
   and `bot-info` are dead classes, checked in both stylesheets like `invite-top`. */
function Activities({ dashboard, topCommissions, copy }) {
  const cur = useSelectedCurrency();
  const reward = useRewardCurrency();
  const money = (value) => cur.show(value, reward);
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-layer4 px-4 py-6">
      <div className="text-xl font-extrabold">{copy.activities}</div>
      <div className="bot-info">
        {topCommissions.length > 0 ? (
          <div className="activities-wrap">
            <div className="flex items-center justify-between">
              <div className="flex">
                <IconReferralRewards className="icon mb-2 size-6 fill-secondary" />
                <span>{copy.referralRewards}</span>
              </div>
              <p className="font-extrabold text-brand">
                +{money(dashboard.availableRewardUsd)}
              </p>
            </div>
            {topCommissions.map((row, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="center">
                  <IconCommissionRewards className="icon mb-2 size-6 fill-secondary" />
                  <span>{copy.commissionRewards}</span>
                </div>
                <p className="font-extrabold text-brand">+{money(row.commissionUsd)}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyPlaceholder>
            <p>{copy.emptyTitle}</p>
            <p>{copy.emptyBody}</p>
          </EmptyPlaceholder>
        )}
      </div>
    </div>
  );
}

export default function ReferralDashboard() {
  const { session } = useSession();
  const navigate = useNavigate();
  /* The pathname, not `useParams()`: on a phone this renders inside `ReferralDialog`, which App
     mounts beside `<Routes>`, where there are no params — every tab would read as Dashboard. */
  const { pathname } = useLocation();

  const { data } = useResource(getReferral);
  const { data: invite } = useResource(getInvitationCode);
  const { data: dashboardInfo } = useResource(getAffiliateDashboard);

  /* Read as the 640 line for the reason the exhibition page documents at length — the artwork
     the programme band swaps has to move with the layout that uses it, and that layout is
     `sm:`. */
  const isDesktop = useMediaQuery('(min-width: 640px)');
  /* The invite headline (`REFERRAL_AMOUNT`) is a USD-designed figure, shown in the selected
     currency. Above the early returns, being a hook. */
  const cur = useSelectedCurrency();
  const size = isDesktop ? ' button-m' : '';

  /* `T.mobile` on the original; the dialog context is this build's proxy — see the heading. ABOVE
     the two early returns below, because it is a hook: called after them it would be skipped on
     the render where the guard fires and the hook order would change between renders. */
  const dialog = useIsDialog();

  /* On a phone the four tabs overflow the strip, and a deep link such as `/referral/rules` would
     leave its own tab off the right edge. Scroll the strip (only the strip, so not
     `scrollIntoView`, which would also move the dialog) until the selected tab is in view. Keyed on
     `ready` too, since the strip only mounts once the three reads settle. */
  const strip = useRef(null);
  const ready = Boolean(data && invite && dashboardInfo);
  useEffect(() => {
    const el = strip.current;
    const tab = el?.querySelector('[aria-selected="true"]');
    if (!el || !tab) return;
    const box = el.getBoundingClientRect();
    const at = tab.getBoundingClientRect();
    el.scrollLeft += at.left - box.left - (box.width - at.width) / 2;
  }, [pathname, ready]);

  /* `guards: [() => !b.login && "/referral-exhibition"]` — the route's own, and the mirror image
     of the guard the exhibition page now carries. */
  if (!session.login) return <Navigate to="/referral-exhibition" replace />;
  /* Three reads, and the page cannot be assembled from a subset: `data` is the copy, `invite` is
     the card's link and code, `dashboardInfo` is every figure in the stat column. `getReferral`
     is a module read that always resolves, so in practice this is the two `/agent/` calls, which
     start together and settle together. */
  if (!data || !invite || !dashboardInfo) {
    return (
      <div className="center h-[60vh]">
        <Loading />
      </div>
    );
  }

  /* `G1(pathname)` — the tab is the FIRST segment after `/referral`, or `referral` when there is
     none, which is how `/referral/my-rewards/commission` still lights My Rewards. */
  const section = pathname.split('/')[2];
  const active = TABS.some((t) => t.id === section) ? section : 'referral';
  const { paneClass } = TABS.find((t) => t.id === active);
  const { program, faq, live } = data;
  const amount = cur.show(REFERRAL_AMOUNT, 'USDFIAT');

  const onAction = (target) => navigate(target === 'dashboard' ? '/referral' : target);

  return (
    /* `px-4` IS THE PAGE'S OWN GUTTER AND THE DIALOG ALREADY HAS ONE. `.dialog-content` carries
       `padding-inline: 1rem` in the shell, so keeping this would inset the card 32px on a phone
       where the capture shows 16. Dropped in the dialog arm, kept on the page — this build's
       column has no inset below `sm`, which is why the class exists at all. */
    <div className={dialog ? '' : 'px-4 sm:px-0'}>
      {/* `<Show when={!T.mobile}>` around `Y1` — THE HEADING IS DESKTOP-ONLY ON THE ORIGINAL, and
          its mobile half is not missing but relocated: `g2`, the chunk's default export, is
          `<Show when={mobile} fallback={<Page/>}><PageLayout title={t("Referral")}><Page/></PageLayout></Show>`,
          so on a phone the same string becomes the dialog's title bar instead. Both arms are
          reproduced — the bar is written at the mount in pages/Referral/Dialog.jsx.

          `useIsDialog()` stands in for `T.mobile` here for the reason the withdraw pane's `mt-4`
          does: `/referral` carries `info.dialog = m.mobile`, so the context is true in exactly the
          case the device test is. */}
      {!dialog && <h2 className="pb-4 text-lg font-extrabold leading-8">Referral</h2>}

      {/* `mt-3 flex-none rounded-xl bg-layer6 p-1 font-semibold sm:mt-0 sm:w-[800px]` is the
          chunk's own class list, minus one word. The strip does not stretch to the container the
          way the promotions one does, and the four tabs split that 800 evenly rather than sizing
          to their labels — that is `.tabs-btn`'s own `flex: 1` doing it, NOT a class on the
          button; see below.

          `bg-layer6` IS DROPPED, and it is the `w-30` case a second time: a class that is inert
          on the original and cannot be inert here. `.tabs-title:not([data-type])` sets the
          track to `tab_nopadding` (#323738), and on the live site that rule WINS — Tailwind v3
          ships no layers, so the two fight on specificity and `:not([data-type])` makes it
          (0,2,0) against `.bg-layer6`'s (0,1,0). This build puts the `.tabs-*` family in
          `@layer components`, where any utility beats it outright, so the class stopped losing
          and painted the track #4A5354 — lighter than the `tab_selected` pill on the active tab,
          which inverted the whole strip. Written back, it would have to be `bg-tab_nopadding`,
          i.e. the value the layered rule already supplies.

          THE TAB BUTTONS CARRY NOTHING OF THEIR OWN, and getting that wrong is the one mistake
          this project has already made once and written down. `P` in the chunk is

            t(r1.TabItem, { class: L(i.class, "mb-4 mt-4 flex-1 bg-transparent font-semibold"), title, children })

          and a `TabItem`'s `class` belongs to the CONTENT PANEL, not to the trigger — the same
          finding the deposit dialog's tab strip is annotated with. Putting it on the button broke
          both halves of what it is for:

            bg-transparent  is a utility, so it beat `.tabs-btn[aria-selected]`'s layered
                            `background-color: var(--color-tab_selected)` and the ACTIVE TAB LOST
                            ITS PILL. On the panel it cancels `.tabs-content`'s layer4 fill
                            instead, which is what it was written to do — and the `!bg-transparent`
                            this call site used to carry there was a compensation for that.
            mt-4 mb-4       is 32px of vertical margin inside a 2.5rem strip whose content box is
                            32px, so the buttons collapsed and their labels sat off centre. On the
                            panel it is the gap above and below the pane — 16px, beating
                            `.tabs-content`'s own `margin-top: .5rem`, which is the space between
                            the strip and the invite card. */}
      <div
        ref={strip}
        role="tablist"
        className="scroll-x tabs-title hide-scroll mt-3 flex-none rounded-xl p-1 font-semibold sm:mt-0 sm:w-[800px]"
      >
        <div className="tabs-btn-group">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              type="button"
              {...(tab.id === active ? { 'aria-selected': 'true' } : {})}
              className="tabs-btn btn-like"
              onClick={() => navigate(tab.path, { replace: true })}
            >
              <TabTitle Icon={TAB_ICON[tab.id]} label={tab.label} active={tab.id === active} />
            </button>
          ))}
        </div>
        <div className="tabs-indicator test-indicator-tab" />
      </div>

      {/* `P`'s class, on the element it was written for. `paneClass` is the per-tab half — only
          My Rewards has one, so the join has to leave no trailing space on the other three. */}
      <div
        className={['tabs-content mb-4 mt-4 flex-1 bg-transparent font-semibold', paneClass]
          .filter(Boolean)
          .join(' ')}
      >
        {active === 'referral' ? (
          <div className="flex flex-col gap-4 bg-layer2">
            <div className="flex flex-col gap-4 md:flex-row">
              {/* `<Show when={!isOfflineAgent}>` — a white-label flag that is false on bc.game,
                  so the invite card always renders. */}
              <InviteCard
                invite={{ ...INVITE, url: invite.invitationUrl, code: invite.aliasCode }}
                amount={amount}
                size={size}
              />
              <Stats dashboard={dashboardInfo.dashboard} copy={DASHBOARD_COPY} />
            </div>
            <Activities
              dashboard={dashboardInfo.dashboard}
              topCommissions={dashboardInfo.topCommissions}
              copy={DASHBOARD_COPY}
            />
            <LiveRewards live={live} />
            <ProgramBand program={program} isDesktop={isDesktop} size={size} />
            <Faq faq={faq} amount={amount} onAction={onAction} />
          </div>
        ) : active === 'my-rewards' ? (
          <MyRewards />
        ) : active === 'refer' ? (
          <ReferralCodes />
        ) : (
          <RateRules />
        )}
      </div>
    </div>
  );
}
