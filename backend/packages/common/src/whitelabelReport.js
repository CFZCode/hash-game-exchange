'use strict';

const { QueryTypes } = require('sequelize');

const money = require('./money');

/**
 * A whitelabel's revenue-share statement for a period (docs/plans/2026-11-01-whitelabel-plan-and-
 * casino-hub.md, Part D). The owner's rule (2026-11-01): GGR revenue share per product, REPORTED
 * only (nothing is collected automatically), shown to the Super Admin and to the whitelabel.
 *
 *   casino, originals   from the PARENT's own record of every round it passed on
 *                       (`whitelabel_casino_rounds`): GGR = bets − wins − refunds − rollbacks
 *                       (a rollback row is what it reversed, bets − wins)
 *   sports              the COPY's own figure (its P&L: the house side of its sports ledger) —
 *                       sports bets never pass through the parent
 *   gateway             gateway orders the copy ran on the parent's account, and their charges
 *   transfers           balance the parent sent the copy
 *
 * Everything in INR at the parent's rates (`exchangerate.usd_rate` = USD per unit); a coin with no
 * rate is left out and listed in `unconverted`, never counted as zero. A product's share is on
 * POSITIVE GGR only: a losing period owes nothing (and carries nothing forward).
 */

const PRODUCTS = Object.freeze(['casino', 'originals', 'sports']);
const LABEL = Object.freeze({ casino: 'Casino', originals: 'Original games', sports: 'Sports' });

const select = (db, sql, replacements) => db.sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
const dec = (minor) => money.toDecimalString(minor);
const PAISA = 10n ** BigInt(money.SCALE - 2);
const toPaisa = (minor) => (minor >= 0n ? ((minor + PAISA / 2n) / PAISA) * PAISA : -(((-minor + PAISA / 2n) / PAISA) * PAISA));

/** `(currency, amount) → INR minor units`, or null when the coin has no rate. */
async function inrValuer(db) {
  const rows = await select(db, `SELECT UPPER(currency) AS currency, usd_rate FROM exchangerate WHERE usd_rate IS NOT NULL`, {});
  const rate = Object.fromEntries(rows.map((r) => [r.currency, money.fromStored(r.usd_rate)]));
  return (currency, amount) => {
    const code = String(currency ?? '').toUpperCase();
    const value = money.fromStored(amount ?? '0');
    if (code === 'INR') return money.toMinorQuantised(value);
    if (!rate[code] || !rate.INR || money.isZero(rate.INR)) return null;
    return money.divide(dec(money.multiply(value, rate[code])), rate.INR);
  };
}

/** The parent-side figures for one whitelabel and `[from, to)`. */
async function ledgerFigures(db, { whitelabelId, from, to }) {
  const value = await inrValuer(db);
  const unconverted = new Set();
  const inr = (currency, amount) => {
    const v = value(currency, amount);
    if (v === null) unconverted.add(String(currency).toUpperCase());
    return v ?? 0n;
  };
  const window = { whitelabelId, from, to };

  const rounds = await select(
    db,
    `SELECT product, kind, currency, COUNT(*)::int AS count, SUM(amount) AS amount
       FROM whitelabel_casino_rounds
      WHERE whitelabel_id = :whitelabelId AND created_at >= :from AND created_at < :to
      GROUP BY product, kind, currency`,
    window
  );
  const blank = () => ({ bets: 0n, wins: 0n, refunds: 0n, rollbacks: 0n, betCount: 0 });
  const games = { casino: blank(), originals: blank() };
  const FIELD = { bet: 'bets', win: 'wins', refund: 'refunds', rollback: 'rollbacks' };
  for (const r of rounds) {
    const g = games[r.product];
    if (!g || !FIELD[r.kind]) continue;
    g[FIELD[r.kind]] += inr(r.currency, r.amount);
    if (r.kind === 'bet') g.betCount += r.count;
  }

  const orders = await select(
    db,
    `SELECT flow, currency, COUNT(*)::int AS count, SUM(COALESCE(settled_amount, amount)) AS amount,
            SUM(COALESCE(settled_amount, amount) * charge_pct / 100) AS charges
       FROM whitelabel_gateway_orders
      WHERE whitelabel_id = :whitelabelId AND status = 'success' AND updated_at >= :from AND updated_at < :to
      GROUP BY flow, currency`,
    window
  );
  const gateway = { deposits: 0n, depositCount: 0, withdrawals: 0n, withdrawalCount: 0, charges: 0n };
  for (const o of orders) {
    if (o.flow === 'deposit') {
      gateway.deposits += inr(o.currency, o.amount);
      gateway.depositCount += o.count;
    } else {
      gateway.withdrawals += inr(o.currency, o.amount);
      gateway.withdrawalCount += o.count;
    }
    gateway.charges += inr(o.currency, o.charges ?? '0');
  }

  const [sent] = await select(
    db,
    `SELECT COUNT(*)::int AS count, COALESCE(SUM(amount), 0) AS amount FROM whitelabel_transfers
      WHERE whitelabel_id = :whitelabelId AND status = 'done' AND created_at >= :from AND created_at < :to`,
    window
  );

  const out = (g) => ({
    bets: dec(g.bets),
    wins: dec(g.wins),
    refunds: dec(g.refunds),
    rollbacks: dec(g.rollbacks),
    betCount: g.betCount,
    ggr: dec(g.bets - g.wins - g.refunds - g.rollbacks),
  });
  return {
    casino: out(games.casino),
    originals: out(games.originals),
    gateway: {
      deposits: dec(gateway.deposits),
      depositCount: gateway.depositCount,
      withdrawals: dec(gateway.withdrawals),
      withdrawalCount: gateway.withdrawalCount,
      charges: dec(toPaisa(gateway.charges)),
    },
    transfers: { amount: money.fromStored(sent?.amount ?? '0'), count: sent?.count ?? 0 },
    unconverted: [...unconverted],
  };
}

