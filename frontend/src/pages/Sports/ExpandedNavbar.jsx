import React from 'react';
import { getSportsNav } from '../../services/sports';
import { useResource } from '../../hooks/useResource';
import { SportIcon, BetbyIcon } from './icons';
import { flagArt } from './sportArt';

/* The panel the rail's overflow arrow opens — BetBy's `expandedNavbar`.
 *
 * Three tabs, a stats button, then a grid of every sport with its live event count. The rows
 * reuse exactly the same artwork as the rail: `SportIcon` for the sport, `flagArt` for the one
 * composite row, `ic-badge-hot` for the flame. Nothing here is a second copy of anything.
 *
 * Only the Sports tab has rows — Esports and Racing were never opened in the capture, so they
 * render the empty state rather than repeating the Sports list. Same choice the event grid's
 * page two makes: repeating known data as if it were captured is worse than showing nothing.
 *
 * The stat button's green dot is BetBy's `featurePin`, an 8px disc it renders inline. The
 * button's own glyph is `ic-stat` at rgb(255,152,32) — the same orange the Popular tab uses,
 * which is why that literal appears twice in this build and is not a token.
 */
function SportRow({ sport }) {
  const flag = sport.flag ? flagArt(sport.flag) : undefined;

  return (
    <button type="button" className="sports-expanded-row" title={sport.label}>
      <span className="sports-expanded-mark">
        {sport.flag ? (
          <span className="sports-rail-stack">
            {flag && <img className="sports-rail-flag" alt="" src={flag} />}
            <SportIcon sport={sport.icon} className="sports-rail-stack-icon" />
          </span>
        ) : (
          <SportIcon sport={sport.icon} className="sports-expanded-icon" />
        )}
        {sport.hot && <BetbyIcon name="ic-badge-hot" className="sports-expanded-hot" />}
      </span>

      <span className="sports-expanded-label">
        {sport.label}
        <span className="sports-expanded-count">{sport.count}</span>
      </span>
    </button>
  );
}

export default function ExpandedNavbar({ open, onClose }) {
  const { data: nav } = useResource(getSportsNav);
  const [tab, setTab] = React.useState('sports');
  if (!open) return null;

  const rows = tab === 'sports' ? (nav?.expandedSports ?? []) : [];

  return (
    <div className="sports-expanded" role="dialog" aria-label="All sports">
      <div className="sports-expanded-head">
        <div className="sports-expanded-tabs">
          {(nav?.expandedTabs ?? []).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={t.id === tab}
              className={`sports-expanded-tab ${t.id === tab ? 'is-active' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <button type="button" className="sports-expanded-stat" aria-label="Statistics">
          <BetbyIcon name="ic-stat" className="sports-expanded-stat-icon" />
          <span className="sports-expanded-pin" />
        </button>
      </div>

      {rows.length ? (
        <div className="sports-expanded-grid hide-scroll">
          {rows.map((sport) => (
            <SportRow key={sport.id} sport={sport} />
          ))}
        </div>
      ) : (
        <p className="sports-expanded-empty">Stay tuned-something&apos;s coming!</p>
      )}

      {/* Click-away. A plain sibling rather than a wrapper so the panel keeps its place in
          the lobby's flow and does not need a portal. */}
      <button
        type="button"
        className="sports-expanded-scrim"
        aria-label="Close"
        onClick={onClose}
      />
    </div>
  );
}
