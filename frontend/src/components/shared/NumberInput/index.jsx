import React from 'react';

/* `uT` in index-BsFv7ByC.js — the site's number input, over `$3` (the plain Input). It lived
 * inside the Buy Crypto page until the Swap page became its second call site; both mount it with
 * a currency Select in its trailing slot, and moving it is the second-call-site rule `Select`,
 * `GameTile`, `PageCard`, `Notice` and `LocalAmountItem` moved under.
 *
 * READ THIS BEFORE TOUCHING IT — IT IS NOT A CONTROLLED INPUT, AND THE DIFFERENCE IS VISIBLE.
 *
 *   const l = f => {
 *     f = f.replace(",", ".");
 *     const h = Number(f);
 *     if (isNaN(h)) c(s());
 *     else { const d = r(h || 0).toNumber();
 *            o(d) ? (c(r(max)), i(max)) : a(d) ? (c(r(min)), i(min)) : (c(r(d)), i(d)) }
 *   }
 *
 * where `c` writes straight to the DOM node (`e.value !== h && (e.value = h)`) and `i` is
 * `onChange`. So the original CLAMPS ON EVERY KEYSTROKE and rewrites what you typed: against a
 * minimum of 30, typing "1" puts 30 in the box, and "30." becomes "30". THIS BUILD DOES NOT: a
 * player could not type an amount at all (Swap, live QA 2026-10-19), so typing only reports the
 * figure and the clamp + rewrite run on BLUR — and nothing is written into the box while it has
 * focus, which is what keeps a typed "." alive. Call sites still guard their submit on the range.
 *
 * Reproducing it needs the input to stay UNCONTROLLED, which is also the original's arrangement.
 * A controlled input would silently drop the clamp whenever the clamped value equals the state
 * already there — select-all, type "1", `onChange(30)`, state is already 30, React does not
 * re-render, and the box is left showing "1". The layout effect below is `re(() => c(s()))`, the
 * original's own render effect; a DOM write, not a setState, so it is not the cascading render
 * the lint rule is about.
 *
 * `precision` — `r(f) = new Big(f).todp(t.precision, ROUND_DOWN)` plus an effect that re-rounds
 * when the prop tightens. Neither call site passes it, so the rounding is inert and is not
 * ported; add it here rather than at a call site if one ever needs it.
 *
 * `[data-focus]` on the WRAPPER is `$3`'s, driven from JS rather than `:focus-within`, because
 * the green ring belongs to the box and not to the <input> inside it. Both call sites also want
 * to know about focus themselves (Swap swaps the box's whole fill on it), hence the pass-through
 * `onFocus`/`onBlur`.
 */
export default function NumberInput({
  value,
  min,
  max,
  disabled,
  readOnly,
  onChange,
  onFocus,
  onBlur,
  className = '',
  children,
}) {
  const ref = React.useRef(null);
  const [focus, setFocus] = React.useState(false);

  const write = (next) => {
    const text = String(next);
    if (ref.current && ref.current.value !== text) ref.current.value = text;
  };

  /* Every render, as the original's render effect runs — which is what keeps the box in step
     when the currency changes under it and the figure is recomputed from outside. */
  React.useLayoutEffect(() => {
    if (ref.current !== document.activeElement) write(value);
  });

  // While typing: report the figure, never rewrite the box ("12." and "0.0" must survive).
  const type = (raw) => {
    const parsed = Number(String(raw).replace(',', '.'));
    if (!Number.isNaN(parsed)) onChange(parsed);
  };

  // On blur: clamp into [min, max] and print the committed figure.
  const commit = (raw) => {
    const parsed = Number(String(raw).replace(',', '.'));
    if (Number.isNaN(parsed)) {
      write(value);
      return;
    }
    if (max !== undefined && parsed > max) {
      write(max);
      onChange(max);
    } else if (min !== undefined && parsed < min) {
      write(min);
      onChange(min);
    } else {
      write(parsed);
      onChange(parsed);
    }
  };

  return (
    <div
      className={`input ${className}`}
      data-focus={focus || undefined}
      data-disabled={disabled || undefined}
    >
      <input
        ref={ref}
        inputMode="decimal"
        readOnly={readOnly}
        disabled={disabled}
        defaultValue={String(value)}
        onFocus={(event) => {
          setFocus(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocus(false);
          if (!readOnly && !disabled) commit(event.target.value);
          onBlur?.(event);
        }}
        onChange={(event) => type(event.target.value)}
      />
      {children}
    </div>
  );
}
