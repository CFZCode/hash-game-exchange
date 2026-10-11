import emptyArt from '../../../assets/empty.png';
import emptyArtLight from '../../../assets/empty_w.png';
import { useSettings } from '../../../context/settings';

/* The site's own empty state — `ks` in `index-BsFv7ByC.js`, verbatim:
 *
 *   <section class="py-10 text-center center flex-col">
 *     <img class="w-48 h-48" src={...}>
 *     <Show when={message}><div class="leading-5 mt-4">{message}</div></Show>
 *   </section>
 *
 * Five types, each a pair of images (dark, light): `empty`, `notfound`, `offline`, `privacy`,
 * `ban`. `ks` picks with `Ce.darken ? oh[type][0] : oh[type][1]`, i.e. the SECOND entry is the
 * light-theme file — the map is not in `ks` itself but assembled at bootstrap by
 * `eb({logo, empty, icons, communities})`.
 *
 * BOTH HALVES OF `empty` ARE LOCAL: `empty-6mO-ndW8.png` and `empty_w-CTX75UaH.png`, same 660x600,
 * under the plain names `empty.png` and `empty_w.png`. Only the dark one was fetched while this
 * build was dark-only, so the crocodile stayed dark-theme art on a white page — one component,
 * so fixing it here reaches every empty state at once: the referral tables, the quest tabs, the
 * Explore and casino grids, the wallet's transaction and rollover panes.
 *
 * The other four types are still dark-only (`notfound`, `offline`, `privacy`, `ban`); nothing
 * routes to any of them here, and their eight filenames are listed in the bundle beside these two
 * when one is needed.
 *
 * TWO THINGS ABOUT THE MESSAGE. It defaults to the type's own string rather than being required
 * (`empty` is "Stay tuned-something's coming!"), and a call site that passes children replaces
 * it — which is how the quest tabs get "No completed quests yet". And the message div carries NO
 * colour of its own: the colour comes from whatever wraps the section, which is why the quest
 * tabs wrap this in a `text-quarterary` div and the Explore grid passes `text-secondary` down
 * through `className`.
 *
 * THIS WAS ALREADY HALF-BUILT. `components/Explore/GameGrid`'s `Empty` was this component with
 * the image left out, because the artwork had not been fetched at the time. It is now a
 * re-export, so the Explore and casino grids gained the crocodile — the original draws it
 * unconditionally and there was never a reason for the two call sites to differ.
 */
export default function EmptyPlaceholder({
  children = "Stay tuned-something's coming!",
  className = '',
}) {
  const { darken } = useSettings();

  return (
    <section className={`center flex-col py-10 text-center ${className}`}>
      <img className="h-48 w-48" src={darken ? emptyArt : emptyArtLight} alt="" />
      {children ? <div className="mt-4 leading-5">{children}</div> : null}
    </section>
  );
}
