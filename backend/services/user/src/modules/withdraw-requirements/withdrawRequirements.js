'use strict';

const { money, sitePolicy, defineErrors } = require('@ibitplay/common');

const { WagerService } = require('../wager/wager.service');
const { PlayerBonusService } = require('../player-bonuses/playerBonus.service');
const { createRewardMoney } = require('../../lib/rewardMoney');

/**
 * Withdrawal requirements — the owner's `withdrawal_requirements` policy, checked in ONE place.
 *
 * ═════════════════════════════════════════════════════════════════════════
 * THE POLICY (owner panel, packages/common/src/featureCatalogue.js)
 *
 *   none           nothing is required
 *   kyc            KYC Verified (the default — what every rail did before the policy)
 *   wager          every open wagering requirement complete
 *   kyc_and_wager  both
 *
 * KYC also needs `WITHDRAW_REQUIRE_KYC` on (the deployment's switch, default on): an env that
 * turns KYC off turns it off whatever the policy says, as it always did.
 *
 * ── "WAGERING COMPLETE" ─────────────────────────────────────────────────
 *
 *   bonus    no active bonus with wagering left (`player_bonuses`, the bonus wagering lock);
 *   deposit  the deposit rollover (`/user/wager/tasks`: approved deposits × multiplier, in USD)
 *            complete. It is the platform's only deposit-turnover rule.
 *
 * Totals are in USD (the rollover's unit; a bonus is converted at the current rate, USDT = 1,
 * and a coin with no rate counts at face value — never as zero).
 *
 * ── THE BONUS PART IS THE PLAYER'S TO CLEAR ─────────────────────────────
 *
 * Forfeiting a bonus clears its wagering. So the wager refusal (403 WITHDRAW_WAGER_REQUIRED) is
 * only for an incomplete DEPOSIT rollover; a withdrawal whose only open wagering is a bonus goes
 * on to the existing 409 BONUS_FORFEIT_REQUIRED, and `forfeitBonus: true` forfeits it and passes.
 * That keeps the confirm-and-forfeit flow exactly as it was. `remaining` in the refusal counts
 * the bonus part too unless the request already forfeits it.
 *
 * Agent-tree players never reach here: every rail refuses them first (WITHDRAW_NOT_FOR_AGENT_USERS).
 * ═════════════════════════════════════════════════════════════════════════
 */

const POLICY = 'withdrawal_requirements';
const ZERO = '0.00000000';
const UNIT = 'USD';

const errors = defineErrors('WITHDRAW', {
  /** Details `{ remaining, currency, deposit, bonus, forfeitable }` — see the module note. */
  WAGER_REQUIRED: {
    status: 403,
    message: 'Complete your wagering requirement before withdrawing',
  },
});

const dec = (minor) => money.toDecimalString(minor);
const sum = (values) => dec(values.reduce((acc, v) => acc + money.toMinor(v), 0n));

