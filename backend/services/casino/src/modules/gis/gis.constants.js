'use strict';

/** Slotegrator's own error codes. Their client switches on these strings. */
const ERROR_CODE = Object.freeze({
  INTERNAL: 'INTERNAL_ERROR',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
});

/** The wallet actions the callback carries. */
const ACTION = Object.freeze({
  BALANCE: 'balance',
  BET: 'bet',
  WIN: 'win',
  REFUND: 'refund',
  ROLLBACK: 'rollback',
});

const MONEY_ACTIONS = Object.freeze(new Set([ACTION.BET, ACTION.WIN, ACTION.REFUND]));

/**
 * Currencies the integration accepts from the provider, and the wallet currency
 * each settles against.
 *
 * INR settles in INR and USD/USDT in USDT, one unit for one unit, no conversion.
 * PKR is not on our Slotegrator contract (checked 2026-10-20), so it is not accepted.
 */
const SETTLEMENT_CURRENCY = Object.freeze({
  USDT: 'USDT',
  USD: 'USDT',
  INR: 'INR',
});

const SUPPORTED_CURRENCIES = Object.freeze(Object.keys(SETTLEMENT_CURRENCY));

/** What the provider is told a currency is called: the contract has USD, not USDT. INR goes as INR. */
const OUTBOUND_CURRENCY = Object.freeze({ USDT: 'USD' });

/**
 * The uuid-v5 namespace used to derive the transaction id we hand back.
 *
 * NEVER CHANGE THIS. Slotegrator stores the id we return and quotes it in
 * reconciliation. Deriving it from their id rather than generating one is what
 * makes a retried request produce the same answer twice — a fresh uuid per
 * attempt would look like two settlements of one bet.
 */
const RESPONSE_ID_NAMESPACE = 'b58d9c74-80bb-46cb-8e0d-57458f25c23c';

/** Balances are quoted to the provider with four decimal places. */
const BALANCE_SCALE = 4;

/** Devices the launch endpoint will ask for. */
const DEVICES = Object.freeze(['desktop', 'mobile']);

module.exports = {
  ERROR_CODE,
  ACTION,
  MONEY_ACTIONS,
  SETTLEMENT_CURRENCY,
  SUPPORTED_CURRENCIES,
  OUTBOUND_CURRENCY,
  RESPONSE_ID_NAMESPACE,
  BALANCE_SCALE,
  DEVICES,
};
