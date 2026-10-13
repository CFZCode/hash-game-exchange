-- Wipe every account except the bootstrap Super Admin (staff id 1), plus all account activity,
-- in ONE transaction. Platform data stays: game catalogue / providers / curation, sports config,
-- siteconfig, site_features, currencies, exchange rates, VIP / bonus / race / spin-wheel definitions,
-- roles, entitlements, migrations, branding.
--
--   psql ... -v ON_ERROR_STOP=1 -f scripts/wipe-accounts.sql
--   (or: node scripts/make-fresh-accounts.mjs --wipe, which runs this first)
--
-- Take a pg_dump first. Prints one NOTICE per table that lost rows. Afterwards clear Redis:
-- ibitplay:rl:* and session caches (make-fresh-accounts.mjs --wipe does it).

BEGIN;

DO $$
DECLARE
  t text;
  n bigint;
  -- Whole-table wipes: per-player / per-staff activity only (no definitions).
  wipe text[] := ARRAY[
    -- mssports mirror (sports exchange)
    'mssports."Affiliates"', 'mssports."SportsBet"', 'mssports.bet_void_audit', 'mssports.betlocks',
    'mssports.credits_ledger', 'mssports.debit_ledger', 'mssports.executives',
    'mssports.oneclick_button_lists', 'mssports.point_ledger', 'mssports.sports_bet_result_cache',
    'mssports.sports_event_result_scan', 'mssports.sports_event_result_summary',
    'mssports.sports_event_settlement_jobs', 'mssports.sports_settlement_report',
    'mssports.staff_market_locks', 'mssports.staff_sports_lock', 'mssports.stake_button_values',
    'mssports.tokens', 'mssports.total_exposures', 'mssports.transactions',
    'mssports.user_activity_logs', 'mssports.user_event_market_locks', 'mssports.user_exposures',
    'mssports.user_match_locks', 'mssports.user_sports_lock', 'mssports.users', 'mssports.staff',
    -- bets / game activity
    'public."SportsBet"', 'public.bets', 'public.bets_1m', 'public.bets_2m', 'public.bets_30s',
    'public.windata_1m', 'public.windata_2m', 'public.windata_30s', 'public.fanwins',
    'public.marketwins', 'public.fancymanualsettlement', 'public.game_runs',
    'public.game_transactions', 'public.game_sessions', 'public.gis_transactions',
    'public.gis_sessions', 'public.gis_freespins', 'public.gis_freevouchers',
    'public.gis_recently_played', 'public.js_game_transactions', 'public.js_game_sessions',
    'public.in_house_rounds', 'public.seamless_transactions', 'public.aggregator_transactions',
    'public.transactions', 'public.transactionscasino', 'public.transaction_live',
    'public.transaction_slot', 'public.sportsbook_sessions', 'public.sports_bet_result_cache',
    'public.sports_event_result_scan', 'public.sports_event_result_summary',
    'public.sports_event_settlement_jobs', 'public.sports_settlement_report',
    'public.user_exposures', 'public.user_favourite_games', 'public.house',
    -- money: balances, ledgers, deposits, withdrawals, payments
    'public.cricpaytransactions', 'public.credits_ledger', 'public.credits', 'public.wallet_history',
    'public.wallet_balances', 'public.wallets', 'public.swap_history', 'public.deposits',
    'public.withdrawals', 'public.inr_deposit', 'public.upideposit', 'public.ccdeposit',
    'public.apaydeposits', 'public.apaywithdrawals', 'public.fiat_deposits', 'public.fiat_withdrawals',
    'public.pay_in_transactions', 'public.pay_out_transactions', 'public.psp_callback_log',
    'public.p2p_disputes', 'public.p2p_orders', 'public.p2p_orders_sell', 'public.p2p_offer_payments',
    'public.p2p_offers', 'public.tips', 'public.vault_interest_history', 'public.vault_transactions',
    'public.vault_pro', 'public.user_bank_accounts', 'public.user_withdrawal_whitelist',
    -- bonuses, rakeback, VIP progress, races, rewards, referrals, clubs
    'public.player_bonus_wagers', 'public.player_bonuses', 'public.bonus_history',
    'public.bonushistory', 'public.bonusgame', 'public.redeembonus', 'public.cronbonus',
    'public.userbonus', 'public.rakeback_accruals', 'public.race_rewards', 'public.spin_wheel_claims',
    'public.unlocked_rewards', 'public.rewards', 'public.team', 'public.user_gift_cards',
    'public.user_medals', 'public.wager_activity', 'public.wager_reversals',
    'public.wager_reverse_outbox', 'public.userwager_history', 'public.userwager',
    'public.club_earnings_log', 'public.club_memberships', 'public.club_notification_status',
    'public.club_banner_notification_status', 'public.clubs',
    -- auth, sessions, logs, KYC, notifications, chat
    'public.auth_sessions', 'public.auth_login_attempts', 'public.auth_verification_tokens',
    'public.user_login_history', 'public.user_otps', 'public.user_2fa', 'public.user_fcm_tokens',
    'public.user_kyc', 'public.user_notifications', 'public.tokens', 'public.messages',
    'public.chat_global', 'public.chat_brazil', 'public.userconfig',
    'public.executive_activity_logs', 'public.admin_activity_logs', 'public.executives'
  ];
