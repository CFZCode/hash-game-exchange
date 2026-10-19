import { emptyIfAgentBlocked, request, USE_FIXTURES } from './client';
import ENDPOINTS from './endpoints';
import { BONUSES } from '../pages/DepositOffer/depositOffer';

/* ── LIVE: THE PLATFORM HAS ONE DEPOSIT BONUS, NOT bc.game's FOUR ────────────────────────────
 *
 * `GET /user/bonus/first-deposit` (public, optional session) answers the operator's first-deposit
 * terms: `{enabled, eligible, currency, tiers: [{minDeposit, percent, maxBonus}], wagerMultiplier,
 * expiryDays, wageringLock, claimed}`. Tiers are AMOUNT bands for ONE deposit in the site's reward
 * currency, lowest minimum first; `maxBonus` "0" means no cap.
 *
 * Both reads below are built from it on the live path, and the bc.game payloads stay the fixture:
 *
 *   /deposit-offer        `enabled` false (this delivery) -> no bonuses, so the page renders its
 *                         two headings over nothing rather than bc.game's monthly 4-stage offer.
 *                         Enabled -> one bonus whose stages are the tiers.
 *   the fiat tab's chips  the recharge config the chips and "Extra +…" read; null unless the
 *                         bonus is enabled AND this account is still eligible for it.
 *
 * The path lives here rather than in endpoints.js because this module is its only caller. */
const FIRST_DEPOSIT = '/api/v1/user/bonus/first-deposit';

const readFirstDeposit = () =>
  Promise.resolve(request(FIRST_DEPOSIT, { live: true, fixture: null })).catch(emptyIfAgentBlocked(null));

const liveTiers = (terms) =>
  terms?.enabled && Array.isArray(terms.tiers) ? terms.tiers.filter((t) => Number(t?.percent) > 0) : [];

/** The first-deposit terms in the shape /deposit-offer renders. Copy is the fixture's where it
    describes the mechanics both share (deposit, claim, wager, collect) and the terms' own numbers
    everywhere else; the monthly/4-chance wording is bc.game's and is not carried over. */
export function toDepositOffer(terms) {
  const tiers = liveTiers(terms);
  if (!tiers.length) return { bonuses: [], resetAt: 0 };

  const [template] = BONUSES;
  const currency = String(terms.currency ?? 'USDT');
  const top = Math.max(...tiers.map((t) => Number(t.percent)));
  const expiry = Number(terms.expiryDays) || 0;

  return {
    bonuses: [
      {
        ...template,
        id: 'first-deposit-bonus',
        title: 'First Deposit Bonus',
        /* A matched deposit bonus, not bc.game's rakeback, so the headline says so. */
        headlineNoun: 'Bonus',
        description: `Up to ${top}% bonus on your first deposit.`,
        tags: [template.tags[0]],
        currentStage: 1,
        /* `claimed` is the player's paid grant (null signed out / not yet paid): the page then
           says so instead of offering a deposit for a bonus that is already spent. */
        claimed: Boolean(terms.claimed),
        progress: terms.claimed ? 100 : 0,
        stages: tiers.map((t) => ({
          /* The tier's own floor, e.g. "10+ USDT", rather than a bare index. */
          label: `${Number(t.minDeposit).toLocaleString('en-US', { maximumFractionDigits: 2 })}+ ${currency}`,
          bonus: Number(t.percent),
          rakeback: 0,
          minDeposit: Number(t.minDeposit),
        })),
        minDepositCurrency: currency,
        overview:
          `Get up to ${top}% on your first deposit.` +
          (terms.wagerMultiplier ? ` The bonus must be wagered ${terms.wagerMultiplier}x before it can be withdrawn.` : '') +
          (expiry ? ` It expires ${expiry} days after it is credited.` : ''),
      },
    ],
    /* A first-deposit bonus never resets — `expiryDays` is how long a CREDITED bonus lives, not a
       cycle — so there is no countdown to print (0 hides the "Reset in" badges). */
    resetAt: 0,
  };
}

/** The first-deposit terms as the recharge config `pages/Deposit/deposit.js` reads (`xg`'s shape),
    or null when there is nothing this account can get. The lowest tier is what a chip offers. */
