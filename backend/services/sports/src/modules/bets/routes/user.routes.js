'use strict';

const { Router } = require('express');
const { validate, refuseCustomCurrencies, noQuery } = require('@ibitplay/common');

const v = require('../bets.validators');
const { BetsService } = require('../bets.service');
const { createControllers } = require('../controllers');
const { sportsEnabled } = require('../../feed/sportsEnabled');

/**
 * A player's own betting.
 *
 * Every route here was unauthenticated in legacy and named the player in the
 * URL or the request body — including the one that takes their money.
 *
 * No `FeedClient` here any more. The ported handler prices against the CACHED
 * book — `oddsData:<gmid>`, which the `feed:odds` job refreshes every two
 * seconds — exactly as legacy's `verifyBetAgainstLiveOdds` did, so what it
 * needs from the container is `cache`, not an upstream client. A live fetch on
 * the bet path would be a provider round trip inside the money transaction.
 */
module.exports = function userRoutes(deps) {
  const ctrl = createControllers({ service: new BetsService(deps) });

  const router = Router();

  // Custom coins (owner-created, no provider behind them) never reach this module: CURRENCY_NOT_SUPPORTED_FOR_SPORTS.

  router.use(refuseCustomCurrencies('SPORTS'));

  // Placing a bet needs sports in the owner's plan AND switched on by the site
  // — the same guard as the board, which alone left this POST open. History
  // and open bets stay readable: they are the player's own money.
  router.post('/', sportsEnabled(deps), validate(v.place), ctrl.place);

  router.get('/', validate(v.history), ctrl.history);
  router.get('/summary', noQuery(), ctrl.summary);
  router.get('/open-count', noQuery(), ctrl.openCount);
  router.get('/exposures', validate(v.exposures), ctrl.exposures);
  router.get('/open/:matchId', noQuery(), validate(v.matchParam), ctrl.openBets);

  return router;
};
