'use strict';

const { AppError } = require('@ibitplay/common');
const { hasPermission, PERMISSIONS: P } = require('@ibitplay/auth');

const { AccessService } = require('../access/access.service');
const { assertTransactionPassword } = require('../staff-auth/transactionPassword');
const { isUsernameTaken } = require('./createAccount');

/**
 * Multi Login Account — zip ka `MultiLogin.jsx` (executives: sub-logins with privileges).
 *
 * Hamare platform pe ye "executives" hain (access module). Banana, privileges badalna,
 * password aur status — sab AccessService se. Yahan sirf zip wali shakal:
 *
 *   zip privilege key (dashboard, userList, bank …)  →  hamari permission strings
 *
 * Executive ki asli authority `permissions.authority` (permission strings) hai — wahi
 * login pe lagti hai. Zip ke ticks bhi saath me `permissions.privileges` me rakhte hain,
 * aur Full Name `permissions.full_name` me, taaki table bilkul zip jaisi dikhe.
 */

/** Zip ke privileges (casino wale chhod ke) → kaunsi permissions chahiye. */
const PRIVILEGE_PERMISSIONS = Object.freeze({
  dashboard: [P.REPORTS_READ],
  marketAnalysis: [P.SPORTS_READ],
  userList: [P.USERS_READ],
  insertUser: [P.USERS_WRITE],
  bank: [P.WALLET_CREDIT, P.WALLET_DEBIT],
  accountStatement: [P.REPORTS_READ],
  partyWinLoss: [P.REPORTS_READ],
  currentBets: [P.SPORTS_READ],
  userHistory: [P.USERS_READ],
  generalLock: [P.USERS_LOCK],
  events: [P.SPORTS_READ],
  marketSearchAnalysis: [P.SPORTS_READ],
  loginUserCreation: [P.STAFF_WRITE],
  withdraw: [P.WALLET_DEBIT],
  deposit: [P.WALLET_CREDIT],
  creditReference: [P.WALLET_READ],
  userInfo: [P.USERS_READ],
  userPasswordChange: [P.USERS_WRITE],
  userLock: [P.USERS_LOCK],
  betLock: [P.USERS_LOCK],
  turnOver: [P.REPORTS_READ],
  couponReport: [P.REPORTS_READ],
  activeUser: [P.USERS_READ],
  fraudReport: [P.REPORTS_READ],
  currencyPermission: [P.CONFIG_READ],
  agentAssign: [P.STAFF_READ],
  userRegisterReport: [P.REPORTS_READ],
  totalProfitLoss: [P.REPORTS_READ],
  userWinLoss: [P.REPORTS_READ],
});

const PRIVILEGE_KEYS = Object.keys(PRIVILEGE_PERMISSIONS);

const badRequest = (message) => new AppError(message, 400, 'EXCHANGE_MULTI_LOGIN_BAD_REQUEST');

/** Sirf jaane-pehchaane keys, true/false. */
function cleanPrivileges(privileges = {}) {
  const clean = {};
  for (const key of PRIVILEGE_KEYS) clean[key] = Boolean(privileges[key]);
  return clean;
}

/**
 * Ticked privileges → permission strings, jo login wale ke paas khud hain sirf wahi
 * (AccessService zyada dene pe refuse karta hai).
 */
function authorityFor(privileges, held) {
  const wanted = new Set();
  for (const key of PRIVILEGE_KEYS) {
    if (privileges[key]) PRIVILEGE_PERMISSIONS[key].forEach((p) => wanted.add(p));
  }
  return [...wanted].filter((p) => hasPermission(held ?? [], p));
}

/** Zip ka password rule (8+, ek upper, ek lower, ek number) + hamara 12 ka rule. */
function assertPassword(password) {
  const value = String(password ?? '');
  if (value.length < 8) throw badRequest('The Password field must be at least 8 characters');
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
    throw badRequest('The password must contain at least: 1 uppercase letter, 1 lowercase letter, 1 number');
  }
  if (value.length < 12) throw badRequest('The Password field must be at least 12 characters');
}

