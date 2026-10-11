import { Link } from 'react-router-dom';
/* `ot` in bc.game/bc.game/assets/Enter-MsmOuq5R.js — the row above every home panel.
 *
 *   <div class="mt-3 flex items-center sm:mt-6 h-8">
 *     <h2 class="flex items-center text-base font-extrabold text-primary">{title}</h2>
 *     <a class="button ml-auto … ">All</a>   (only when a link is given)
 *     {controller}                            (only when showController !== false)
 *   </div>
 *
 * The title is arbitrary children because callers put more than text in it — Recent Big
 * Wins nests its live dot and tab row inside the same h2.
 *
 * `all_class` on the original is a per-caller override slot; the site's own value for the
 * All button is `bg-[#fff] dark:bg-layer5`, and this build is dark-only (there is no `dark`
 * class on the root), so only the layer5 half is reproduced.
 *
 * The controller is passed in rather than rendered here: it has to drive a specific
 * scroll container, and only the caller owns that ref.
 */
export default function SectionHeader({ children, href, allClass = '', controller, className = '' }) {
  return (
    <div className={`mt-3 flex h-8 items-center sm:mt-6 ${className}`}>
      <h2 className="flex items-center text-base font-extrabold text-primary">{children}</h2>

      {href ? (
        /* A ROUTER LINK, NOT A BARE ANCHOR, and that is the original's own component rather than a
           convenience: `ot` renders the All pill as `rh` — the router's `<A>` — which emits a real
           `<a href>` and then intercepts the click (`preventDefault` plus a queued `navigate()`),
           which is exactly what React Router's `<Link>` does. It was an `<a>` here for as long as
           every destination fell through to the catch-all, where a full page reload and a
           client-side navigation are indistinguishable. They are not indistinguishable now that
           `/section/*`, `/gamelist/*` and `/tagname/*` are real pages: a reload re-boots the app,
           drops the session and re-fetches every asset. */
        <Link
          to={href}
          className={`button ml-auto flex h-8 items-center gap-1 rounded-lg bg-layer5 px-2 font-extrabold ${allClass}`}
        >
          All
        </Link>
      ) : (
        /* `Hc` — an empty `ml-auto` span. It is not decorative: it is what pushes the
           controller to the right edge when there is no All button. */
        <span className="ml-auto" />
      )}

      {controller}
    </div>
  );
}
