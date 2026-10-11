'use strict';

const test = require('node:test');
const assert = require('node:assert');

const db = require('@ibitplay/db');
const { createLogger, money } = require('@ibitplay/common');

const { PayoutRunner } = require('../settlement.payout.job');
const { SettlementService } = require('../settlement.service');
// user-service, in process: the same handlers `/internal/user/wager/{record,reverse}` run.
const { WagerActivityService } = require('../../../../../user/src/modules/wager/wagerActivity.service');
const { RakebackService } = require('../../../../../user/src/modules/rakeback/rakeback.service');
const { PlayerBonusService } = require('../../../../../user/src/modules/player-bonuses/playerBonus.service');
const { WagerReverseOutboxService } = require('../../../../../user/src/modules/wager/reverseOutbox.service');

/**
 * A sports stake counted toward the player's wager (`recordSettledStakes` →
 * `/internal/user/wager/record`, key `sports:<bet id>`) must come back out when
 * the bet is later voided after settlement — USD wager, unclaimed rakeback and
 * bonus wagering progress, exactly once. A bet that was never counted changes
 * nothing.
 *
 * Real tables on the test DB: sports rows through a sports-service connection,
 * the wager pipeline through a user-service connection, joined by an
 * in-process client in place of the HTTP hop.
 */

const TEST_DB = process.env.TEST_DB_NAME || 'ibitplay_test';
let nextUid = 991_000_000 + Math.floor(process.pid % 100_000) * 1000;
const newUid = () => (nextUid += 1);
let nextMatch = 0;
const newMatch = () => `vwr-${process.pid}-${Date.now()}-${(nextMatch += 1)}`;

const connect = (service, logger) =>
  db.connect({
    config: {
      DB_HOST: process.env.DB_HOST || '127.0.0.1',
      DB_PORT: Number(process.env.DB_PORT || 5432),
      DB_NAME: TEST_DB,
      DB_USER: process.env.DB_USER || 'postgres',
      DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
      DB_SCHEMA: 'public',
    },
    logger,
    service,
  });

