'use strict';

const test = require('node:test');
const assert = require('node:assert');

test('feedMaxStake: max first, maxb/umaxbof of 1 is no cap, maxb fills in a missing max', async () => {
  const { feedMaxStake } = await import('../../../lib/helper/feedStakeLimit.mjs');
  assert.strictEqual(feedMaxStake({ max: 2000, maxb: 1, umaxbof: 10000 }), 2000);
  assert.strictEqual(feedMaxStake({ max: 0, maxb: 100000, umaxbof: 1 }), 100000);
  assert.strictEqual(feedMaxStake({ max: 0, maxb: 1, umaxbof: 1 }), 0);
  assert.strictEqual(feedMaxStake({ max: '50000' }), 50000);
  assert.strictEqual(feedMaxStake(null), 0);
});
