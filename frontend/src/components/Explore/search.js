import { getCasinoPage, getLiveProviders } from '../../services/catalog';
import { getOriginals } from '../../services/originals';
import { getSportsTree } from '../../services/exchange/feed';
import { USE_FIXTURES } from '../../services/client';
import { providerDisplayName } from '../../data/providers';
import { matchPath, sportIconOf } from '../../pages/Exchange/model';
import { PROVIDERS, searchGames } from './catalogue';

/* What the header's search overlay asks, one read per tab. Each answers `{ items, total }`, so a
   tab's count badge and its list come from the same read.

     casino / live   the platform catalogue's own `search` (services/catalog.js), paged
     originals       the in-house list, matched by name
     providers       the platform's provider list, matched by name
     sports/esports  the exchange's sports tree (one read, kept for a minute), matched on the
                     match, its competition and its sport */

export const MIN_QUERY = 3;
export const PAGE_SIZE = 24;

const has = (text, needle) => String(text ?? '').toLowerCase().includes(needle);

export function searchCasino(set, query, page = 1) {
  const needle = query.trim();
  if (USE_FIXTURES) {
    const found = searchGames(needle).filter((game) => set !== 'live' || game.category.includes('Live'));
    return Promise.resolve({ items: found.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total: found.length });
  }
  return Promise.resolve(getCasinoPage(set, { search: needle, page, limit: PAGE_SIZE })).then((answer) => ({
    items: answer?.games ?? [],
    total: answer?.total ?? 0,
  }));
}

export function searchOriginals(query) {
  const needle = query.trim().toLowerCase();
  return Promise.resolve(getOriginals()).then((games) => {
    const items = (games ?? []).filter((game) => has(game.name, needle));
    return { items, total: items.length };
  });
}

export function searchProviders(query) {
  const needle = query.trim().toLowerCase();
  return Promise.resolve(USE_FIXTURES ? PROVIDERS : getLiveProviders()).then((names) => {
    const items = (names ?? []).filter((name) => has(name, needle) || has(providerDisplayName(name), needle));
    return { items, total: items.length };
  });
}

/* The tree is the same for every keystroke: read it once and keep it for a minute. */
const TREE_TTL_MS = 60000;
let tree = null;
let treeAt = 0;

function readTree() {
  if (tree && Date.now() - treeAt < TREE_TTL_MS) return tree;
  treeAt = Date.now();
  tree = getSportsTree().catch(() => {
    tree = null;
    return { sports: [], racing: [] };
  });
  return tree;
}

const list = (value) => (Array.isArray(value) ? value : []);
const isEsport = (sport) =>
  sportIconOf(sport.etid, sport.name) === 'esports' || /e-?sport|e-?game|virtual/i.test(String(sport.name ?? ''));

function flatten(data) {
  const rows = [];
  for (const sport of list(data?.sports)) {
    const esport = isEsport(sport);
    for (const comp of list(sport.children)) {
      for (const match of list(comp.children)) {
        if (match?.gmid == null) continue;
        rows.push({ esport, sport: sport.name, sid: match.etid ?? sport.etid, gmid: match.gmid, name: match.name, league: comp.name });
      }
    }
  }
  for (const sport of list(data?.racing)) {
    for (const race of list(sport.children)) {
      if (race?.gmid == null) continue;
      rows.push({ esport: false, sport: sport.name, sid: race.etid ?? sport.etid, gmid: race.gmid, name: race.name, league: '' });
    }
  }
  return rows;
}

/* `{ sports, esports }`, each `{ items, total }`. A match row carries its page (`to`). */
export function searchSports(query) {
  const needle = query.trim().toLowerCase();
  return Promise.resolve(readTree()).then((data) => {
    const seen = new Set();
    const found = flatten(data)
      .filter((row) => has(row.name, needle) || has(row.league, needle) || has(row.sport, needle))
      .filter((row) => {
        const key = `${row.sid}:${row.gmid}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((row) => ({ ...row, key: `${row.sid}:${row.gmid}`, to: matchPath(row.sid, row.gmid), icon: sportIconOf(row.sid, row.sport) }));
    const sports = found.filter((row) => !row.esport);
    const esports = found.filter((row) => row.esport);
    return { sports: { items: sports, total: sports.length }, esports: { items: esports, total: esports.length } };
  });
}
