import React from 'react';
import { Link } from 'react-router-dom';
import { Card, SectionGroup } from '../../components/shared/SectionGroup';
import { IconArrow } from '../../components/shared/icons';
import { FormulaButton, Countdown } from '../Quests/QuestCard';
import { redeemBonusCode, claimBonus, claimRakeback } from '../../services/rewards';
import { showToast, bonusToast } from '../../components/shared/Toast/toast';
import { useSession } from '../../context/session';
import { walletCode } from '../../utils/currency';
import { useSelectedCurrency } from '../../hooks/useSelectedCurrency';
import { coinIcon } from '../../utils/coinArt';
import LevelCard from './LevelCard';
import LossBonus from './LossBonus';
import BonusRatio from './BonusRatio';
import { REWARD_TYPES, COUNTDOWN, isRecurringReward } from './bonus';
import { RewardType } from './rewardTypes';
import * as icons from './icons';
import Loading from '../../components/shared/Loading';

/* The left-hand panel — `Q2` in bonus-v5-page-dF3gugl8.js.
 *
 * Four blocks, and the capture shows three of them: the two-up header (Level card beside Total
 * Claimable), the sections, and the redeem bar. The fourth is the Welcome Shield banner between
 * the header and the sections, which renders only when the payload carries a
 * `new_user_lossback` reward and is absent here.
 *
 * NOT BUILT, each inert at its call site rather than removed: the ƒ(x) popup behind every chip
 * (a different one per reward type, all pushed onto the site's popup stack), the claim flow
 * behind Claim All and behind a row (`POST /activity/bonus/v2/batch-claim/`, authenticated), and
 * the redeem submit. The Total Claimable card's own chevron link to `/claimable-bonus` is drawn
 * only when there is something to claim, so it never appears with this payload — reproduced
 * rather than dropped.
 */

/* `E2` — the bolt on the Claim All button, and the one glyph on this page that is NOT on the
   32-unit grid: a 24 viewBox, `size-5 fill-current` written into the file itself. */
const BoltIcon = () => (
  <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden="true">
    <path d="M13 2L4.09347 12.6879C3.74465 13.1064 4.04506 13.75 4.59339 13.75H11.25V22L20.1565 11.3121C20.5053 10.8936 20.2049 10.25 19.6566 10.25H13V2Z" />
  </svg>
);

/* The registry's `icon` field resolved to a component. Three of them are not drawings at all:
   the daily, weekly and monthly rows are a single styled LETTER (`fn`/`wo`/`$o` in the chunk),
   each in its own colour, which is what the capture's D / W / M are. */
const REWARD_ICON = {
  instant: <icons.IconInstant className="icon size-5 text-warning_brighter fill-current" />,
  depositRakeback: <icons.IconDepositRakeback className="icon size-5 text-brand fill-current" />,
  levelUp: <icons.IconLevelUp className="icon size-5 text-warning_brighter fill-current" />,
  welcomeShield: <icons.IconRewards className="icon size-5 text-brand fill-current" />,
  lossback: <icons.IconLossback className="icon size-5 text-warning_brighter fill-current" />,
  reload: <icons.IconReload className="icon size-5 text-brand fill-current" />,
  gameplay: <icons.IconGameplayBonus className="icon size-5 text-brand fill-current" />,
  topPlayer: <icons.IconTopPlayer className="icon size-5 text-warning_brighter fill-current" />,
  D: <span className="text-base font-extrabold text-brand">D</span>,
  W: <span className="text-base font-extrabold text-warning_brighter">W</span>,
  M: <span className="text-base font-extrabold text-secondary-light">M</span>,
};

/* `R` in claimable-item-detail-DA9ukfTK.js — a coin mark beside a figure. The original resolves
   the mark through its own currency-icon component; this build already has the 148-file coin
   glob the wallet uses, and `BC` falls through it to nothing, which is correct: BC is a token
   the wallet does not hold and has no coin file. */