function readJson(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

/** Table ki row — zip ke `executives` list jaisi. */
function shapeExecutive(row) {
  const stored = readJson(row.permissions);
  return {
    id: row.id,
    username: row.username,
    full_name: stored.full_name ?? null,
    active: row.status === 'active',
    status: row.status,
    permissions: cleanPrivileges(stored.privileges),
  };
}

class MultiLoginService {
  constructor(deps) {
    this.models = deps.models;
    this.logger = deps.logger;
    this.access = new AccessService(deps);
  }

  /** Login wale ke apne executives (zip: multi-login/list). */
  async list({ actor }) {
    const rows = await this.models.Executives.findAll({
      where: { parent_staff_id: actor.id, kind: 'executive' },
      order: [['id', 'DESC']],
      raw: true,
    });
    return { success: true, executives: rows.map(shapeExecutive) };
  }

  async create({ actor, username, full_name: fullName, password, transactionPassword, permissions }) {
    const privileges = cleanPrivileges(permissions);
    if (!PRIVILEGE_KEYS.some((k) => privileges[k])) throw badRequest('The Privileges field is required');
    assertPassword(password);

    await assertTransactionPassword(this.models, actor.id, transactionPassword, {
      required: true,
      executiveId: actor.executiveId ?? null,
    });
    if (await isUsernameTaken(this.models, username)) throw new AppError('User Name Already Exists', 409, 'EXCHANGE_ACCOUNTS_USERNAME_EXISTS');

    const authority = authorityFor(privileges, actor.permissions);
    if (!authority.length) throw badRequest('None of these privileges are available to your account');

    const created = await this.access.createExecutive({ actor, username: username.toLowerCase(), password, permissions: authority });
    await this.#saveExtras(created.id, { privileges, full_name: fullName });

    return { success: true, message: 'User Sucessfully Inserted', executive: await this.#one(created.id) };
  }

  /** Edit privileges modal — poora map aata hai, replace hota hai. */
  async updatePrivileges({ actor, executiveId, permissions }) {
    const privileges = cleanPrivileges(permissions);
    const authority = authorityFor(privileges, actor.permissions);
    if (!authority.length) throw badRequest('Select at least one privilege');

    // Full name pehle padh lo — AccessService poora permissions column badal deta hai.
    await this.access.getExecutive({ actor, executiveId });
    const stored = readJson((await this.models.Executives.findByPk(executiveId, { raw: true }))?.permissions);
    await this.access.updateExecutive({ actor, executiveId, permissions: authority });
    await this.#saveExtras(executiveId, { privileges, full_name: stored.full_name });

    return { success: true, message: 'Privileges updated', executive: await this.#one(executiveId) };
  }

  /** On / Off button — `active` na ho to ulta kar do. */
  async setActive({ actor, executiveId, active }) {
    const current = await this.access.getExecutive({ actor, executiveId });
    const next = active === undefined ? current.status !== 'active' : Boolean(active);
    await this.access.setStatus({ actor, executiveId, status: next ? 'active' : 'inactive' });
    return { success: true, message: next ? 'Login enabled' : 'Login disabled', executive: await this.#one(executiveId) };
  }

  async changePassword({ actor, executiveId, password }) {
    assertPassword(password);
    await this.access.resetPassword({ actor, executiveId, password });
    return { success: true, message: 'Password updated' };
  }

  /** Delete — login usi waqt band. Apna hi executive. */
  async remove({ actor, executiveId }) {
    if (actor.executiveId) throw new AppError('An executive cannot manage sub-logins', 403, 'EXCHANGE_MULTI_LOGIN_FORBIDDEN');
    await this.access.getExecutive({ actor, executiveId }); // apna hai ya nahi
    await this.models.Executives.destroy({ where: { id: executiveId, parent_staff_id: actor.id } });
    this.logger?.warn({ actorStaffId: actor.id, executiveId }, 'Sub-login deleted');
    return { success: true, message: 'Executive deleted' };
  }

  /** authority ke saath zip ke ticks aur full name bhi jsonb me. */
  async #saveExtras(executiveId, { privileges, full_name: fullName }) {
    const row = await this.models.Executives.findByPk(executiveId, { attributes: ['id', 'permissions'], raw: true });
    const stored = readJson(row?.permissions);
    await this.models.Executives.update(
      { permissions: { ...stored, privileges, full_name: fullName ?? stored.full_name ?? null } },
      { where: { id: executiveId } }
    );
  }

  async #one(executiveId) {
    const row = await this.models.Executives.findByPk(executiveId, { raw: true });
    return row ? shapeExecutive(row) : null;
  }
}

module.exports = { MultiLoginService, PRIVILEGE_PERMISSIONS, authorityFor, cleanPrivileges };
