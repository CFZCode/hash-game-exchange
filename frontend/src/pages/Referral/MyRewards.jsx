import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useResource } from '../../hooks/useResource';
import Loading from '../../components/shared/Loading';
import Skeleton from '../../components/shared/Skeleton';
import useMediaQuery from '../../hooks/useMediaQuery';
import {
  getAffiliateDashboard,
  getCommissionList,
  getFriendCommissions,
  getInviteCodes,
  getReferralRewards,
  claimAllAffiliateRewards,
  getRewardHistory,
} from '../../services/referral';
import { toast } from '../../components/shared/Toast/toast';
import { getAlias } from '../../utils/currency';
import { coinIcon } from '../../utils/coinArt';
import EmptyPlaceholder from '../../components/shared/EmptyPlaceholder';
import PopCenter from '../../components/shared/PopCenter';
import Select from '../../components/shared/Select';
import DataTable from './DataTable';
import { IconRateRules } from './icons';
import {
  IconInform,
  IconArrow,
  IconSearch,
  IconBetHistory,
} from '../../layouts/MainLayout/Header/AfterLogin/icons';
import { REWARD_TIPS, MY_REWARDS_TABS } from './referral';
import { useSelectedCurrency } from '../../hooks/useSelectedCurrency';
import { useRewardCurrency, walletCode } from './format';

/* `Re(pathname)` — the chunk's own way of reading which pane is open, and it really is the LAST
   segment rather than a route parameter. */
const lastSegment = (pathname) => pathname.split('/').pop() || '';

/* The My Rewards tab of the signed-in referral page — `/referral/my-rewards/:pane`, and the
 * second of the four to be built.
 *
 * `index-Deo68lWp.js` off `hash.game/assets/`, plus `table-DWtoUmQ7.js` (ported next door as
 * DataTable). Every class list below is the Solid template's own and every string is verbatim
 * `t("…")` out of the chunk or `index-Dn9m_cUp.js`. NOTHING HERE IS READ OFF THE SCREENSHOT.
 *
 * BEING LOCKED OUT IS THE CORRECT RENDERING, which is the transaction pane's finding again. All
 * four feeds are authenticated and all four are shut — `/agent/commission/list/` answers
 * bc.game's own 6002 envelope, the three POSTs answer a bare gateway 403, both probed rather than
 * assumed. So the summary card prints the request module's default (every figure "0"), both
 * buttons take their own disabled gate, and all three panes render the site's empty state. That
 * is exactly what the capture shows, arrived at without inventing a row.
 *
 * THE INNER STRIP IS A SECOND SET OF TABS INSIDE THE PAGE'S OWN, and its three panes are three
 * more URL segments: `friends` / `commission` / `referral` map to Commission by Friends /
 * Commission by Currency / Level Up Rewards in that order. Note the segment names do not match
 * their labels — `commission` is Commission by CURRENCY and `friends` is Commission by FRIENDS,
 * so reading the path is not enough. `TABS`'s default sub-tab is `commission`, which is the tab
 * the capture has open.
 *
 * NOT BUILT, each inert at its call site:
 *
 * - The DATE RANGE PICKERS. `fT` in the main bundle is a 720px calendar layer with a preset rail;
 *   what renders closed is its trigger, which is the `.input` primitive in `readOnly` with the
 *   formatted range as its value and the label as its `order-first` child. That trigger is built
 *   and the layer is not, so the fields show their range and do not open. No capture shows one
 *   open, and there is nothing to filter behind them.
 * - The two ROW LINKS — `/rewards-detail` and `/friends-detail` — and the `/rewards-swap` and
 *   `/rewards-withdraw` routes behind Swap and Withdraw to Wallet. All four are real paths on the
 *   original and none is a route here; all four are unreachable anyway, since every figure is
 *   zero and no row exists to click.
 * - The PAGER under each table (`total > 10`, which no empty list reaches) and the skeleton the
 *   chunk shows while a table's resource is pending, which a synchronous fixture cannot trip.
 */

