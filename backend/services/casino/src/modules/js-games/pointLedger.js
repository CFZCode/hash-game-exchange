'use strict';

const { QueryTypes } = require('sequelize');

/**
 * JS games ka point ledger — agent ke CHILD users (users.parent_staff_id hai) ke liye `point_ledger`
 * (poori chain); DIRECT users ke liye `point_ledger_direct` (sirf unki ek row) — neeche addDirectGamePoints.
 *
 * Sports settlement (sports `walletService.updateAllPointHierarchy`) jaisa: player + upar ke
 * saare staff ke `credits` rows me `all_point` (+ `thirdparty_pts`) += delta, aur har wallet ki
 * ek `mssports.point_ledger` row (category CASINO). `entry_ref` movement ka refId — same
 * callback dobara aaye to entry dobara nahi lagti.
 *
 * Paisa (`credits.inr`) pehle hi move ho chuka hota hai (user-service, HTTP se); ye sirf points likhta hai.
 */

const CATEGORY = 'CASINO';
const EVENT = 'BET_SETTLEMENT';

/** Child user ki chain (player wallet, phir staff wallets upar tak); direct user = null. */
async function childChain(sequelize, userId, transaction) {
  const [user] = await sequelize.query(
    `SELECT u.name, u.parent_staff_id, c.id AS wallet_id
       FROM public.users u LEFT JOIN public.credits c ON c.uid = u.id
      WHERE u.id = :userId`,
    { replacements: { userId }, type: QueryTypes.SELECT, transaction }
  );
  if (!user || user.parent_staff_id == null || !user.wallet_id) return null;

  const walletIds = [Number(user.wallet_id)];
  const seen = new Set();
  let staffId = user.parent_staff_id;
  while (staffId && !seen.has(Number(staffId))) {
    seen.add(Number(staffId));
    const [staff] = await sequelize.query(
      `SELECT s.parent_id, c.id AS wallet_id
         FROM public.staff s LEFT JOIN public.credits c ON c.staff_id = s.id
        WHERE s.id = :staffId`,
      { replacements: { staffId }, type: QueryTypes.SELECT, transaction }
    );
    if (!staff) break;
    if (staff.wallet_id) walletIds.push(Number(staff.wallet_id));
    staffId = staff.parent_id;
  }
  return walletIds;
}

/**
 * @param {import('sequelize').Sequelize} sequelize
 * @param {{ userId: number, delta: string, entryRef: string, gameType?: string, remark?: string }} p
 *   delta = decimal string (win − bet), INR
 * @returns {Promise<null | { duplicate: true } | { wallets: number }>}
 */
async function addChildGamePoints(sequelize, { userId, delta, entryRef, gameType, remark }) {
  return sequelize.transaction(async (transaction) => {
    const walletIds = await childChain(sequelize, userId, transaction);
    if (!walletIds) return null;

    const [already] = await sequelize.query('SELECT 1 FROM mssports.point_ledger WHERE entry_ref = :entryRef LIMIT 1', {
      replacements: { entryRef },
      type: QueryTypes.SELECT,
      transaction,
    });
    if (already) return { duplicate: true };

    const wallets = await sequelize.query(
      `UPDATE public.credits c
          SET all_point = c.all_point + :delta, thirdparty_pts = c.thirdparty_pts + :delta
         FROM (SELECT c2.id, COALESCE(u.name, s.name) AS username
                 FROM public.credits c2
                 LEFT JOIN public.users u ON u.id = c2.uid
                 LEFT JOIN public.staff s ON s.id = c2.staff_id
                WHERE c2.id IN (:walletIds)) w
        WHERE c.id = w.id
        RETURNING c.id AS wallet_id, c.all_point, c.inr, w.username`,
      { replacements: { delta, walletIds }, type: QueryTypes.SELECT, transaction }
    );

    for (const w of wallets) {
      await sequelize.query(
        `INSERT INTO mssports.point_ledger
           (entry_ref, event_type, category, game_type, username, wallet_id, delta, all_point_after,
            closing_inr_balance, source_user_id, remark, created_at)
         VALUES
           (:entryRef, :event, :category, :gameType, :username, :walletId, :delta, :allPointAfter,
            :inr, :userId, :remark, NOW())`,
        {
          replacements: {
            entryRef,
            event: EVENT,
            category: CATEGORY,
            gameType: gameType ? String(gameType).slice(0, 50) : null,
            username: w.username,
            walletId: w.wallet_id,
            delta,
            allPointAfter: w.all_point,
            inr: w.inr ?? 0,
            userId,
            remark: String(remark ?? '').slice(0, 255),
          },
          transaction,
        }
      );
    }
    return { wallets: wallets.length };
  });
}

/**
 * Direct user (koi parent nahi) ka JS games callback — `mssports.point_ledger_direct` me EK row,
 * usi currency me jisme khela (migration 116). `credits.all_point` nahi chhuta: direct user ka
 * "all point" uska paisa hai; `balanceAfter` = movement ke baad us currency ka wallet balance.
 * `entry_ref` unique: wahi callback dobara aaye to row dobara nahi banti.
 *
 * @param {{ userId: number, currency: string, delta: string, balanceAfter?: string|null,
 *           entryRef: string, gameType?: string, remark?: string }} p   delta = signed decimal
 * @returns {Promise<null | { written: boolean }>} null = child user (ye uska ledger nahi)
 */
async function addDirectGamePoints(sequelize, { userId, currency, delta, balanceAfter, entryRef, gameType, remark }) {
  const [user] = await sequelize.query('SELECT name, parent_staff_id FROM public.users WHERE id = :userId', {
    replacements: { userId },
    type: QueryTypes.SELECT,
  });
  if (!user || user.parent_staff_id != null) return null;

  const rows = await sequelize.query(
    `INSERT INTO mssports.point_ledger_direct
       (entry_ref, event_type, category, user_id, username, currency, delta, balance_after, game_type, remark, created_at)
     VALUES
       (:entryRef, :event, :category, :userId, :username, :currency, :delta, :balanceAfter, :gameType, :remark, NOW())
     ON CONFLICT (entry_ref) DO NOTHING
     RETURNING id`,
    {
      replacements: {
        entryRef,
        event: EVENT,
        category: CATEGORY,
        userId,
        username: user.name ?? null,
        currency: String(currency || 'INR').toUpperCase().slice(0, 10),
        delta,
        balanceAfter: balanceAfter ?? null,
        gameType: gameType ? String(gameType).slice(0, 50) : null,
        remark: String(remark ?? '').slice(0, 255),
      },
      type: QueryTypes.SELECT,
    }
  );
  return { written: rows.length > 0 };
}

module.exports = { addChildGamePoints, addDirectGamePoints, CATEGORY };