test('sports void after settlement reverses the counted wager', async (t) => {
  const logger = createLogger({ name: 'void-wager-reverse-test', level: 'silent' });
  let sports;
  let user;
  try {
    sports = await connect('sports-service', logger);
    user = await connect('user-service', logger);
    await sports.ping();
    await user.ping();
  } catch (error) {
    t.skip(`No test database reachable (${error.message})`);
    return;
  }

  const um = user.models;
  const sm = sports.models;
  const seeded = [];
  const cleanup = async (uid) => {
    await user.sequelize.query('DELETE FROM wager_reverse_outbox WHERE user_id = :uid', { replacements: { uid: String(uid) } });
    await user.sequelize.query('DELETE FROM wager_reversals WHERE user_id = :uid', { replacements: { uid: String(uid) } });
    await sm.SportsBet.destroy({ where: { user_id: String(uid) } });
    await um.CreditsLedger.destroy({ where: { user_id: String(uid) } });
    const bonusIds = (await um.PlayerBonus.findAll({ where: { user_id: uid }, attributes: ['id'], raw: true })).map((r) => r.id);
    if (bonusIds.length) await um.PlayerBonusWager?.destroy({ where: { bonus_id: bonusIds } }).catch(() => {});
    await um.PlayerBonus.destroy({ where: { user_id: uid } });
    await um.WagerActivity.destroy({ where: { user_id: uid } });
    await um.RakebackAccrual.destroy({ where: { user_id: uid } });
    await um.UserwagerHistory.destroy({ where: { uid } });
    await um.Userwager.destroy({ where: { uid } });
    await um.Credits.destroy({ where: { uid } });
    await um.Users.destroy({ where: { id: uid } });
  };
  t.after(async () => {
    for (const uid of seeded) await cleanup(uid).catch(() => {});
    await sports.close();
    await user.close();
  });

  const inrRate = (await um.Exchangerate.findOne({ where: { currency: 'INR' }, raw: true }))?.usd_rate;
  assert.ok(inrRate, 'the test database carries an INR rate');
  const dec = (v) => money.toDecimalString(money.toMinorQuantised(String(v ?? '0').replace(/,/g, '')));
  const usdOf = (inr) => money.toDecimalString(money.multiply(inr, inrRate));

  // ── user-service, in process ──────────────────────────────────────────
  const base = { models: um, db: user, logger, config: { SERVICE_NAME: 'user-service' } };
  const deps = { ...base, bonusWageringLock: async () => true };
  const playerBonuses = new PlayerBonusService(deps);
  const wager = new WagerActivityService({
    ...deps,
    vip: { onWager: async () => {} },
    affiliate: { onWager: async () => {} },
    rakeback: new RakebackService(deps),
    playerBonuses,
  });
  const calls = [];
  const clients = {
    user: {
      post: async (path, body) => {
        calls.push({ path, body });
        if (path === '/internal/user/wager/record') return wager.record(body);
        if (path === '/internal/user/wager/reverse') return wager.reverse(body);
        throw new Error(`unexpected path ${path}`);
      },
    },
  };
  const reversals = () => calls.filter((c) => c.path === '/internal/user/wager/reverse').map((c) => c.body);

  // ── sports-service ────────────────────────────────────────────────────
  const runner = new PayoutRunner({ models: sm, db: sports, config: {}, logger, clients });
  const settlement = new SettlementService({
    models: sm,
    db: sports,
    config: { SPORTS_VOID_WINDOW_HOURS: 30 },
    logger,
    clients,
  });

  const seedPlayer = async () => {
    const uid = newUid();
    await cleanup(uid);
    seeded.push(uid);
    await um.Users.create({ id: uid, name: `vwr-${uid}`, password: 'x', status: 'active', rakeback: '0.01', rakeamount: '0' });
    await um.Credits.create({ uid, inr: '100000' });
    const bonus = await playerBonuses.grant({
      userId: uid, source: 'spin_wheel', grantKey: `vwr-bonus:${uid}`, ref: 'x', amount: '100', currency: 'USDT',
      wagerMultiplier: 50, expiryDays: 30,
    });
    assert.equal(bonus.locked, true);
    return { uid, bonusId: bonus.bonusId };
  };

  /** One closed bet and its settlement ledger row (what the payout job leaves). */
  const settledBet = async (uid, matchId, { stake = '1000', result = 'won', payout = '0' } = {}) => {
    const bet = await sm.SportsBet.create({
      user_id: String(uid), game_type: 'MO', market_type: 'MATCH_ODDS', match_id: matchId, eventid: matchId,
      selection_name: 'A', bet_type: 'back', odds: '2', stake_amount: stake, status: 'closed', result_status: result,
      sport_id: '4',
    });
    const ledger = await um.CreditsLedger.create({
      user_id: String(uid), currency: 'INR', amount: payout, reason: 'test', match_id: matchId, eventid: matchId,
      market_type: 'MATCH_ODDS', sport_id: '4', bet_id: bet.id, netamount: '0', profit: '0', loss: '0',
    });
    return { betId: bet.id, ledgerId: ledger.id };
  };

  const wagerOf = async (uid) => dec((await um.Userwager.findOne({ where: { uid }, raw: true }))?.wager);
  const rakeOf = async (uid) => dec((await um.Users.findByPk(uid, { raw: true })).rakeamount);
  const wageredOf = async (bonusId) => dec((await um.PlayerBonus.findByPk(bonusId, { raw: true })).wagered);

  await t.test('void-bet then void-market: each counted stake reversed exactly once', async () => {
    calls.length = 0;
    const { uid, bonusId } = await seedPlayer();
    const matchId = newMatch();
    const a = await settledBet(uid, matchId, { stake: '1000', result: 'won', payout: '2000' });
    const b = await settledBet(uid, matchId, { stake: '500', result: 'loss' });

    await runner.recordSettledStakes([a.betId, b.betId]);
    const usdA = usdOf('1000');
    const usdB = usdOf('500');
    const both = money.toDecimalString(money.add(usdA, usdB));
    assert.equal(await wagerOf(uid), both);
    assert.equal(await wageredOf(bonusId), both, 'both stakes moved the bonus');
    const rakeAll = await rakeOf(uid);
    assert.equal(rakeAll, money.toDecimalString(money.multiply(both, '0.01')));

    // Void bet A after settlement.
    await settlement.voidBetAfterSettlement({ ledger_id: a.ledgerId });
    assert.deepEqual(reversals(), [{ userId: uid, source: 'sports', ref: String(a.betId) }]);
    assert.equal(await wagerOf(uid), usdB, "A's USD left userwager");
    assert.equal(await wageredOf(bonusId), usdB, "A's bonus progress left");
    assert.equal(await rakeOf(uid), money.toDecimalString(money.multiply(usdB, '0.01')), "A's unclaimed rakeback left");

    // Second void of the same bet: refused, nothing reversed twice.
    await assert.rejects(() => settlement.voidBetAfterSettlement({ ledger_id: a.ledgerId }));
    assert.equal(reversals().length, 1);
    assert.equal(await wagerOf(uid), usdB);

    // Void the whole market: only B is still counted.
    await settlement.voidMarketAfterSettlement({ match_id: matchId, market_type: 'MATCH_ODDS' });
    assert.deepEqual(reversals().map((r) => r.ref), [String(a.betId), String(b.betId)], 'A is not reversed again');
    assert.equal(await wagerOf(uid), '0.00000000');
    assert.equal(await wageredOf(bonusId), '0.00000000');
    assert.equal(await rakeOf(uid), '0.00000000');

    // Void the market again: refused, unchanged.
    await assert.rejects(() => settlement.voidMarketAfterSettlement({ match_id: matchId, market_type: 'MATCH_ODDS' }));
    assert.equal(reversals().length, 2);

    // Even a replayed reverse (client retry) cannot take it out twice.
    const replay = await wager.reverse({ userId: uid, source: 'sports', ref: String(b.betId) });
    assert.equal(replay.duplicate, true);
    assert.equal(await wagerOf(uid), '0.00000000');

    // The re-run payout pass does not count the voided bets again.
    await runner.recordSettledStakes([a.betId, b.betId]);
    assert.equal(await wagerOf(uid), '0.00000000');
  });

  await t.test('void of a bet that was never counted changes nothing', async () => {
    calls.length = 0;
    const { uid, bonusId } = await seedPlayer();
    const counted = await settledBet(uid, newMatch(), { stake: '1000', result: 'loss' });
    await runner.recordSettledStakes([counted.betId]);
    const usd = usdOf('1000');
    const rake = await rakeOf(uid);

    // A refunded bet (never turnover) and a won bet whose count never landed.
    const matchId = newMatch();
    const refunded = await settledBet(uid, matchId, { stake: '700', result: 'refund' });
    const uncounted = await settledBet(uid, matchId, { stake: '300', result: 'won', payout: '600' });

    await settlement.voidBetAfterSettlement({ ledger_id: refunded.ledgerId });
    assert.deepEqual(reversals(), [], 'a refunded bet was never counted — nothing to reverse');

    await settlement.voidMarketAfterSettlement({ match_id: matchId, market_type: 'MATCH_ODDS' });
    assert.equal(await wagerOf(uid), usd, 'the counted stake on another market is untouched');
    assert.equal(await wageredOf(bonusId), usd);
    assert.equal(await rakeOf(uid), rake);

    // The late count for the voided bet (a retried record) is refused, not counted.
    const late = await wager.record({ userId: uid, amount: '300', currency: 'INR', source: 'sports', ref: String(uncounted.betId) });
    assert.equal(late.counted, false);
    assert.equal(await wagerOf(uid), usd);
  });

  await t.test('a failing reverse never fails the void', async () => {
    const { uid } = await seedPlayer();
    const matchId = newMatch();
    const bet = await settledBet(uid, matchId, { stake: '100', result: 'loss' });
    await runner.recordSettledStakes([bet.betId]);

    const failing = new SettlementService({
      models: sm, db: sports, config: { SPORTS_VOID_WINDOW_HOURS: 30 }, logger,
      clients: { user: { post: async () => { throw new Error('user-service down'); } } },
    });
    await assert.doesNotReject(() => failing.voidBetAfterSettlement({ ledger_id: bet.ledgerId }));
    assert.equal(await sm.SportsBet.findByPk(bet.betId, { raw: true }).then((r) => r.result_status), 'voided_after_settlement');
  });

  await t.test('a failing reverse is queued in the outbox and the retry job clears it', async () => {
    const { uid, bonusId } = await seedPlayer();
    const bet = await settledBet(uid, newMatch(), { stake: '1000', result: 'loss' });
    await runner.recordSettledStakes([bet.betId]);
    const usd = usdOf('1000');
    assert.equal(await wagerOf(uid), usd);

    const failing = new SettlementService({
      models: sm, db: sports, config: { SPORTS_VOID_WINDOW_HOURS: 30 }, logger,
      clients: { user: { post: async () => { throw new Error('user-service down'); } } },
    });
    await assert.doesNotReject(() => failing.voidBetAfterSettlement({ ledger_id: bet.ledgerId }));
    const outboxOf = async () => (await user.sequelize.query(
      "SELECT * FROM wager_reverse_outbox WHERE source = 'sports' AND ref = :ref",
      { replacements: { ref: String(bet.betId) }, type: db.QueryTypes.SELECT }
    ))[0];
    let row = await outboxOf();
    assert.ok(row, 'the failed call was queued');
    assert.equal(row.status, 'pending');
    assert.equal(row.origin, 'sports');
    assert.equal(String(row.user_id), String(uid));
    assert.equal(await wagerOf(uid), usd, 'still counted until the retry lands');

    // First retry: user-service still failing → rescheduled with backoff, still pending.
    const down = new WagerReverseOutboxService({
      db: user, logger, wagerActivity: { reverse: async () => { throw new Error('still down'); } },
    });
    const now = new Date(Date.now() + 1000);
    const first = await down.retryPending({ now });
    assert.ok(first.retried >= 1);
    row = await outboxOf();
    assert.equal(row.status, 'pending');
    assert.equal(row.attempts, 1);
    assert.ok(new Date(row.next_attempt_at).getTime() > now.getTime(), 'next attempt pushed out');

    // Next due pass with user-service back: delivered once, marked done.
    const up = new WagerReverseOutboxService({ db: user, logger, wagerActivity: wager });
    await up.retryPending({ now: new Date(Date.now() + 10 * 60 * 1000) });
    row = await outboxOf();
    assert.equal(row.status, 'done');
    assert.ok(row.done_at);
    assert.equal(await wagerOf(uid), '0.00000000', 'the queued reversal landed');
    assert.equal(await wageredOf(bonusId), '0.00000000');
    assert.equal(await rakeOf(uid), '0.00000000');

    // Done rows are not replayed.
    const again = await up.retryPending({ now: new Date(Date.now() + 20 * 60 * 1000) });
    assert.ok(!(await user.sequelize.query(
      "SELECT 1 FROM wager_reverse_outbox WHERE source = 'sports' AND ref = :ref AND status = 'pending'",
      { replacements: { ref: String(bet.betId) }, type: db.QueryTypes.SELECT }
    )).length);
    void again;
  });

  await t.test('the outbox gives up after the maximum attempts and marks the row failed', async () => {
    const { uid } = await seedPlayer();
    const ref = `outbox-giveup-${uid}`;
    await user.sequelize.query(
      `INSERT INTO wager_reverse_outbox (origin, user_id, source, ref, refund_ref, attempts)
       VALUES ('sports', :uid, 'sports', :ref, '', :attempts)`,
      { replacements: { uid: String(uid), ref, attempts: Number(process.env.WAGER_REVERSE_OUTBOX_MAX_ATTEMPTS || 10) - 1 } }
    );
    const down = new WagerReverseOutboxService({
      db: user, logger, wagerActivity: { reverse: async () => { throw new Error('gone'); } },
    });
    await down.retryPending({ now: new Date(Date.now() + 1000) });
    const [row] = await user.sequelize.query(
      'SELECT status, last_error FROM wager_reverse_outbox WHERE ref = :ref',
      { replacements: { ref }, type: db.QueryTypes.SELECT }
    );
    assert.equal(row.status, 'failed');
    assert.equal(row.last_error, 'gone');
  });
});