/* `ve` — the ⓘ popup beside each figure. Both bodies are one i18n value apiece with the h3/p
   pairs as numbered slots, so the array order in `REWARD_TIPS` IS the display order; recovered
   verbatim from `bonus.affiliate.rewardtip1` / `rewardtip2`. The wrapper's `content` class
   generates nothing in the mirror's six stylesheets nor in the current deploy's, so it is kept
   like `sub-num` below and `page-main` elsewhere. */
function RewardTip({ tip, onClose }) {
  return (
    <PopCenter open={!!tip} onClose={onClose} title={tip?.title}>
      <div className="content">
        {tip?.rows.map((row) =>
          row.heading ? (
            <h3 key={row.heading} className="text-base font-extrabold">
              {row.heading}
            </h3>
          ) : (
            <p key={row.body} className="font-semibold text-secondary">
              {row.body}
            </p>
          )
        )}
      </div>
    </PopCenter>
  );
}

/* `Z` — the Rules / History pair. On a desktop it is `sm:absolute` in the tab card's top-right
   corner, which is why the chunk renders it INSIDE the tab strip rather than beside it; on a
   phone it sits inline above the tabs instead. `<Show when={!mobile}>` gates the desktop copy,
   with the mobile one rendered inside each pane — a device test, so only the desktop arm is
   built, as everywhere else here.

   `button-m` is written unconditionally rather than through the page's `size`, because this
   whole component only ever renders on a desktop, which is where `ot` would supply it. */
function StripActions({ onHistory }) {
  const navigate = useNavigate();

  return (
    <div className="right-2 top-2 flex items-center justify-between sm:absolute sm:gap-3">
      <button
        type="button"
        className="button button-second button-m center h-8 gap-1 px-2"
        onClick={() => navigate('/referral/rules', { replace: true })}
      >
        <IconRateRules className="icon size-5" />
        <span className="font-extrabold">Rules</span>
      </button>
      <button
        type="button"
        className="button button-second button-m center h-8 gap-1 px-2"
        onClick={onHistory}
      >
        <IconBetHistory className="icon size-4" />
        <span className="font-extrabold">History</span>
        <IconArrow className="icon size-4 rotate-180 fill-primary" />
      </button>
    </div>
  );
}

/* `K` — the date range field. See the header note: this is `fT`'s TRIGGER and not its layer.
 *
 * `format` is the chunk's own and has a special case worth keeping: the picker's "cleared" state
 * is not an empty value but a pair of Dates one second apart, and the formatter prints that pair
 * as "All Range" rather than as two identical dates. `I` is that sentinel — `new Date(now - 1000)`
 * evaluated once at module scope on the original, so it is a fixed instant per page load. */
const CLEARED = 'All Range';

/* `f(r, "YYYY/MM/DD")` — the picker's own format for a real range, out of `utils-PrQ_cjrK.js`. */
const ymd = (date) =>
  `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(
    date.getDate()
  ).padStart(2, '0')}`;

function DateRangeField({ label, value, clear, className = '' }) {
  return (
    <div className={`relative w-full ${className}`}>
      {/* `readOnly` is the picker's, and it is what makes the field a button that cannot be
          typed into. `.input`'s own box supplies the height and the border. */}
      <div className="input relative w-full bg-layer3">
        <div className="order-first text-nowrap">{label}</div>
        <input className="w-full bg-transparent outline-none" readOnly value={value} />
      </div>
      {clear ? (
        <div className="center absolute right-4 top-1/2 size-5 -translate-y-1/2 cursor-pointer rounded-full bg-layer4">
          {/* `xk` — the picker's own close mark. `IconClose` is the same drawing. */}
          <IconClose className="icon size-3 text-secondary" />
        </div>
      ) : null}
    </div>
  );
}

/* `xk` in index-BsFv7ByC.js, the generic close cross — inlined here rather than added to the
   dashboard's icon module, which holds only drawings this page family owns. */
const IconClose = ({ className = '' }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <path
      fill="currentColor"
      d="M25.3333 8.54667L23.4533 6.66667L16 14.12L8.54667 6.66667L6.66667 8.54667L14.12 16L6.66667 23.4533L8.54667 25.3333L16 17.88L23.4533 25.3333L25.3333 23.4533L17.88 16L25.3333 8.54667Z"
    />
  </svg>
);

