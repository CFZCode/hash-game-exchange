'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { configureEntitlements, resetEntitlements } = require('../src/entitlements');
const { readCashierLimits, assertCashierLimits } = require('../src/cashierLimits');

// A table with one INR row, as migration 112 stores it.
const sequelize = { query: async () => [[{ currency: 'INR', deposit_min: '50.00000000', deposit_max: null, withdraw_min: null, withdraw_max: null }]] };

test.afterEach(() => resetEntitlements());

test('no owner block: the cashier_limits table applies', async () => {
  configureEntitlements({ read: async () => ({ features: {}, flags: {} }) });
  assert.deepEqual(await readCashierLimits(sequelize), { INR: { depositMin: '50', depositMax: null, withdrawMin: null, withdrawMax: null } });
});

test("the owner's block wins over the table, an empty block = no limits", async () => {
  configureEntitlements({ read: async () => ({ cashierLimits: { INR: { depositMin: '100', depositMax: '100000', withdrawMin: '200', withdrawMax: '50000' } } }) });
  const limits = await readCashierLimits(sequelize);
  assert.equal(limits.INR.depositMin, '100');
  await assert.rejects(assertCashierLimits(sequelize, { currency: 'INRFIAT', amount: '99', flow: 'deposit' }), (e) => e.code === 'CASHIER_BELOW_MINIMUM');
  await assert.rejects(assertCashierLimits(sequelize, { currency: 'INR', amount: '50001', flow: 'withdraw' }), (e) => e.code === 'CASHIER_ABOVE_MAXIMUM');
  await assertCashierLimits(sequelize, { currency: 'INR', amount: '100', flow: 'deposit' });

  configureEntitlements({ read: async () => ({ cashierLimits: {} }) });
  assert.deepEqual(await readCashierLimits(sequelize), {});
});

test('no owner block and an empty table: the default limits apply', async () => {
  configureEntitlements({ read: async () => ({ features: {}, flags: {} }) });
  const empty = { query: async () => [[]] };
  const limits = await readCashierLimits(empty);
  assert.deepEqual(limits.INR, { depositMin: '100', depositMax: '100000', withdrawMin: '200', withdrawMax: '50000' });
  assert.deepEqual(Object.keys(limits).sort(), ['BTC', 'DOGE', 'ETH', 'INR', 'LTC', 'TRX', 'USDT']);
  await assert.rejects(assertCashierLimits(empty, { currency: 'INR', amount: '99', flow: 'deposit' }), (e) => e.code === 'CASHIER_BELOW_MINIMUM');
});