export function toRechargeConfig(terms) {
  const program = terms?.program;
  /* hash.game's Monthly Deposit Bonus: the NEXT deposit of the UTC month gets schedule[used], and
     `eligible` is already false once all of them are used, so "used up" renders as no offer. */
  const monthly = program?.mode === 'monthly';
  const used = Number(program?.usedThisMonth) || 0;
  const tiers = monthly ? (terms.enabled && program.schedule?.[used] ? [program.schedule[used]] : []) : liveTiers(terms);
  if (!tiers.length || !terms.eligible) return null;
  const [low] = tiers;
  return {
    depositBonusType: monthly ? 'MONTHLY' : 'FIRST_DEPOSIT',
    /* Read by the manual deposit form's "Deposit bonus N/4" line; null in first-deposit mode. */
    monthly: monthly ? { n: used + 1, total: program.schedule.length, gradual: program.unlockMode === 'gradual' } : null,
    selected: false,
    supportCurrencyRule: [{ type: 'all', list: [] }],
    currentUseConfigs: [
      {
        seq: monthly ? used + 1 : 1,
        selectedBonusType: null,
        currency: String(terms.currency ?? 'USDT'),
        minDeposit: Number(low.minDeposit),
        maxDeposit: null,
        bonusRatio: Number(low.percent) / 100,
        extraBonusRatio: null,
        maxBonus: Number(low.maxBonus) > 0 ? Number(low.maxBonus) : null,
        fiatRechargeV2: null,
      },
    ],
  };
}

/* The deposit-bonus feed behind /deposit-offer.
 *
 * The PATH is the original's own — `index-CoOXrsZl.js` in the mirror declares
 * `getTimesDepositBonus: () => s.get("/activity-extension/times-deposit-bonus/list/")` — but
 * no response was captured, so the payload is this project's reconstruction. See
 * pages/DepositOffer/depositOffer.js for what in it is transcribed and what is derived.
 */

/* End of the current month, 00:00:00 UTC on the 1st, minus a millisecond.
 *
 * COMPUTED, not pinned, and the page itself is the authority: its overview reads "All 4
 * chances reset on the 1st of each month at 00:00 UTC". The captured `expiresinms` attribute
 * was 1788220799999 — 2026-08-31T23:59:59.999Z — which is exactly what this returns for the
 * month that capture was taken in, so the rule and the capture agree and the countdown keeps
 * running instead of freezing on that date.
 *
 * `Date.UTC` with a month of `getUTCMonth() + 1` and a day of 1 rolls the year over on its
 * own in December, so there is no wrap-around case to handle. */
function endOfMonthUtc(now = new Date()) {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) - 1;
}

export const getDepositBonuses = () =>
  USE_FIXTURES
    ? depositBonusesFixture()
    : readFirstDeposit().then((terms) => toDepositOffer(terms));

const depositBonusesFixture = () =>
  request(ENDPOINTS.bonus.timesDeposit, {
    fixture: {
      bonuses: BONUSES,
      /* One instant for the whole payload rather than one per bonus: the page prints the same
         "Reset in" countdown in the progress card's header and on the promotion card, and on
         the original they tick together off the identical `expiresinms`. */
      resetAt: endOfMonthUtc(),
    },
  });

/* `/activity/recharge-bonus/config/current/` — the payload the FIAT deposit tab reads, and the
 * one place in this project where a fixture is assembled from a DIFFERENT endpoint's live
 * answer rather than either captured or invented.
 *
 * `xg` in index-C1xohM7W.js takes `currentUseConfigs[0]` and turns it into the bonus behind
 * three things on that tab: the "Extra +₹…" figure beside the amount box, the orange "+180%"
 * corner tag on a quick-amount chip, and — through `_l` — the floor the chips are generated
 * from. This endpoint is login-gated and `hash.game` answers it 6002.
 *
 * WHAT IS REAL. `/activity/recharge-bonus/progress/` DOES answer unauthenticated, and its
 * `progressList` carries exactly the fields `currentUseConfigs` entries carry. Its seq-1 row is
 * the next deposit's config, which is what `currentUseConfigs[0]` is, so the numbers below are
 * that row verbatim: `minDeposit` 5 BCD, `fiatRechargeV2.minDepositCurrencies.INRFIAT` 1000,
 * `bonusRatio` 1.8, `maxDeposit` and `maxBonus` both null. The nine fiat minimums and the six
 * USD-based ones are the live response's own.
 *
 * THE ONE FIELD THAT IS NOT. `extraBonusRatio` is 0.4 in the progress response and is `null`
 * here, and the capture is what settles it: `Ni` adds the two when the second is non-null, so
 * 1.8 + 0.4 would print "+220%" on every chip, and the fiat tab's capture reads "+180%" with a
 * 1,000 INR deposit showing "Extra +₹1,800.00" — 1000 x 1.8 exactly. The extra ratio is a
 * separate seasonal top-up (`extraBonusExpiredTime` is its own field) that the progress feed
 * reports and this config does not. Correct it the day the real response can be read.
 *
 * The derivation is worth keeping straight: /deposit-offer's stage match and the hero's deposit
 * slide DO add the two and print 220. Three surfaces, two answers, and both are right. */
