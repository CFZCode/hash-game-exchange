'use strict';

const money = require('./money');
const { AppError } = require('./errors');

/**
 * Cashier limits per currency — set by the Super Admin in the site admin (Site config → Limits and
 * policy → Cashier), stored in `cashier_limits` (migration 112), checked on every deposit and
 * withdrawal rail.
 *
 *   { INR:  { depositMin: '100', depositMax: '100000', withdrawMin: '500', withdrawMax: '50000' },
 *     USDT: { depositMin: '10',  depositMax: null,     withdrawMin: null,  withdrawMax: '5000'  } }
 *
 * Each amount is in that currency, a decimal string above 0, or null = no limit (the rail's own
 * minimum still applies). A currency with no row has no limits.
 */

const FIELDS = Object.freeze(['depositMin', 'depositMax', 'withdrawMin', 'withdrawMax']);
const CODE = /^[A-Z0-9]{2,12}$/;
const AMOUNT = /^\d{1,15}(\.\d{1,8})?$/;

const EMPTY = Object.freeze({ depositMin: null, depositMax: null, withdrawMin: null, withdrawMax: null });

/** A positive decimal string (a finite positive number is accepted and written as a string). */
const amountOf = (v) => {
  const s = typeof v === 'number' && Number.isFinite(v) ? String(v) : typeof v === 'string' ? v.trim() : null;
  return s && AMOUNT.test(s) && Number(s) > 0 ? s : null;
};

/** Wallet codes come in several spellings (`inr`, `INRFIAT`, `USDT`); the block is keyed upper-case. */
const codeOf = (currency) => String(currency ?? '').trim().toUpperCase().replace(/FIAT$/, '');

/** Reading (every reader): known currencies and fields only; a bad value reads as no limit. */
function cleanCashierLimits(value) {
  const given = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const out = {};
  for (const [rawCode, entry] of Object.entries(given)) {
    const code = codeOf(rawCode);
    if (!CODE.test(code) || !entry || typeof entry !== 'object') continue;
    const row = {};
    for (const f of FIELDS) row[f] = amountOf(entry[f]);
    if (FIELDS.some((f) => row[f] !== null)) out[code] = row;
  }
  return out;
}

/** Saving (strict): the first problem with a submitted block, or null. */
function cashierLimitsProblem(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'cashierLimits must be an object';
  for (const [code, entry] of Object.entries(value)) {
    if (!CODE.test(code)) return `cashierLimits: "${code}" is not a currency code`;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return `cashierLimits.${code} must be an object`;
    const extra = Object.keys(entry).find((k) => !FIELDS.includes(k));
    if (extra) return `cashierLimits.${code}.${extra} is not a field (${FIELDS.join(', ')})`;
    for (const f of FIELDS) {
      if (entry[f] != null && amountOf(entry[f]) === null) return `cashierLimits.${code}.${f} must be an amount above 0 with at most 8 decimals, or empty`;
    }
    for (const [lo, hi] of [['depositMin', 'depositMax'], ['withdrawMin', 'withdrawMax']]) {
      const a = amountOf(entry[lo]);
      const b = amountOf(entry[hi]);
      if (a && b && money.gt(a, b)) return `cashierLimits.${code}: ${lo} is above ${hi}`;
    }
  }
  return null;
}

/** The limits of one currency (all null when the owner set none). */
const limitsFor = (all, currency) => cleanCashierLimits(all)[codeOf(currency)] ?? { ...EMPTY };

const belowMinimum = (details) => new AppError(`The minimum is ${details.minimum} ${details.currency}`, 400, 'CASHIER_BELOW_MINIMUM', details);
const aboveMaximum = (details) => new AppError(`The maximum is ${details.maximum} ${details.currency}`, 400, 'CASHIER_ABOVE_MAXIMUM', details);

/**
 * Refuse an amount outside the owner's limits for its currency. `flow` is 'deposit' or 'withdraw'.
 * `all` is the document's `cashierLimits` (or the whole entitlements document).
 */
function assertWithinCashierLimits(all, { currency, amount, flow }) {
  const block = all && typeof all === 'object' && 'cashierLimits' in all ? all.cashierLimits : all;
  const l = limitsFor(block, currency);
  const min = flow === 'withdraw' ? l.withdrawMin : l.depositMin;
  const max = flow === 'withdraw' ? l.withdrawMax : l.depositMax;
  const code = codeOf(currency);
  if (min && money.lt(String(amount), min)) throw belowMinimum({ minimum: min, currency: code, flow });
  if (max && money.gt(String(amount), max)) throw aboveMaximum({ maximum: max, currency: code, flow });
}

const COLUMN = { depositMin: 'deposit_min', depositMax: 'deposit_max', withdrawMin: 'withdraw_min', withdrawMax: 'withdraw_max' };

/** Every stored row as the block above. An older database without the table reads as no limits. */
async function readCashierLimits(sequelize, { transaction } = {}) {
  if (!sequelize?.query) return {};
  try {
    const [rows] = await sequelize.query('SELECT currency, deposit_min, deposit_max, withdraw_min, withdraw_max FROM cashier_limits', { transaction });
    const block = {};
    for (const r of rows) {
      block[r.currency] = Object.fromEntries(FIELDS.map((f) => [f, r[COLUMN[f]] == null ? null : String(r[COLUMN[f]]).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')]));
    }
    return cleanCashierLimits(block);
  } catch (error) {
    const code = error?.original?.code ?? error?.parent?.code;
    if (code === '42P01') return {};
    throw error;
  }
}

/** Replace the stored limits with `block` (already validated): currencies left out are cleared. */
async function writeCashierLimits(sequelize, block, { staffId = null, transaction } = {}) {
  const clean = cleanCashierLimits(block);
  await sequelize.query('DELETE FROM cashier_limits', { transaction });
  for (const [currency, l] of Object.entries(clean)) {
    await sequelize.query(
      `INSERT INTO cashier_limits (currency, deposit_min, deposit_max, withdraw_min, withdraw_max, updated_by, updated_at)
       VALUES (:currency, :dmin, :dmax, :wmin, :wmax, :staffId, now())`,
      { transaction, replacements: { currency, dmin: l.depositMin, dmax: l.depositMax, wmin: l.withdrawMin, wmax: l.withdrawMax, staffId } }
    );
  }
  return clean;
}

/** Read the stored limits and refuse an amount outside them (`flow`: 'deposit' | 'withdraw'). */
async function assertCashierLimits(sequelize, { currency, amount, flow }) {
  assertWithinCashierLimits(await readCashierLimits(sequelize), { currency, amount, flow });
}

module.exports = {
  FIELDS, cleanCashierLimits, cashierLimitsProblem, limitsFor, assertWithinCashierLimits, codeOf,
  readCashierLimits, writeCashierLimits, assertCashierLimits,
};
