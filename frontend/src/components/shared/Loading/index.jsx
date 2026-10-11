/* The site's spinner — `sa` in index-BsFv7ByC.js, over `.loading` in index-DxOqNczA.css.
 *
 * It is the one glyph in this project that is NOT on the 32-unit grid: Tailwind's own
 * `animate-spin` circle at 24, a quarter-opacity ring under a three-quarter-opacity arc, both
 * on `currentColor`. `.loading` supplies the 20px box and the rotation; the colour branch below
 * is the component's own — brand green UNLESS the call site has named a `text-` or `fill-` class
 * of its own, which is why it reads the string rather than taking a prop.
 *
 * Lifted out of `layouts/MainLayout/Header/AfterLogin/icons.jsx` when the quest page became its
 * second call site, under the rule `Select` and `GameTile` moved under. Only the spinner moved,
 * not the whole icon set: the rest of that file is the account dropdown's own drawings, while
 * this one belongs to the main bundle and any page can want it. `IconLoading` there is now a
 * re-export, so the currency dropdown's call site is unchanged.
 */
export default function Loading({ className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      className={`loading ${/text-|fill-/.test(className) ? '' : 'text-brand'} ${className}`}
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
