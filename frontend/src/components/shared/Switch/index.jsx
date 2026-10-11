/* `CO` — the site's Switch. Its markup is four lines and it has been written out three times in
 * this project (the notification drawer's Show-unread bar, the currency dropdown's Hide Small, the
 * account dropdown's Do Not Disturb row); the settings pages render ten of them, so it moved here
 * under the rule `Select`, `GameTile`, `LocalAmountItem` and `MenuPageLayout` all moved under.
 *
 * IT IS A `<div>` AND NOT A `<button>`, which is the chunk's own element and is also forced at two
 * of the call sites: the Do Not Disturb switch sits inside the row's `<button>`, where a nested
 * button is invalid and undeliverable. `role="switch"` carries the semantics instead.
 *
 * `size="small"` is the original's own prop name and maps to `.switch.switch-xs`; both classes are
 * already in index.css, where the ordering note explains why `-xs` must follow `.switch`.
 *
 * `aria-checked` is what index.css keys the checked colour off — see the unlayered block at the
 * end of that file for why the checked rule is not in `@layer components` with the rest.
 *
 * THREE OLDER CALL SITES STILL WRITE THIS MARKUP BY HAND — the notification drawer's Show-unread
 * bar, the currency dropdown's Hide Small and the Do Not Disturb row — each with its own notes
 * attached. They are identical to this and can migrate; they are left alone for the reason the
 * four per-file coin-art globs were, which is that a working call site is not worth a rewrite
 * until it needs one.
 *
 * The inner `<div>` is the knob and is not optional: `.switch > div` is what index.css moves and
 * recolours, so without a child the track renders and nothing slides in it.
 */
export default function Switch({ value, onChange, size, label, className = '', disabled = false }) {
  return (
    <div
      role="switch"
      aria-checked={Boolean(value)}
      aria-label={label}
      data-disabled={disabled ? '' : undefined}
      className={`switch ${size === 'small' ? 'switch-xs' : ''} ${className}`}
      onClick={() => !disabled && onChange?.(!value)}
    >
      <div />
    </div>
  );
}
