'use strict';

/**
 * The withdrawal block — the refusal every payout path asks for first.
 *
 * ═════════════════════════════════════════════════════════════════════════
 * ONE GUARD, EVERY RAIL
 *
 * `users.withdraw_locked` / `staff.withdraw_locked` (migration 091) is an
 * operator lock set through `POST /admin/locks` (`withdraw: true`), cascaded to
 * an agent's subtree like the other lock columns. A block that only one rail
 * honours is not a block — the money simply leaves by the other one — so the
 * fiat and crypto withdrawals, the gateway payout, a P2P sell order, a tip and
 * the agent cash-outs all call this before anything is held or moved.
 *
 * `system_locked` is refused here too. The auth guard already turns a
 * system-locked player away, but it caches the account row briefly, and the
 * agent cash-out routes act on a player who is not the caller at all.
 *
 * NOT `withdraw_locked_until`: that timed cooldown after a password or 2FA
 * change has its own refusal (WITHDRAW_COOLDOWN) on each rail and expires by
 * itself.
 *
 * Read on every call, no cache: an operator who blocks an account during an
 * incident means the next request.
 * ═════════════════════════════════════════════════════════════════════════
 */

const { defineErrors } = require('./defineErrors');

const errors = defineErrors('WITHDRAW', {
  /** Code `WITHDRAW_BLOCKED` — the player site maps it to its own message. */
  BLOCKED: {
    status: 403,
    message: 'Withdrawals are blocked on this account. Contact support.',
  },
});

/**
 * Refuse when the account may not move money out.
 *
 * @param {object} models   the service's registered models (Users and/or Staff)
 * @param {object} target   `{ userId }` or `{ staffId }`
 * @param {object} [options]
 * @param {import('sequelize').Transaction} [options.transaction]
 * @throws {AppError} WITHDRAW_BLOCKED (403), `details.reason` 'withdraw' | 'system'
 *
 * An account that does not exist is not refused here; the caller's own lookup
 * answers that with its own error.
 */
async function assertWithdrawAllowed(models, { userId, staffId } = {}, { transaction } = {}) {
  const isStaff = staffId != null && userId == null;
  const model = isStaff ? models.Staff : models.Users;
  const id = isStaff ? staffId : userId;
  if (!model || id == null) throw new Error('assertWithdrawAllowed needs a userId or a staffId');

  const row = await model.findByPk(id, {
    attributes: ['id', 'withdraw_locked', 'system_locked'],
    raw: true,
    transaction,
  });
  if (!row) return;

  if (row.withdraw_locked) throw errors.BLOCKED({ reason: 'withdraw' });
  if (row.system_locked) throw errors.BLOCKED({ reason: 'system' });
}

module.exports = { assertWithdrawAllowed, errors, WITHDRAW_BLOCKED: 'WITHDRAW_BLOCKED' };