/* ── THE CONFIG IS A STORE, AND THAT IS WHY IT HAS TWO ACCESSORS ───────────────────────────────
 *
 * `xg` reads `bonusStore.rechargeConfig` SYNCHRONOUSLY, from inside pure helpers that compute a
 * chip ladder and an "Extra +₹…" figure — none of which is a component and none of which can
 * await anything. On the original that works because something else fills the store and those
 * helpers simply see `undefined` until it does.
 *
 * Reproduced with the same split rather than by making four pure functions async:
 *
 *   getRechargeBonusConfig()    the read — a Promise now (see services/client.js), and what a
 *                               component hands `useResource`. Resolving it fills the cache.
 *   rechargeBonusConfigNow()    the store — the payload if it has arrived, else null. This is
 *                               what `pages/Deposit/deposit.js` reads.
 *
 * The one thing a call site MUST do is start the read, or the cache never fills: `FiatTab`
 * mounts the `useResource` for exactly that reason, which is also what re-renders the tab when
 * the chips can finally be generated. Same arrangement as the original, where the store is
 * populated by the page and read by the helpers. */
let cached = null;

export const rechargeBonusConfigNow = () => cached;

export const getRechargeBonusConfig = () => {
  const answer = rechargeBonusConfig();
  if (answer && typeof answer.then === 'function') {
    return answer.then((payload) => {
      cached = payload;
      return payload;
    });
  }
  cached = answer;
  return answer;
};

const rechargeBonusConfig = () =>
  USE_FIXTURES
    ? rechargeBonusConfigFixture()
    : readFirstDeposit().then(toRechargeConfig, () => null);

const rechargeBonusConfigFixture = () =>
  request(ENDPOINTS.bonus.rechargeConfig, {
    fixture: {
      depositBonusType: 'MONTHLY',
      /* `t.selected` and `supportCurrencyRule` are both read by `xg`'s guards. The rule below
         is the permissive shape (`type: "all"`), which is what a MONTHLY bonus with nine fiat
         minimums must carry — every one of those currencies has to pass `bg()`. */
      selected: false,
      supportCurrencyRule: [{ type: 'all', list: [] }],
      currentUseConfigs: [
        {
          seq: 1,
          selectedBonusType: null,
          currency: 'BCD',
          minDeposit: 5,
          maxDeposit: null,
          bonusRatio: 1.8,
          extraBonusRatio: null,
          maxBonus: null,
          fiatRechargeV2: {
            minDepositCurrencies: {
              INRFIAT: 1000,
              NGNFIAT: 2000,
              IDRFIAT: 40000,
              PKRFIAT: 600,
              THBFIAT: 150,
              PHPFIAT: 200,
              BDTFIAT: 150,
              BRLFIAT: 25,
              ARSFIAT: 7000,
            },
            usdBasedCurrencies: {
              KRWFIAT: 15.2,
              MXNFIAT: 2.1,
              VNDFIAT: 8.1,
              RUBFIAT: 16.4,
              JPYFIAT: 17.1,
              MYRFIAT: 13.3,
            },
          },
        },
      ],
    },
  });

/* The player's ACTIVE bonus money (`GET /user/bonus-balance` → `{ currency, balances: [{ currency, amount }] }`),
   held apart from the wallet columns until it is wagered off — the wallet's Bonus Balance card. Null in fixture mode. */
export const getBonusBalance = () =>
  USE_FIXTURES ? null : Promise.resolve(request('/api/v1/user/bonus-balance', { live: true, fixture: null })).catch(() => null);

/* hash.game: "Claim your unlocked rewards from the Bonus page anytime" — `POST /user/bonus-balance/claim`
   moves what the locked deposit bonuses have unlocked to cash. */
export const claimUnlockedBonus = () =>
  request('/api/v1/user/bonus-balance/claim', { live: true, method: 'POST', fixture: null });

export default getDepositBonuses;
