import React from 'react';
import { Link } from 'react-router-dom';
import Select from '../../../components/shared/Select';
import Table, { HEAD, HEAD_CENTER, HEAD_END } from '../../../components/shared/Table';
import CurrencyAmount from '../../../components/shared/CurrencyAmount';
import { AssetsFilter, TimeFilter } from '../../../components/shared/WalletFilters';
import Notice from '../../../components/shared/Notice';
import PopCenter from '../../../components/shared/PopCenter';
import EmptyPlaceholder from '../../../components/shared/EmptyPlaceholder';
/* `IconInform-Dfks8fNQ.js`, which is the file the chunk imports — a squircle outline around a
   dot and stem. NOT `components/shared/icons.jsx`'s `IconInform`, which is a different drawing
   (the filled circle in the deposit dialog's notice box) despite the identical name. The two icon
   sets were extracted from different chunks and the head of that file warns about exactly this;
   the Vault pane reaches for the same one. */
import { IconInform } from '../../../layouts/MainLayout/Header/AfterLogin/icons';
import { IconArrow } from '../../../components/shared/icons';
import {
  getDepositOrderStatus,
  getWithdrawOrderStatus,
  depositCodeFor,
  withdrawCodeFor,
} from './status';
import { useSession } from '../../../context/session';
import { useGates } from '../../../context/gates';
import WalletFilterProvider from '../../../context/WalletFilterProvider';
import useResource from '../../../hooks/useResource';
import { useWalletFilter as useFilter } from '../../../context/walletFilter';
import {
  getBillRecords,
  getDepositRecords,
  getWithdrawRecords,
  getSwapRecords,
  getBuyCryptoRecords,
  TIME_RANGE,
  defaultRange,
  resolveRange,
  clampRange,
} from '../../../services/transaction';

/* `/wallet/transaction` — the sixth wallet pane, and the widest of them: five history lists
 * behind one Type filter, five filter controls, a rules popup and two conditional notices.
 *
 * WHERE IT CAME FROM. `DialogTransaction` resolves to `index-DNrYnkmC.js` (15 KB), and the pane
 * spreads across eight more: `index-DP7RdwkJ.js` (the card shell), `Bill-D7sK-R1j.js` (the
 * default list and its request), `Table-Cyxc_MMr.js` (the table and its cells),
 * `CurrencyAmount-CcsyxXsB.js` (the filter store and the amount cell), `Assets-NsyfBPnl.js`,
 * `Time-Biy5hfP-.js`, `timeRange-Chxugo4p.js` and `index-BnY4Y-60.js` (the deposit list). All off
 * `hash.game/assets/`.
 *
 * ── THE EMPTY STATE IS THE CORRECT RENDERING, NOT A COMPROMISE ────────────────────────────────
 *
 * Every one of the five feeds is authenticated — `/user/amount/change/record/` answers 403, the
 * other four are the history calls of panes whose writes are equally shut. So every list is empty
 * and the pane renders the site's own "Stay tuned-something's coming!", which is exactly what the
 * capture shows. Nothing had to be invented to reach it, and nothing here is read off a
 * screenshot: the columns, the filter options and the two notices are all the chunks'.
 *
 * ── THE FILTER STATE IS PERSISTED, AND WHERE IT COMES FROM IS THE INTERESTING PART ────────────
 *
 * `N` in CurrencyAmount reads each key from the SEARCH PARAMS first, then `sessionStorage` under
 * `wallet:tx-filter-v2`, then the defaults — and writes the whole set back to sessionStorage on
 * every change. Two consequences worth keeping: the Vault card's History button works
 * (`/wallet/transaction?type=bill&billType=Vault` lands with the Bill Type filter already set),
 * and the pane remembers your filters for the tab's lifetime but not beyond it. Session, not
 * local: the original picked the storage that forgets.
 *
 * Seeded ONCE, as the original seeds it — each key becomes its own signal at provider mount, so
 * editing the URL afterwards does not re-seed. `useState` initialisers reproduce that exactly.
 *
 * ── NOT BUILT, each inert at its call site ────────────────────────────────────────────────────
 *
 *   Swap and Buy Crypto   both render their own headers over the empty state. Their ROW renderers
 *                         are not written: neither feed answers on either backend, and each needs
 *                         its own status machine plus a detail route that is not built. **Deposit
 *                         and Withdraw came off this list** — see the note at those two, which are
 *                         built and live against the platform.
 *   the Bill row's links  a game-detail link off `gameUnique`/`relatedId` and a copy button, both
 *                         behind authenticated calls (`createBillShare`, `getLotteryBetId`).
 *   the custom range      the Time control is the site's date-RANGE picker: presets plus a
 *                         two-month calendar behind a "Custom" entry. Only the presets are built
 *                         — they are what the capture shows and what the filter actually stores,
 *                         and the calendar is a component in its own right.
 *   infinite scroll       the list pages 20 at a time off `totalPage`. With nothing to page there
 *                         is nothing to observe, so the pager is not wired.
 */

