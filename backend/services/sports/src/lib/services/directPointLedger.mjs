// Direct user (koi parent nahi) ka point ledger — `mssports.point_ledger_direct` (migration 116).
//
// Agent system ka `point_ledger` chain ke har wallet ki row likhta hai; direct user ki chain
// nahi hoti, isliye yahan har event ki SIRF EK row — usi user ki, usi currency me jisme bet lagi.
// `credits.all_point` ko ye kabhi nahi chhuta: direct user ka "all point" uska paisa hai, jo
// settlement pehle hi move kar chuka hota hai. `balance_after` = us currency ka wallet balance.
// `entry_ref` unique hai — wahi event dobara aaye to row dobara nahi banti.
import { QueryTypes } from "sequelize";

const TABLE = "mssports.point_ledger_direct";

/** User ka `credits.<currency>` balance (column na ho to null) aur naam. */
async function walletOf(db, userId, currency, transaction) {
  const [row] = await db.query(
    `SELECT u.name AS username, to_jsonb(c) ->> :column AS balance
       FROM public.users u LEFT JOIN public.credits c ON c.uid = u.id
      WHERE u.id = :userId`,
    { replacements: { userId, column: currency.toLowerCase() }, type: QueryTypes.SELECT, transaction }
  );
  return row ?? {};
}

/**
 * Ek entry likho. `delta` sign ke saath (jeet +, haar −), `currency` me.
 * @returns {Promise<{ written: boolean }>} written=false: ye entry_ref pehle se hai
 */
async function writeDirectEntry(db, { entryRef, eventType, category, userId, currency, delta, betId = null, sportId = null, gameType = null, remark = null }, { transaction } = {}) {
  const code = String(currency || "INR").toUpperCase().slice(0, 10);
  const wallet = await walletOf(db, userId, code, transaction);
  const rows = await db.query(
    `INSERT INTO ${TABLE}
       (entry_ref, event_type, category, user_id, username, currency, delta, balance_after,
        bet_id, sport_id, game_type, remark, created_at)
     VALUES
       (:entryRef, :eventType, :category, :userId, :username, :currency, :delta, :balanceAfter,
        :betId, :sportId, :gameType, :remark, NOW())
     ON CONFLICT (entry_ref) DO NOTHING
     RETURNING id`,
    {
      replacements: {
        entryRef,
        eventType,
        category,
        userId,
        username: wallet.username ?? null,
        currency: code,
        delta: String(delta),
        balanceAfter: wallet.balance ?? null,
        betId,
        sportId: sportId != null ? String(sportId).slice(0, 50) : null,
        gameType: gameType != null ? String(gameType).slice(0, 50) : null,
        remark: remark != null ? String(remark).slice(0, 255) : null
      },
      type: QueryTypes.SELECT,
      transaction
    }
  );
  return { written: rows.length > 0 };
}

/** `originalRef` ki ulti entry `reversalRef` ke naam se — asli row kabhi delete nahi hoti. */
async function reverseDirectEntry(db, { originalRef, reversalRef, eventType, remark }, { transaction } = {}) {
  const [original] = await db.query(`SELECT * FROM ${TABLE} WHERE entry_ref = :originalRef`, {
    replacements: { originalRef },
    type: QueryTypes.SELECT,
    transaction
  });
  if (!original) return { written: false, missing: true };
  return writeDirectEntry(
    db,
    {
      entryRef: reversalRef,
      eventType,
      category: original.category,
      userId: original.user_id,
      currency: original.currency,
      delta: `${String(original.delta).startsWith("-") ? "" : "-"}${String(original.delta).replace(/^-/, "")}`,
      betId: original.bet_id,
      sportId: original.sport_id,
      gameType: original.game_type,
      remark: remark ?? original.remark
    },
    { transaction }
  );
}

/** Silent void: entry hi mita do (statement me kuch na dikhe). */
async function deleteDirectEntries(db, entryRef, { transaction } = {}) {
  const rows = await db.query(`DELETE FROM ${TABLE} WHERE entry_ref = :entryRef RETURNING id`, {
    replacements: { entryRef },
    type: QueryTypes.SELECT,
    transaction
  });
  return { deleted: rows.length };
}

export { writeDirectEntry, reverseDirectEntry, deleteDirectEntries };
