'use strict';

const { defineErrors } = require('@ibitplay/common');

/** Launch-side errors. The wallet callbacks never throw — they answer in the aggregator's envelope. */
module.exports = defineErrors('ORIGINAL_GAMES', {
  NOT_CONFIGURED: { status: 503, message: 'The original games aggregator is not configured' },
  UNSUPPORTED_CURRENCY: { status: 422, message: 'Original games play in INR or USDT only' },
  CASINO_LOCKED: { status: 403, message: 'Casino play is locked on this account' },
  UPSTREAM_FAILED: { status: 502, message: 'The game provider could not be reached' },
  UPSTREAM_REJECTED: { status: 502, message: 'The game provider rejected the request' },
  MAINTENANCE: { status: 503, message: 'The game is under maintenance' },
});
