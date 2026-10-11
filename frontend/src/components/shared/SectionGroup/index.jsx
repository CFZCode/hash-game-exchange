/* `section-group-l1HCczCi.js`, both of its exports — a shared bonus-family primitive off
 * `hash.game/assets/`.
 *
 * It lived in `pages/Quests/QuestCard.jsx` until the bonus page became its second call site,
 * which is the rule `Select`, `GameTile` and `EmptyPlaceholder` all moved under. `Card` came
 * with it: the chunk exports the two together and the bonus page uses both.
 */

/* `_` — a heading over a clipped body. The header row renders when EITHER `title` or
   `titleRight` is present, and the children wrapper is always there because it carries the
   `overflow-hidden` that clips a rounded row group's corners. */
export function SectionGroup({
  title,
  titleRight,
  subTitle,
  className = '',
  childrenClass = '',
  children,
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div>
        {(title || titleRight) && (
          <div className="flex items-center justify-between p-1">
            {title && <h3 className="text-sm font-extrabold text-secondary">{title}</h3>}
            {titleRight}
          </div>
        )}
        {subTitle}
      </div>
      <div className={`overflow-hidden ${childrenClass}`}>{children}</div>
    </div>
  );
}

/* `w` — the plain bordered panel. `variant="brand"` only changes the border tint; the fill stays
   layer2 either way, and the bonus page's two brand cards paint over it with their own inline
   gradient. */
export function Card({ variant, className = '', style, children }) {
  return (
    <div
      className={`relative flex flex-col justify-between rounded-xl border-[1px] bg-layer2 p-4 ${
        variant === 'brand' ? 'border-brand/20' : 'border-fourth/5'
      } ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

export default SectionGroup;
