'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const { createLogger, errorHandler, requestContext, entitlements } = require('@ibitplay/common');

// The player's read of the owner's cashier limits: one currency's four figures, null = no limit.
test('GET /cashier-limits answers the owner limits of one currency', async () => {
  entitlements.configureEntitlements({
    read: async () => ({ features: {}, flags: {}, version: 1, source: 'owner', cashierLimits: { INR: { depositMin: '100', depositMax: '100000', withdrawMin: '200' } } }),
  });
  const logger = createLogger({ service: 'test', level: 'silent' });
  const app = express();
  app.use(requestContext());
  app.use('/cashier-limits', require('../routes/user.routes')({ models: {}, logger }));
  app.use(errorHandler({ logger }));
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const inr = await (await fetch(`${base}/cashier-limits?currency=inrfiat`)).json();
    assert.deepEqual(inr.data, { currency: 'INR', depositMin: '100', depositMax: '100000', withdrawMin: '200', withdrawMax: null });
    const usdt = await (await fetch(`${base}/cashier-limits?currency=USDT`)).json();
    assert.deepEqual(usdt.data, { currency: 'USDT', depositMin: null, depositMax: null, withdrawMin: null, withdrawMax: null });
    assert.equal((await fetch(`${base}/cashier-limits`)).status, 422, 'currency is required');
  } finally {
    server.close();
    entitlements.resetEntitlements();
  }
});
