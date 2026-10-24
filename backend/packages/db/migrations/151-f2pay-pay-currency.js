'use strict';

/**
 * F2Pay collects in more than the wallet's currency: its Indonesian methods (QRIS, DANA, BNI …)
 * are paid in IDR into the INR wallet. The order keeps both figures: `amount` / `currency` is what
 * the wallet is credited, `pay_amount` / `pay_currency` what F2Pay collects (NULL = the same) —
 * the callback is checked against the latter.
 *
 * The IDR rate row is what converts them. Seeded with the market rate on 2026-10-24
 * (open.er-api: 18,090 IDR per USD); the hourly refresh keeps it current from then on
 * (exchangeRate.service FIAT_CODES). Idempotent.
 */
async function up({ sequelize, transaction }) {
  await sequelize.query('ALTER TABLE f2paydeposits ADD COLUMN IF NOT EXISTS pay_amount NUMERIC(20, 8)', { transaction });
  await sequelize.query('ALTER TABLE f2paydeposits ADD COLUMN IF NOT EXISTS pay_currency VARCHAR(10)', { transaction });
  await sequelize.query(
    `INSERT INTO exchangerate (currency, usd_rate, last_updated)
     SELECT 'IDR', 0.00005528, now()
      WHERE NOT EXISTS (SELECT 1 FROM exchangerate WHERE UPPER(currency) = 'IDR')`,
    { transaction }
  );
}

async function down({ sequelize, transaction }) {
  await sequelize.query("DELETE FROM exchangerate WHERE currency = 'IDR'", { transaction });
  await sequelize.query('ALTER TABLE f2paydeposits DROP COLUMN IF EXISTS pay_currency', { transaction });
  await sequelize.query('ALTER TABLE f2paydeposits DROP COLUMN IF EXISTS pay_amount', { transaction });
}

module.exports = { up, down };