const Empty = () => <EmptyPlaceholder>No rewards yet invite friends to join you now!</EmptyPlaceholder>;

/* hash.game's Reward History dialog (`/reward-history?type=…` there): a kind picker over a
   Currency / Amount / Time / Status table. Opened over the pane rather than routed, so the
   page under it stays put. The Commission pane opens on commission, the others on referral. */
const HISTORY_KINDS = { referral: 'Referral Rewards', commission: 'Commission Rewards' };
const HISTORY_STATUS = { available: 'Available', claimed: 'Received', void: 'Void' };

function RewardHistory({ pane, onClose }) {
  const [kind, setKind] = React.useState(pane === 'commission' ? 'commission' : 'referral');
  const read = React.useCallback(() => getRewardHistory(kind), [kind]);
  const { data, loading } = useResource(read);
  const columns = [
    {
      title: 'Currency',
      dataIndex: 'currency',
      render: (v) => (
        <div className="flex items-center gap-2">
          <img className="size-5" alt="" src={coinIcon(v)} />
          <span>{getAlias(v)}</span>
        </div>
      ),
    },
    { title: 'Amount', dataIndex: 'amount', render: (v) => <Primary>{Number(v).toLocaleString('en-US', { maximumFractionDigits: 8 })}</Primary> },
    { title: 'Time', dataIndex: 'createdAt', render: (v) => <Secondary>{v ? new Date(v).toLocaleString('en-US') : '--'}</Secondary> },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v) => <span className={v === 'available' ? 'text-brand' : 'text-secondary'}>{HISTORY_STATUS[v] ?? v}</span>,
    },
  ];

  return (
    <PopCenter open onClose={onClose} title="Reward History">
      <div className="flex min-h-[30rem] flex-col gap-4">
        <Select className="w-fit" value={kind} options={Object.keys(HISTORY_KINDS)} onChange={setKind}>
          {(option) => HISTORY_KINDS[option]}
        </Select>
        {loading ? <Loading /> : <DataTable columns={columns} data={data ?? []} empty={<EmptyPlaceholder className="w-full" />} />}
      </div>
    </PopCenter>
  );
}

/* `ct` — Commission by Currency. One row per coin, and note the page ALSO folds
   `availableRewardUsd` into a synthetic USDT row when that figure is non-zero, which is a rule
   about the DATA rather than the markup and lives in the service. Both figures are floored to
   2dp rather than rounded (`ROUND_DOWN`), so a balance never reads higher than it is.

   `pc:gap-10` IS A DEAD CLASS HERE and is kept as one. `pc` is not a breakpoint on the original —
   `.pc` is a plain class carrying `--footer: 0rem`, and the variant resolves against it — so this
   build, which has no such root class and no such variant, emits nothing for it. The row keeps
   `gap-14` at every width, which is what the desktop capture shows anyway. */
function CommissionByCurrency({ data }) {
  const cur = useSelectedCurrency();
  return (
    <div className="rounded-lg p-3">
      {data.length ? (
        <>
          <div className="mb-3" />
          {data.map((row) => (
            <div key={row.currencyName} className="my-5 flex items-center justify-between">
              <div className="center gap-3">
                <img className="h-8 w-8" alt="icon" src={coinIcon(row.currencyName)} />
                {/* `w` is a dead class — nothing in the mirror's stylesheets nor the deploy's. */}
                <span className="w">{getAlias(row.currencyName)}</span>
              </div>
              <div className="flex gap-14 pc:gap-10">
                <div className="flex flex-col items-center">
                  {/* In the row's own coin, floored there, then shown in the selected currency. */}
                  <span className="font-extrabold text-brand">{cur.show(floor2(row.availableUsd), walletCode(row.currencyName))}</span>
                  <span className="text-secondary">Available</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-extrabold">{cur.show(floor2(row.commissionUsd), walletCode(row.currencyName))}</span>
                  <span className="text-secondary">Total Received</span>
                </div>
              </div>
            </div>
          ))}
        </>
      ) : (
        <Empty />
      )}
    </div>
  );
}

