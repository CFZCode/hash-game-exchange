'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { Op } = require('sequelize');

const { PayoutRunner } = require('../settlement.payout.job');

/**
 * Sports bets never reached `userwager` (no VIP XP, no rakeback, no
 * commission). After a payout pass, every bet it CLOSED as won/loss is posted
 * to user-service's `/internal/user/wager/record` in INR, keyed
 * `sports:<bet id>`, for conversion to USD and an exactly-once count.
 */
test('recordSettledStakes', async (t) => {
  const build = (rows) => {
    const posted = [];
    let where = null;
    const runner = new PayoutRunner({
      models: { SportsBet: { findAll: async (q) => { where = q.where; return rows; } } },
      db: { Op },
      config: {},
      logger: { warn() {}, info() {}, error() {} },
      clients: { user: { post: async (path, body) => { posted.push({ path, body }); return {}; } } },
    });
    return { runner, posted, where: () => where };
  };

  await t.test('posts each settled won/loss stake in INR with the bet key', async () => {
    const { runner, posted, where } = build([
      { id: 11, user_id: '5', stake_amount: '1000.00' },
      { id: 12, user_id: '5', stake_amount: '250.50' },
    ]);
    await runner.recordSettledStakes([11, 12, 13]);

    assert.deepEqual(where().result_status, { [Op.in]: ['won', 'loss'] }, 'refunds and voids are not turnover');
    assert.equal(where().status, 'closed');
    assert.deepEqual(posted.map((p) => p.body), [
      { userId: 5, amount: '1000.00', currency: 'INR', source: 'sports', ref: '11' },
      { userId: 5, amount: '250.50', currency: 'INR', source: 'sports', ref: '12' },
    ]);
    assert.ok(posted.every((p) => p.path === '/internal/user/wager/record'));
  });

  await t.test('a failing post never throws into settlement', async () => {
    const { runner } = build([{ id: 1, user_id: '5', stake_amount: '10' }]);
    runner.clients.user.post = async () => { throw new Error('down'); };
    await assert.doesNotReject(() => runner.recordSettledStakes([1]));
  });

  await t.test('no clients wired: nothing happens', async () => {
    const runner = new PayoutRunner({ models: {}, db: { Op }, config: {}, logger: null });
    await assert.doesNotReject(() => runner.recordSettledStakes([1]));
  });
});
