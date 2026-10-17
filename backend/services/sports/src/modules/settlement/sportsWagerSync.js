'use strict';

const { QueryTypes } = require('sequelize');

/**
 * Sports stakes → the player's wager (VIP level, bonus gates, affiliate).
 *
 * casino-service posts every stake to user-service's `/internal/user/wager/record`; the
 * sportsbook never did, so sports play never moved a player's VIP level. This job closes that:
 *
 *   COUNT    a bet that SETTLED won or lost (matched, closed) is posted once, as its stake in
 *            its own currency (`original_currency`, INR by default) — user-service converts it
 *            to USD, the unit `userwager` and the VIP ladder are kept in — keyed `sports:<betId>`.
 *            Counted at settlement, not placement: an open or voided bet must not raise a level.
 *   REVERSE  a counted bet that was later voided / refunded / cancelled is taken back out
 *            (`/internal/user/wager/reverse`, same key).
 *
 * `mssports.sports_wager_sync` (migration 117) is the cursor. user-service is idempotent on
 * `(source, ref)` too, so a crash between the post and the insert only causes a harmless
 * duplicate post. The first run walks every bet settled before this existed — the backfill.
 * Level-up / rank-up credits fire for levels crossed, exactly as a casino stake would: the
 * player earned them, and their idempotency keys (`vip:level_up:<user>:<level>`) pay each once.
 *
 * `rakeback: false`: exchange stakes carry their own commission, and rakeback on a stake that
 * can be hedged (back + lay) would be free money.
 */
const COUNTED = ['won', 'win', 'loss', 'lost'];
const UNDONE = ['void', 'refund', 'refunded', 'cancelled', 'canceled'];
const SOURCE = 'sports';
const refOf = (betId) => `sports:${betId}`;

/** A stake as user-service's validator takes it: a plain decimal, at most 8 places. */
function stakeString(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n.toFixed(8).replace(/\.?0+$/, '');
}

function createSportsWagerSync({ sequelize, clients, logger, schema = 'mssports', batch = 200 }) {
  const t = (name) => `"${schema}"."${name}"`;
  const select = (sql, replacements) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

  async function countSettled() {
    const rows = await select(
      `SELECT b.id, b.user_id, COALESCE(NULLIF(b.original_currency, ''), 'INR') AS currency,
              COALESCE(b.original_amount, b.stake_amount) AS amount
         FROM ${t('SportsBet')} b
         LEFT JOIN ${t('sports_wager_sync')} s ON s.bet_id = b.id
        WHERE s.bet_id IS NULL
          AND LOWER(b.status) = 'closed'
          AND LOWER(COALESCE(b.result_status, '')) IN (:counted)
          AND COALESCE(b.unmatched, false) = false
        ORDER BY b.id
        LIMIT :batch`,
      { counted: COUNTED, batch }
    );
    let counted = 0;
    let done = 0;
    for (const row of rows) {
      const amount = stakeString(row.amount);
      let outcome = { counted: false, reason: 'NOT_POSITIVE' };
      if (amount) {
        outcome = await clients.user.post('/internal/user/wager/record', {
          userId: Number(row.user_id),
          amount,
          currency: String(row.currency).toUpperCase(),
          source: SOURCE,
          ref: refOf(row.id),
          rakeback: false,
        });
      }
      // No rate for the currency yet: leave it for a later run rather than marking it done.
      if (outcome?.reason === 'NO_RATE') continue;
      await sequelize.query(
        `INSERT INTO ${t('sports_wager_sync')} (bet_id, user_id) VALUES (:id, :userId) ON CONFLICT (bet_id) DO NOTHING`,
        { replacements: { id: row.id, userId: row.user_id } }
      );
      done += 1;
      if (outcome?.counted) counted += 1;
    }
    return { scanned: rows.length, counted, done };
  }

  async function reverseUndone() {
    const rows = await select(
      `SELECT s.bet_id, s.user_id
         FROM ${t('sports_wager_sync')} s
         JOIN ${t('SportsBet')} b ON b.id = s.bet_id
        WHERE s.reversed_at IS NULL
          AND LOWER(COALESCE(b.result_status, '')) IN (:undone)
        ORDER BY s.bet_id
        LIMIT :batch`,
      { undone: UNDONE, batch }
    );
    for (const row of rows) {
      await clients.user.post('/internal/user/wager/reverse', { userId: Number(row.user_id), source: SOURCE, ref: refOf(row.bet_id) });
      await sequelize.query(`UPDATE ${t('sports_wager_sync')} SET reversed_at = NOW() WHERE bet_id = :id`, {
        replacements: { id: row.bet_id },
      });
    }
    return { reversed: rows.length };
  }

  let running = false;
  /** One pass: count newly settled bets (draining the backlog in batches), then reversals. */
  async function tick() {
    if (running) return null;
    running = true;
    try {
      let total = 0;
      for (let i = 0; i < 50; i += 1) {
        const { scanned, counted, done } = await countSettled();
        total += counted;
        // A full batch where nothing could be marked (every row waiting on a USD rate) would
        // re-post the same rows 50 times a tick; stop and retry next tick instead.
        if (scanned < batch || done === 0) break;
      }
      const { reversed } = await reverseUndone();
      if (total || reversed) logger?.info({ counted: total, reversed }, 'sports wager sync');
      return { counted: total, reversed };
    } catch (error) {
      logger?.warn({ err: error.message }, 'sports wager sync failed; retrying next tick');
      return null;
    } finally {
      running = false;
    }
  }

  function start(intervalMs) {
    if (!(intervalMs > 0)) return () => {};
    const first = setTimeout(tick, 5_000);
    const timer = setInterval(tick, intervalMs);
    timer.unref?.();
    first.unref?.();
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }

  return { tick, start, countSettled, reverseUndone };
}

module.exports = { createSportsWagerSync, stakeString, COUNTED, UNDONE, refOf };