/* `m`/`h` in Time-Biy5hfP-.js — the Type enum, verbatim. Note `Bonus` and `Game` are capitalised
   where the rest are lower-case, and `All` is the empty string; all three are the server's own
   spellings and are sent as written. */
const TYPE = {
  Deposit: 'deposit',
  Withdraw: 'withdraw',
  Swap: 'swap',
  Buy: 'buy_crypto',
  Bill: 'bill',
  Bonus: 'Bonus',
  Game: 'Game',
  BetHistory: 'bet_history',
  All: '',
};

const STORAGE_KEY = 'wallet:tx-filter-v2';

/* An agent's player has no deposit, withdraw, swap, buy or bonus of their own: every credit and
   debit comes from their agent and is a Bill row (the ledger's TRANSFER_IN / TRANSFER_OUT,
   "Credited by agent" / "Debited by agent"). So their Type filter is Bill alone, as addaplay's
   history is the agent's transfers. */
const AGENT_PLAYER_TYPES = new Set([TYPE.Bill]);
/* …and Bill Type drops the categories they cannot have (Affiliate, Vault, Swap). */
const AGENT_PLAYER_BILL_TYPES = new Set(['All', 'Game']);

/* Every filter is `A` — the shared Select — over OPTION OBJECTS rather than strings, with the
   label behind a function so it stays translatable. `ellipsis w-0 flex-auto text-left` on the
   label div is what keeps a long currency name from pushing the chevron out of the trigger. */
const optionLabel = (option) => (
  <div className="ellipsis w-0 flex-auto text-left">{option.label}</div>
);

/* `Ie` — the Type filter. Swap and Buy Crypto are gated on the white-label routes profile, and
   bc.game's `main` carries both, so all six render. Changing type CLEARS status and billType,
   which is the original's own `s("status",""), s("billType","")` — without it a Bill Type of
   "Vault" would silently narrow the Deposit list. */
function TypeFilter() {
  const { get, setMany } = useFilter();
  const { agentPlayer } = useGates();
  const options = React.useMemo(
    () =>
      [
        { label: 'Bill', value: TYPE.Bill },
        { label: 'Deposit', value: TYPE.Deposit },
        { label: 'Withdraw', value: TYPE.Withdraw },
        { label: 'Swap', value: TYPE.Swap },
        { label: 'Bonus', value: TYPE.Bonus },
      ].filter((option) => !agentPlayer || AGENT_PLAYER_TYPES.has(option.value)),
    [agentPlayer],
  );
  const value = options.find((o) => o.value === get('type')) ?? options[0];

  return (
    <Select
      className="text-base"
      title="Transaction type"
      value={value}
      options={options}
      onChange={(option) => setMany({ type: option.value, status: '', billType: '' })}
    >
      {optionLabel}
    </Select>
  );
}

