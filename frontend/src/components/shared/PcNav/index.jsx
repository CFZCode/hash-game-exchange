import { useNavigate } from 'react-router-dom';

/* `PcNav-DkMNy63s.js`, whole — the back arrow and page title that sit above a secondary casino
 * page. Not in the mirror; recovered off `hash.game/assets/` under the hash
 * `Enter-MsmOuq5R.js` already lists for it (dep 456), so every class below is the Solid
 * template's own:
 *
 *   <Show when={!device.mobile}>
 *     <div class={clsx("my-6 flex items-center", props.class)}>
 *       <Button class="mr-3 size-8 rounded-lg bg-layer4 !p-0 text-secondary"
 *               onClick={() => props.link ? navigate(props.link) : navigate(-1)}>
 *         <IconBack class="size-5"/>
 *       </Button>
 *       <div class="text-xl font-extrabold">{props.title}</div>
 *     </div>
 *   </Show>
 *
 * IT IS DESKTOP-ONLY BY ITS OWN TEST, not by ours, and that is why these pages need no
 * `useIsDialog()` branch to hide their heading on a phone: `info.dialog = m.mobile` puts the same
 * string in the dialog's title bar at exactly the widths this returns nothing. The two are one
 * flag on the original and must stay in step here — `hidden lg:flex` is the same 1024 line
 * `App.jsx` mounts the dialog at.
 *
 * `button-m` is written out because it is `ot`'s own default rather than the call site's
 * (`s = size || !mobile && "m"`, and this only ever renders where `!mobile`), the same miss the
 * referral terms link and the Select triggers are documented for. It is inert either way here:
 * `size-8` is a utility and beats the layered 2.5rem, and `rounded-lg` beats its `--radius-lg`.
 *
 * `link` navigates somewhere specific; with none, the arrow is history's own `-1`. Both pages
 * that use it today pass none.
 *
 * `my-6` IS WRITTEN `mt-0 mb-6`, AND THE TOP HALF IS NOT DROPPED — IT COLLAPSES ON THE ORIGINAL.
 * `#page-content` there carries `px-4` and no vertical padding at all, so this row's top margin
 * escapes it rather than pushing anything down, and the only gap above the heading is the one the
 * chrome already leaves. This build's column has real `padding-top`
 * (`calc(var(--header-h) + var(--header-mb))`, i.e. 60 + 12 at `lg`), so nothing collapses and the
 * margin would simply add.
 *
 * MEASURED, not reasoned: in the reference capture of `/favorite` (dpr 1.25) the back button's box
 * is 40 image px tall — `size-8` — which fixes the scale, and its top edge sits 72 CSS px below
 * the viewport, which is this column's padding-top exactly and 12px below the header. Every later
 * edge then falls out of the class lists with nothing tuned: the crocodile's first opaque pixel
 * lands at 200 CSS (72 + 32 + `mb-6` + `py-10` + the PNG's own 32.3px of transparent margin,
 * against a measured 200) and the Recommended Games row's All pill at 460..491 (against a measured
 * 460..491.2). Restore the top margin and all three move down together by 24px.
 *
 * Four routes mount this on the original — `/favorite`, `/recent`, `/gamelist/:type` and one
 * more list page — which is why it is shared rather than living in the page family that
 * happens to have built it first.
 */
export default function PcNav({ title, link, className = '' }) {
  const navigate = useNavigate();

  return (
    <div className={`mb-6 mt-0 hidden items-center lg:flex ${className}`}>
      <button
        type="button"
        className="button button-m mr-3 size-8 rounded-lg bg-layer4 !p-0 text-secondary"
        onClick={() => (link ? navigate(link) : navigate(-1))}
        aria-label="Back"
      >
        {/* `pk` in index-BsFv7ByC.js — the same chevron the home rows' controller and the
            sidebar's dropdowns draw, and `_t` is what prepends `icon` (fill: currentColor), so
            it takes the button's `text-secondary` rather than painting solid black. */}
        <svg viewBox="0 0 32 32" className="icon size-5">
          <path d="M19.6912 5.6L9.2912 16L19.6912 26.4L22.7088 23.3824L15.3264 16L22.7088 8.6176L19.6912 5.6Z" />
        </svg>
      </button>
      <div className="text-xl font-extrabold">{title}</div>
    </div>
  );
}
