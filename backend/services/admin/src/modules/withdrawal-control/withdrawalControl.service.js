'use strict';

const { Op, QueryTypes } = require('sequelize');
const { AppError, entitlements, money, withdrawalCap, withdrawalCapFigures, withdrawalDailyLimit } = require('@ibitplay/common');

const { assertTransactionPassword } = require('../staff-auth/transactionPassword');

const onlyOwner = () => new AppError('Only the Super Admin can manage withdrawal controls', 403, 'WITHDRAWAL_CONTROL_OWNER_ONLY');

const escapeLike = (v) => String(v).replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * Admin → Users → Financial → Withdrawal — reference admin (admin-structure.zip →
 * siteconfig/routes/withdrawalControlRoutes.js) jaisa:
 *
 *   Global withdrawals ON / OFF   `withdrawal_control.withdrawals_enabled` → withdrawBlock
 *   Withdrawal limit              owner panel → Features & plan → Withdrawals (read-only yahan)
 *   Wagering bonus                same
 *   Per-user withdrawal lock      list yahan; lock/unlock purane `POST admin/locks` se
 *
 * Limit / wagering bonus sirf owner panel badalta hai (signed document ka `withdrawalCap`);
 * `withdrawal_control` ke purane limit columns ab padhe nahi jaate. Global switch badalna sirf
 * owner (Super Admin), transaction password ke saath.
 */
class WithdrawalControlService {
  constructor({ models, db, logger }) {
    this.models = models;
    this.db = db;
    this.logger = logger;
    this.figures = withdrawalCapFigures.createCapFigures({ db: { sequelize: models.Staff.sequelize } });
  }

  get sequelize() {
    return this.models.Staff.sequelize;
  }

  /** Limit settings in force — hamesha owner panel ki. */
  async #capInForce() {
    let plan = {};
    try {
      plan = (await entitlements.getEntitlements()) ?? {};
    } catch (error) {
      this.logger?.warn({ err: error }, 'entitlements unavailable — deposit cap defaults');
    }
    return {
      ...withdrawalCap.cleanWithdrawalCap(plan.withdrawalCap ?? {}),
      daily: withdrawalDailyLimit.cleanWithdrawalDailyLimit(plan.withdrawalDailyLimit),
      source: 'owner',
    };
  }

  /** Summary — upar ke teen card + direct users / locked ki ginti. */
  async read() {
    const [[row], cap, [counts]] = await Promise.all([
      this.sequelize.query(
        `SELECT w.withdrawals_enabled, w.updated_at, w.updated_by, s.name AS updated_by_name
           FROM withdrawal_control w LEFT JOIN staff s ON s.id = w.updated_by
          WHERE w.id = 1`,
        { type: QueryTypes.SELECT }
      ),
      this.#capInForce(),
      this.sequelize.query(
        `SELECT COUNT(*)::int AS direct_users,
                COUNT(*) FILTER (WHERE withdraw_locked IS TRUE)::int AS locked_direct_users
           FROM users WHERE parent_staff_id IS NULL`,
        { type: QueryTypes.SELECT }
      ),
    ]);

    return {
      enabled: row ? row.withdrawals_enabled !== false : true,
      updatedAt: row?.updated_at ?? null,
      updatedBy: row?.updated_by != null ? { id: String(row.updated_by), name: row.updated_by_name ?? null } : null,
      limit: {
        enabled: cap.enabled,
        depositMultiplier: cap.depositMultiplier,
        wagerBonus: cap.wagerBonus,
        wagerMultiplier: cap.wagerMultiplier,
        source: cap.source,
      },
      // Owner's daily withdrawal limit per currency (rolling 24 hours); read-only here.
      dailyLimit: cap.daily,
      directUsers: counts?.direct_users ?? 0,
      lockedDirectUsers: counts?.locked_direct_users ?? 0,
    };
  }

  async #owner(actor, transactionPassword) {
    if (!actor.canIssueFunds) throw onlyOwner();
    await assertTransactionPassword(this.models, actor.id, transactionPassword, { required: true });
  }

  /** Global switch ON / OFF. */
  async setGlobal({ actor, enabled, transactionPassword }) {
    await this.#owner(actor, transactionPassword);

    await this.sequelize.query(
      `INSERT INTO withdrawal_control (id, withdrawals_enabled, updated_by, updated_at)
       VALUES (1, :enabled, :staffId, now())
       ON CONFLICT (id) DO UPDATE
         SET withdrawals_enabled = EXCLUDED.withdrawals_enabled, updated_by = EXCLUDED.updated_by, updated_at = now()`,
      { replacements: { enabled, staffId: actor.id } }
    );

    this.logger?.warn({ actorStaffId: actor.id, enabled }, `Global withdrawals switched ${enabled ? 'ON' : 'OFF'}`);
    return this.read();
  }

  /**
   * Per-user withdrawal lock ki list — DIRECT users (parent nahi), reference jaisa:
   * INR balance, Deposited, Wagered, Withdrawn / max (cap), Joined, lock.
   */
  async users({ search, status = 'all', limit = 20, offset = 0 }) {
    const where = { parent_staff_id: null };
    if (status === 'locked') where.withdraw_locked = true;
    if (search) {
      const term = `%${escapeLike(search.trim())}%`;
      where[Op.or] = [
        { name: { [Op.iLike]: term } },
        { email: { [Op.iLike]: term } },
        { phone: { [Op.iLike]: term } },
        ...(/^\d+$/.test(search.trim()) ? [{ id: Number(search.trim()) }] : []),
      ];
    }

    const [{ rows, count }, cap] = await Promise.all([
      this.models.Users.findAndCountAll({
        where,
        attributes: ['id', 'name', 'avatar', 'email', 'phone', 'country', 'created', 'withdraw_locked', 'system_locked'],
        order: [['id', 'DESC']],
        limit,
        offset,
        raw: true,
      }),
      this.#capInForce(),
    ]);

    const ids = rows.map((r) => r.id);
    const credits = ids.length ? await this.models.Credits.findAll({ where: { uid: ids }, attributes: ['uid', 'inr'], raw: true }) : [];
    const balance = new Map(credits.map((c) => [String(c.uid), money.fromStored(c.inr ?? '0')]));

    const out = await Promise.all(
      rows.map(async (u) => {
        const f = await this.figures.figures(u.id, 'INR');
        const c = withdrawalCap.computeCap({ currency: 'INR', ...f, settings: cap });
        return {
          id: String(u.id),
          name: u.name ?? null,
          avatar: u.avatar ?? null,
          email: u.email ?? null,
          phone: u.phone ?? null,
          country: u.country ?? null,
          created: u.created ?? null,
          inrBalance: balance.get(String(u.id)) ?? '0.00000000',
          withdrawLocked: Boolean(u.withdraw_locked),
          systemLocked: Boolean(u.system_locked),
          deposited: c.deposited,
          withdrawn: c.withdrawn,
          wagered: c.wagered,
          wagerBonus: c.unlockedByWager,
          // Limit OFF ho to max nahi (null = koi had nahi).
          maxWithdrawable: cap.enabled ? c.cap : null,
        };
      })
    );

    return { total: count, rows: out };
  }
}

module.exports = { WithdrawalControlService };
