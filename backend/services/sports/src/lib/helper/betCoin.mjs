// helper/betCoin.mjs — a sports bet's money moves in the coin it was placed in (user, 2026-10-18).
// The exchange still reckons in INR (exposure, ledger, points); only the wallet write converts:
// what placement took comes back at the bet's own rate (original_amount / stake_amount), a win
// on top is converted at today's rate. INR bets never come here — their code is unchanged.
import { QueryTypes } from "sequelize";
import { inrToCurrency } from "./toInr.mjs";

var round8 = (n) => Math.round(Number(n) * 1e8) / 1e8;

/** The bets' coin, upper case; INR when unset. */
var betCoin = (bets) => String([].concat(bets)[0]?.original_currency || "INR").trim().toUpperCase();

/** Coin per INR the bets were placed at, or null when they carry no amounts. */
var placedRate = (bets) => {
  let inr = 0, coin = 0;
  for (const b of [].concat(bets)) {
    inr += Number(b?.stake_amount) || 0;
    coin += Number(b?.original_amount) || 0;
  }
  return inr > 0 && coin > 0 ? coin / inr : null;
};

/** The `public.credits` column for `coin` — it must be a wallet column with a rate, never a points column. */
var walletColumn = async (db, coin, transaction) => {
  const col = String(coin || "").trim().toLowerCase();
  const [row] = await db.query(
    `SELECT 1 AS ok FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'credits' AND column_name = :col
        AND EXISTS (SELECT 1 FROM public.exchangerate WHERE LOWER(currency) = :col)`,
    { replacements: { col }, type: QueryTypes.SELECT, transaction }
  );
  if (!row) throw new Error(`Betting in ${String(coin).toUpperCase()} is not available`);
  return col;
};

/** INR → the bets' coin: `release` (stake/liability coming back or taken, any sign) at the placed rate, `win` (a win, or a commission off it) at today's rate. */
var coinParts = async (bets, { release = 0, win = 0 }) => {
  const coin = betCoin(bets);
  const rate = placedRate(bets);
  const back = rate ? Number(release) * rate : await inrToCurrency(release, coin);
  const won = Number(win) ? await inrToCurrency(win, coin) : 0;
  return { coin_win: round8(won), coin_amount: round8(back + won) };
};
var toBetCoin = async (bets, parts) => (await coinParts(bets, parts)).coin_amount;

/** A settlement credit split into the liability it returns and the win on top (a negative credit is all `release`). */
var splitCredit = (credit, net) => {
  const c = Number(credit) || 0;
  const win = c > 0 ? Math.min(Math.max(Number(net) || 0, 0), c) : 0;
  return { release: c - win, win };
};

/** Adds `amount` (signed, in `coin`) to the player's wallet inside `transaction`; returns the new balance. */
var addToWallet = async (db, uid, coin, amount, transaction) => {
  const col = await walletColumn(db, coin, transaction);
  const [row] = await db.query(
    `UPDATE public.credits SET "${col}" = COALESCE("${col}", 0) + :amount WHERE uid = :uid RETURNING "${col}" AS balance`,
    { replacements: { amount: round8(amount), uid }, type: QueryTypes.SELECT, transaction }
  );
  if (!row) throw new Error(`Wallet not found for user ${uid}`);
  return Number(row.balance);
};

/** The player's balance in `coin`, row-locked inside `transaction`. */
var walletBalance = async (db, uid, coin, transaction) => {
  const col = await walletColumn(db, coin, transaction);
  const [row] = await db.query(
    `SELECT COALESCE("${col}", 0) AS balance FROM public.credits WHERE uid = :uid FOR UPDATE`,
    { replacements: { uid }, type: QueryTypes.SELECT, transaction }
  );
  if (!row) throw new Error(`Wallet not found for user ${uid}`);
  return Number(row.balance);
};

/** Moves an INR settlement/refund figure into the bets' coin wallet; returns what the ledger row's meta keeps (a void reverses `coin_win`). */
var payInBetCoin = async (db, { uid, bets, release = 0, win = 0, transaction }) => {
  const coin = betCoin(bets);
  const parts = await coinParts(bets, { release, win });
  const balance = await addToWallet(db, uid, coin, parts.coin_amount, transaction);
  return { coin, ...parts, coin_balance: balance };
};

export { betCoin, placedRate, walletColumn, toBetCoin, splitCredit, addToWallet, walletBalance, payInBetCoin };
