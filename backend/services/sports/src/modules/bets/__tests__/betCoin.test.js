'use strict';

const test = require('node:test');
const assert = require('node:assert');

// A sports bet's money in its own coin (helper/betCoin.mjs) — needs the DB for rates; wallet writes are rolled back.
test.after(async () => (await import('../../../lib/config/db.mjs')).db_default.close());

const usdtPerInr = async () => {
  const { db_default } = await import('../../../lib/config/db.mjs');
  const [inr] = await db_default.query("SELECT usd_rate FROM public.exchangerate WHERE UPPER(currency) = 'INR'", { type: 'SELECT' });
  return Number(inr.usd_rate);
};

test('splitCredit: a settlement credit is liability back + win on top', async () => {
  const { splitCredit } = await import('../../../lib/helper/betCoin.mjs');
  assert.deepStrictEqual(splitCredit(300, 200), { release: 100, win: 200 }); // won: stake 100 back + 200 profit
  assert.deepStrictEqual(splitCredit(60, -40), { release: 60, win: 0 }); // hedged loss: part of the liability back
  assert.deepStrictEqual(splitCredit(0, -100), { release: 0, win: 0 }); // full loss
  assert.deepStrictEqual(splitCredit(-5, 0), { release: -5, win: 0 });
});

test('toBetCoin: what was taken comes back at the bet rate, a win converts at today\'s rate; INR untouched', async () => {
  const { toBetCoin, betCoin } = await import('../../../lib/helper/betCoin.mjs');
  const rate = await usdtPerInr();
  // 100 USDT staked when it was 8000 INR — a deliberately different rate from today's.
  const bets = [{ original_currency: 'USDT', original_amount: 100, stake_amount: 8000 }];
  assert.strictEqual(betCoin(bets), 'USDT');
  assert.strictEqual(await toBetCoin(bets, { release: 8000 }), 100);
  assert.strictEqual(await toBetCoin(bets, { release: -8000 }), -100);
  // Won 200 points (INR): stake back exactly + 200 INR in USDT at today's rate.
  assert.strictEqual(await toBetCoin(bets, { release: 8000, win: 200 }), Math.round((100 + 200 * rate) * 1e8) / 1e8);
  // INR bets: the figure itself.
  const inr = [{ original_currency: 'INR', original_amount: 500, stake_amount: 500 }];
  assert.strictEqual(await toBetCoin(inr, { release: 500, win: 150 }), 650);
  assert.strictEqual(betCoin([{}]), 'INR');
  // BTC keeps its decimals (original_amount is NUMERIC(24,8), migration 129): 0.015 back, not 0.02.
  assert.strictEqual(await toBetCoin([{ original_currency: 'BTC', original_amount: 0.015, stake_amount: 81250 }], { release: 81250 }), 0.015);
});

test('walletColumn: only coin columns with a rate, never points', async () => {
  const { walletColumn } = await import('../../../lib/helper/betCoin.mjs');
  const { db_default } = await import('../../../lib/config/db.mjs');
  assert.strictEqual(await walletColumn(db_default, 'USDT'), 'usdt');
  await assert.rejects(walletColumn(db_default, 'all_point'), /not available/);
  await assert.rejects(walletColumn(db_default, 'credit'), /not available/);
  await assert.rejects(walletColumn(db_default, 'XYZ'), /not available/);
});

test('payInBetCoin: moves the coin column only, INR column untouched (rolled back)', async () => {
  const { payInBetCoin, walletBalance, addToWallet } = await import('../../../lib/helper/betCoin.mjs');
  const { db_default } = await import('../../../lib/config/db.mjs');
  const [player] = await db_default.query('SELECT uid FROM public.credits WHERE uid IS NOT NULL LIMIT 1', { type: 'SELECT' });
  const t = await db_default.transaction();
  try {
    const [before] = await db_default.query('SELECT inr, usdt FROM public.credits WHERE uid = :uid', { replacements: { uid: player.uid }, type: 'SELECT', transaction: t });
    const bets = [{ original_currency: 'USDT', original_amount: 10, stake_amount: 880 }];
    const startUsdt = await walletBalance(db_default, player.uid, 'USDT', t);
    await addToWallet(db_default, player.uid, 'USDT', -10, t); // placement took 10 USDT
    const paid = await payInBetCoin(db_default, { uid: player.uid, bets, release: 880, transaction: t }); // refund
    assert.strictEqual(paid.coin, 'USDT');
    assert.strictEqual(paid.coin_amount, 10);
    assert.strictEqual(paid.coin_balance, startUsdt);
    const [after] = await db_default.query('SELECT inr FROM public.credits WHERE uid = :uid', { replacements: { uid: player.uid }, type: 'SELECT', transaction: t });
    assert.strictEqual(Number(after.inr), Number(before.inr));
  } finally {
    await t.rollback();
  }
});
