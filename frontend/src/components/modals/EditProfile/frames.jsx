/* The avatar-frame grid's catalogue and its two glyphs.
 *
 * ── WHAT IS THE ORIGINAL'S AND WHAT IS NOT ────────────────────────────────────────────────────
 *
 * RECOVERED from `Profile-D32vXKY5.js`: the display ORDER, which is `Y` with `Oe` removed —
 * `[0, 9, 6, 7, 1, 2, 3, 8, 4, 5]`, exactly the ten cells the live page draws; the cell, badge
 * and "Not used" templates, verbatim; the padlock, which is that chunk's own `be`; and the rule
 * that id 0 is the "Not used" cell rather than a ring (`<Show when={!s().id}>`).
 *
 * NOT RECOVERED, and this is the honest part: **the ring artwork.** The original draws each ring
 * with a lazily-registered `Frame` component — `T3("Frame")`, keyed on the frame id — which is in
 * no chunk the mirror saved, and there is not a single frame image file anywhere in it. The nine
 * rings below are therefore APPROXIMATIONS: concentric strokes in the colours the live page
 * shows, drawn here rather than fetched. They are the one piece of invented artwork in this
 * project and are isolated in this file so they are easy to replace the day the real component or
 * its assets can be had.
 *
 * NOT AVAILABLE EITHER: which frames an account owns. `userAvatarFrameList` is a per-account
 * field on `/api/account/get/`, its store default is `[]`, and the mirror's capture of that route
 * is logged-out (`null`). The `/account/*` family answers 403 on hash.game. So every ring renders
 * LOCKED, which is also what a fresh account sees — and it is the truthful state here for a
 * second reason: **this platform has no frame concept at all.** `avatar` is a string up to 500
 * characters; there is no frame table, no unlock route, and nothing on `PUT /user/profile` that
 * would accept a choice. `docs/settings.md` records that.
 */

/* `be` in that chunk — the padlock on every locked cell. */
export const IconFrameLock = (props) => (
  <svg viewBox="0 0 32 32" {...props}>
    <path d="M23.2576 13.7203H22.1016V8.67326C22.0975 5.84024 19.8023 3.54504 16.9701 3.54102H15.1613C12.3283 3.54504 10.0331 5.84024 10.029 8.67246V13.7195H8.72347C7.18476 13.7307 5.94189 14.98 5.94189 16.5204V25.661C5.94189 27.2077 7.19601 28.4618 8.74276 28.4618H23.2568C24.8035 28.4618 26.0577 27.2077 26.0577 25.661V16.5204C26.0577 14.9736 24.8035 13.7195 23.2568 13.7195L23.2576 13.7203ZM17.1397 21.5023C17.0947 22.0602 16.6309 22.4959 16.0657 22.4959C15.5005 22.4959 15.0367 22.0602 14.9917 21.5063V19.6548C15.0367 19.0969 15.5005 18.6612 16.0657 18.6612C16.6309 18.6612 17.0947 19.0969 17.1397 19.6508V19.6548V21.5023Z M19.8168 13.7203H12.3146V8.67326C12.3186 7.10239 13.5904 5.83059 15.1613 5.82657H16.9701C18.541 5.83059 19.8128 7.10239 19.8168 8.67326V13.7203Z" />
  </svg>
);

/**
 * One ring. APPROXIMATED — see the note at the head of this file.
 *
 * Two concentric strokes rather than one, because every ring on the live page reads as a band
 * with a lighter inner edge; the two "Crest" frames add four gems at the diagonals, which is the
 * one structural difference visible between the plain rings and the ornate pair.
 */
export function FrameRing({ frame, className = '' }) {
  if (!frame?.ring) return null;
  const { ring, accent, gems } = frame;
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <circle cx="50" cy="50" r="45" fill="none" stroke={ring} strokeWidth="4" />
      <circle cx="50" cy="50" r="40" fill="none" stroke={accent ?? ring} strokeWidth="1.5" opacity="0.7" />
      {gems
        ? [
            [50, 5],
            [95, 50],
            [50, 95],
            [5, 50],
          ].map(([cx, cy]) => (
            <rect
              key={`${cx}-${cy}`}
              x={cx - 4}
              y={cy - 4}
              width="8"
              height="8"
              fill={accent ?? ring}
              transform={`rotate(45 ${cx} ${cy})`}
            />
          ))
        : null}
    </svg>
  );
}