/* `Fe` — the Bill Type filter, and it renders ONLY for the Bill type. The five values are the
   chunk's; a white-label deploy can narrow them through `page.transaction.filterBillType`, which
   bc.game does not set. */
const BILL_TYPES = [
  { label: 'All Type', value: 'All' },
  { label: 'Game', value: 'Game' },
  { label: 'Affiliate', value: 'Affiliate' },
  { label: 'Vault', value: 'Vault' },
  { label: 'Swap', value: 'Swap' },
];

function BillTypeFilter() {
  const { get, set } = useFilter();
  const { agentPlayer } = useGates();
  if (get('type') !== TYPE.Bill) return null;

  const options = agentPlayer ? BILL_TYPES.filter((o) => AGENT_PLAYER_BILL_TYPES.has(o.value)) : BILL_TYPES;
  const value = options.find((o) => o.value === get('billType')) ?? options[0];
  return (
    <Select
      className="text-base"
      title="Bill type"
      value={value}
      options={options}
      onChange={(option) => set('billType', option.value)}
    >
      {optionLabel}
    </Select>
  );
}

/* `Ne` — the Status filter, for Deposit and Withdraw only, and Withdraw gets a sixth value
   (Refunded) the deposit side has no equivalent for. */
function StatusFilter() {
  const { get, set } = useFilter();
  const type = get('type');
  if (type !== TYPE.Withdraw && type !== TYPE.Deposit) return null;

  const options = [
    { label: 'All status', value: '' },
    { label: 'Complete', value: 'success' },
    { label: 'Processing', value: 'progress' },
    { label: 'Failed', value: 'fail' },
    { label: 'Canceled', value: 'cancel' },
  ];
  if (type === TYPE.Withdraw) options.push({ label: 'Refunded', value: 'refunded' });

  const value = options.find((o) => o.value === get('status')) ?? options[0];
  return (
    <Select
      className="text-base"
      title="Status"
      value={value}
      options={options}
      onChange={(option) => set('status', option.value)}
    >
      {optionLabel}
    </Select>
  );
}

const BILL_COLUMNS = [
  ['Type', HEAD],
  ['Time', HEAD_CENTER],
  ['Amount', HEAD_CENTER],
  ['Balance', HEAD_END],
];

/* Deposit, Withdraw and Buy Crypto all land on the same four; Swap swaps the last two for its own
   pair. Read off each chunk's desktop header arm rather than assumed from the Bill one. */
const STATUS_COLUMNS = [
  ['Type', HEAD],
  ['Time', HEAD_CENTER],
  ['Amount', HEAD_CENTER],
  ['Status', HEAD_END],
];

const SWAP_COLUMNS = [
  ['Type', HEAD],
  ['Time', HEAD_CENTER],
  ['Swap From', HEAD_CENTER],
  ['Swap To', HEAD_END],
];

/* `Pe`/`ge` — the Bill list, the pane's default and the only one whose rows are written. `be`
 * derives all three of its numbers from four fields, which is worth stating because none of them
 * is served directly:
 *
 *   change   = generalChangeAmount + bonusChangeAmount
 *   balance  = beforeBonusChangeAmount + beforeGeneralChangeAmount + the two change amounts
 *   isBonus  = the whole change was bonus
 *
 * Unreachable with a 403 feed; written because it is the default view and fully recovered. The
 * two link affordances inside the Type cell are not — see the header note.
 */
