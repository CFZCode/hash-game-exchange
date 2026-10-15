'use strict';

const { z } = require('@ibitplay/common');

const paging = {
  limit: z.coerce.number().int().min(1).max(200).default(25),
  offset: z.coerce.number().int().min(0).default(0),
};

const day = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD');

/** GET /home — koi query nahi. */
const home = { query: z.object({}).strict() };

/** GET /login-history, /password-history — username khaali = apna account. */
const history = {
  query: z
    .object({
      ...paging,
      username: z.string().trim().max(120).optional(),
      fromDate: day.optional(),
      toDate: day.optional(),
    })
    .strict(),
};

/** GET /ip-detail?ip= — zip jaisa IPv4 / IPv6 shape check. */
const ipDetail = {
  query: z
    .object({
      ip: z.string().trim().regex(/^([0-9]{1,3}\.){3}[0-9]{1,3}$|^[0-9a-fA-F:]+$/, 'Valid ip query param is required'),
    })
    .strict(),
};

/** GET /auth-list, /fraud */
const list = { query: z.object(paging).strict() };

/** GET /register-detail — type: 1 = All, 2 = Created Date, 3 = Last Login Date */
const registerDetail = {
  query: z
    .object({
      ...paging,
      username: z.string().trim().max(120).optional(),
      type: z.enum(['1', '2', '3']).default('1'),
    })
    .strict(),
};

module.exports = { home, history, ipDetail, list, registerDetail };
