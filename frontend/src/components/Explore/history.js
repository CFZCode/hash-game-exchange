/* `se()` in index-DrTwTnbT.js and the reader beside it.
 *
 * `localStorage["bc_search_history"]` is a comma-joined list, newest first, capped at 10 —
 * the same key and the same shape as the live site, so a history written by one is readable
 * by the other.
 *
 * Split out of SearchHistory.jsx only because a file that exports a component may not also
 * export plain functions without breaking Fast Refresh.
 */

const KEY = 'bc_search_history';
const LIMIT = 10;

export function readHistory() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? raw.split(',').filter(Boolean) : [];
  } catch {
    /* Safari in private mode throws on localStorage. The panel degrades to Suggested only. */
    return [];
  }
}

export function writeHistory(list) {
  try {
    localStorage.setItem(KEY, list.join(','));
  } catch {
    /* ignored, as above */
  }
}

/* Newest first, existing duplicates dropped, then trimmed back to 10. The original splices a
   single entry off the tail rather than slicing, which only holds while the list grows one at
   a time; `slice` is the same thing without that assumption. */
export function remember(query) {
  const list = [query, ...readHistory().filter((item) => item !== query)].slice(0, LIMIT);
  writeHistory(list);
  return list;
}
