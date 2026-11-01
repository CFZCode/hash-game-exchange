/**
 * A whitelabel copy's game catalogues, copied from the parent's database: the original games
 * (`og_games`, with the parent's on/off), Slotegrator's providers and games (`gis_providers_new`,
 * `gisgamesnew`). A copy plays on the parent's provider accounts (casino-service modules/wl-hub),
 * so the parent's catalogue IS the copy's — and a fresh copy only has the seed's handful.
 *
 * Every column but the serial `id`; a row whose unique key (game code, uuid, provider name)
 * the copy already has is kept as it is, so this can run again at any time.
 *
 * `parent` / `copy`: `{ query(sql, params) → rows }` (the setup worker's, or sync-catalogue.mjs's).
 */

export const CATALOGUES = Object.freeze([
  { table: 'og_games', columns: ['code', 'name', 'position', 'data', 'synced_at', 'enabled'], order: 'code' },
  { table: 'gis_providers_new', columns: ['name', 'created_at', 'enabled'], order: 'name' },
  {
    table: 'gisgamesnew',
    columns: [
      'uuid', 'name', 'provider', 'provider_id', 'type', 'image', 'technology', 'has_lobby', 'is_mobile', 'has_freespins',
      'freespin_valid_until_full_day', 'updated_at', 'label', 'parameters', 'tags', 'images', 'created_at', 'image3', 'aggregator',
    ],
    order: 'uuid',
  },
]);

const BATCH = 500;

export async function copyCatalogue(parent, copy, log = () => {}) {
  const counts = {};
  for (const { table, columns, order } of CATALOGUES) {
    const list = columns.join(', ');
    let added = 0;
    for (let offset = 0; ; offset += BATCH) {
      // Fixed table and column names from the list above; only the batch is a parameter.
      const rows = await parent.query(`SELECT ${list} FROM ${table} ORDER BY ${order} LIMIT ${BATCH} OFFSET ${offset}`);
      if (!rows.length) break;
      const inserted = await copy.query(
        `INSERT INTO ${table} (${list})
         SELECT ${list} FROM json_populate_recordset(NULL::${table}, $1::json)
         ON CONFLICT DO NOTHING RETURNING 1`,
        [JSON.stringify(rows)]
      );
      added += inserted.length;
      if (rows.length < BATCH) break;
    }
    counts[table] = added;
  }
  log(`catalogues from the parent: ${Object.entries(counts).map(([t, n]) => `${t} +${n}`).join(', ')}`);
  return counts;
}