/**
 * The statement: one row per product the plan includes (`products` from the plan; all three when
 * no plan), GGR × the product's share % on positive GGR, rounded to the paisa.
 *
 * `sports` = { ggr } in INR, or null when the copy could not be asked (`sportsError` says why).
 */
function assemble({ from, to, ledger, sports, sportsError = null, revenueShare = {}, products = null }) {
  const rows = [];
  let totalGgr = 0n;
  let totalShare = 0n;
  for (const product of PRODUCTS) {
    if (products && products[product] === false) continue;
    const ggrDecimal = product === 'sports' ? sports?.ggr ?? null : ledger[product].ggr;
    const pct = String(revenueShare[product] ?? '0');
    const ggr = ggrDecimal === null ? null : money.toMinorQuantised(ggrDecimal);
    const share = ggr === null ? null : toPaisa(ggr > 0n ? money.percentOf(dec(ggr), pct) : 0n);
    if (ggr !== null) totalGgr += ggr;
    if (share !== null) totalShare += share;
    rows.push({
      product,
      label: LABEL[product],
      ...(product === 'sports' ? { staked: sports?.staked ?? null, betCount: sports?.betCount ?? null } : { bets: ledger[product].bets, wins: ledger[product].wins, refunds: ledger[product].refunds, rollbacks: ledger[product].rollbacks, betCount: ledger[product].betCount }),
      ggr: ggr === null ? null : dec(ggr),
      sharePct: pct,
      share: share === null ? null : dec(share),
    });
  }
  return {
    from,
    to,
    currency: 'INR',
    products: rows,
    totalGgr: dec(totalGgr),
    totalShare: dec(totalShare),
    complete: rows.every((r) => r.ggr !== null),
    sportsError,
    gateway: ledger.gateway,
    transfers: ledger.transfers,
    unconverted: ledger.unconverted,
  };
}

/** The statement as CSV lines (cells already safe: numbers and fixed labels only). */
function toCsv(report, { name } = {}) {
  const lines = [
    ['Whitelabel', name ?? ''],
    ['From', report.from],
    ['To (exclusive)', report.to],
    ['Currency', report.currency],
    [],
    ['Product', 'Bets / staked', 'Wins', 'Refunds + rollbacks', 'GGR', 'Share %', 'Share'],
  ];
  for (const r of report.products) {
    const reversed = r.refunds == null ? '' : dec(money.toMinorQuantised(r.refunds) + money.toMinorQuantised(r.rollbacks));
    lines.push([r.label, r.bets ?? r.staked ?? '', r.wins ?? '', reversed, r.ggr ?? 'not available', r.sharePct, r.share ?? '']);
  }
  lines.push(['Total', '', '', '', report.totalGgr, '', report.totalShare]);
  lines.push([]);
  lines.push(['Gateway deposits', report.gateway.deposits, `${report.gateway.depositCount} order(s)`]);
  lines.push(['Gateway withdrawals', report.gateway.withdrawals, `${report.gateway.withdrawalCount} order(s)`]);
  lines.push(['Gateway charges', report.gateway.charges]);
  lines.push(['Balance sent by the parent', report.transfers.amount, `${report.transfers.count} transfer(s)`]);
  if (report.unconverted.length) lines.push(['Left out (no exchange rate)', report.unconverted.join(' ')]);
  if (report.sportsError) lines.push(['Sports', `not available: ${report.sportsError}`]);
  return lines.map((cells) => cells.map((c) => `"${String(c ?? '').replace(/"/g, '""').replace(/^[=+\-@\t\r]/, (m) => (/^-\d/.test(String(c)) ? m : `'${m}`))}"`).join(',')).join('\r\n');
}

module.exports = { PRODUCTS, ledgerFigures, assemble, toCsv };
