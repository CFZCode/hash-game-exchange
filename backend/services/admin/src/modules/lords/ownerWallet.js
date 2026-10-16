'use strict';

const { Op, QueryTypes, literal } = require('sequelize');
const { money } = require('@ibitplay/common');
const { creditStaffFloat, insufficientFunds } = require('./staffFloat');
const { TRANSFER_TYPE } = require('./lords.constants');

/**
 * Owner (Super Admin, level 1) ke DO balance hain:
 *
 *   Client Management balance → `credits.inr` (user_type 'OWNER', migration 099)
 *     Sirf children ke liye: staff/agent aur parent wale players.
 *
 *   Direct User balance → `staff_balances.inr` (owner ki row)
 *     Sirf DIRECT users ke liye (khud signup kiya, parent_staff_id NULL).
 *
 * Rules:
 *
 *   1. Owner khud apne Client Management balance me add karta hai → `addOwnerBalance`
 *      (inr + credit + all_point badhte hain, point ledger me "Credit" — zip jaisa).
 *
 *   2. Owner khud apne Direct User balance me add karta hai → `addOwnerDirectBalance`
 *      (`staff_balances.inr` badhta hai, staff_transfers me 'owner_direct_topup').
 *
 *   3. Owner apne child ko deta hai → `credits.inr` se katta hai (staffFloat).
 *
 *   4. Owner DIRECT user ko deta hai → `staff_balances.inr` se katta hai;
 *      direct user se leta hai → wapas `staff_balances.inr` me jaata hai.
 *      Client Management balance (credits) is len-den me nahi aata.
 *      History: transfer_type 'direct', point ledger 'Bank Deposite' / 'Bank Withdraw'.
 */

/** Direct User balance kam pada. */
const insufficientDirectBalance = (details = {}) =>
  insufficientFunds(
    { party: 'owner_direct', ...details },
    'There is not enough in your Direct User balance to cover this'
  );

const toDecimal = (amount) => money.toDecimalString(money.toMinor(amount));

/** Owner ka Direct User balance (`staff_balances.inr`), decimal string. Row na ho to 0. */
async function readOwnerDirectBalance(models, ownerId, { transaction } = {}) {
  const row = await models.StaffBalances.findOne({ where: { staff_id: ownerId }, attributes: ['inr'], transaction, raw: true });
  return money.toDecimalString(money.toMinorQuantised(row?.inr ?? '0'));
}

/**
 * Direct User balance se `amount` kaato. Guard `inr >= amount` UPDATE ke andar
 * hai (Postgres row lock), isliye do request saath me bhi minus me nahi le ja sakti.
 *
 * @returns {Promise<boolean>} false = balance kam hai, kuch nahi likha.
 */
async function debitOwnerDirectBalance(models, ownerId, amount, { transaction } = {}) {
  const decimal = toDecimal(amount);
  const [affected] = await models.StaffBalances.update(
    { inr: literal(`inr - ${decimal}`) },
    { where: { staff_id: ownerId, inr: { [Op.gte]: decimal } }, transaction }
  );
  return affected > 0;
}

/** Direct User balance me `amount` jodo (row na ho to banao). */
async function creditOwnerDirectBalance(models, ownerId, amount, { transaction } = {}) {
  const decimal = toDecimal(amount);
  const [, created] = await models.StaffBalances.findOrCreate({
    where: { staff_id: ownerId },
    defaults: { staff_id: ownerId, inr: decimal },
    transaction,
  });
  if (!created) {
    await models.StaffBalances.increment({ inr: decimal }, { where: { staff_id: ownerId }, transaction });
  }
}

/**
 * Owner apne Direct User balance me paisa daalta hai.
 * `staff_transfers` me 'owner_direct_topup' row (from 'system').
 */
