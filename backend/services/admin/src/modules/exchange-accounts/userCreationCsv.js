'use strict';

const { Op } = require('sequelize');
const { AppError } = require('@ibitplay/common');

const { visibleStaffIds } = require('../staff-directory/staffDirectory.service');

/**
 * Assign Agent > "User Creation" — Download CSV.
 *
 * Zip me ye button abhi mock tha (sirf loader). Yahan asli CSV: From se To tak jo
 * players bane, login wale ke tree me. Window zip wali: To = From + 7 din, aaj se aage nahi,
 * aur From ek mahine se purana nahi.
 */

const RANGE_DAYS = 7;
const LOOKBACK_DAYS = 31;
const DAY_MS = 24 * 60 * 60 * 1000;

const COLUMNS = ['S.No.', 'User Name', 'Mobile Number', 'Parent', 'Created At'];

/** CSV ka ek cell — comma / quote / newline ho to quote me. */
const cell = (value) => {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

function assertWindow(from, to) {
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    throw new AppError('Select a valid date range', 400, 'EXCHANGE_CSV_RANGE');
  }
  if (end - start > RANGE_DAYS * DAY_MS) throw new AppError('The range may be at most 7 days', 400, 'EXCHANGE_CSV_RANGE');
  if (Date.now() - start > LOOKBACK_DAYS * DAY_MS) {
    throw new AppError('From Date may be at most one month back', 400, 'EXCHANGE_CSV_RANGE');
  }
  return { start, endExclusive: new Date(end.getTime() + DAY_MS) };
}

async function userCreationCsv({ models, logger }, { actor, from, to }) {
  const { start, endExclusive } = assertWindow(from, to);

  const staffIds = await visibleStaffIds(models, actor.id, { logger });
  // Owner ko direct users (koi parent nahi) bhi dikhte hain.
  const scope = actor.canIssueFunds
    ? { [Op.or]: [{ parent_staff_id: staffIds }, { parent_staff_id: null }] }
    : { parent_staff_id: staffIds };

  const users = await models.Users.findAll({
    where: { ...scope, created: { [Op.gte]: start, [Op.lt]: endExclusive } },
    attributes: ['id', 'name', 'phone', 'parent_staff_id', 'created'],
    order: [['created', 'ASC']],
    raw: true,
  });

  const parentIds = [...new Set(users.map((u) => u.parent_staff_id).filter(Boolean))];
  const parents = parentIds.length
    ? await models.Staff.findAll({ where: { id: parentIds }, attributes: ['id', 'name'], raw: true })
    : [];
  const parentName = new Map(parents.map((p) => [String(p.id), p.name]));

  const lines = [COLUMNS.join(',')];
  users.forEach((u, i) => {
    lines.push(
      [i + 1, u.name, u.phone ?? '', parentName.get(String(u.parent_staff_id)) ?? '', u.created ? new Date(u.created).toISOString() : '']
        .map(cell)
        .join(',')
    );
  });

  return { filename: `user-creation-${from}-to-${to}.csv`, csv: `${lines.join('\r\n')}\r\n`, count: users.length };
}

module.exports = { userCreationCsv, COLUMNS };
