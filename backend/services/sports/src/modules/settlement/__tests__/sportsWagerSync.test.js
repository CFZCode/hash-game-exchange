'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createSportsWagerSync, stakeString } = require('../sportsWagerSync');
const { makeLadder } = require('../../../../../../packages/common/src/vipLadder');

/** A fake `mssports` pair of tables answering the three queries the sync runs. */
function fakeDb(bets) {
  const sync = new Map();
  const query = async (sql, { replacements = {} } = {}) => {
    if (/FROM .*"SportsBet" b\s+LEFT JOIN/s.test(sql)) {
      return bets
        .filter((b) => !sync.has(b.id) && b.status === 'closed' && replacements.counted.includes(b.result_status) && !b.unmatched)
        .slice(0, replacements.batch)
        .map((b) => ({ id: b.id, user_id: b.user_id, currency: b.original_currency || 'INR', amount: b.original_amount ?? b.stake_amount }));
    }
    if (/^INSERT INTO/.test(sql.trim())) {
      if (!sync.has(replacements.id)) sync.set(replacements.id, { user_id: replacements.userId, reversed: false });
      return [];
    }
    if (/FROM .*"sports_wager_sync" s\s+JOIN/s.test(sql)) {
      return [...sync.entries()]
        .filter(([id, s]) => !s.reversed && replacements.undone.includes(bets.find((b) => b.id === id)?.result_status))
        .map(([id, s]) => ({ bet_id: id, user_id: s.user_id }));
    }
    if (/^UPDATE/.test(sql.trim())) {
      sync.get(replacements.id).reversed = true;
      return [];
    }
    throw new Error(`unexpected query: ${sql}`);
  };
  return { sequelize: { query }, sync };
}

function fakeUser({ noRate = [] } = {}) {
  const posts = [];
  const counted = new Set();
  return {
    posts,
    client: {
      post: async (path, body) => {
        posts.push([path, body]);
        if (path.endsWith('/record')) {
          if (noRate.includes(body.currency)) return { counted: false, reason: 'NO_RATE' };
          if (counted.has(body.ref)) return { counted: false, duplicate: true };
          counted.add(body.ref);
          return { counted: true };
        }
        return { reversed: true };
      },
    },
  };
}

const bet = (id, result_status, extra = {}) => ({ id, user_id: 7, status: 'closed', result_status, stake_amount: '2000.00', original_currency: 'INR', ...extra });

test('settled won/lost bets are counted once, at their stake in their own currency, without rakeback', async () => {
  const db = fakeDb([bet(1, 'won'), bet(2, 'loss'), bet(3, 'pending', { status: 'open' }), bet(4, 'void')]);
  const user = fakeUser();
  const sync = createSportsWagerSync({ sequelize: db.sequelize, clients: { user: user.client } });

  assert.deepEqual(await sync.tick(), { counted: 2, reversed: 0 });
  assert.deepEqual(
    user.posts.map(([p, b]) => [p, b.ref, b.amount, b.currency, b.source, b.rakeback]),
    [
      ['/internal/user/wager/record', 'sports:1', '2000', 'INR', 'sports', false],
      ['/internal/user/wager/record', 'sports:2', '2000', 'INR', 'sports', false],
    ]
  );
  // A second run posts nothing: the cursor remembers.
  assert.deepEqual(await sync.tick(), { counted: 0, reversed: 0 });
  assert.equal(user.posts.length, 2);
});

test('a counted bet that is later voided is reversed once; one voided before counting never counts', async () => {
  const bets = [bet(1, 'won'), bet(2, 'refunded')];
  const db = fakeDb(bets);
  const user = fakeUser();
  const sync = createSportsWagerSync({ sequelize: db.sequelize, clients: { user: user.client } });
  await sync.tick();
  bets[0].result_status = 'void';
  assert.deepEqual(await sync.tick(), { counted: 0, reversed: 1 });
  assert.deepEqual(await sync.tick(), { counted: 0, reversed: 0 });
  assert.deepEqual(user.posts.map(([p, b]) => [p.split('/').pop(), b.ref]), [['record', 'sports:1'], ['reverse', 'sports:1']]);
});

test('a currency with no rate is retried later rather than marked done', async () => {
  const db = fakeDb([bet(1, 'won', { original_currency: 'PKR' })]);
  const user = fakeUser({ noRate: ['PKR'] });
  const sync = createSportsWagerSync({ sequelize: db.sequelize, clients: { user: user.client } });
  await sync.tick();
  assert.equal(db.sync.size, 0);
});

test('the backlog drains in batches in one pass', async () => {
  const bets = Array.from({ length: 5 }, (_, i) => bet(i + 1, 'loss'));
  const db = fakeDb(bets);
  const user = fakeUser();
  const sync = createSportsWagerSync({ sequelize: db.sequelize, clients: { user: user.client }, batch: 2 });
  assert.deepEqual(await sync.tick(), { counted: 5, reversed: 0 });
});

test('stakeString gives the validator a plain decimal', () => {
  assert.equal(stakeString('2000.00'), '2000');
  assert.equal(stakeString('12.345678912'), '12.34567891');
  assert.equal(stakeString('0'), null);
  assert.equal(stakeString(null), null);
});

test('below the first VIP band the progress bar moves with the wager (it was stuck at 0%)', () => {
  const ladder = makeLadder({
    key: 't',
    unranked: { level: 0, name: 'Unranked', card: 'unranked' },
    bonusGates: { daily: 1, weekly: 1, monthly: 1 },
    bands: [
      { level: 1, name: 'Wood', card: 'wood', minXp: '500', maxXp: '999' },
      { level: 2, name: 'Bronze', card: 'bronze', minXp: '1000', maxXp: '1999' },
    ],
  });
  const r = ladder.levelFor('24');
  assert.equal(r.level, 0);
  assert.equal(r.progressPct, '4.80');
  assert.equal(r.wagerToNextLevel, '476');
});
