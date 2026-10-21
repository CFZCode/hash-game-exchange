'use strict';

const test = require('node:test');
const assert = require('node:assert');

const stake = (id, delta, bal) => ({ id, entry_ref: `bal:${id}`, event_type: 'BET_PLACED', category: 'OTHER', currency: 'INR', delta, closing_inr_balance: bal, bet_id: null, remark: 'Pak v Eng' });
const move = (id, delta, bal) => ({ id, entry_ref: `bal:${id}`, event_type: 'BALANCE_CHANGE', category: 'OTHER', currency: 'INR', delta, closing_inr_balance: bal, bet_id: null, remark: null });
const settle = (id, betId, delta, bal) => ({ id, entry_ref: `settle:bet:SPORTS:${betId}`, event_type: 'BET_SETTLEMENT', category: 'SPORTS', currency: 'INR', delta, closing_inr_balance: bal, bet_id: betId, remark: 'Match Odds' });

test('statement rows show the cash that moved, as TENEXCH does', async () => {
  const { foldSettlementMoves } = await import('../services/DirectStatementService.mjs');

  // Lost Match Odds: the stake left at placement, the settlement moved nothing → one row, not two.
  assert.deepStrictEqual(foldSettlementMoves([stake(1, -21.05, 10), settle(2, 99, -21.05, 10)]).map((r) => [r.id, r.delta]), [[1, -21.05]]);

  // Won Match Odds: the payout (stake + profit) folds into the settlement row.
  assert.deepStrictEqual(
    foldSettlementMoves([stake(1, -100, 0), move(2, 152, 152), settle(3, 7, 52, 152)]).map((r) => [r.id, r.delta, r.closing_inr_balance]),
    [[1, -100, 0], [3, 152, 152]]
  );

  // Lost fancy: exposure release + result net to 0 → dropped with its two wallet moves.
  assert.deepStrictEqual(foldSettlementMoves([stake(1, -100, 0), move(2, 100, 100), move(3, -100, 0), settle(4, 8, -100, 0)]).map((r) => r.id), [1]);

  // An unlabelled move not followed by a settlement (e.g. a swap) stays as it is.
  assert.deepStrictEqual(foldSettlementMoves([move(1, 5, 5), stake(2, -5, 0)]).map((r) => r.id), [1, 2]);
});
