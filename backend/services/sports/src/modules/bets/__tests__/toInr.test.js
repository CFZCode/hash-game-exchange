'use strict';

const test = require('node:test');
const assert = require('node:assert');

// placeBet's stake conversion, against the platform's own rate table (needs the DB).
test('toInr: INR passes through, other coins convert at exchangerate, unknown coin refused', async (t) => {
  const { toInr } = await import('../../../lib/helper/toInr.mjs');
  const { db_default } = await import('../../../lib/config/db.mjs');
  t.after(() => db_default.close());

  assert.strictEqual(await toInr(500, 'INR'), 500);

  const [inr] = await db_default.query("SELECT usd_rate FROM public.exchangerate WHERE UPPER(currency) = 'INR'", { type: 'SELECT' });
  assert.strictEqual(await toInr(2, 'usdt'), Math.round((2 / Number(inr.usd_rate)) * 100) / 100);

  await assert.rejects(toInr(1, 'XYZ'), /No exchange rate for XYZ/);
});
