'use strict';

const { defineErrors } = require('@ibitplay/common');

module.exports = defineErrors('ACCOUNTS', {
  NOT_IN_YOUR_TREE: { status: 404, message: 'Account not found' },
  NOT_FOUND: { status: 404, message: 'Account not found' },

  TRANSACTION_PASSWORD_REQUIRED: {
    status: 403,
    /**
     * Legacy required this on every write here and it is kept — it is the one
     * control that distinguishes "somebody stole a session" from "an operator
     * decided this".
     */
    message: 'This action requires your transaction password',
  },

  INSUFFICIENT_FUNDS: {
    status: 402,
    message: 'There is not enough in your balance to cover this',
  },

  REFILL_TOO_LARGE: {
    status: 422,
    // Legacy had no ceiling on a direct wallet credit.
    message: 'That amount exceeds the single-refill limit',
  },

  CANNOT_ACT_ON_SELF: { status: 422, message: 'An account cannot do that to itself' },

  /** An agent's float is INR (`staff_balances.inr`); there is nothing else to draw from. */
  FLOAT_CURRENCY_ONLY: {
    status: 422,
    message: 'Agent balance moves are in INR only',
  },

  /** Players never play on credit; only an agent's float has a credit line. */
  PLAYER_CREDIT_NOT_SUPPORTED: {
    status: 422,
    message: 'Players cannot be given a credit limit',
  },

  PLAYER_INSUFFICIENT_FUNDS: {
    status: 402,
    message: 'The player does not have enough balance for this',
  },

  IDEMPOTENCY_CONFLICT: {
    status: 409,
    message: 'This request key was already used with a different amount',
  },
});