function createWithdrawRequirements(deps) {
  const { models, config, logger } = deps;
  const wager = deps.wagerService ?? new WagerService(deps);
  const bonuses = deps.playerBonuses ?? new PlayerBonusService(deps);
  const rewardMoney = deps.rewardMoney ?? createRewardMoney(deps);
  const kycSwitch = config?.WITHDRAW_REQUIRE_KYC !== false;

  /** `{ policy, kyc, wager }` — which checks are in force now. Read on every call, no cache. */
  async function rules() {
    const policy = await sitePolicy.readPolicy(models, POLICY);
    const requires = (what) => (sitePolicy.ALLOWS[POLICY][what] ?? []).includes(policy);
    return { policy, kyc: requires('kyc') && kycSwitch, wager: requires('wager') };
  }

  /** The player's latest `user_kyc` row (user_id is VARCHAR in the legacy schema). */
  async function kycStatus(userId) {
    const row = await models.UserKyc.findOne({
      where: { user_id: String(userId) },
      order: [['id', 'DESC']],
      attributes: ['status'],
      raw: true,
    });
    const status = row?.status ?? 'NotSubmitted';
    return { status, verified: status === 'Verified' };
  }

  async function usd(amount, currency) {
    const value = await rewardMoney.toUsd(amount, currency);
    if (value == null) {
      logger?.warn({ currency }, 'Withdrawal requirements: no USD rate for a bonus currency — counted at face value');
      return amount;
    }
    return dec(money.toMinorQuantised(value));
  }

  /** The open wagering: `{ bonus, deposit }`, both in USD. */
  async function openWagering(userId) {
    const [open, tasks] = await Promise.all([bonuses.openWagering(userId), wager.getTasks(userId)]);

    const bonusRemaining = sum(await Promise.all(open.map((b) => usd(b.remaining, b.currency))));
    const task = tasks.tasks.find((t) => t.kind === 'deposit') ?? null;
    const depositRemaining = sum(tasks.tasks.filter((t) => t.status !== 'complete').map((t) => t.remaining));

    return {
      bonus: {
        remaining: bonusRemaining,
        currency: UNIT,
        bonuses: open,
      },
      deposit: {
        remaining: depositRemaining,
        currency: UNIT,
        target: task?.target ?? ZERO,
        wagered: task?.wagered ?? ZERO,
        multiplier: tasks.multiplier ?? null,
      },
    };
  }

  /**
   * The full answer for a player — `GET /user/withdrawals/requirements`. Both checks are read
   * whatever the policy (a page can show progress), `required` says which are enforced.
   */
  async function evaluate(userId) {
    const [r, kyc, open] = await Promise.all([rules(), kycStatus(userId), openWagering(userId)]);
    const remaining = sum([open.bonus.remaining, open.deposit.remaining]);
    const done = money.lte(remaining, '0');
    const missing = [];
    if (r.kyc && !kyc.verified) missing.push('kyc');
    if (r.wager && !done) missing.push('wager');
    return {
      policy: r.policy,
      ok: missing.length === 0,
      missing,
      kyc: { required: r.kyc, status: kyc.status, verified: kyc.verified },
      wager: {
        required: r.wager,
        done,
        remaining,
        // What would still block after the player forfeits their bonuses.
        remainingAfterForfeit: open.deposit.remaining,
        currency: UNIT,
        bonus: open.bonus,
        deposit: open.deposit,
      },
      // Any active bonus is forfeited by a withdrawal (409 BONUS_FORFEIT_REQUIRED, then
      // `forfeitBonus: true`), whatever the policy: bonus money is never cash.
      bonusForfeitRequired: open.bonus.bonuses.length > 0,
    };
  }

  /**
   * The rail's check, after its cooldown and before the bonus forfeit. `kycError(status)` builds
   * the rail's own `*_KYC_REQUIRED`. Returns the rules applied.
   */
  async function assertMet(userId, { forfeitBonus = false, kycError }) {
    const r = await rules();
    if (r.kyc) {
      const kyc = await kycStatus(userId);
      if (!kyc.verified) throw kycError(kyc.status);
    }
    if (r.wager) {
      const open = await openWagering(userId);
      if (money.gt(open.deposit.remaining, '0')) {
        const remaining = forfeitBonus ? open.deposit.remaining : sum([open.deposit.remaining, open.bonus.remaining]);
        logger?.info({ userId: String(userId), remaining, policy: r.policy }, 'Withdrawal refused: wagering incomplete');
        throw errors.WAGER_REQUIRED({
          remaining,
          currency: UNIT,
          deposit: { remaining: open.deposit.remaining, target: open.deposit.target, wagered: open.deposit.wagered },
          bonus: { remaining: forfeitBonus ? ZERO : open.bonus.remaining, count: open.bonus.bonuses.length },
          forfeitable: !forfeitBonus && open.bonus.bonuses.length > 0,
        });
      }
      // Only bonus wagering open: the rail's bonus check answers 409 BONUS_FORFEIT_REQUIRED,
      // and a confirmed forfeit clears it.
    }
    return r;
  }

  return { rules, evaluate, assertMet, kycStatus };
}

module.exports = { createWithdrawRequirements, withdrawRequirementErrors: errors, POLICY };
