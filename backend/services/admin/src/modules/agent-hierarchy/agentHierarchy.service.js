'use strict';

const { QueryTypes } = require('sequelize');

const { manageableStaffIds } = require('../staff-directory/staffDirectory.service');

const MAX_UP = 20;

/**
 * Agent hierarchy — zip `PercentageHierarchyPage` jaisa tree, apne setup ka:
 * staff (`staff.parent_id`) apne role / level ke saath. Percentage nahi — har node pe uske
 * direct players (`users.parent_staff_id`) ki ginti.
 *   depth < 0  upline (parent, grandparent …)   depth 0  main   depth > 0  downline
 */
class AgentHierarchyService {
  constructor({ models, logger }) {
    this.models = models;
    this.logger = logger;
  }

  get sequelize() {
    return this.models.Staff.sequelize;
  }

  async #rows(ids) {
    if (!ids.length) return [];
    return this.sequelize.query(
      `SELECT s.id, s.name, s.parent_id, s.status, r.name AS role, r.level,
              (SELECT COUNT(*)::int FROM users u WHERE u.parent_staff_id = s.id) AS users
         FROM staff s LEFT JOIN roles r ON r.id = s.role_id
        WHERE s.id IN (:ids)`,
      { replacements: { ids }, type: QueryTypes.SELECT }
    );
  }

  async tree({ actor }) {
    // Upline: parent_id upar tak.
    const up = [];
    let [me] = await this.#rows([actor.id]);
    for (let cur = me, i = 1; cur?.parent_id && i <= MAX_UP; i++) {
      const [parent] = await this.#rows([cur.parent_id]);
      if (!parent) break;
      up.push({ ...parent, depth: -i });
      cur = parent;
    }

    // Downline: jo staff ye dekh / sambhal sakta hai (Super Admin = sab).
    const ids = (await manageableStaffIds(this.models, actor.id, { logger: this.logger, level: actor.level })).map(Number);
    const down = await this.#rows(ids.filter((id) => id !== Number(actor.id)));

    // Depth = main se kitni seedhi.
    const all = [me, ...down].filter(Boolean);
    const byId = new Map(all.map((n) => [Number(n.id), n]));
    const depthOf = (n, seen = new Set()) => {
      if (Number(n.id) === Number(actor.id)) return 0;
      const parent = byId.get(Number(n.parent_id));
      if (!parent || seen.has(n.id)) return 1;
      seen.add(n.id);
      return depthOf(parent, seen) + 1;
    };

    const shape = (n, depth) => ({
      id: String(n.id),
      name: n.name ?? `#${n.id}`,
      role: n.role ?? '—',
      level: n.level ?? null,
      parentId: n.parent_id != null ? String(n.parent_id) : null,
      status: n.status ?? null,
      users: n.users ?? 0,
      depth,
    });

    return [
      ...up.map((n) => shape(n, n.depth)),
      ...(me ? [shape(me, 0)] : []),
      ...down.map((n) => shape(n, depthOf(n))),
    ];
  }
}

module.exports = { AgentHierarchyService };
