'use strict';

const { z, VIP_LADDERS } = require('@ibitplay/common');

/** Every card any ladder uses (unranked, wood, bronze … diamond, brownz). */
const CARDS = [...new Set(Object.values(VIP_LADDERS).flatMap((l) => [l.unranked.card, ...l.levels.map((b) => b.card)]))];
const card = z.object({ card: z.enum(CARDS) }).strict();

module.exports = {
  CARDS,
  empty: { query: z.object({}).strict() },
  rename: {
    params: z.object({ level: z.coerce.number().int().min(0).max(200) }).strict(),
    body: z.object({ name: z.string().trim().min(1).max(40) }).strict(),
  },
  badge: { params: card, body: z.object({}).strict() },
  byCard: { params: card },
  image: { params: card, query: z.object({ v: z.string().max(64).optional() }).strict() },
};
