'use strict';

const test = require('node:test');
const assert = require('node:assert');

const db = require('@ibitplay/db');
const { createLogger } = require('@ibitplay/common');

const { RaceTurnoverService } = require('../raceTurnover.service');

/**
 * Race turnover counts STAKES, once, and only stakes that stood.
 *
 *  - an in-house bet that was refunded is not turnover (it used to count);
 *  - a jsGames v2 stake is `additional_data.bet_amount` — the stored `amount`
 *    is win − bet, negative for a stake, so v2 used to count nothing;
 *  - a v2 negative-bet correction takes its stake back out;
 *  - seamless stakes count unless rolled back.
 */
const TEST_DB = process.env.TEST_DB_NAME || 'ibitplay_test';
const uid = 930_000_000 + (process.pid % 100_000);

test('race turnover against a database', async (t) => {
  const logger = createLogger({ name: 'race-test', level: 'silent' });
  let connection;
  try {
    connection = await db.connect({
      config: {
        DB_HOST: process.env.DB_HOST || '127.0.0.1',
        DB_PORT: Number(process.env.DB_PORT || 5432),
        DB_NAME: TEST_DB,
        DB_USER: process.env.DB_USER || 'postgres',
        DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
        DB_SCHEMA: 'public',
      },
      logger,
      service: 'casino-service',
    });
    await connection.ping();
  } catch (error) {
    t.skip(`No test database reachable (${error.message})`);
    return;
  }
  const { models } = connection;
  const q = (sql, replacements) => connection.sequelize.query(sql, { replacements });

  const clean = async () => {
    await models.Bets.destroy({ where: { uid } });
    await models.GameTransaction.destroy({ where: { user_id: uid } });
    await q('DELETE FROM seamless_transactions WHERE user_id = :uid', { uid });
  };

  t.after(async () => {
    await clean();
    await connection.close();
  });

  await clean();
  const now = new Date();
  const tag = `race-${process.pid}-${Date.now()}`;

  // In-house: one settled bet (10), one refunded bet (10, must NOT count).
  const bet = (amount, result, n) =>
    models.Bets.create({
      uid, gid: n, name: 'r', game: 'limbo', coin: 'inr', amount, profit: '0', hash: `${tag}-${n}`, result, created: now,
    });
  await bet('10', 2.5, 1);
  await bet('10', 'refunded', 2);

  // v2: a lost round (bet 10 → amount −10), a won round in one message
  // (bet 10, win 20 → amount +10), a split-round win row (bet 0), a 'loss' row
  // (0/0), and a negative-bet correction of −4.
  const v2 = (type, bet, win, n) =>
    models.GameTransaction.create({
      user_id: uid, game_uid: null, transaction_type: type, amount: String(Number(win) - Number(bet)), currency: 'INR',
      external_transaction_id: `${tag}-v2-${n}`, transaction_status: 'completed',
      additional_data: { bet_amount: bet, win_amount: win },
    });
  await v2('bet', '10', '0', 1);
  await v2('bet_result', '10', '20', 2);
  await v2('win', '0', '15', 3);
  await v2('loss', '0', '0', 4);
  await v2('negative_bet', '-4', '0', 5);

  // seamless: a stake of 3 USDT, and one of 2 that was rolled back.
  const sl = (id, action, amount, reverses = null) =>
    q(
      `INSERT INTO seamless_transactions (transaction_id, action, member_account, user_id, currency, provider_amount, amount, reverses_id)
       VALUES (:id, :action, 'm', :uid, 'USDT', 0, :amount, :reverses)`,
      { id, action, uid, amount, reverses }
    );
  await sl(`${tag}-s1`, 'withdraw', '-3');
  await sl(`${tag}-s2`, 'pushbet', '-2');
  await sl(`rollback:${tag}-s2`, 'rollback', '2', `${tag}-s2`);

  const service = new RaceTurnoverService({ db: connection, logger });
  const { rows } = await service.racePoints({ from: new Date(now.getTime() - 60_000), to: new Date(now.getTime() + 60_000) });
  const mine = rows.filter((r) => r.userId === String(uid));
  const byCurrency = {};
  for (const r of mine) {
    byCurrency[r.currency] ??= { amount: 0, bets: 0 };
    byCurrency[r.currency].amount += Number(r.amount);
    byCurrency[r.currency].bets += r.bets;
  }

  await t.test('in-house refunded bets are excluded; v2 stakes count from bet_amount, corrections subtract', () => {
    // 10 (in-house) + 10 + 10 (v2 stakes) − 4 (correction) = 26 INR over 3 bets.
    assert.equal(byCurrency.INR.amount, 26);
    assert.equal(byCurrency.INR.bets, 3);
  });

  await t.test('seamless stakes count, rolled-back ones do not', () => {
    assert.equal(byCurrency.USDT.amount, 3);
    assert.equal(byCurrency.USDT.bets, 1);
  });
});
