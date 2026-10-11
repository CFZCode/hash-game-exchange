'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { STAFF_LEVELS } = require('@ibitplay/auth');

const { createAdminController } = require('../controllers/admin.controller');
const { WalletService } = require('../wallet.service');

/**
 * `POST /admin/user/wallet/adjust` — who gets which path (B2B fix 1).
 *
 * Agent-tree staff (4–6, and an executive row acting for one) never create
 * money: their adjust goes to admin-service as a transfer from their own float,
 * with the transaction password REQUIRED there. House staff (1–3) keep the
 * operator adjustment, behind their transaction password once one is set.
 */

const call = (handler, req) =>
  new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { resolve({ status: this.statusCode, body }); return this; },
    };
    handler(req, res, (err) => (err ? reject(err) : resolve({ status: res.statusCode, body: null })));
  });

const body = {
  userId: 42, currency: 'INR', amount: '100', operation: 'credit', description: 'test', transactionPassword: 'tp',
};

const fakeService = () => {
  const calls = [];
  return {
    calls,
    assertPlayerVisible: async (...args) => { calls.push(['visible', ...args]); },
    agentAdjust: async (...args) => { calls.push(['agentAdjust', ...args]); return { transferId: '1' }; },
    checkTransactionPassword: async (...args) => { calls.push(['checkTxn', ...args]); return { set: true, verified: true }; },
    adminAdjust: async (...args) => { calls.push(['adminAdjust', ...args]); return { ledgerId: 1 }; },
  };
};

test('wallet adjust routing', async (t) => {
  for (const level of [STAFF_LEVELS.SUPER_MASTER, STAFF_LEVELS.MASTER, STAFF_LEVELS.AGENT]) {
    await t.test(`level ${level} is a transfer from its own float`, async () => {
      const service = fakeService();
      const ctrl = createAdminController({ service });
      await call(ctrl.adjust, { body, staff: { id: 9, level } });

      const names = service.calls.map((c) => c[0]);
      assert.deepEqual(names, ['visible', 'agentAdjust']);
      assert.deepEqual(service.calls[1][2], { staffId: 9 });
    });
  }

  await t.test('an executive row acting for an agent takes the agent path', async () => {
    const service = fakeService();
    const ctrl = createAdminController({ service });
    await call(ctrl.adjust, { body, staff: { id: 9, level: STAFF_LEVELS.EXECUTIVE, parentLevel: STAFF_LEVELS.AGENT } });
    assert.ok(service.calls.some((c) => c[0] === 'agentAdjust'));
    assert.ok(!service.calls.some((c) => c[0] === 'adminAdjust'));
  });

  for (const level of [STAFF_LEVELS.SUPER_ADMIN, STAFF_LEVELS.ADMIN, STAFF_LEVELS.SUB_ADMIN]) {
    await t.test(`house level ${level} adjusts, after the transaction-password check`, async () => {
      const service = fakeService();
      const ctrl = createAdminController({ service });
      await call(ctrl.adjust, { body, staff: { id: 3, level } });

      const names = service.calls.map((c) => c[0]);
      assert.deepEqual(names, ['visible', 'checkTxn', 'adminAdjust']);
      assert.deepEqual(service.calls[1].slice(1), [3, 'tp', { required: false }]);
    });
  }

  await t.test('a refused transaction password stops a house adjustment', async () => {
    const service = fakeService();
    service.checkTransactionPassword = async () => {
      const err = new Error('The transaction password is not correct');
      err.status = 403;
      err.code = 'TXN_PASSWORD_INVALID';
      throw err;
    };
    const ctrl = createAdminController({ service });
    await assert.rejects(() => call(ctrl.adjust, { body, staff: { id: 3, level: STAFF_LEVELS.ADMIN } }), (e) => e.code === 'TXN_PASSWORD_INVALID');
    assert.ok(!service.calls.some((c) => c[0] === 'adminAdjust'));
  });

  await t.test('agentAdjust forwards a derived idempotency key to admin-service', async () => {
    const posted = [];
    const service = Object.create(WalletService.prototype);
    service.clients = { admin: { post: async (path, payload) => { posted.push([path, payload]); return { replayed: true }; } } };

    await service.agentAdjust(body, { staffId: 9 });
    assert.equal(posted[0][0], '/internal/admin/accounts/player-adjust');
    assert.equal(posted[0][1].staffId, 9);
    assert.equal(posted[0][1].transactionPassword, 'tp');
    assert.match(posted[0][1].idempotencyKey, /^adm:9:42:INR:credit:100:\d+$/);
  });
});
