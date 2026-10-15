'use strict';

const { QueryTypes } = require('sequelize');
const { AppError } = require('@ibitplay/common');
const { STAFF_LEVELS } = require('@ibitplay/auth');

const { manageableStaffIds, descendantIds } = require('../staff-directory/staffDirectory.service');

/**
 * Exchange user reports — zip (msadmin) ke ye screens:
 *
 *   Home                 → home()            login wale ka apna wallet (credits) + downline exposure
 *   User History         → loginHistory(), passwordHistory(), ipDetail()
 *   User Authentication  → authList()        direct children + unka 2FA
 *   Fraud Report         → fraud()           zip me bhi backend nahi tha — khaali list
 *   User Register Detail → registerDetail()  tree ke players: created, last login, deposit dates
 *
 * Zip ke tables ki jagah hamare tables:
 *   Wallets            → credits (staff_id / uid)
 *   user_activity_logs → user_login_history (player logins) aur admin_activity_logs (password change)
 *   Transaction DEPOSIT → staff_transfers (to_type 'user') — player ko diya gaya paisa
 */

const notInDownline = () => new AppError('User is not in your downline', 403, 'EXCHANGE_NOT_IN_DOWNLINE');

const round2 = (value) => Math.round(Number.parseFloat(value || 0) * 100) / 100;
/** NUMERIC → "123.45" (2 decimals). */
const show = (value) => round2(value).toFixed(2);

/** "26/07/2026 03:09:30" — IST me, zip ke fmtDate jaisa. */
function fmtDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).format(new Date(value)).replace(',', '');
}

/** x-forwarded-for "client, proxy" / "::ffff:1.2.3.4" → sirf client IP (zip ka normalizeIp). */
function normalizeIp(raw) {
  if (!raw) return '';
  return String(raw).split(',')[0].trim().replace(/^::ffff:/i, '');
}

/** fromDate / toDate (YYYY-MM-DD) → SQL ke liye instants, zip jaisa (toDate poora din). */
function dateRange(fromDate, toDate) {
  return {
    from: fromDate ? new Date(`${fromDate}T00:00:00.000Z`) : null,
    to: toDate ? new Date(`${toDate}T23:59:59.999Z`) : null,
  };
}

const emptyPage = { rows: [], total: 0 };

class UserReportsService {
  constructor({ models, logger }) {
    this.models = models;
    this.logger = logger;
  }

  get sequelize() {
    return this.models.Credits.sequelize;
  }