function BillList({ settings }) {
  const { get } = useFilter();
  const type = get('type');
  const changeTypeName = type === TYPE.Bonus ? TYPE.Bonus : get('billType');
  const assets = get('assets');
  const time = get('time');

  /* Every filter change is a refetch on the original — the whole filter set goes into the POST
     body — so the reader is memoised on the fields that make up that body and the table shows its
     first-page spinner again each time one of them moves.

     THE RANGE IS RESOLVED INSIDE THE READER, NOT OUTSIDE IT, and that is not tidiness: a preset
     resolves through `Date.now()`, so `resolveRange` returns a DIFFERENT pair on every call. Keyed
     on `[begin, end]` the reader is a new function every render, `useResource` sees a new source
     every render, and the fetch never settles — the table spins forever. The stable thing is the
     filter STRING (`preset:7776000000`), which is what the store holds and what actually changes
     when someone picks a range. */
  const read = React.useCallback(() => {
    const [beginTime, endTime] = resolveRange(
      clampRange(time, type === TYPE.Bill ? TIME_RANGE.NINETY_DAYS : TIME_RANGE.SIXTY_DAYS),
    );
    return getBillRecords({
      beginTime,
      endTime,
      currencyName: assets,
      /* The Bonus type has no list of its own — it is the Bill table with `changeTypeName`
         pinned, which is why `Ye` has no branch for it and falls through to this component. */
      changeTypeName,
    });
  }, [time, type, assets, changeTypeName]);
  const { data: page, loading } = useResource(read);
  const rows = page?.list ?? [];

  return (
    <Table columns={BILL_COLUMNS} loading={loading}>
      {rows.length === 0 ? (
        <EmptyPlaceholder />
      ) : (
        rows.map((item) => {
          const change =
            Number(item.generalChangeAmount) + Number(item.bonusChangeAmount);
          const balance =
            Number(item.beforeBonusChangeAmount) +
            Number(item.beforeGeneralChangeAmount) +
            Number(item.bonusChangeAmount) +
            Number(item.generalChangeAmount);

          return (
            <div
              key={item.amountLogId}
              className="flex items-center justify-between border-b border-third"
            >
              <div className="ellipsis flex flex-1 flex-col items-start p-4 text-base font-extrabold">
                <div>{item.changeTypeDesc}</div>
                {item.changeTypeDetail && (
                  <div className="ml-1 mt-0.5 flex items-center text-xs text-secondary">
                    ({item.changeTypeDetail})
                  </div>
                )}
              </div>
              <div className="ellipsis flex flex-1 items-center justify-center p-4 text-base font-extrabold text-secondary">
                {new Date(Number(item.createTime)).toLocaleString()}
              </div>
              <div className="ellipsis flex flex-1 items-center justify-center p-4 text-base font-extrabold">
                <CurrencyAmount
                  amount={change}
                  currency={item.currencyName}
                  sign="auto"
                  color="auto"
                  settings={settings}
                />
              </div>
              <div className="ellipsis flex flex-1 items-center justify-end p-4 text-base font-extrabold">
                <CurrencyAmount
                  amount={balance}
                  currency={item.currencyName}
                  settings={settings}
                />
              </div>
            </div>
          );
        })
      )}
    </Table>
  );
}

/* The two remaining lists. Each keeps its own header — that is what you see the moment you change
   type — over the empty state, because neither feed answers and neither row renderer could be
   exercised if it were written. Deposit and Withdraw came off this list; see below. */
function HeaderOnlyList({ columns, read }) {
  const rows = read()?.list ?? [];
  return (
    <Table columns={columns}>
      {rows.length === 0 ? <EmptyPlaceholder /> : null}
    </Table>
  );
}

