import React from 'react';
import { ODDS_FORMATS, DISCLAIMER } from './lobby';
import { ChevronIcon } from './icons';

/* Under the grid: an odds-format select and the data disclaimer.
 *
 * NOT `components/shared/Select`. That one is bc.game's — a `.button.select` trigger with a
 * chevron in its own square, plus a portalled `.dropdown-layer` positioned from JS. This is a
 * plain rounded-full pill with the chevron inline, and it belongs to the widget. Reusing the
 * shared component would have meant overriding its trigger, its square and its radius, which
 * is the point at which reuse stops paying.
 *
 * The list beyond "European" was never on screen — the dropdown was not opened in the capture
 * — so it is the standard set every book offers, and lobby.js says so. The control is a real
 * <select> here: it carries no captured styling of its own to reproduce beyond the pill, and a
 * native select gets keyboard and mobile behaviour for free.
 *
 * The `ODDS FORMAT` label is letter-spaced small caps in the capture, which is the only place
 * on this page that treatment appears.
 */
export default function LobbyFooter() {
  const [format, setFormat] = React.useState(ODDS_FORMATS[0]);

  return (
    <div className="sports-lobby-footer">
      <div className="sports-odds-format">
        <span className="sports-odds-format-label">Odds Format</span>

        <span className="sports-odds-format-control">
          <select
            className="sports-odds-format-select"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            aria-label="Odds format"
          >
            {ODDS_FORMATS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <ChevronIcon className="sports-odds-format-chevron" />
        </span>
      </div>

      <p className="sports-disclaimer">{DISCLAIMER}</p>
    </div>
  );
}