async function addOwnerDirectBalance(models, { ownerId, amount, note }, { transaction }) {
  const decimal = toDecimal(amount);
  await creditOwnerDirectBalance(models, ownerId, decimal, { transaction });

  const row = await models.StaffTransfers.create(
    {
      from_type: 'system',
      from_id: 0,
      to_type: 'staff',
      to_id: ownerId,
      amount: decimal,
      direction: 'deposit',
      transfer_type: TRANSFER_TYPE.OWNER_DIRECT_TOPUP,
      note: note ?? 'Owner added Direct User balance',
      created_at: new Date(),
    },
    { transaction }
  );

  return {
    transferId: String(row.id),
    amount: decimal,
    balance: money.fromStored(await readOwnerDirectBalance(models, ownerId, { transaction })),
  };
}

/** Ye staff owner (level 1) hai? */
async function isOwnerStaff(models, staffId, { transaction } = {}) {
  const staff = await models.Staff.findByPk(staffId, { attributes: ['role_id'], transaction, raw: true });
  if (!staff) return false;
  const role = await models.Roles.findByPk(staff.role_id, { attributes: ['level'], transaction, raw: true });
  return Number(role?.level) === 1;
}

/** Player direct user hai? (khud signup kiya, koi parent nahi) */
async function isDirectUser(models, userId, { transaction } = {}) {
  const user = await models.Users.findByPk(userId, { attributes: ['parent_staff_id'], transaction, raw: true });
  return Boolean(user) && user.parent_staff_id == null;
}

/**
 * Owner apne wallet me balance add karta hai.
 * `staff_transfers` me 'owner_topup' row banti hai (from 'system'), taaki
 * pata rahe owner ne kab kitna paisa system me daala.
 */
async function addOwnerBalance(models, { ownerId, amount, note }, { transaction }) {
  const decimal = money.toDecimalString(money.toMinor(amount));

  await creditStaffFloat(models, ownerId, decimal, { transaction });

  const row = await models.StaffTransfers.create(
    {
      from_type: 'system',
      from_id: 0,
      to_type: 'staff',
      to_id: ownerId,
      amount: decimal,
      direction: 'deposit',
      transfer_type: TRANSFER_TYPE.OWNER_TOPUP,
      note: note ?? 'Owner added balance',
      created_at: new Date(),
    },
    { transaction }
  );

  // Zip (tenexch bundle) jaisa: owner ka credit aur all_point bhi badhte hain, aur
  // point ledger me 'Credit' entry (koi parent nahi — settled_with_wallet_id NULL).
  const [wallet] = await models.Credits.sequelize.query(
    `UPDATE credits SET credit = credit + :amount, all_point = all_point + :amount
      WHERE staff_id = :ownerId
      RETURNING id, inr, all_point`,
    { replacements: { amount: decimal, ownerId }, type: QueryTypes.SELECT, transaction }
  );
  const staff = await models.Staff.findByPk(ownerId, { attributes: ['name'], transaction, raw: true });
  const username = staff?.name ?? String(ownerId);

  await models.Credits.sequelize.query(
    `INSERT INTO mssports.point_ledger
       (entry_ref, event_type, username, wallet_id, settled_with_wallet_id, delta, all_point_after,
        closing_inr_balance, closing_inr_balance_parent, source_user_id, remark, created_at)
     VALUES (:entryRef, 'Credit', :username, :walletId, NULL, :amount, :allPoint, :inr, NULL, NULL, :remark, NOW())`,
    {
      replacements: {
        entryRef: `deposit:${row.id}`,
        username,
        walletId: wallet.id,
        amount: decimal,
        allPoint: wallet.all_point,
        inr: wallet.inr,
        remark: `${note || 'Owner add balance'}#${username}`.slice(0, 255),
      },
      transaction,
    }
  );

  return { transferId: String(row.id), amount: decimal, balance: money.fromStored(wallet?.inr ?? '0') };
}

module.exports = {
  isOwnerStaff,
  isDirectUser,
  addOwnerBalance,
  addOwnerDirectBalance,
  readOwnerDirectBalance,
  debitOwnerDirectBalance,
  creditOwnerDirectBalance,
  insufficientDirectBalance,
};
