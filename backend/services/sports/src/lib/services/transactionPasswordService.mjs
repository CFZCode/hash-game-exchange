// services/admin/transactionPasswordService.js — mssports core, moved unchanged
import { Staff_default } from "../../models/admin/Staff.mjs";
import { Owner_default } from "../../models/admin/Owner.mjs";
import { MESSAGES } from "../constants/messages.mjs";

var MAX_TXN_PASSWORD_ATTEMPTS = 10;
async function verifyTxnPasswordWithAttempts(reqUser, transactionPassword) {
  const userId = reqUser.account ? reqUser.account.id : reqUser.user_id || reqUser.staff_id || reqUser.owner_id;
  const userRole = reqUser.role;
  if (!transactionPassword) {
    return { ok: false, status: 400, message: MESSAGES.ADMIN.TXN.REQUIRED };
  }
  const isOwner = userRole === "OWNER" || userRole === "Owner";
  const user = isOwner ? await Owner_default.findOne({ where: { owner_id: userId } }) : await Staff_default.findByPk(userId);
  if (!user) {
    return { ok: false, status: 404, message: MESSAGES.ADMIN.TXN.ACCOUNT_NOT_FOUND };
  }
  if (!isOwner && user.active === false) {
    return {
      ok: false,
      status: 403,
      message: MESSAGES.ADMIN.TXN.LIMIT_REACHED,
      attemptsLeft: 0
    };
  }
  const attemptsLeft = user.txn_password_attempts ?? MAX_TXN_PASSWORD_ATTEMPTS;
  if (!isOwner && attemptsLeft <= 0) {
    return { ok: false, status: 403, message: MESSAGES.ADMIN.TXN.LIMIT_REACHED, attemptsLeft: 0 };
  }
  if (user.transaction_password !== transactionPassword) {
    const remaining = Math.max(0, attemptsLeft - 1);
    const updates = { txn_password_attempts: remaining };
    let message = MESSAGES.ADMIN.TXN.NOT_VALID_ATTEMPTS_LEFT(remaining);
    if (remaining === 0) {
      message = MESSAGES.ADMIN.TXN.LIMIT_REACHED;
    }
    await user.update(updates);
    return { ok: false, status: 400, message, attemptsLeft: remaining };
  }
  if (attemptsLeft !== MAX_TXN_PASSWORD_ATTEMPTS) {
    await user.update({ txn_password_attempts: MAX_TXN_PASSWORD_ATTEMPTS });
  }
  return { ok: true, status: 200, message: MESSAGES.ADMIN.TXN.VERIFIED, attemptsLeft: MAX_TXN_PASSWORD_ATTEMPTS };
}

export { verifyTxnPasswordWithAttempts };
