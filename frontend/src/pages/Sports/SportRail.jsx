import React from 'react';
import { getSportsNav } from '../../services/sports';
import { useResource } from '../../hooks/useResource';
import { SportIcon, BetbyIcon } from './icons';
import { hasSportIcon, flagArt } from './sportArt';
import Skeleton from '../../components/shared/Skeleton';

/* The rail across the top of the lobby: four fixed controls, a divider, seventeen sports, an
 * overflow arrow, a second divider, and search at the far right.
 *
 * SOURCED FROM THE RENDERED MARKUP, not a screenshot. Every icon here is BetBy's own SVG,
 * lifted out of the live widget's navbar and saved under `src/assets/sports/` under BetBy's own
 * filenames. Three things the screenshot reading got wrong and the markup settled:
 *
 * - The badge is NOT a counter. The pin element holds `ic-badge-hot` — a flame — and no text
 *   node whatsoever. What read as a "6" beside eSoccer and Counter-Strike was the flame itself.
 *   It renders at 19px in rgb(255,78,78), which is BetBy's inline `color` on it.
 * - The sport list is seventeen, not twenty: no Athletics, Table Tennis, MMA or Futsal, and a
 *   Sumo cell instead. Baseball precedes Cricket.
 * - Icons are `fill: currentcolor; color: inherit`, so the cell drives the colour and the SVG
 *   just follows. That is why the files carry no fill of their own and why a call site that
 *   forgets to set one gets solid black.
 *
 * GEOMETRY. 48px cells with NO gap, corroborated twice: the capture's icon centres are 60 image
 * px apart at dpr 1.25, and the widget's own cells measure 48x48 around a 32px icon. A 6px gap
 * across 25 cells adds 150px and pushes the tail of the row off-screen — do not add one back.
 *
 * ONE CELL IS STILL SHORT. `highlights` is a composite on the live rail: a 28px country flag
 * image (`flags_by_code/international.svg`) with a 20px white soccer icon stacked over it. The
 * flag is remote and was never captured, so only the soccer half renders and this cell reads as
 * a plain ball rather than the multicoloured globe. Dropping the flag in and rendering it under
 * the icon is all that is missing.
 */
function RailCell({ item, active, onTip }) {
  /* The composite Highlights cell: a 28px flag disc with a 20px white icon over it. Anything
     with a `flag` takes this branch, so a second composite cell needs no new code. */
  const flag = item.flag ? flagArt(item.flag) : undefined;

  /* The tooltip cannot be a `::after` on this button. `.sports-rail-scroll` carries
     `overflow-x: auto`, and CSS computes the other axis to `auto` too the moment one axis is
     not `visible` — so anything drawn below the cell would be clipped by the scroller. The tip
     is therefore a single element owned by the rail, and each cell reports where to put it.
     `offsetLeft` is measured against `.sports-rail` (the nearest positioned ancestor) and the
     scroller's own `scrollLeft` is subtracted so the tip tracks a scrolled rail. */
  const report = (e) => {
    const cell = e.currentTarget;
    const scroller = cell.parentElement;
    onTip({
      label: item.label,
      x: cell.offsetLeft - (scroller?.scrollLeft ?? 0) + cell.offsetWidth / 2,
    });
  };

  return (
    <button
      type="button"
      aria-label={item.label}
      className={`sports-rail-cell ${active ? 'is-active' : ''}`}
      onMouseEnter={report}
      onFocus={report}
      onMouseLeave={() => onTip(null)}
      onBlur={() => onTip(null)}
    >
      {item.flag ? (
        <span className="sports-rail-stack">
          {flag && <img className="sports-rail-flag" alt="" src={flag} />}
          <SportIcon sport={item.icon} className="sports-rail-stack-icon" />
        </span>
      ) : item.chrome ? (
        <BetbyIcon name={item.chrome} className="sports-rail-icon" />
      ) : hasSportIcon(item.icon) ? (
        <SportIcon sport={item.icon} className="sports-rail-icon" />
      ) : null}

      {item.hot && <BetbyIcon name="ic-badge-hot" className="sports-rail-hot" />}
    </button>
  );
}

export default function SportRail({ expanded, onToggleExpanded }) {
  const { data: nav, loading } = useResource(getSportsNav);
  const [tip, setTip] = React.useState(null);

  return (
    <div className="sports-rail">
      <div className="sports-rail-scroll hide-scroll">
        {/* The bar keeps its 48px whatever happens — the overflow arrow at the end is a cell in
            its own right — so this is about the cells being visibly absent rather than about a
            layout jump. Twelve 32px squares is roughly a desktop rail's worth; the real count is
            19 sports plus 3 actions and the rail scrolls, so it is a width, not a quantity.
            Inferred, like every other loader on this page — see EventGrid.jsx. */}
        {loading &&
          Array.from({ length: 12 }, (unused, i) => (
            <span key={`skeleton-${i}`} className="sports-rail-cell">
              <Skeleton className="block size-8 rounded" radius={0}>
                <div className="size-full" />
              </Skeleton>
            </span>
          ))}

        {(nav?.actions ?? []).map((item) => (
          <RailCell key={item.id} item={item} active={item.active} onTip={setTip} />
        ))}

        <span className="sports-rail-divider" />

        {(nav?.sports ?? []).map((item) => (
          <RailCell key={item.id} item={item} onTip={setTip} />
        ))}

        {/* BetBy's `ic-rounded-arrow` — a filled triangle already pointing down, so unlike the
            pager's chevron it is NOT rotated when closed. Open, it flips to point up and turns
            brand green, which is what the live panel does. */}
        <button
          type="button"
          className={`sports-rail-cell sports-rail-more ${expanded ? 'is-open' : ''}`}
          aria-label="More sports"
          aria-expanded={expanded}
          onClick={onToggleExpanded}
        >
          <BetbyIcon name="ic-rounded-arrow" className="sports-rail-more-arrow" />
        </button>
      </div>

      {/* A second divider sits between the overflow arrow and search on the live rail. */}
      <span className="sports-rail-divider" />

      <button type="button" className="sports-rail-cell sports-rail-search" aria-label="Search">
        <BetbyIcon name="ic-search" className="sports-rail-icon" />
      </button>

      {/* One tip for the whole rail, outside the scroller so it is not clipped. */}
      {tip && (
        <span className="sports-rail-tip" style={{ left: `${tip.x}px` }} role="tooltip">
          {tip.label}
        </span>
      )}
    </div>
  );
}