BEGIN
  FOREACH t IN ARRAY wipe LOOP
    IF to_regclass(t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('DELETE FROM %s', t);
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN RAISE NOTICE 'deleted % from %', n, t; END IF;
  END LOOP;

  -- mssports wallets: drop every player/staff wallet, zero the owner (Super Admin mirror) one.
  DELETE FROM mssports."Wallets" WHERE user_type <> 'OWNER';
  GET DIAGNOSTICS n = ROW_COUNT; IF n > 0 THEN RAISE NOTICE 'deleted % from mssports."Wallets"', n; END IF;
  UPDATE mssports."Wallets" SET profit_loss = 0, sportsbook_pts = 0, sports_pts = 0, down_point = 0,
    upper_point = 0, all_point = 0, cash_received = 0, credit = 0, cash = 0, inr_balance = 0,
    "totalCommission" = 0;

  -- players
  DELETE FROM public.users;
  GET DIAGNOSTICS n = ROW_COUNT; IF n > 0 THEN RAISE NOTICE 'deleted % from public.users', n; END IF;

  -- staff: everyone but the bootstrap Super Admin (id 1). Children before parents.
  DELETE FROM public.staff_whatsapp_ref WHERE staff_id <> 1;
  DELETE FROM public.staff_hierarchy WHERE NOT (ancestor_id = 1 AND descendant_id = 1);
  GET DIAGNOSTICS n = ROW_COUNT; IF n > 0 THEN RAISE NOTICE 'deleted % from public.staff_hierarchy', n; END IF;
  DELETE FROM public.staff_balances WHERE staff_id <> 1;
  GET DIAGNOSTICS n = ROW_COUNT; IF n > 0 THEN RAISE NOTICE 'deleted % from public.staff_balances', n; END IF;
  UPDATE public.staff SET parent_id = NULL WHERE id <> 1;
  DELETE FROM public.staff WHERE id <> 1;
  GET DIAGNOSTICS n = ROW_COUNT; IF n > 0 THEN RAISE NOTICE 'deleted % from public.staff', n; END IF;

  -- Super Admin: clean balance and lock state (password is handled by make-fresh-accounts.mjs).
  INSERT INTO public.staff_hierarchy (ancestor_id, descendant_id, depth) VALUES (1, 1, 0)
    ON CONFLICT DO NOTHING;
  INSERT INTO public.staff_balances (staff_id) VALUES (1) ON CONFLICT DO NOTHING;
  UPDATE public.staff_balances SET inr = 0, credit_limit = 0, exposure_limit = 0, gt = 0, casino_gt = 0
    WHERE staff_id = 1;
  UPDATE public.staff SET status = 'active', bet_status = 'active', system_locked = false,
    sports_betlocked = false, casino_locked = false, withdraw_locked = false, lock_sources = '{}'::jsonb
    WHERE id = 1;
END $$;

COMMIT;