/* `Ut` — Commission by Friends. Six columns and four filters.
 *
 * The code dropdown is SEEDED and appended to, not replaced: the chunk starts it at
 * `["All Codes"]` and pushes one `aliasCode` per row of `/agent/invitation/code/list/`, so an
 * empty response leaves exactly the one option — which is what the capture shows. `All Codes` is
 * also the sentinel the request strips before sending, so it is a real option rather than a
 * placeholder.
 *
 * The wager range opens on the LAST 90 DAYS rather than cleared, which is the one filter here
 * that starts narrowed; the registration range opens on the picker's own cleared sentinel. */
function CommissionByFriends({ codes, data, wagerRange }) {
  const cur = useSelectedCurrency();
  const reward = useRewardCurrency();
  const [code, setCode] = React.useState('All Codes');
  const [name, setName] = React.useState('');

  const columns = [
    { title: 'Username', dataIndex: 'userName', render: (v) => <Secondary>{v}</Secondary> },
    { title: 'User ID', dataIndex: 'userId', render: (v) => <Secondary>{v}</Secondary> },
    {
      title: 'Commission Rate',
      dataIndex: 'commissionRate',
      /* The `%` is a literal in the template AFTER the value, and the value is the stored
         fraction times 100 — 0.25 renders as "25%" (rounded, so 0.07 is not "7.000000000000001%"). */
      render: (v) => <Primary>{Math.round(Number(v) * 10000) / 100}%</Primary>,
    },
    { title: 'Total Deposits (Past 7D)', dataIndex: 'day7TotalDeposits', render: (v) => <Primary>{v == null ? '-' : cur.show(v, reward)}</Primary> },
    { title: 'Registration Date', dataIndex: 'createDate', render: (v) => <Secondary>{v}</Secondary> },
    {
      title: 'Total Commission',
      dataIndex: 'commissionUsd',
      render: (v) => (
        <div className="flex cursor-pointer items-center justify-end gap-1 font-semibold">
          <span className="text-brand">{cur.show(v, reward)}</span>
          <IconArrow className="icon size-4 rotate-180 fill-secondary" />
        </div>
      ),
    },
  ];

  return (
    <div className="p-4">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row">
        <div className="center flex-1 gap-3">
          <Select
            className="flex-1 !bg-layer3"
            value={code}
            options={codes}
            onChange={setCode}
          >
            {(option) => option}
          </Select>
          {/* `He` — the search field, whose icon is `order-first` so it leads the box. */}
          <div className="input flex-1 bg-layer3">
            <IconSearch className="icon order-first size-6 fill-secondary" />
            <input
              className="w-full bg-transparent outline-none"
              placeholder="Search UserName"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <DateRangeField label="Registration Date:" value={CLEARED} clear />
          <DateRangeField label="Wager Date:" value={wagerRange} />
        </div>
      </div>
      <DataTable columns={columns} data={data} empty={<Empty />} />
    </div>
  );
}