/* ── DEPOSIT AND WITHDRAW ──────────────────────────────────────────────────────────────────────
 *
 * `me` in `index-BnY4Y-60.js` and `Re` in the pane's own chunk, both off `hash.game/assets/`, with
 * their status machines in `Transaction/status.js`. So every class list, every string and the
 * order of every cell is the chunk's.
 *
 * THE TWO ROWS ARE NOT ONE COMPONENT WITH A PROP, and the differences are not incidental:
 *
 *   · A DEPOSIT PRINTS TWO DIFFERENT AMOUNTS. `isSuccess ? receiveAmount : amount` — what arrived
 *     once it has, what was sent while it has not. A withdrawal prints one.
 *   · The signs are opposite and asymmetric. Deposit is `+`/success at both widths; withdraw is
 *     `-`/error on a desktop and `auto`/`auto` on a phone, so a refund shows as a credit there.
 *   · A DEPOSIT'S ROW IS WRAPPED. The anchor sits inside a `border-b border-third` div so the UTR
 *     verification line can sit under it inside the same rule; a withdrawal's anchor carries the
 *     border itself.
 *   · Their status cells differ by one class: withdraw's text is `text-secondary`, deposit's is
 *     not. Reproduced as written.
 *   · The mobile HEADERS differ too — deposit's second column is one div reading "Amount/Status",
 *     withdraw's is plain "Amount".
 *
 * Both rows link to `/wallet/<type>-detail?orderId=…`, which is not a route here, so they fall to
 * the catch-all. The href is the chunk's and is left as it is: the path is right and only the page
 * is missing, which is the same call the bet-history row's `/game-detail/` link takes.
 *
 * Not rendered, and both correctly: the fiat UTR-verify line (gated on `mode` being 3 or 6 with an
 * INRFIAT currency, and its dialog is not built) and the support-ticket chip (gated on
 * `ticketId`). The platform sends neither field, so both `<Show>`s are false rather than removed.
 */
function StatusCell({ orderClass, txt, textClass = '' }) {
  return (
    <div className="flex items-center justify-end">
      {/* `D` in `Image-D1QE7fNY.js` — an `<svg fill=currentColor>` holding one 8-radius circle,
          which is why the status colour is a TEXT class. Written out rather than imported from
          the Rollover pane, which writes its own copy of the same component for the same
          reason: it is six lines and neither pane owns it. */}
      <svg fill="currentColor" viewBox="0 0 32 32" className={`size-4 ${orderClass}`}>
        <path d="M16 8 a8 8 0 1 0 0.0001 0" />
      </svg>
      <div className={`ml-1 ${textClass}`}>{txt}</div>
      <IconArrow className="ml-1 size-4 rotate-180" />
    </div>
  );
}

function HistoryList({ type, columns, read, mapStatus, children }) {
  const { get } = useFilter();
  const assets = get('assets');
  const time = get('time');
  const status = get('status');

  /* Keyed on the filter STRING rather than on the resolved pair, for the reason `BillList`'s own
     note gives: a preset resolves through `Date.now()`, so a reader keyed on the timestamps is a
     new function every render and the fetch never settles. */
  const load = React.useCallback(() => {
    const [beginTime, endTime] = resolveRange(clampRange(time, TIME_RANGE.SIXTY_DAYS));
    return read({ beginTime, endTime, currencyName: assets, status });
  }, [read, time, assets, status]);

  const { data: page, loading } = useResource(load);
  const rows = page?.list ?? [];

  return (
    <Table columns={columns} loading={loading}>
      {rows.length === 0
        ? <EmptyPlaceholder />
        : rows.map((item) => children(item, mapStatus(item.status), type))}
    </Table>
  );
}

const DEPOSIT_COLUMNS = STATUS_COLUMNS;

function DepositList({ settings }) {
  return (
    <HistoryList
      type="deposit"
      columns={DEPOSIT_COLUMNS}
      read={getDepositRecords}
      mapStatus={(status) => getDepositOrderStatus(depositCodeFor(status))}
    >
      {(item, state) => (
        <div key={item.orderId} className="border-b border-third">
          <Link
            className="flex flex-none cursor-pointer items-center justify-between border-third hover:rounded-sm hover:bg-white_alpha5"
            to={`/wallet/deposit-detail?orderId=${item.orderId}`}
          >
            <div className="ellipsis flex flex-1 flex-col items-start p-4 text-base font-extrabold">
              Deposit
            </div>
            <div className="ellipsis flex flex-1 items-center justify-center p-4 text-base font-extrabold text-secondary">
              {new Date(Number(item.createTime)).toLocaleString()}
            </div>
            <div className="ellipsis flex flex-1 items-center justify-center p-4 text-base font-extrabold">
              <CurrencyAmount
                amount={state.isSuccess ? item.receiveAmount : item.amount}
                currency={item.currencyName}
                sign="+"
                color="success"
                settings={settings}
              />
            </div>
            <div className="ellipsis flex flex-1 items-center justify-end p-4 text-base font-extrabold">
              <StatusCell orderClass={state.orderClass} txt={state.txt} />
            </div>
          </Link>
        </div>
      )}
    </HistoryList>
  );
}

