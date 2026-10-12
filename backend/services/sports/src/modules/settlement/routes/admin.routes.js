'use strict';

const { Router } = require('express');

const { lazy } = require('../../../lib/mssports');

/**
 * mssports `api/settlementStatement.api.js` → `manualSettleRouter`, route for route.
 * Mounted at `/api/v1/admin/sports/internalsettle` (staff token, then mssports' own checks).
 *
 *  GET  /momatches                        match-odds/bookmaker markets with open bets
 *  GET  /fanmatches                       fancy markets with open bets
 *  POST /declareresult                    declare a result → settles via the settlement worker
 *  POST /void                             void a market / one fancy session
 *  GET  /open-bets                        open bets of one market
 *  POST /void-single-bet                  void one open bet
 *  GET  /settled-markets                  settled markets (last 24 h)
 *  GET  /settled-bets                     settled bets of one market
 *  POST /void-bet-after-settlement    🔑  reverse a settled bet      (needs transaction password)
 *  POST /void-market-after-settlement 🔑  reverse a settled market   (needs transaction password)
 */
module.exports = function adminRoutes() {
  const router = Router();
  const authMiddleware = lazy((m) => m.authMiddleware);
  const requireOwner = lazy((m) => m.requireOwner);
  const verifyTransactionPassword = lazy((m) => m.verifyTransactionPassword);
  const settle = (name) => lazy((m) => m.ManualSettleController[name]);

  router.get('/momatches', authMiddleware, requireOwner, settle('getMoMatches'));
  router.get('/fanmatches', authMiddleware, requireOwner, settle('getFanOpenBets'));
  router.post('/declareresult', authMiddleware, requireOwner, settle('declareResult'));
  router.post('/void', authMiddleware, requireOwner, settle('voidResult'));
  router.get('/open-bets', authMiddleware, requireOwner, settle('getOpenBetsForMarket'));
  router.post('/void-single-bet', authMiddleware, requireOwner, settle('voidSingleOpenBet'));
  // Sports — settle ho chuke markets ka void (admin "Void Bets (After Settlement)" page).
  router.get('/settled-markets', authMiddleware, requireOwner, settle('getSettledMarkets'));
  router.get('/settled-bets', authMiddleware, requireOwner, settle('getSettledBets'));
  router.post('/void-bet-after-settlement', authMiddleware, requireOwner, verifyTransactionPassword, settle('voidBetAfterSettlement'));
  router.post('/void-market-after-settlement', authMiddleware, requireOwner, verifyTransactionPassword, settle('voidMarketAfterSettlement'));

  router.authorizationReviewed =
    'mssports authorizes each route itself: authMiddleware then requireOwner (the platform Super Admin), plus the transaction password on the two post-settlement voids';
  return router;
};