  #query(sql, replacements) {
    return this.sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
  }

  // ══════════════════════════════════════════════════════════════════════
  //  Home (dashboard)
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Zip `Home.jsx` ke cards — login wale ka apna `credits` row:
   *   Balance = inr, Credit pts = credit, All pts = all_point,
   *   Settlement pts = all_point − credit, Upper / Down pts, Sports pts (P/L ke liye).
   * Exposure = tree ke saare players ka open exposure (zip: downline ka total).
   */
  async home({ actor }) {
    const [wallet] = await this.#query(
      `SELECT inr, credit, all_point, upper_point, down_point, sports_pts
         FROM credits WHERE staff_id = :staffId LIMIT 1`,
      { staffId: actor.id }
    );
    const exposure = await this.#downlineExposure(actor);
    const allPoint = round2(wallet?.all_point);
    const credit = round2(wallet?.credit);

    return {
      balance: show(wallet?.inr),
      exposure: show(exposure),
      credit: show(wallet?.credit),
      allPoint: show(wallet?.all_point),
      settlementPoints: show(round2(allPoint - credit)),
      upperPoint: show(wallet?.upper_point),
      downPoint: show(wallet?.down_point),
      sportsPts: show(wallet?.sports_pts),
      isOwner: this.#isOwner(actor),
    };
  }

  /** Tree ke players ka exposure — har player ka |SUM(total_exposure)|, phir sabka jod. */
  async #downlineExposure(actor) {
    const staffIds = await this.#treeStaffIds(actor);
    const [row] = await this.#query(
      `SELECT COALESCE(SUM(x.exp), 0) AS total FROM (
         SELECT ABS(SUM(e.total_exposure)) AS exp
           FROM mssports.total_exposures e
           JOIN users u ON u.id = e.user_id
          WHERE u.parent_staff_id IN (:staffIds) OR (:withDirect AND u.parent_staff_id IS NULL)
          GROUP BY e.user_id) x`,
      { staffIds: staffIds.length ? staffIds : [0], withDirect: this.#isOwner(actor) }
    );
    return row.total;
  }

  // ══════════════════════════════════════════════════════════════════════
  //  User History — Login History / Change Password History / Ip Detail
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Login History — player ki logins `user_login_history` se.
   * Staff logins abhi kahin save nahi hote (sirf log file), isliye staff ke liye khaali list.
   */
  async loginHistory({ actor, username, fromDate, toDate, limit, offset }) {
    const target = await this.#historyTarget(actor, username);
    if (!target || target.type !== 'USER') return emptyPage;

    const { from, to } = dateRange(fromDate, toDate);
    const replacements = { id: target.id, from, to, limit, offset };
    const where = `user_id = :id
      AND (CAST(:from AS timestamptz) IS NULL OR created_at >= :from)
      AND (CAST(:to AS timestamptz) IS NULL OR created_at <= :to)`;

    const [rows, [{ total }]] = await Promise.all([
      this.#query(
        `SELECT id, ip_address, created_at FROM user_login_history WHERE ${where}
          ORDER BY created_at DESC, id DESC LIMIT :limit OFFSET :offset`,
        replacements
      ),
      this.#query(`SELECT COUNT(*)::int AS total FROM user_login_history WHERE ${where}`, replacements),
    ]);

    return {
      rows: rows.map((r) => ({ id: String(r.id), username: target.username, loginAt: r.created_at, ip: normalizeIp(r.ip_address) })),
      total,
    };
  }

  /**
   * Change Password History — `admin_activity_logs` me password change ke audit rows:
   *   player: account.password.set, user.update (details.passwordChanged = true)
   *   staff:  account.password.set, staff.password.change
   */
  async passwordHistory({ actor, username, fromDate, toDate, limit, offset }) {
    const target = await this.#historyTarget(actor, username);
    if (!target) return emptyPage;

    const { from, to } = dateRange(fromDate, toDate);
    const actions = target.type === 'USER' ? ['account.password.set'] : ['account.password.set', 'staff.password.change'];
    const replacements = { targetType: target.type, targetId: String(target.id), actions, from, to, limit, offset };
    const where = `target_type = :targetType AND target_id = :targetId AND status = 'success'
      AND (action IN (:actions)
           OR (:targetType = 'USER' AND action = 'user.update' AND details->>'passwordChanged' = 'true'))
      AND (CAST(:from AS timestamptz) IS NULL OR created_at >= :from)
      AND (CAST(:to AS timestamptz) IS NULL OR created_at <= :to)`;

    const [rows, [{ total }]] = await Promise.all([
      this.#query(
        `SELECT id, ip, actor_name, created_at FROM admin_activity_logs WHERE ${where}
          ORDER BY created_at DESC, id DESC LIMIT :limit OFFSET :offset`,
        replacements
      ),
      this.#query(`SELECT COUNT(*)::int AS total FROM admin_activity_logs WHERE ${where}`, replacements),
    ]);

    return {
      rows: rows.map((r) => ({
        id: String(r.id),
        username: target.username,
        changedAt: r.created_at,
        ip: normalizeIp(r.ip),
        changedBy: r.actor_name || target.username,
      })),
      total,
    };
  }

  /**
   * Ip Detail modal — zip ip-api.com se laata tha. Hum bahar IP nahi bhejte:
   * jo location login ke waqt save hui (user_login_history / ip_locations) wahi dikhate hain.
   */
  async ipDetail({ ip: raw }) {
    const ip = normalizeIp(raw);
    const [seen] = await this.#query(
      `SELECT city, country FROM user_login_history
        WHERE TRIM(regexp_replace(split_part(ip_address, ',', 1), '^::ffff:', '', 'i')) = :ip
          AND (city IS NOT NULL OR country IS NOT NULL)
        ORDER BY created_at DESC LIMIT 1`,
      { ip }
    );
    const [cached] = seen ? [] : await this.#query(
      'SELECT city, country FROM ip_locations WHERE address = :ip ORDER BY resolved_at DESC LIMIT 1',
      { ip }
    );
    const place = seen || cached || {};
    return { ip, city: place.city || '-', country: place.country || '-', mobile: false };
  }

  /**
   * Naam se account dhoondo (zip `resolveHistoryTarget`): pehle player, phir staff.
   * Naam khaali = login wala khud. Downline ke bahar → 403.
   */
  async #historyTarget(actor, username) {
    const name = String(username || '').trim();
    const staffIds = await this.#treeStaffIds(actor);

    if (!name) {
      const me = await this.models.Staff.findByPk(actor.id, { attributes: ['id', 'name'], raw: true });
      return me ? { type: 'STAFF', id: Number(me.id), username: me.name } : null;
    }

    const [user] = await this.#query('SELECT id, name, parent_staff_id FROM users WHERE name ILIKE :name LIMIT 1', { name });
    if (user) {
      const visible = user.parent_staff_id == null ? this.#isOwner(actor) : staffIds.includes(Number(user.parent_staff_id));
      if (!visible) throw notInDownline();
      return { type: 'USER', id: Number(user.id), username: user.name };
    }

    const [staff] = await this.#query('SELECT id, name FROM staff WHERE name ILIKE :name LIMIT 1', { name });
    if (staff) {
      if (!staffIds.includes(Number(staff.id))) throw notInDownline();
      return { type: 'STAFF', id: Number(staff.id), username: staff.name };
    }

    return null; // zip: "User not found" — khaali list
  }

  // ══════════════════════════════════════════════════════════════════════
  //  User Authentication
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Zip `users/all-details` ki tarah sirf DIRECT children (staff + players), naam se sorted.
   * 2FA (authenticator app) on ho to "google authentication", warna "no authentication".
   */
  async authList({ actor, limit, offset }) {
    const replacements = {
      me: actor.id,
      withDirect: this.#isOwner(actor),
      executiveLevel: STAFF_LEVELS.EXECUTIVE,
      limit,
      offset,
    };
    const childrenSql = `
      SELECT s.name AS username, s.id AS account_id, 'staff' AS account_type, COALESCE(s.two_fa_enabled, false) AS two_fa
        FROM staff s JOIN roles r ON r.id = s.role_id
       WHERE s.parent_id = :me AND r.level < :executiveLevel
      UNION ALL
      SELECT u.name, u.id, 'user',
             COALESCE(u.two_fa_status, false) OR EXISTS (SELECT 1 FROM user_2fa f WHERE f.uid = u.id::text AND f.is_enabled)
        FROM users u
       WHERE u.parent_staff_id = :me OR (:withDirect AND u.parent_staff_id IS NULL)`;

    const [rows, [{ total }]] = await Promise.all([
      this.#query(`SELECT * FROM (${childrenSql}) a ORDER BY LOWER(a.username), a.account_id LIMIT :limit OFFSET :offset`, replacements),
      this.#query(`SELECT COUNT(*)::int AS total FROM (${childrenSql}) a`, replacements),
    ]);

    return {
      rows: rows.map((r) => ({
        id: `${r.account_type}-${r.account_id}`,
        username: r.username,
        authentication: r.two_fa ? 'google authentication' : 'no authentication',
      })),
      total,
    };
  }

  // ══════════════════════════════════════════════════════════════════════
  //  Fraud Report
  // ══════════════════════════════════════════════════════════════════════

  /** Zip me `/admin/reports/fraud` ka backend tha hi nahi (404). Hamare paas bhi fraud ka koi source nahi. */
  async fraud() {
    return emptyPage;
  }

  // ══════════════════════════════════════════════════════════════════════
  //  User Register Detail
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Tree ke players (zip `getUserRegisterDetail`). username = staff → uska poora downline,
   * player → sirf wahi. type 3 = last login se sort, baaki created date se.
   */
  async registerDetail({ actor, username, type, limit, offset }) {
    const scope = await this.#registerScope(actor, username);
    if (!scope) return emptyPage;

    const replacements = { ...scope, limit, offset };
    const where = `(u.parent_staff_id IN (:staffIds) OR (:withDirect AND u.parent_staff_id IS NULL))
      AND (CAST(:userId AS bigint) IS NULL OR u.id = :userId)`;
    const order = type === '3' ? 'u.last_login_at DESC NULLS LAST' : 'u.created DESC NULLS LAST';

    const [rows, [{ total }]] = await Promise.all([
      this.#query(
        `SELECT u.id, u.name, u.created, u.last_login_at, u.referalcode, s.name AS agent_name, c.sports_pts,
                d.first_dep, d.last_dep
           FROM users u
           LEFT JOIN staff s ON s.id = u.parent_staff_id
           LEFT JOIN credits c ON c.uid = u.id
           LEFT JOIN LATERAL (
             SELECT MIN(t.created_at) AS first_dep, MAX(t.created_at) AS last_dep
               FROM staff_transfers t WHERE t.to_type = 'user' AND t.to_id = u.id) d ON true
          WHERE ${where}
          ORDER BY ${order}, u.id DESC
          LIMIT :limit OFFSET :offset`,
        replacements
      ),
      this.#query(`SELECT COUNT(*)::int AS total FROM users u WHERE ${where}`, replacements),
    ]);

    return {
      rows: rows.map((r) => ({
        id: String(r.id),
        username: r.name,
        agentName: r.agent_name || '',
        createdDate: fmtDate(r.created),
        lastLogin: fmtDate(r.last_login_at),
        firstDepositDate: fmtDate(r.first_dep),
        lastDepositDate: fmtDate(r.last_dep),
        deposit: r.first_dep ? 'Deposit' : 'No Deposit',
        sportsBalance: round2(r.sports_pts),
        referralCode: r.referalcode || '',
      })),
      total,
    };
  }

  /** Register Detail ka scope: kin staff ke players, aur ek player chuna ho to uska id. */
  async #registerScope(actor, username) {
    const staffIds = await this.#treeStaffIds(actor);
    const base = { staffIds: staffIds.length ? staffIds : [0], withDirect: this.#isOwner(actor), userId: null };
    const name = String(username || '').trim();
    if (!name || name.toLowerCase() === 'all') return base;

    const [staff] = await this.#query('SELECT id FROM staff WHERE name ILIKE :name LIMIT 1', { name });
    if (staff) {
      if (!staffIds.includes(Number(staff.id))) return null;
      const below = (await descendantIds(this.models, staff.id, { logger: this.logger })).map(Number);
      return { staffIds: below.length ? below : [0], withDirect: false, userId: null };
    }

    const [user] = await this.#query('SELECT id FROM users WHERE name ILIKE :name LIMIT 1', { name });
    return user ? { ...base, userId: Number(user.id) } : null;
  }

  // ══════════════════════════════════════════════════════════════════════
  //  Helpers
  // ══════════════════════════════════════════════════════════════════════

  #isOwner(actor) {
    return Number(actor.level) === STAFF_LEVELS.SUPER_ADMIN;
  }

  /** Login wale ke neeche ke saare staff ids (khud bhi). Owner = poori site. */
  async #treeStaffIds(actor) {
    const ids = await manageableStaffIds(this.models, actor.id, { logger: this.logger, level: actor.level });
    return ids.map(Number);
  }
}

module.exports = { UserReportsService, fmtDate, normalizeIp };