function WithdrawList({ settings }) {
  return (
    <HistoryList
      type="withdraw"
      columns={STATUS_COLUMNS}
      read={getWithdrawRecords}
      mapStatus={(status) => getWithdrawOrderStatus(withdrawCodeFor(status))}
    >
      {(item, state) => (
        <Link
          key={item.orderId}
          className="flex cursor-pointer items-center justify-between border-b border-third text-base hover:rounded-xl hover:bg-white_alpha5"
          /* `rail` is this build's addition to the original's `?orderId=` link, and it is forced:
             the two withdrawal tables have independent id sequences and the merged history keys on
             `id`, so an orderId alone is ambiguous. See services/transaction.js. */
          to={`/wallet/withdraw-detail?orderId=${item.orderId}&rail=${item.method || ''}`}
        >
          <div className="ellipsis flex flex-1 flex-col items-start p-4 text-base font-extrabold">
            Withdraw
          </div>
          <div className="ellipsis flex flex-1 items-center justify-center p-4 text-base font-extrabold">
            {new Date(Number(item.createTime)).toLocaleString()}
          </div>
          <div className="ellipsis flex flex-1 items-center justify-center p-4 text-base font-extrabold">
            <CurrencyAmount
              amount={item.amount}
              currency={item.currencyName}
              sign="-"
              color="error"
              settings={settings}
            />
          </div>
          <div className="ellipsis flex flex-1 items-center justify-end p-4 text-base font-extrabold">
            <StatusCell orderClass={state.orderClass} txt={state.txt} textClass="text-secondary" />
          </div>
        </Link>
      )}
    </HistoryList>
  );
}

/* `Ye` — the switch. Note the FALLBACK is the Bill list, which is how Bonus is served. */
function TransactionList({ settings }) {
  const { get, setMany } = useFilter();
  const { agentPlayer } = useGates();
  /* A remembered filter from before (session storage) may name a type an agent's player no longer
     has: put it back on Bill rather than open a list they cannot use. */
  const stale = agentPlayer && !AGENT_PLAYER_TYPES.has(get('type'));
  React.useEffect(() => {
    if (stale) setMany({ type: TYPE.Bill, status: '', billType: '' });
  }, [stale, setMany]);
  if (stale) return <BillList settings={settings} />;

  switch (get('type')) {
    case TYPE.Deposit:
      return <DepositList settings={settings} />;
    case TYPE.Withdraw:
      return <WithdrawList settings={settings} />;
    case TYPE.Swap:
      return <HeaderOnlyList columns={SWAP_COLUMNS} read={getSwapRecords} />;
    case TYPE.Buy:
      return <HeaderOnlyList columns={STATUS_COLUMNS} read={getBuyCryptoRecords} />;
    default:
      return <BillList settings={settings} />;
  }
}

/* `Je` — the Fiat deposit disputes popup. Four rules, verbatim en-US, with `__ENV_HOST__`
   expanded through `license.host.toUpperCase()` as everywhere else. The `- ` in front of each is
   a text node in the template, not a list marker. */
