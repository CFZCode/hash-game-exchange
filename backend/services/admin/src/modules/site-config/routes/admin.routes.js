'use strict';

const { Router } = require('express');
const { validate, response, asyncHandler, createActivityRecorder, noBody } = require('@ibitplay/common');
const { PERMISSIONS, denyAgentTree } = require('@ibitplay/auth');

const v = require('../siteConfig.validators');
const { SiteConfigService } = require('../siteConfig.service');

/**
 * Platform settings, for staff.
 *
 * Legacy mounted the two affiliate settings routes on `/affiliateAdmin` with NO
 * middleware whatsoever. The PUT set the commission percentage and the
 * registration bonus — the two numbers that decide what the platform pays out —
 * from an unauthenticated request.
 *
 * The write is audited for the same reason it is permissioned: a settings
 * change here does not move money at the moment it happens, so the only record
 * that it was made, by whom, is this one. Every payment it later affects looks
 * ordinary.
 */
module.exports = function adminRoutes(deps) {
  const { auth, clients, logger, config } = deps;
  const service = new SiteConfigService(deps);

  const withActivity = createActivityRecorder({
    client: clients.admin, logger, serviceName: config.SERVICE_NAME,
  });

  const router = Router();

  /**
   * The operator's own limits, policy and schedule — the values that used to
   * be environment variables. `source` on each says whether it is theirs or
   * still the deployment's; see `OPERATOR_SETTINGS` in the service.
   */
  router.get(
    '/settings',
    auth.requirePermission(PERMISSIONS.CONFIG_READ),
    asyncHandler(async (_req, res) => response.ok(res, await service.operatorSettings()))
  );

  /** The owner's per-currency deposit / withdrawal limits — read-only here (owner panel → Cashier). */
  router.get(
    '/cashier-limits',
    auth.requirePermission(PERMISSIONS.CONFIG_READ),
    asyncHandler(async (_req, res) => response.ok(res, await service.cashierLimits()))
  );

  /**
   * A patch, not a replacement, and `null` on a key hands it back to the
   * deployment. Permissioned and audited like every other settings write.
   */
  router.put(
    '/settings',
    auth.requirePermission(PERMISSIONS.CONFIG_WRITE),
    validate(v.updateOperatorSettings),
    withActivity({
      action: 'site-config.settings.update',
      describe: (req) => ({ targetType: 'SITE_CONFIG', targetId: 'settings', details: req.body }),
    }),
    asyncHandler(async (req, res) =>
      response.ok(res, await service.updateOperatorSettings({ patch: req.body, staffId: req.staff?.id }))
    )
  );

  // Affiliate and reward settings are promotions: refused to the agent tree.
  const houseOnly = denyAgentTree();

  /** @legacy GET /affiliateAdmin/settings */
  router.get(
    '/affiliate',
    houseOnly,
    auth.requirePermission(PERMISSIONS.CONFIG_READ),
    asyncHandler(async (_req, res) => response.ok(res, await service.affiliateSettings()))
  );

  /** @legacy PUT /affiliateAdmin/settings */
  router.put(
    '/affiliate',
    houseOnly,
    auth.requirePermission(PERMISSIONS.CONFIG_WRITE),
    validate(v.updateAffiliateSettings),
    withActivity({
      action: 'site-config.affiliate.update',
      describe: (req) => ({ targetType: 'SITE_CONFIG', targetId: 'affiliate', details: req.body }),
    }),
    asyncHandler(async (req, res) =>
      response.ok(
        res,
        await service.updateAffiliateSettings({ ...req.body, staffId: req.staff?.id ?? null })
      )
    )
  );

  /**
   * Welcome bonuses: whether a new player gets the registration bonus, and the
   * first-deposit bonus terms. Promotions, so refused to the agent tree like
   * the affiliate settings; audited because they decide what the site pays.
   */
  router.get(
    '/welcome-bonuses',
    houseOnly,
    auth.requirePermission(PERMISSIONS.CONFIG_READ),
    asyncHandler(async (_req, res) => response.ok(res, await service.welcomeBonusSettings()))
  );

  router.put(
    '/welcome-bonuses',
    houseOnly,
    auth.requirePermission(PERMISSIONS.CONFIG_WRITE),
    validate(v.updateWelcomeBonusSettings),
    withActivity({
      action: 'site-config.welcome-bonuses.update',
      describe: (req) => ({ targetType: 'SITE_CONFIG', targetId: 'welcome-bonuses', details: req.body }),
    }),
    asyncHandler(async (req, res) =>
      response.ok(
        res,
        await service.updateWelcomeBonusSettings({ ...req.body, staffId: req.staff?.id ?? null })
      )
    )
  );

  /**
   * Peer-to-peer tip limits (USD): per tip, per rolling 24h, and the lifetime
   * wager a sender needs. Same gate as the welcome bonuses — house staff only,
   * config:read / config:write, and the write is audited because it decides
   * how much money players can move between accounts.
   */
  router.get(
    '/tips',
    houseOnly,
    auth.requirePermission(PERMISSIONS.CONFIG_READ),
    asyncHandler(async (_req, res) => response.ok(res, await service.tipSettings()))
  );

  router.put(
    '/tips',
    houseOnly,
    auth.requirePermission(PERMISSIONS.CONFIG_WRITE),
    validate(v.updateTipSettings),
    withActivity({
      action: 'site-config.tips.update',
      describe: (req) => ({ targetType: 'SITE_CONFIG', targetId: 'tips', details: req.body }),
    }),
    asyncHandler(async (req, res) =>
      response.ok(res, await service.updateTipSettings({ ...req.body, staffId: req.staff?.id ?? null }))
    )
  );

  /**
   * Referral unlock tiers (migration 106): the "Friend's Level / Total Wager /
   * Unlock Amount" table on the player site's /referral/rules. Promotions, so
   * house staff only like the affiliate rates; the PUT replaces the list and is
   * audited because it is what the site promises referrers.
   */
  router.get(
    '/referral-unlocks',
    houseOnly,
    auth.requirePermission(PERMISSIONS.CONFIG_READ),
    asyncHandler(async (_req, res) => response.ok(res, await service.referralUnlockSettings()))
  );

  router.put(
    '/referral-unlocks',
    houseOnly,
    auth.requirePermission(PERMISSIONS.CONFIG_WRITE),
    validate(v.updateReferralUnlockSettings),
    withActivity({
      action: 'site-config.referral-unlocks.update',
      describe: (req) => ({ targetType: 'SITE_CONFIG', targetId: 'referral-unlocks', details: req.body }),
    }),
    asyncHandler(async (req, res) =>
      response.ok(res, await service.updateReferralUnlockSettings({ ...req.body, staffId: req.staff?.id ?? null }))
    )
  );

  /** @legacy GET /sportsCheck */
  router.get(
    '/sports',
    auth.requirePermission(PERMISSIONS.CONFIG_READ),
    asyncHandler(async (_req, res) => response.ok(res, await service.sportsEnabled()))
  );

  // The sports kill switch is the owner's (owner panel → Site flags → Sports); no write here.

  // ── Reward payout currencies ────────────────────────────────────────

  router.get(
    '/rewards',
    houseOnly,
    auth.requirePermission(PERMISSIONS.CONFIG_READ),
    asyncHandler(async (_req, res) => response.ok(res, await service.rewardCurrencies()))
  );

  router.put(
    '/rewards',
    houseOnly,
    auth.requirePermission(PERMISSIONS.CONFIG_WRITE),
    validate(v.updateRewardCurrencies),
    withActivity({
      action: 'site-config.rewards.update',
      describe: (req) => ({
        targetType: 'SITE_CONFIG',
        targetId: 'rewards',
        details: req.body,
      }),
    }),
    asyncHandler(async (req, res) =>
      response.ok(
        res,
        await service.updateRewardCurrencies({ ...req.body, staffId: req.staff?.id ?? null })
      )
    )
  );

  // ── Feature flags ───────────────────────────────────────────────────

  /** @legacy GET /api/admin/config/global */
  /**
   * The flags, and in `meta.entitled` which of them the owner's plan includes
   * — beside the map rather than in it, so every value in `data` stays a boolean.
   */
  router.get(
    '/global',
    auth.requirePermission(PERMISSIONS.CONFIG_READ),
    asyncHandler(async (_req, res) => {
      const [flags, entitled] = await Promise.all([service.globalSettings(), service.globalEntitlements()]);
      return response.ok(res, flags, { entitled });
    })
  );

  /**
   * @legacy PUT /api/admin/config/global
   *
   * Audited, and the audit names WHICH flags moved. Turning `casino` or
   * `sports` off takes a whole product off the site for every player at once,
   * and nothing else records that it happened.
   *
   * Legacy required a transaction password here. That is not carried over: the
   * password guards operations that MOVE MONEY, and diluting it across
   * settings screens is how it stops being a meaningful second factor. This is
   * `config:write` plus an audit row.
   */
  router.put(
    '/global',
    auth.requirePermission(PERMISSIONS.CONFIG_WRITE),
    validate(v.updateGlobalSettings),
    withActivity({
      action: 'site-config.global.update',
      describe: (req) => ({
        targetType: 'SITE_CONFIG', targetId: 'global', details: { flags: req.body },
      }),
    }),
    asyncHandler(async (req, res) =>
      response.ok(
        res,
        await service.updateGlobalSettings({ ...req.body, staffId: req.staff?.id ?? null })
      )
    )
  );

  // ── One player's preferences ────────────────────────────────────────

  /** @legacy GET /api/admin/config/user/:uid */
  router.get(
    '/user/:userId',
    auth.requirePermission(PERMISSIONS.CONFIG_READ),
    validate(v.userParam),
    asyncHandler(async (req, res) =>
      response.ok(
        res,
        await service.userSettings({ actor: { id: req.staff.id }, userId: req.params.userId })
      )
    )
  );

  /** @legacy PUT /api/admin/config/user/:uid */
  router.put(
    '/user/:userId',
    auth.requirePermission(PERMISSIONS.CONFIG_WRITE),
    validate(v.updateUserSettings),
    withActivity({
      action: 'site-config.user.update',
      describe: (req) => ({
        targetType: 'USER', targetId: req.params.userId, details: { settings: req.body },
      }),
    }),
    asyncHandler(async (req, res) =>
      response.ok(
        res,
        await service.updateUserSettings({
          ...req.body,
          actor: { id: req.staff.id },
          userId: req.params.userId,
          staffId: req.staff?.id ?? null,
        })
      )
    )
  );

  // ── Outbound mail ───────────────────────────────────────────────────

  /** @legacy GET /email/settings */
  router.get(
    '/email',
    auth.requirePermission(PERMISSIONS.CONFIG_READ),
    asyncHandler(async (_req, res) => response.ok(res, await service.emailSettings()))
  );

  /**
   * @legacy PUT /email/settings
   *
   * Audited, and the audit records WHICH settings changed, never their values —
   * one of them is an SMTP credential.
   */
  router.put(
    '/email',
    auth.requirePermission(PERMISSIONS.CONFIG_WRITE),
    validate(v.updateEmailSettings),
    withActivity({
      action: 'site-config.email.update',
      describe: (req) => ({
        targetType: 'SITE_CONFIG',
        targetId: 'email',
        details: { changed: Object.keys(req.body) },
      }),
    }),
    asyncHandler(async (req, res) =>
      response.ok(
        res,
        await service.updateEmailSettings({ ...req.body, staffId: req.staff?.id ?? null })
      )
    )
  );

  /** @legacy POST /email/settings/test */
  router.post(
    '/email/test',
    noBody(),
    auth.requirePermission(PERMISSIONS.CONFIG_WRITE),
    withActivity({
      action: 'site-config.email.test',
      describe: () => ({ targetType: 'SITE_CONFIG', targetId: 'email' }),
    }),
    asyncHandler(async (req, res) =>
      response.ok(res, await service.sendTestEmail({ staffId: req.staff?.id ?? null }))
    )
  );

  return router;
};
