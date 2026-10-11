'use strict';

/** Where a bonus came from. Stored in `player_bonuses.source`; add, never rename. */
const SOURCE = Object.freeze({
  FIRST_DEPOSIT: 'first_deposit',
  SPIN_WHEEL: 'spin_wheel',
});

const SOURCES = Object.freeze(Object.values(SOURCE));

const STATUS = Object.freeze({
  ACTIVE: 'active',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
  FORFEITED: 'forfeited',
});

const STATUSES = Object.freeze(Object.values(STATUS));

/** The ledger `ref_type` of a bonus's cash credit, per source (the same ones the cash grants used). */
const REF_TYPE = Object.freeze({
  [SOURCE.FIRST_DEPOSIT]: 'FIRST_DEPOSIT_BONUS',
  [SOURCE.SPIN_WHEEL]: 'SPIN_WHEEL_BONUS',
});
const refTypeOf = (source) => REF_TYPE[source] ?? 'PLAYER_BONUS';

const LABEL = Object.freeze({
  [SOURCE.FIRST_DEPOSIT]: 'First deposit bonus',
  [SOURCE.SPIN_WHEEL]: 'Spin wheel bonus',
});
const labelOf = (source) => LABEL[source] ?? 'Bonus';

/** The cash credit when a bonus's wagering is met. `credits_ledger.idempotency_key` is unique. */
const releaseKey = (bonusId) => `player-bonus:${bonusId}`;

/** Why a bonus stopped being active (`player_bonuses.end_reason`). */
const END_REASON = Object.freeze({
  WAGERING_MET: 'WAGERING_MET',
  NO_WAGERING: 'NO_WAGERING',
  LOCK_OFF: 'WAGERING_LOCK_OFF',
  EXPIRED: 'EXPIRED',
  WITHDRAWAL: 'WITHDRAWAL',
  MANUAL: 'MANUAL',
});

const DEFAULT_EXPIRY_DAYS = 30;

module.exports = {
  SOURCE, SOURCES, STATUS, STATUSES, REF_TYPE, refTypeOf, labelOf, releaseKey, END_REASON, DEFAULT_EXPIRY_DAYS,
};
