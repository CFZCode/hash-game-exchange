/* `v`, the default skeleton in `skeleton-9E-gKDFG.js` — a lazy chunk that is not in the mirror
 * and came off `hash.game/assets/`. The whole component is four lines there:
 *
 *   const e = mergeProps({ visible: !0, animate: !0, as: "div", radius: .25 }, t),
 *         [r, a] = splitProps(e, ["as", "radius", "animate", "visible"]);
 *   return <Dynamic component={r.as} data-animate={r.animate} data-visible={r.visible}
 *                   class={clsx("skeleton", t.class)} {...a}/>
 *
 * IT WRAPS THE REAL CONTENT RATHER THAN REPLACING IT. `.skeleton` (index.css, transcribed
 * verbatim) covers its children with two pseudo-elements, so the placeholder is automatically
 * the exact size and shape of what is coming and nothing reflows when the data lands. That is
 * also why `visible` defaults to TRUE: the caller turns it off, it does not turn it on.
 *
 * `radius` is in the props default but the component never reads it — `splitProps` pulls it out
 * and drops it. Only the table variant (`E`, not ported) uses it, to build an inline
 * `border-radius`. Kept in the signature for the same reason dead classes are kept, and applied
 * here rather than discarded because a bare `.skeleton` over a rounded card would otherwise
 * paint square corners over it; the original's call sites pass a rounding utility in `class`
 * instead, which is what this build's do too. Pass `radius={0}` for a square one.
 *
 * The Solid original spreads the remaining props onto the element, which is how a call site
 * gets `style`; the same is done here.
 */
export default function Skeleton({
  as: Component = 'div',
  visible = true,
  animate = true,
  radius = 0.25,
  className = '',
  style,
  children,
  ...rest
}) {
  return (
    <Component
      className={`skeleton ${className}`}
      data-animate={animate ? 'true' : 'false'}
      data-visible={visible ? 'true' : 'false'}
      style={radius ? { borderRadius: `${radius}rem`, ...style } : style}
      {...rest}
    >
      {children}
    </Component>
  );
}