function CurrencyAmount({ amount, currency, iconCurrency, className = '' }) {
  /* The figure is in the bonus currency; it is SHOWN in the selected one (the `selected-currency`
     skill), and the coin beside it follows — except BC, which is its own token's mark. */
  const cur = useSelectedCurrency();
  const art = coinIcon(iconCurrency === 'BC' ? 'BC' : cur.code);

  return (
    <span className={`inline-flex min-w-0 items-center gap-1 ${className}`}>
      <span className="shrink-0">
        {art ? (
          <img className="size-3.5 rounded-full" src={art} alt="" />
        ) : (
          <span className="block size-3.5 rounded-full bg-layer5" />
        )}
      </span>
      <span className="inline-flex min-w-0 flex-col">
        <span className="inline-flex min-w-0 items-center gap-1">
          <span className="flex min-w-0 font-extrabold" style={{ fontSize: '1em' }}>
            {cur.show(amount, walletCode(currency))}
          </span>
        </span>
      </span>
    </span>
  );
}

/* `Vt` in redeem-M5TwYr_j.js — a row's right-hand column, and it is a SWITCH whose arm order is
 * the whole of its behaviour. In order: settling, then "In Progress" for a recurring type that
 * has a next-claim time, then a countdown for anything else that has one, then a zero figure
 * when the entry has no items, then the grouped amounts.
 *
 * That ordering is why the capture's Daily, Weekly and Monthly rows read "In Progress" with no
 * clock beside them even though a clock is configured for all three: the recurring arm matches
 * first and the countdown arm never runs. Reproduced, countdown included, because the same
 * component serves Reload and Welcome Bonus, which are not recurring and do print theirs.
 */
function RewardStatus({ entry, session }) {
  const config = COUNTDOWN[entry.rewardType];
  const timestamp = config && !entry.canClaim ? entry.extra?.nextClaimTime : undefined;
  const settling = isRecurringReward(entry.rewardType) && entry.extra?.settling === true;

  if (settling) {
    return <span className={`text-xs font-semibold ${config?.className ?? ''}`}>settling</span>;
  }

  if (entry.extra?.lockedVip != null && !entry.canClaim) {
    return <span className="text-xs font-semibold text-secondary">Unlocks at VIP {entry.extra.lockedVip}</span>;
  }

  if (isRecurringReward(entry.rewardType) && timestamp) {
    return <span className="text-xs font-semibold text-primary">In Progress</span>;
  }

  if (timestamp) {
    return (
      <Countdown
        timestamp={timestamp}
        className={`text-xs font-semibold ${config?.className ?? ''}`}
      />
    );
  }

  /* `y()` — the coin BESIDE the figure is BC for the two $BC types and the account's bonus
     currency for everything else, while the figure itself is always priced in the bonus
     currency. Two different currencies in one line, and it is the original's own pairing. */
  const iconCurrency =
    entry.rewardType === RewardType.INSTANT_BC || entry.rewardType === RewardType.BC_ENGINE_GRANT
      ? 'BC'
      : session.bonusCurrencyName;

  /* The last two arms of the switch: a bare zero when the entry has no items, otherwise the
     amounts folded together. This was written as a hardcoded `0` for as long as every entry in
     the payload came from the service module's declared default and so had an empty `items` —
     the zero arm was the only reachable one. It is reachable no longer: `services/rewards.js`
     fills a real figure onto four of the six rows. Summed rather than listed because the
     platform holds ONE amount in one currency per type; the original groups by currency first,
     which is the same thing until an entry carries two. An empty `items` still sums to 0, so the
     fixture path renders exactly as before. */
  const amount = (entry.items ?? []).reduce((total, item) => total + (Number(item.amount) || 0), 0);

  return (
    <CurrencyAmount
      amount={amount}
      currency={session.bonusCurrencyName}
      iconCurrency={iconCurrency}
      className="text-sm font-extrabold text-primary"
    />
  );
}

/* `K2` — one reward row. The whole row is the claim target on the original, which is why the
   `cursor-pointer` is conditional on `canClaim`; nothing claims here. */
