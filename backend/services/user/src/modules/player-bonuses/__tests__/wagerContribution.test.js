'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { contributionFor, clearContributionCache, providerKey } = require('../wagerContribution');

/** Provider names as seeded and as the catalogue spells them meet; the most specific rule wins. */

test('provider names: seeded spelling matches the catalogue spelling', () => {
  for (const [seeded, catalogue] of [['pg soft', 'PGSoft'], ['hacksaw', 'Hacksaw Gaming'], ['platipus', 'Platipus2'], ['playngo', 'PlayNGo']]) {
    assert.equal(providerKey(seeded), providerKey(catalogue), seeded);
  }
  assert.notEqual(providerKey('pragmatic'), providerKey('pragmaticplaylive'));
});

test('game, then provider, then category, else 100%; sports under 1.5 counts nothing', async () => {
  clearContributionCache();
  const rows = [
    { category: 'originals', provider: null, game_ref: null, percent: '80' },
    { category: null, provider: 'pg soft', game_ref: null, percent: '80' },
    { category: null, provider: null, game_ref: 'crash', percent: '50' },
    { category: 'sports', provider: null, game_ref: null, percent: '50' },
  ];
  const sequelize = { query: async () => rows };
  assert.equal(await contributionFor(sequelize, { category: 'originals', game_ref: 'crash' }), '0.5');
  assert.equal(await contributionFor(sequelize, { category: 'originals', game_ref: 'limbo' }), '0.8');
  assert.equal(await contributionFor(sequelize, { category: 'slots', provider: 'PGSoft', game_ref: 'x1' }), '0.8');
  assert.equal(await contributionFor(sequelize, { category: 'slots', provider: 'Unknown' }), '1');
  assert.equal(await contributionFor(sequelize, { category: 'sports', odds: '1.4' }), '0');
  assert.equal(await contributionFor(sequelize, { category: 'sports', odds: '2' }), '0.5');
});
