// helper/toInr.mjs — a stake in any coin, in INR (user, 2026-10-17): the exchange runs on INR,
// so placeBet converts once at the platform's own rate table (public.exchangerate,
// usd_rate = USD per unit) and everything after it stays as it was.
import { db_default, init_db } from "../config/db.mjs";
import { QueryTypes } from "sequelize";

init_db();

// The rate table may carry no row for these; they are the dollar itself.
var ONE_USD = ["USD", "USDT"];

var toInr = async (amount, currency) => {
  const code = String(currency || "").trim().toUpperCase();
  const n = Number(amount);
  if (code === "INR") return n;
  const rows = await db_default.query(
    "SELECT UPPER(currency) AS currency, usd_rate FROM public.exchangerate WHERE UPPER(currency) IN (:codes)",
    { replacements: { codes: [code, "INR"] }, type: QueryTypes.SELECT }
  );
  const rate = (c) => Number(rows.find((r) => r.currency === c)?.usd_rate) || (ONE_USD.includes(c) ? 1 : 0);
  const from = rate(code);
  const inr = rate("INR");
  if (!(from > 0) || !(inr > 0)) throw new Error(`No exchange rate for ${code}`);
  return Math.round(n * from / inr * 100) / 100;
};

export { toInr };