/* `xt` — Level Up Rewards. Five columns over one filter. */
function LevelUpRewards({ data }) {
  const cur = useSelectedCurrency();
  const reward = useRewardCurrency();
  const columns = [
    { title: 'Username', dataIndex: 'userName', render: (v) => <Secondary>{v}</Secondary> },
    { title: 'Registration Date', dataIndex: 'createDate', render: (v) => <Secondary>{v}</Secondary> },
    { title: 'VIP Level', dataIndex: 'userLevel', render: (v) => <Leading>{v}</Leading> },
    { title: 'Code', dataIndex: 'aliasCode', render: (v) => <Secondary>{v}</Secondary> },
    {
      title: 'Earned',
      dataIndex: 'rewardUsd',
      render: (v) => (
        <div className="flex cursor-pointer items-center justify-end gap-2">
          <span className="font-semibold text-brand">{cur.show(v, reward)}</span>
          <IconArrow className="icon size-4 rotate-180 fill-secondary" />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* `!w-80` is the chunk's own — the one filter on this pane does not stretch. */}
        <DateRangeField label="Registration Date:" value={CLEARED} clear className="!w-80" />
      </div>
      <DataTable columns={columns} data={data} empty={<Empty />} />
    </div>
  );
}

/* The three cell wrappers the two tables share. `V`/`pe` are the same markup declared twice in
   the chunk (once per table) and are one component here; `bt`/`_t` likewise. */
const Secondary = ({ children }) => (
  <span className="font-semibold leading-6 text-secondary">{children}</span>
);
const Leading = ({ children }) => <span className="font-semibold leading-6">{children}</span>;
const Primary = ({ children }) => (
  <span className="font-semibold leading-6 text-primary">{children}</span>
);

/* `new p(v).toFixed(2, p.ROUND_FLOOR)` / `ROUND_DOWN` — Decimal's floor, not `toFixed`'s rounding.
   They differ on the third decimal and the difference always favours the site, so it is worth
   keeping: 1.239 prints 1.23 here and 1.24 through the native call. */
const floor2 = (value) => (Math.floor(Number(value || 0) * 100) / 100).toFixed(2);

export default function MyRewards() {
  const navigate = useNavigate();
  /* `useResource` has no refetch, so a claim re-keys its reader — the same mechanism the bonus
     page uses after its own claims. */
  const [reloads, setReloads] = React.useState(0);
  const onClaimed = React.useCallback(() => setReloads((n) => n + 1), []);
  /* Held with the other top-level hooks rather than beside the button they serve: the card's read
     gates this component with an early return, and a hook below that would not run on every
     render. */
  const [claiming, setClaiming] = React.useState(false);
  const { pathname } = useLocation();
  const isDesktop = useMediaQuery('(min-width: 640px)');
  const size = isDesktop ? ' button-m' : '';

  /* The Wager Date filter opens on the LAST 90 DAYS rather than cleared — `$.setDate(-90)` in
     `Ut`, evaluated once at module scope there. Held in state rather than computed during render
     for the reason `/deposit-offer`'s clock is: reading the wall clock in a render body is what
     `react-hooks/purity` rejects. */
  const [wagerRange] = React.useState(() => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 90);
    return `${ymd(start)}-${ymd(end)}`;
  });

  const readDashboard = React.useCallback(() => getAffiliateDashboard({ reloads }), [reloads]);
  const { data: info } = useResource(readDashboard);
  // Re-read after a claim too: Available drops to 0 the moment the rewards are paid.
  const readCurrencies = React.useCallback(() => getCommissionList({ reloads }), [reloads]);
  const { data: currencies } = useResource(readCurrencies);
  const { data: friends } = useResource(getFriendCommissions);
  const { data: codeList } = useResource(getInviteCodes);
  const { data: levelUp } = useResource(getReferralRewards);

  const [tip, setTip] = React.useState(null);
  const [history, setHistory] = React.useState(null);
  /* The summary card's figures are sums of reward credits (the reward currency), floored there to
     2dp so a balance never reads higher than it is, then shown in the selected currency. Held up
     here with the other hooks, above the loading return. */
  const cur = useSelectedCurrency();
  const reward = useRewardCurrency();
  const money = (value) => cur.show(floor2(value), reward);

  /* The indicator is MEASURED, as the promotions and quest strips are and for the same reason:
     `sm:[&_.tabs-btn]:flex-none sm:[&_.tabs-btn]:px-0` with `sm:[&_.tabs-btn-group]:gap-6` sizes
     every tab to its own label, so there is no even division to compute one from. */
  const stripRef = React.useRef(null);
  const segment = lastSegment(pathname);
  const active = MY_REWARDS_TABS.some((t) => t.id === segment) ? segment : 'commission';

  React.useLayoutEffect(() => {
    const strip = stripRef.current;
    const tab = strip?.querySelector('[aria-selected="true"]');
    if (!strip || !tab) return;
    strip.style.setProperty('--tabs-width', `${tab.clientWidth}px`);
    strip.style.setProperty('--tabs-indicator-position', `${tab.offsetLeft}px`);
  }, [active, isDesktop]);

  /* THE SUMMARY CARD AND THE TABLE ARE DIFFERENT READS AND ARE GATED SEPARATELY, which is the
     chunk's own arrangement: `/agent/affiliate/dashboard/` feeds the card and one of the three
     `/agent/…/list/` calls feeds whichever pane is open, and the chunk shows a SKELETON over the
     table while its own call is out (see CLAUDE.md's note on this pane) rather than blanking the
     card above it. Only the card's read can gate the whole pane, since every figure on it is a
     field of that one payload. */
  if (!info) {
    return (
      <div className="center h-96">
        <Loading />
      </div>
    );
  }

  const tableLoading = !currencies || !friends || !codeList || !levelUp;
  const dashboard = info.dashboard;

  /* `disabled` is ONE test shared by both buttons — neither figure above zero. Written as the
     chunk writes it, which is an AND rather than a per-button check, so Swap is disabled by the
     referral balance it does not spend. */
  const idle = Number(dashboard.availableCommissionUsd) === 0 && Number(dashboard.availableRewardUsd) === 0;

  const withdrawToWallet = async () => {
    if (idle || claiming) return;
    setClaiming(true);
    try {
      await claimAllAffiliateRewards();
      /* `Withdraw-uCHTYWsY.js`: `.then(() => m(u("All rewards have been withdrawn to Wallet")))`
         and `l => m(l.message)` — two BARE toasts, the refusal printing the server's message as
         a plain string (so no error icon). */
      toast('All rewards have been withdrawn to Wallet');
      /* The two figures above come from the dashboard read, so the page has to be re-read for
         them to fall to zero — the same re-key the bonus page uses after its claims. */
      onClaimed?.();
    } catch (failure) {
      if (failure?.message) toast(String(failure.message));
    } finally {
      setClaiming(false);
    }
  };

  /* The code dropdown's seed. See `CommissionByFriends`. */
  const codes = ['All Codes', ...(codeList?.list || []).map((row) => row.aliasCode)];

  return (
    <div className="bg-layer2 font-semibold">
      <section className="mb-4 flex flex-col gap-3 rounded-xl bg-layer4 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
        {/* The two blocks are NOT the same markup: the first carries the phone divider
            (`border-b … pb-3`, cancelled from `sm` up) and one sub-figure, the second carries two
            in a `gap-3` row and no divider. */}
        <div className="flex flex-col border-b border-third pb-3 sm:flex-1 sm:border-none sm:pb-0">
          <div className="flex items-center justify-between">
            <span className="text-secondary">Available Commission Rewards</span>
            <IconInform
              className="icon size-5 fill-secondary"
              onClick={() => setTip(REWARD_TIPS.commission)}
            />
          </div>
          <span className="mb-3 text-2xl font-extrabold text-brand">
            {money(dashboard.availableCommissionUsd)}
          </span>
          <div>
            <span className="mr-1 text-nowrap">Total Received</span>
            <span>{money(dashboard.commissionReceivedUsd)}</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-1">
          <div className="flex items-center justify-between">
            <span className="text-secondary">Available Referral Rewards</span>
            <IconInform
              className="icon size-5 fill-secondary"
              onClick={() => setTip(REWARD_TIPS.referral)}
            />
          </div>
          <span className="mb-3 text-2xl font-extrabold text-brand">
            {money(dashboard.availableRewardUsd)}
          </span>
          <div className="flex items-center gap-3">
            <div>
              <span className="mr-1 text-nowrap text-secondary">Total Received</span>
              {/* `sub-num` is a dead class in the mirror AND in the current deploy, both
                  checked. Kept like `page-main` and `header-nav-item`. */}
              <span className="sub-num">{money(dashboard.rewardReceivedUsd)}</span>
            </div>
            <div>
              <span className="mr-1 text-nowrap text-secondary">Locked Rewards</span>
              <span className="sub-num">{money(dashboard.remainingRewardUsd)}</span>
            </div>
          </div>
        </div>

        {/* `button-m` is `ot`'s, not the call site's — see the note at the terms link in
            Dashboard.jsx. Here it is the RADIUS rather than the height that depends on it: `h-10`
            already pins 2.5rem, but `.button`'s own radius is `--radius-md` and `.button-m`
            raises it to `--radius-lg`, which is what these two pills have in the capture. */}
        <div className="flex items-center gap-2 border-third sm:h-20 sm:border-l sm:pl-4 lg:pl-10">
          <button
            type="button"
            disabled={idle}
            className={`button button-second${size} h-10 flex-1 sm:px-8`}
            /* hash.game's `/rewards-swap` is not built; rewards land in the wallet, so Swap opens the wallet's own. */
            onClick={() => navigate('/wallet/swap')}
          >
            Swap
          </button>
          {/* THE ORIGINAL OPENS A SCREEN AND THE PLATFORM HAS A CALL. bc.game navigates to
              `/rewards-withdraw` to choose what to move; the platform's whole capability is
              `POST /affiliate/rewards/claim-all` — no arguments, everything available. So this
              performs the claim rather than opening a screen with nothing to decide, and the
              route it used to point at is not built here anyway. `services/referral.js` carries
              the argument; `claimAffiliateReward(rewardId)` is there too for the day a per-row
              claim has somewhere to live. */}
          <button
            type="button"
            disabled={idle || claiming}
            className={`button button-brand${size} h-10 flex-1 sm:flex-auto sm:px-8`}
            onClick={withdrawToWallet}
          >
            Withdraw to Wallet
          </button>
        </div>
      </section>

      <section className="relative rounded-xl bg-layer4 pt-2">
        <div
          ref={stripRef}
          role="tablist"
          data-type="indicator"
          className="scroll-x tabs-title hide-scroll border-third sm:[&_.tabs-btn-group]:mx-4 sm:[&_.tabs-btn-group]:w-fit sm:[&_.tabs-btn-group]:flex-none sm:[&_.tabs-btn-group]:gap-6 sm:[&_.tabs-btn]:flex-none sm:[&_.tabs-btn]:px-0"
        >
          <div className="tabs-btn-group">
            {MY_REWARDS_TABS.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                type="button"
                {...(tab.id === active ? { 'aria-selected': 'true' } : {})}
                className="tabs-btn btn-like"
                onClick={() => navigate(`/referral/my-rewards/${tab.id}`, { replace: true })}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="tabs-indicator test-indicator-tab" />
        </div>

        <div className="tabs-content !bg-transparent">
          {/* The chunk's own pending arm for a table: `Skeleton` over the rows, which paints
              layer4/layer5 at exactly the size of what is coming. Every one of these three lists
              is shut (6002 on one, a bare 403 on the other two), so what lands under the pulse is
              the empty placeholder — the same thing the capture shows, arrived at a beat later. */}
          {tableLoading ? (
            <Skeleton className="block h-56 w-full" radius={0}>
              <div className="h-56 w-full" />
            </Skeleton>
          ) : active === 'friends' ? (
            <CommissionByFriends codes={codes} data={friends.list} wagerRange={wagerRange} />
          ) : active === 'referral' ? (
            <LevelUpRewards data={levelUp.list} />
          ) : (
            <CommissionByCurrency data={currencies} />
          )}
        </div>

        {/* THE RULES / HISTORY PAIR AND THE HAIRLINE ARE SIBLINGS OF THE STRIP, NOT ITS CHILDREN,
            and that is the Tabs component's own arrangement rather than a layout choice. `iT`
            returns `[<div class="tabs-title">…</div>, <Show>{the content panel}</Show>,
            Ae(() => t.children)]` — so anything a call site passes BESIDES its `TabItem`s renders
            after the panel, and `TabItem` itself returns `null` and only registers itself in a
            context. Both of these are absolute, so what they resolve against is this
            `section.relative` and nothing else.

            Put inside `.tabs-title` — which is `position: relative` in its own right — everything
            shifts down by the section's `pt-2`: the buttons land 8px low, and the `top-12`
            hairline lands 8px BELOW the strip's bottom edge instead of exactly on it, which reads
            as a stray border floating over the pane. Against the section the arithmetic is exact:
            8px of `pt-2` plus `.tabs-title`'s own 2.5rem is 48px, which is `top-12`. */}
        {isDesktop ? (
          <>
            <StripActions onHistory={() => setHistory(active)} />
            <div className="absolute top-12 h-[1px] w-full bg-third" />
          </>
        ) : null}
      </section>

      <RewardTip tip={tip} onClose={() => setTip(null)} />
      {history ? <RewardHistory pane={history} onClose={() => setHistory(null)} /> : null}
    </div>
  );
}
