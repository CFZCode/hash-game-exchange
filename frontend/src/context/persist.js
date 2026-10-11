/* The session's localStorage half — `nl` in index-BsFv7ByC.js, ported.
 *
 * The original persists FOUR stores through that one helper: `setting` (lang/theme/lite),
 * `account`, `system` (the currency catalogue) and `usdprice`. Only `account` matters here, and
 * it is written under that exact key:
 *
 *   function nl(t, e) {
 *     const n = Oy(JSON.stringify(t)).toString(36), r = localStorage, i = e.name;
 *     function s() {
 *       let l = r.getItem(i);
 *       l = l && l.indexOf(n) === -1 ? null : l;          // <- version gate
 *       if (!l) return null;
 *       try { return (e.deserialize || JSON.parse)(l) } catch (u) { return null }
 *     }
 *     const o = s(), [a, c] = Xt({ ...t, __version: n, ...(o ?? {}), _isStale: !0 });
 *     he(() => { const { _isStale, ...u } = a; r.setItem(i, JSON.stringify(u)) });
 *     return [a, c, o !== null]
 *   }
 *
 * TWO THINGS IN THERE ARE WORTH COPYING AND ONE IS NOT.
 *
 * Worth copying, first: `__version` is a hash OF THE DEFAULTS THEMSELVES, stored inside the
 * record, and a stored copy that does not contain it is thrown away. So editing the shape of the
 * defaults invalidates every browser's saved copy automatically — no version number to remember
 * to bump, and no stale record surviving a rename. (The hash here is not murmur; it is the
 * smallest thing with the same property, since nothing has to interoperate with the real site.)
 *
 * Worth copying, second: the stored value is merged OVER the defaults rather than replacing
 * them, so a field added to the defaults later appears for someone who already has a record.
 *
 * NOT worth copying: the original stores the WHOLE account object, because on the live site that
 * object is a real session that the server re-sends on every load. Here it is a fixture, and
 * storing it whole means editing `SIGNED_IN` in code does nothing until you clear your browser —
 * exactly the trap that kept this build unpersisted for so long. So `SessionProvider` stores a
 * SUBSET: the two things a visitor can actually change, and nothing that is fixture data.
 */

/* A 32-bit FNV-1a over the defaults' JSON, base36 — stands in for the original's murmur. Any
   stable hash works; what matters is that it changes when the shape does. */
function fingerprint(value) {
  const text = JSON.stringify(value);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/* Every access is wrapped: `localStorage` throws rather than returning null in a Safari private
   window and when a browser has site data switched off, and a header that cannot render is a
   worse outcome than a sign-in that does not survive a reload. */
export function createPersistedStore(name, defaults) {
  const version = fingerprint(defaults);

  const read = () => {
    try {
      const raw = localStorage.getItem(name);
      /* The original's own gate, and it is a substring test rather than a parse-then-compare:
         a record from a different shape is discarded before `JSON.parse` ever sees it. */
      if (!raw || raw.indexOf(version) === -1) return null;
      const stored = JSON.parse(raw);
      return { ...defaults, ...stored };
    } catch {
      return null;
    }
  };

  const write = (value) => {
    try {
      localStorage.setItem(name, JSON.stringify({ ...value, __version: version }));
    } catch {
      /* Storage full or unavailable. Nothing to do and nothing to say — the app is still
         correct, it just will not remember. */
    }
  };

  /* No `clear`. The original has none either — `nl` only ever writes, and a sign-out is a write
     of `login: false` rather than a delete. Reproduced, and it is also the less surprising of
     the two: a record that is always present and always current is easier to reason about in
     devtools than one that appears and disappears. */
  return { read, write, defaults };
}