function RewardRow({ entry, section }) {
  const { session } = useSession();
  const config = REWARD_TYPES[entry.rewardType];
  if (!config) return null;

  const title =
    config.preferConfigTitle || !entry.rewardTypeName ? config.title : entry.rewardTypeName;
  const description =
    typeof config.description === 'function'
      ? config.description({ canClaim: entry.canClaim })
      : config.description;

  return (
    <div
      className={`flex min-h-16 items-center gap-x-2 bg-layer3 px-3 py-2 ${
        entry.canClaim ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex w-10 shrink-0 items-center justify-center">
        {REWARD_ICON[config.icon]}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="min-w-0 text-base font-extrabold text-primary">{title}</span>
          {/* Every chip's popup is a different component and none is built — see the header
              note. The chip is drawn because it is part of the row. */}
          {config.formula && <FormulaButton />}
        </div>
        {description && (
          <span className="line-clamp-2 text-xs font-semibold text-tertiary">{description}</span>
        )}
      </div>
      <div className="flex max-w-[30%] shrink-0 items-center justify-end overflow-hidden font-extrabold">
        <div className="flex min-w-0 flex-col items-end gap-1">
          <RewardStatus entry={entry} session={session} />
        </div>
      </div>
      {/* `section` is unused by the row itself and is threaded in only so a future claim flow
          knows which group it belongs to. */}
      <span hidden data-section={section.id} />
    </div>
  );
}

/* `P2` — the Total Claimable card. Its `Claim All` disables on `unclaimedCount === 0`, which is
   what greys it out in the capture; `.button:disabled` is the base reset's `opacity: .4`, the
   same state the withdraw page's Preview button sits in. */
/* Which call clears which reward. `RECURRING` in `services/rewards.js` maps the platform's three
   bonus types onto these `rewardType` ids, and rakeback is its own module; anything not in here —
   the level-up bonus, instant $BC — has no claim route on this platform and is left out rather
   than pointed at a guess. */
const CLAIM_BY_TYPE = {
  daily_bet_back_bonus: () => claimBonus('daily'),
  weekly_bonus: () => claimBonus('weekly'),
  month_bonus: () => claimBonus('monthly'),
  rakeback: () => claimRakeback(),
};

function TotalClaimable({ payload, onClaimed }) {
  const { session } = useSession();
  const cur = useSelectedCurrency();
  const total = payload?.claimableTotal ?? 0;
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState('');
  const types = payload?.claimableTypes ?? [];
  const disabled = (payload?.unclaimedCount ?? 0) === 0 || pending;

  /* ONE CALL PER REWARD, IN ORDER. There is no batch-claim route here (bc.game's is
     `/activity/bonus/v2/batch-claim/`), and each of these credits a wallet — so a sequence that
     stops on the first refusal is right where a `Promise.all` would fire the rest into a state
     the first one already invalidated. The refusal is shown as it comes: `VIP_LEVEL_TOO_LOW` and
     `NOT_CLAIMABLE` are both the platform's own words and both are things a visitor can act on. */
  const claimAll = async () => {
    if (disabled) return;
    setPending(true);
    setError('');
    let claimed = 0;
    try {
      for (const type of types) {
        const call = CLAIM_BY_TYPE[type];
        if (!call) continue;
        await call();
        claimed += 1;
      }
      showToast(claimed ? `Claimed ${claimed} reward${claimed === 1 ? '' : 's'}.` : 'Nothing to claim.');
      onClaimed?.();
    } catch (failure) {
      setError(failure?.message || 'That reward could not be claimed.');
      /* Whatever DID go through has moved money, so the page is refreshed even on a failure —
         leaving the old figures up would show a balance that is already stale. */
      if (claimed) onClaimed?.();
    } finally {
      setPending(false);
    }
  };

  return (
    /* `!bg-layer3 !p-3` — see the note on the Level card beside it; both header cards take the
       same two departures so they read as raised against the layer2 panel and sit tighter than
       the chunk's `p-4`. */
    <Card variant="brand" className="!bg-layer3 !p-3">
      <div className="relative pb-1 pr-8">
        <div className="flex items-center justify-between">
          <span className="truncate text-sm font-semibold leading-snug text-tertiary">
            Total Claimable
          </span>
        </div>
        {/* The chevron to `/claimable-bonus` is `<Show when={total.gt(0)}>` on the original, so
            it is absent here exactly as it is in the capture. Kept as a branch rather than
            deleted, because the day a real payload arrives it should reappear on its own. */}
        {total > 0 && (
          <Link to="/claimable-bonus" className="absolute right-0 top-0">
            <span className="button button-second button-s size-5 rounded-lg">
              <IconArrow className="icon rotate-180 fill-secondary" />
            </span>
          </Link>
        )}
        <div className="flex h-9 w-full min-w-0 items-center text-2xl font-extrabold text-brand">
          <span className="-mt-0.5">
            {cur.show(total, walletCode(session.bonusCurrencyName))}
          </span>
        </div>
      </div>
      <div className="mt-auto flex">
        <button
          type="button"
          disabled={disabled}
          onClick={claimAll}
          className="button button-brand button-m text-nowrap !px-4 !text-base !font-extrabold sm:w-44 sm:min-w-0"
        >
          <BoltIcon />
          Claim All
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-error">{error}</p> : null}
    </Card>
  );
}

/* `jt` in redeem-M5TwYr_j.js. The button is `type="second"` and then written over with
   `button-input border-white_alpha5 bg-none backdrop-blur`, and `not-full` beside it is one of
   the original's dead classes — kept for the reason the header's own `not-full` is.

   THE SUBMIT IS BUILT NOW, and it is `Et(Tt)` on the original:

     const Et = e => { const [r,a] = signal(""); return { handleRedeem: () => { r() && e($e(r)) }, … } }
     const Tt = code => { W || popup.push(() => <Show when={login} fallback={<SignIn code/>}>
                                                  <RedeemResult code/></Show>) }

   so Redeem PUSHES A POPUP rather than calling the API from here — `xt` is the result screen and
   `W` is a one-at-a-time guard on it. That screen is `_t`: a "REDEEMED!" heading over ONE ROW PER
   REWARD, each naming its own type and where it landed ("Added to Lottery", "Added to Lucky
   Spin", each a link into that feature).

   THE PLATFORM ANSWERS ONE AMOUNT, not a list: `{code, amount, currency, newBalance}` in the
   bonus currency, with no reward types and nowhere for those rows to come from. So the result is
   a toast carrying the site's own "REDEEMED!" and the figure, rather than a dialog whose whole
   structure would be one invented row. Build the dialog the day the platform returns a list.

   The code is sent RAW: the server trims and upper-cases before it looks up, deliberately, so a
   code copied out of a screenshot in lower case still matches. */
/* The platform answers an amount as a decimal STRING at the wallet's own eight places —
   `"25.00000000"` — which is right for arithmetic and wrong to read. The trailing zeros go and so
   does a bare point; nothing rounds, because a bonus figure that changed on the way to the eye
   would be worse than a long one. */
const trimAmount = (value) =>
  String(value).includes('.') ? String(value).replace(/0+$/, '').replace(/\.$/, '') : String(value);

function Redeem() {
  const [code, setCode] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState('');

  const submit = async () => {
    if (!code || pending) return;
    setPending(true);
    setError('');
    try {
      const answer = await redeemBonusCode({ code });
      /* `REDEEMED!` is `_t`'s own heading. The amount is the platform's, which bc.game's screen
         has no equivalent of — its rows name a reward type instead. */
      showToast(
        answer?.amount
          ? `REDEEMED! ${trimAmount(answer.amount)} ${answer.currency ?? ''}`.trim()
          : 'REDEEMED!',
      );
      setCode('');
    } catch (failure) {
      /* A REFUSAL IS A TOAST, not a line under the field. The result popup's `useCode` read sits
         in an error boundary whose fallback is `n => (Te.error(n), m.pop(), null)` — the bonus
         pages' `.error` (ring off, the gradient class), carrying the server's own message:
         "That redeem code is not valid", "…has already been used or has expired". */
      const message = failure?.message || 'That redeem code is not valid';
      bonusToast.error(message);
      /* ALSO INLINE, under the field — the gift-card dialog's idiom — so the refusal stays on
         screen after the toast has gone and the visitor can see what to fix. The page stays put. */
      setError(message);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="rounded-lg">
      <div className="flex items-center gap-2 rounded-lg">
        <input
          className="input h-10 flex-1 !bg-input_darken text-sm font-semibold placeholder:text-quarterary"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            if (error) setError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
          aria-invalid={error ? true : undefined}
          placeholder="Enter code here..."
        />
        <button
          type="button"
          disabled={!code || pending}
          onClick={submit}
          className="button button-input button-m not-full flex flex-shrink-0 gap-x-1 border border-solid border-white_alpha5 bg-none text-sm text-primary backdrop-blur"
        >
          <icons.IconRedeem className="icon size-5 fill-secondary" />
          Redeem
        </button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-xs font-semibold text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default function Rewards({ payload, sections, mobile = false, loading = false, error = null, onRetry, onClaimed }) {
  const { session } = useSession();

  return (
    <div className="flex flex-col gap-3">
      {/* `sm:grid-cols-[repeat(auto-fit,minmax(min(100%,_17.5rem),_1fr))]` is the original's own
          — the two cards sit side by side while there is 280px each and stack when there is
          not, without a breakpoint. */}
      <div className="grid min-h-36 w-full grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(min(100%,_17.5rem),_1fr))] sm:gap-3">
        <LevelCard session={session} />
        <TotalClaimable payload={payload} onClaimed={onClaimed} />
      </div>

      <LossBonus onClaimed={onClaimed} />
      <BonusRatio />

      <div className="flex flex-col gap-3 @container">
        {/* THE LEVEL CARD IS NOT GATED WITH THE SECTIONS, and that is not a shortcut: it reads
            `session`, not the reward payload, so it has nothing to wait for — which is also why
            `TotalClaimable` beside it takes `payload` and simply shows its own zero until one
            arrives, the same declared-default state the chunk's store opens in.

            The six reward rows below ARE the payload, so they get the spinner. `min-h-40` is the
            same box the In Progress tab uses on `/quests` — the sibling page, whose chunk really
            does put a bare `.loading` in a `min-h-40` div for exactly this. */}
        {loading ? (
          <div className="center min-h-40">
            <Loading />
          </div>
        ) : error && !payload ? (
          /* A failed read (a 429 from the gateway on a cold load, most often) is said inline with
             a retry, rather than leaving the section empty. */
          <div className="center min-h-40 flex-col gap-3 text-center" role="alert">
            <p className="text-sm font-semibold text-secondary">
              {Number(error?.status) === 429 ? 'Too many requests — please wait a moment.' : 'Rewards could not be loaded.'}
            </p>
            {onRetry && (
              <button type="button" className="button button-second h-10 px-4" onClick={onRetry}>
                Retry
              </button>
            )}
          </div>
        ) : (
          sections.map((section) => (
            <SectionGroup key={section.id} title={section.sectionName}>
              {/* `row-group` and `card-group` are the site's own two list shapes: the first
                  stacks rows into one bordered box with shared hairlines, the second is a grid of
                  separately bordered cards. Which one a section gets is the registry's `layout`,
                  and for Recurring that is a device test — desktop takes the grid. */}
              <div
                className={
                  section.layout === 'grid'
                    ? 'card-group grid-cols-1 gap-3 @lg:grid-cols-2'
                    : 'row-group'
                }
              >
                {section.rows.map(({ primary }) => (
                  <RewardRow key={primary.rewardType} entry={primary} section={section} />
                ))}
              </div>
            </SectionGroup>
          ))
        )}
      </div>

      {/* THE REDEEM BAR GETS A CARD OF ITS OWN ON A PHONE AND NOTHING ON A DESKTOP, and it is
          this wrapper that carries it rather than the bar — `a2` is inserted into `u` and then
          `u` is classed from the same device flag:

            a(u, r(a2, {})),
            M(() => E(u, w("mt-2", k.mobile ? "rounded-xl border-[1px] border-fourth/5 bg-layer3 p-2" : "")))

          On a desktop the bar sits inside the panel's own layer2 box and needs no surface; on a
          phone there is no panel, so the input and its button would otherwise float on the page
          background. Sampled off the reference at #292d2e, which is layer3 exactly, with the
          input's `input_darken` (#1e2121) inside it and the disabled button reading #303536 —
          `input_button` #3a4142 at `.button:disabled`'s own 40%, which is what confirmed the
          surface underneath is layer3 and not layer2. */}
      <div
        className={`mt-2 ${
          mobile ? 'rounded-xl border-[1px] border-fourth/5 bg-layer3 p-2' : ''
        }`.trim()}
      >
        <Redeem />
      </div>
    </div>
  );
}
