'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { BetHistoryService } = require('../betHistory.service');

/**
 * The public ticker / top wins fold third-party legs into rounds beside the in-house bets.
 * No database: each model is a stub that answers its fixed rows.
 */
const stub = (rows) => ({ findAll: async () => rows });
const ago = (ms) => new Date(Date.now() - ms);

const v2 = (type, round, bet, win, at, extra = {}) => ({
  transaction_type: type,
  amount: type === 'bet' ? `-${bet}` : String(win - bet),
  currency: 'INR',
  game_uid: 'aviator-uid',
  game_name: 'Aviator',
  external_transaction_id: round,
  created_at: at,
  additional_data: { game_round: round, bet_amount: String(bet), win_amount: String(win), ...extra },
});

function build() {
  return new BetHistoryService({
    models: {
      // topWins asks the database for `profit > 0`; this losing bet would not come back.
      Bets: { findAll: async ({ where }) => (where?.profit ? [] : [{ gid: 1, game: 'limbo', amount: '10', profit: '-10', coin: 'inr', created: ago(5_000) }]) },
      GameTransaction: stub([
        v2('bet_result', 'won', 10, 25, ago(1_000)),
        v2('bet', 'won', 10, 0, ago(2_000)),
        v2('bet', 'lost', 10, 0, ago(120_000)), // a losing spin never gets a second leg
        v2('bet', 'in-flight', 10, 0, ago(3_000)), // stake only, still inside the grace window
      ]),
      JsGames: stub([{ game_uid: 'aviator-uid', game_name: 'Aviator', vendor: 'Spribe' }]),
    },
    logger: { warn() {} },
  });
}

test('the ticker carries provider rounds beside in-house bets, newest first', async () => {
  const rows = await build().liveFeed({ limit: 10 });
  assert.deepEqual(rows.map((r) => r.game), ['aviator-uid', 'limbo', 'aviator-uid']);
  const won = rows[0];
  assert.equal(won.title, 'Aviator');
  assert.equal(won.amount, '10');
  assert.equal(won.profit, '15');
  assert.equal(won.outcome, 'WIN');
  assert.equal(won.currency, 'INR');
  assert.equal(rows[2].profit, '-10');
  assert.ok(!rows.some((r) => r.reference === 'in-flight'), 'an open round is not a public loss');
});

test('top wins ranks provider wins with in-house ones and drops losses', async () => {
  const rows = await build().topWins({ limit: 10 });
  assert.deepEqual(rows.map((r) => [r.game, r.profit]), [['aviator-uid', '15']]);
});
