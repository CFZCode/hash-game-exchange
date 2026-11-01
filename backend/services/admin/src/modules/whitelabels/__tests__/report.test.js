'use strict';

const test = require('node:test');
const assert = require('node:assert');

const db = require('@ibitplay/db');
const { createLogger, money, whitelabelReport } = require('@ibitplay/common');

const { WhitelabelsService } = require('../whitelabels.service');

/**
 * The revenue-share statement (owner, 2026-11-01): GGR per product — casino and original games
 * from the parent's round record, sports from the copy — × the product's share %, on positive GGR
 * only; gateway charges and transfers beside it; reported, not collected; CSV for download.
 */

const TEST_DB = process.env.TEST_DB_NAME || 'ibitplay_test';
const logger = createLogger({ name: 'wl-report-test', level: 'silent' });
const BASE = 7_700_000 + (process.pid % 10_000) * 10;

test('statement arithmetic: share on positive GGR only, to the paisa', () => {
  const zero = { bets: '0', wins: '0', refunds: '0', rollbacks: '0', betCount: 0, ggr: '0' };
  const ledger = {
    casino: { ...zero, bets: '1000', wins: '600', refunds: '50', ggr: '350.00000000' },
    originals: { ...zero, wins: '20', ggr: '-20.00000000' },
    gateway: { deposits: '0', depositCount: 0, withdrawals: '0', withdrawalCount: 0, charges: '0' },
    transfers: { amount: '0', count: 0 },
    unconverted: [],
  };
  const r = whitelabelReport.assemble({ from: 'a', to: 'b', ledger, sports: { ggr: '333.33' }, revenueShare: { casino: '10', originals: '12', sports: '2.5' } });
  assert.deepEqual(
    r.products.map((p) => [p.product, p.ggr, p.share]),
    [
      ['casino', '350.00000000', '35.00000000'],
      ['originals', '-20.00000000', '0.00000000'],
      ['sports', '333.33000000', '8.33000000'],
    ]
  );
  assert.equal(r.totalGgr, '663.33000000');
  assert.equal(r.totalShare, '43.33000000');

  // Sports unavailable: shown as such, never counted as zero; a product out of the plan is not a row.
  const partial = whitelabelReport.assemble({ from: 'a', to: 'b', ledger, sports: null, sportsError: 'down', revenueShare: {}, products: { casino: true, originals: false, sports: true } });
  assert.deepEqual(partial.products.map((p) => [p.product, p.ggr]), [['casino', '350.00000000'], ['sports', null]]);
  assert.equal(partial.complete, false);

  // A name that is a formula opens as text.
  assert.match(whitelabelReport.toCsv(r, { name: '=HYPERLINK("x")' }), /"'=HYPERLINK/);
});

test('statement from the database', async (t) => {
  let connection;
  try {
    connection = await db.connect({
      config: {
        DB_HOST: process.env.DB_HOST || '127.0.0.1',
        DB_PORT: Number(process.env.DB_PORT || 5432),
        DB_NAME: TEST_DB,
        DB_USER: process.env.DB_USER || 'postgres',
        DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
        DB_SCHEMA: 'public',
      },
      logger,
      service: 'admin-service',
    });
    await connection.ping();
  } catch (error) {
    t.skip(`No test database reachable (${error.message})`);
    return;
  }
  const q = (sql, replacements = {}) => connection.sequelize.query(sql, { replacements, type: connection.sequelize.QueryTypes.SELECT });
  const wlId = BASE;
  const rates = await q(`SELECT currency, usd_rate FROM exchangerate WHERE UPPER(currency) IN ('INR', 'USDT')`);
  const cleanup = async () => {
    await q(`DELETE FROM whitelabel_casino_rounds WHERE whitelabel_id = :wlId`, { wlId });
    await q(`DELETE FROM whitelabel_gateway_orders WHERE whitelabel_id = :wlId`, { wlId });
    await q(`DELETE FROM whitelabel_transfers WHERE whitelabel_id = :wlId`, { wlId });
    await q(`DELETE FROM whitelabels WHERE id = :wlId`, { wlId });
  };
  t.after(async () => {
    try {
      await cleanup();
      for (const r of rates) await q(`UPDATE exchangerate SET usd_rate = :rate WHERE currency = :currency`, { rate: r.usd_rate, currency: r.currency });
    } finally {
      await connection.close();
    }
  });
  await cleanup();
  // 1 USDT = 80 INR.
  await q(`UPDATE exchangerate SET usd_rate = '1' WHERE UPPER(currency) = 'USDT'`);
  await q(`UPDATE exchangerate SET usd_rate = '0.0125' WHERE UPPER(currency) = 'INR'`);

  const plan = {
    products: { casino: true, sports: true, originals: true },
    features: { branch_management: false, bonus: false, affiliate: false, vip: false, promotions: false },
    payments: { manual: true, gateways: { ccpayment: true, f2pay: true, upi: false } },
  };
  const terms = { fees: { ccpayment: { deposit: '2', withdraw: '3' }, f2pay: { deposit: '4', withdraw: '5' }, upi: { deposit: '0', withdraw: '0' } }, revenueShare: { casino: '10', originals: '12', sports: '8' } };
  await q(
    `INSERT INTO whitelabels (id, slug, name, site_domain, admin_domain, api_domain, template, company_role_name, company_name, company_email,
                              link_key, status, admin_port, plan, terms)
     VALUES (:wlId, :slug, 'Report Test', :site, :admin, :api, 'hash_game', 'Company', 'Co', 'co@test.invalid', 'x', 'live', 1,
             CAST(:plan AS JSONB), CAST(:terms AS JSONB))`,
    { wlId, slug: `report-${wlId}`, site: `s${wlId}.test.invalid`, admin: `a${wlId}.test.invalid`, api: `p${wlId}.test.invalid`, plan: JSON.stringify(plan), terms: JSON.stringify(terms) }
  );
  const round = (product, kind, tx, currency, amount, at = '2026-10-15T10:00:00Z') =>
    q(
      `INSERT INTO whitelabel_casino_rounds (whitelabel_id, product, provider, kind, transaction_id, player_id, currency, amount, created_at)
       VALUES (:wlId, :product, :provider, :kind, :tx, 'p1', :currency, :amount, :at)`,
      { wlId, product, provider: product === 'casino' ? 'gis' : 'og', kind, tx: `${wlId}-${tx}`, currency, amount, at }
    );
  await round('casino', 'bet', 'b1', 'INR', '1000');
  await round('casino', 'win', 'w1', 'INR', '400');
  await round('casino', 'bet', 'b2', 'USDT', '5'); // 400 INR
  await round('casino', 'refund', 'r1', 'INR', '100');
  await round('casino', 'bet', 'old', 'INR', '99999', '2026-09-01T00:00:00Z'); // outside the period
  await round('originals', 'bet', 'ob1', 'INR', '300');
  await round('originals', 'win', 'ow1', 'INR', '500');
  await q(
    `INSERT INTO whitelabel_gateway_orders (whitelabel_id, provider, flow, reference, copy_reference, currency, amount, charge_pct, status, updated_at)
     VALUES (:wlId, 'f2pay', 'deposit', :r1, 'c1', 'INR', 10000, 4, 'success', '2026-10-10'),
            (:wlId, 'f2pay', 'payout', :r2, 'c2', 'INR', 2000, 5, 'success', '2026-10-11'),
            (:wlId, 'f2pay', 'deposit', :r3, 'c3', 'INR', 7777, 4, 'failed', '2026-10-12')`,
    { wlId, r1: `R1-${wlId}`, r2: `R2-${wlId}`, r3: `R3-${wlId}` }
  );
  await q(`INSERT INTO whitelabel_transfers (whitelabel_id, amount, status, staff_id, created_at) VALUES (:wlId, 100000, 'done', 1, '2026-10-02')`, { wlId });

  const service = new WhitelabelsService({ models: connection.models, db: connection, logger, config: { TOTP_ENCRYPTION_KEY: 'a'.repeat(64) } });
  const asked = [];
  service.link = async (_row, method, path) => {
    asked.push(path);
    return { currency: 'INR', ggr: '1500.00000000', staked: '9000.00000000', betCount: 12, casinoGgr: '1100.00000000', originalsGgr: '-200.00000000' };
  };

  const report = await service.report(wlId, { from: '2026-10-01', to: '2026-11-01' });
  assert.match(asked[0], /^\/ggr\?from=2026-10-01&to=2026-11-01$/);
  const row = (p) => report.products.find((r) => r.product === p);
  // Casino: bets 1000 + 400 (5 USDT) − wins 400 − refund 100 = 900 → 10% = 90.
  assert.deepEqual([row('casino').bets, row('casino').ggr, row('casino').share], ['1400.00000000', '900.00000000', '90.00000000']);
  // Originals lost 200: no share.
  assert.deepEqual([row('originals').ggr, row('originals').share], ['-200.00000000', '0.00000000']);
  // Sports from the copy: 1500 × 8% = 120.
  assert.deepEqual([row('sports').ggr, row('sports').share], ['1500.00000000', '120.00000000']);
  assert.deepEqual([report.totalGgr, report.totalShare], ['2200.00000000', '210.00000000']);
  // Gateway: paid orders only; charges 400 + 100.
  assert.deepEqual([report.gateway.deposits, report.gateway.withdrawals, report.gateway.charges], ['10000.00000000', '2000.00000000', '500.00000000']);
  assert.equal(report.transfers.amount, '100000.00000000');
  assert.deepEqual(report.copyFigures, { currency: 'INR', casinoGgr: '1100.00000000', originalsGgr: '-200.00000000' });

  const all = await service.reportAll({ from: '2026-10-01', to: '2026-11-01' });
  const mine = all.whitelabels.find((w) => w.id === wlId);
  assert.equal(mine.totalShare, '210.00000000');
  assert.ok(money.gte(all.totalShare, '210'));
});
