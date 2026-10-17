'use strict';

const { defaultCurrencyOf } = require('@ibitplay/common');

/**
 * The coin "All currencies" totals are valued in: the site's DEFAULT COIN
 * (the owner's `default_currency` policy, USDT when unset) — the same coin
 * every admin money screen opens on, so a converted total reads in the unit
 * the operator actually runs the site in rather than in USD.
 */
async function reportingCurrency(models) {
  if (typeof models?.SiteFeature?.findByPk !== 'function') return defaultCurrencyOf(null);
  const row = await models.SiteFeature.findByPk('default_currency', { attributes: ['variant'], raw: true }).catch(() => null);
  return defaultCurrencyOf(row?.variant);
}

module.exports = { reportingCurrency };
