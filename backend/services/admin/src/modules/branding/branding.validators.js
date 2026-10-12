'use strict';

const { z } = require('@ibitplay/common');

/** `<64 hex>.<png|webp|svg>` and nothing else: no path, no other extension, no case games. */
const assetParams = z.object({ file: z.string().regex(/^[0-9a-f]{64}\.(png|webp|svg)$/, 'not a branding image name') }).strict();

/** The reads take no query string at all. */
const emptyQuery = z.preprocess((v) => v ?? {}, z.object({}).strict());

module.exports = { assetParams, emptyQuery };
