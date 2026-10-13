// services/admin/transactionPasswordService.js — mssports core, moved unchanged
import { Staff_default } from "../../models/admin/Staff.mjs";
import { Owner_default } from "../../models/admin/Owner.mjs";
import { MESSAGES } from "../constants/messages.mjs";
import { createRequire } from "node:module";

// TXN_PASSWORD_MODE=login (the platform default): the transaction password IS the platform login
// password, which admin-service owns — so the check is admin-service's, not this mirror row's
// `transaction_password` (which the mirror never sets). `separate` keeps the mssports compare.
const require = createRequire(import.meta.url);
const { isLoginPasswordMode } = require("@ibitplay/auth");
const { ServiceClient, resolveInternalKey } = require("@ibitplay/common");
const config = require("../../config");
let adminClient = null;
const admin = () => adminClient ??= new ServiceClient({
  name: "admin-service",
  baseUrl: config.ADMIN_SERVICE_URL,
  internalKey: resolveInternalKey(config, config.SERVICE_NAME),
  callerName: config.SERVICE_NAME,
  timeoutMs: config.SERVICE_TIMEOUT_MS,
  retries: 0
});
async function passwordMatches(reqUser, user, transactionPassword) {
  if (!isLoginPasswordMode()) return user.transaction_password === transactionPassword;
  const staffId = Number(reqUser.platformStaffId);
  if (!Number.isSafeInteger(staffId) || staffId <= 0) return false;
  try {
    await admin().post("/internal/admin/staff-directory/verify-transaction-password", { staffId, transactionPassword });
    return true;
  } catch (error) {
    // 403 = wrong password; anything else (admin-service down) also refuses — fail closed.
    if (error?.status !== 403 && error?.statusCode !== 403) console.error("Transaction password check failed:", error?.message);
    return false;
  }
}

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
  if (!(await passwordMatches(reqUser, user, transactionPassword))) {
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