const DISPUTE_RULES = [
  'For any issues or disputes arising out of any fiat transactions on Our Site, you must formally ' +
    'report and submit such issues or disputes to BC.GAME within 60 calendar days from the date of ' +
    'the transaction(s) in question.',
  'For any issues or disputes received by BC.GAME exceeding 60 calendar days from the date of such ' +
    'transaction(s), We will not accept them for resolution and such transaction(s) are ineligible ' +
    'for us to resolve.',
  'Any attempts to circumvent this rule by raising your issue or dispute in relation to the fiat ' +
    'transaction(s) beyond the 60 calendar days period on a public complaint forum of any website, ' +
    'whether online or otherwise, will not change this.',
  'BC.GAME will not be able to assist any issues or disputes submitted beyond the stipulated ' +
    'timeframe. There are no exceptions to this rule.',
];

/* `et` — a notice shown only for Deposit or Withdraw AND a window of 60 days or more. It is the
   pane's own explanation for why those two types cap where the others do not. */
function FiatWindowNotice() {
  const { get } = useFilter();
  const type = get('type');
  if (type !== TYPE.Withdraw && type !== TYPE.Deposit) return null;

  const [begin, end] = resolveRange(clampRange(get('time'), TIME_RANGE.SIXTY_DAYS));
  if (Math.ceil((end - begin) / TIME_RANGE.ONE_DAY) < 60) return null;

  return (
    <Notice type="info" className="mb-4">
      For fiat transactions, only the last 2 months are available here due to some security
      reasons.
    </Notice>
  );
}

export default function Transaction() {
  const { session } = useSession();
  const settings = session.setting;
  const [disputes, setDisputes] = React.useState(false);
  /* No fiat deposits for an agent's player, so no deposit-disputes link either. */
  const { agentPlayer } = useGates();

  const defaults = React.useMemo(
    () => ({ type: TYPE.Bill, time: defaultRange(), assets: '', status: '', billType: '' }),
    [],
  );

  return (
    <WalletFilterProvider storageKey={STORAGE_KEY} defaults={defaults}>
      {/* `w`/`pe` — the card. `PageLayout title="Transactions"` above it writes into the dialog
          context and renders bare children on a page, so there is no heading; `bg-layer4 lg:px-8`
          is the page arm of `isDialog ? "bg-layer2" : "bg-layer4 lg:px-8"`. */}
      <div className="sm:mx-0 flex-auto rounded-xl bg-layer4 lg:px-8">
        {/* Sticky, and `bg-[inherit]` is what lets rows scroll under it without naming the card's
            colour — the same idea as `--layer0` on the Select's search bar. `top-15` (60px, the
            fixed header) is the ORIGINAL's own value here, not this build's usual departure.
            Three columns from `sm` up, which is why four filters wrap 3 + 1. */}
        <div className="sticky top-15 z-10 grid grid-cols-2 gap-2 bg-[inherit] py-4 sm:grid-cols-3 [&>button]:bg-input_bright">
          <TypeFilter />
          <AssetsFilter />
          <TimeFilter />
          <BillTypeFilter />
          <StatusFilter />
        </div>

        <FiatWindowNotice />

        {/* `Qe` — gated on `page.transaction.hideFiatIssues`, which bc.game's profile does not
            set, so it always renders. */}
        {!agentPlayer && (
          <button
            type="button"
            className="mb-3 flex cursor-pointer items-center text-secondary underline sm:mb-4"
            onClick={() => setDisputes(true)}
          >
            <IconInform className="icon mr-1 size-4" />
            Fiat deposit issues or disputes
          </button>
        )}

        <TransactionList settings={settings} />
      </div>

      <PopCenter
        open={disputes}
        onClose={() => setDisputes(false)}
        title="Fiat deposit issues or disputes"
        className="w-[480px] text-base text-secondary [&>.pop-title]:rounded-t-xl [&>.pop-title]:sm:bg-layer4"
      >
        <div className="mt-6">
          {DISPUTE_RULES.map((rule) => (
            <div key={rule.slice(0, 24)} className="mb-5 last:mb-0">
              - {rule}
            </div>
          ))}
        </div>
      </PopCenter>
    </WalletFilterProvider>
  );
}
