'use strict';

const { z } = require('@ibitplay/common');

const id = z.coerce.number().int().positive();

/** Zip ka `alpha_num` — sirf a-z, A-Z, 0-9. */
const username = z.string().regex(/^[a-zA-Z0-9]+$/, 'The User Name field may only contain alpha-numeric characters');

/** GET /check-username?username= */
const checkUsername = {
  query: z.object({ username: z.string().trim().min(1).max(60) }).strict(),
};

/**
 * POST /create — zip ka Create Account form (users/InsertUser.jsx).
 * userType: 'USER' ya staff ka level (2 Admin … 6 Agent). Credit Amount khali = 0.
 */
const createAccount = {
  body: z
    .object({
      username: username.min(4, 'The User Name field must be at least 4 characters').max(60),
      fullname: z.string().trim().max(120).optional(),
      password: z.string().min(8).max(200),
      city: z.string().trim().max(120).optional(),
      phone: z.string().trim().regex(/^\d*$/, 'The Mobile Number field may only contain numeric characters').max(15).optional(),
      creditAmount: z.string().trim().max(20).optional(),
      userType: z.union([z.literal('USER'), id]), // 'USER' ya staff level 2..6
      percentage: z.string().trim().max(10).optional(),
      remark: z.string().trim().max(500).optional(),
      transactionPassword: z.string().max(200).optional(),
    })
    .strict(),
};

/** Multi Login — zip ke privilege keys (utils/permissions.js), true/false. */
const privileges = z.record(z.string().max(40), z.boolean());

const createExecutive = {
  body: z
    .object({
      username: z.string().trim().min(4).max(100),
      full_name: z.string().trim().min(4).max(120),
      password: z.string().min(1).max(200),
      transactionPassword: z.string().max(200).optional(),
      permissions: privileges,
    })
    .strict(),
};

const updateExecutive = {
  params: z.object({ executiveId: id }),
  body: z.object({ permissions: privileges }).strict(),
};

// Body kuch nahi aata (DELETE) — strict khali object.
const executiveParam = { params: z.object({ executiveId: id }), body: z.object({}).strict() };

const executiveActive = {
  params: z.object({ executiveId: id }),
  body: z.object({ active: z.boolean().optional() }).strict(),
};

const executivePassword = {
  params: z.object({ executiveId: id }),
  body: z.object({ password: z.string().min(1).max(200) }).strict(),
};

/** Assign Agent — "User Creation" CSV: From date, To = From + 7 din. */
const userCreationCsv = {
  query: z
    .object({
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
    .strict(),
};

// ── System Tracker ────────────────────────────────────────────────────

const trackerSearch = { query: z.object({ q: z.string().trim().max(100).optional() }).strict() };
const trackerAccount = { params: z.object({ idOrUsername: z.string().trim().min(1).max(100) }) };
const watchdogList = { query: z.object({ all: z.enum(['0', '1']).optional() }).strict() };
const watchdogAck = { params: z.object({ id }), body: z.object({}).strict() };

module.exports = {
  checkUsername,
  createAccount,
  createExecutive,
  updateExecutive,
  executiveParam,
  executiveActive,
  executivePassword,
  userCreationCsv,
  trackerSearch,
  trackerAccount,
  watchdogList,
  watchdogAck,
};
