'use strict';

const { QueryTypes } = require('sequelize');
const { money } = require('@ibitplay/common');
const { creditStaffFloat } = require('./staffFloat');
const { TRANSFER_TYPE } = require('./lords.constants');

/**
 * Owner (Super Admin, level 1) ka wallet.
 *
 * Owner ka balance bhi `credits` me hai (user_type 'OWNER', migration 099),
 * aur rules simple hain:
 *
 *   1. Owner khud apne wallet me balance add karta hai  → `addOwnerBalance`
 *      (inr + credit + all_point badhte hain, point ledger me "Credit" — zip jaisa).
 *      Sirf owner, sirf apne wallet me. Yahi jagah hai jahan paisa system me aata hai.
 *
 *   2. Owner apne child ko deta hai (staff/agent ya parent wala player)
 *      → owner ke `inr` se katta hai, baaki sab staff jaisa (staffFloat).
 *
 *   3. Owner DIRECT user ko deta hai (khud signup kiya, parent_staff_id NULL)
 *      → player ko mil jaata hai, owner ka balance NAHI katta.
 *        Iski history alag type se likhi jaati hai: transfer_type 'direct'
 *        aur point ledger me 'Bank Deposite' / 'Bank Withdraw'.
 */

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

module.exports = { isOwnerStaff, isDirectUser, addOwnerBalance };
