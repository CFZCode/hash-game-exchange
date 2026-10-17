'use strict';

const test = require('node:test');
const assert = require('node:assert');

const db = require('@ibitplay/db');
const { createLogger } = require('@ibitplay/common');

const { AgentHierarchyService } = require('../agentHierarchy.service');

/** Tree: upline negative depth, main 0, downline positive; users ki ginti; percentage nahi. */

const TEST_DB = process.env.TEST_DB_NAME || 'ibitplay_test';

test('agent hierarchy against a database', async (t) => {
  const logger = createLogger({ name: 'agent-hierarchy-test', level: 'silent' });
  let connection;
  try {
    connection = await db.connect({
      config: {
        DB_HOST: process.env.DB_HOST || '127.0.0.1',
        DB_PORT: Number(process.env.DB_PORT || 5432),
        DB_NAME: TEST_DB,
        DB_USER: process.env.DB_USER || 'postgres',
        DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
        DB_SCHEMA: 'public',
      },
      logger,
      service: 'admin-service',
    });
    await connection.ping();
  } catch (error) {
    t.skip(`No test database reachable (${error.message})`);
    return;
  }

  const { models, sequelize } = connection;
  const service = new AgentHierarchyService({ models, logger });

  const roleId = 8500 + (process.pid % 40);
  await sequelize.query(
    'INSERT INTO roles (id, name, level) VALUES (:id, :name, 5) ON CONFLICT (id) DO UPDATE SET level = 5',
    { replacements: { id: roleId, name: `ah-master-${roleId}` } }
  );
  const top = 975_000 + (process.pid % 1000);
  const mid = top + 1000;
  const low = top + 2000;
  const uid = 836_000_000 + (process.pid % 100_000);
  const cleanup = async () => {
    await models.Users.destroy({ where: { id: uid } });
    await models.Staff.destroy({ where: { id: [low, mid, top] } });
  };
  await cleanup();
  const staff = (id, parent) =>
    models.Staff.create({ id, name: `ah-${id}`, email: `ah-${id}@test.invalid`, password: 'x', role_id: roleId, parent_id: parent, status: 'active' });
  await staff(top, null);
  await staff(mid, top);
  await staff(low, mid);
  await models.Users.create({ id: uid, name: `ah-player-${uid}`, password: 'x', status: 'active', parent_staff_id: low });

  t.after(async () => {
    await cleanup();
    await connection.close();
  });

  await t.test('upline, me and downline with depths and user counts', async () => {
    const nodes = await service.tree({ actor: { id: mid, level: 5 } });
    const depth = Object.fromEntries(nodes.map((n) => [n.id, n.depth]));
    assert.equal(depth[String(top)], -1);
    assert.equal(depth[String(mid)], 0);
    assert.equal(depth[String(low)], 1);
    assert.equal(nodes.find((n) => n.id === String(low)).users, 1);
    assert.equal(nodes.find((n) => n.id === String(mid)).role, `ah-master-${roleId}`);
    assert.ok(nodes.every((n) => !('percentage' in n)));
  });
});
