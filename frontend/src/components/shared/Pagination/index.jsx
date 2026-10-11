import React from 'react';
import Loading from '../Loading';

/* The site's pager — a prev button, an editable current-page field, "of", the total, a next
 * button. The markup and class names are the live page's own; the styling is index-DxOqNczA
 * .css's `.pagination*` block, translated into src/index.css (see the note there).
 *
 * ONE ARROW PATH, drawn twice. The original ships a single left-chevron and rotates it for
 * next — `.pagination-next .pagination-arrow { transform: rotate(180deg) }` — rather than
 * carrying a mirrored copy. That is also how it gets RTL right, with `:dir(rtl)` swapping the
 * two rotations. Kept as-is; a second path would break that.
 *
 * The page number is an INPUT, not a label: you can type a page and press Enter. `size="2"`
 * and `.pagination-current`'s `min-width: 2rem` are what keep it the size of a two-digit box.
 * Both numbers are zero-padded to two digits, which is the live page's own "01 of 02".
 */
const ArrowIcon = () => (
  <svg viewBox="0 0 32 32" className="icon pagination-arrow size-4 fill-secondary">
    <path d="M19.6912 5.6L9.2912 16L19.6912 26.4L22.7088 23.3824L15.3264 16L22.7088 8.6176L19.6912 5.6Z" />
  </svg>
);

const pad = (n) => String(n).padStart(2, '0');

/* `align` exists because the weekly raffle's winner list puts the same pager flush with its
   panel's left padding, where every other call site centres it. Centre stays the default so
   nothing else has to change. `end` came later, for the referral tables, whose chunks write
   `class="flex justify-end p-3"` on this component. */
export default function Pagination({ page, pages, onChange, align = 'center', loading = false }) {
  /* The field is free text while it is being typed — committing on every keystroke would jump
     the grid to page 0 the moment you clear it to type "12". It commits on Enter and on blur,
     and snaps back to the real page if what was typed is not a page.

     The draft is stamped with the page it was typed against, and any draft older than the
     current page is ignored. That is what makes the arrows update the field without an effect
     syncing the two: `useEffect(() => setDraft(...))` is the obvious way to write this and is
     exactly what `react-hooks/set-state-in-effect` forbids. */
  const [draft, setDraft] = React.useState({ page, text: pad(page) });
  const text = draft.page === page ? draft.text : pad(page);

  if (pages <= 1) return null;

  const go = (next) => {
    const clamped = Math.min(pages, Math.max(1, next));
    setDraft({ page: clamped, text: pad(clamped) });
    if (clamped !== page) onChange(clamped);
  };

  const commit = () => {
    const parsed = parseInt(text, 10);
    if (Number.isNaN(parsed)) setDraft({ page, text: pad(page) });
    else go(parsed);
  };

  /* `items-center justify-center` spelled out where the capture has the `center` helper —
     computed identically, but `center` is UNLAYERED and its own `justify-content: center`
     beat the `justify-start` utility outright, so `align` silently did nothing. Same trap
     the weekly raffle's hero and toolbar hit; see the note in WeeklyRaffle.css. */
  return (
    <div
      className={`f-ull mt-4 flex items-center ${
        align === 'start' ? 'justify-start' : align === 'end' ? 'justify-end' : 'justify-center'
      }`}
    >
      <div className="flex items-center gap-x-[0.15rem]">
        {/* `.pagination-button .loading { width: 1rem; height: 1rem }` is in the original's
            stylesheet, so the arrow really is REPLACED by a 16px spinner while the page it asked
            for is in flight — a rule that exists for no other reason. Both buttons take it and
            both disable, which is what stops a second click queueing another page.

            `loading` is the call site's, because only the call site knows whether the list under
            it re-reads: the weekly raffle's winners do, the referral code table pages client-side
            over one response and passes nothing. */}
        <button
          type="button"
          className="button button-m pagination-button pagination-prev"
          disabled={loading || page <= 1}
          aria-label="Previous page"
          onClick={() => go(page - 1)}
        >
          {loading ? <Loading /> : <ArrowIcon />}
        </button>

        <div className="pagination">
          <input
            size="2"
            className="pagination-current"
            value={text}
            aria-label="Page"
            onChange={(e) => setDraft({ page, text: e.target.value })}
            onBlur={commit}
            onKeyDown={(e) => e.key === 'Enter' && commit()}
          />
          <span className="text-tertiary">of</span>
          <div className="flex h-8 min-w-8 items-center justify-center p-2">
            <span>{pad(pages)}</span>
          </div>
        </div>

        <button
          type="button"
          className="button button-m pagination-button pagination-next"
          disabled={loading || page >= pages}
          aria-label="Next page"
          onClick={() => go(page + 1)}
        >
          {loading ? <Loading /> : <ArrowIcon />}
        </button>
      </div>
    </div>
  );
}
