import { getLobbyTabs } from '../../services/sports';
import { useResource } from '../../hooks/useResource';
import { BetbyIcon } from './icons';

/* The lobby's section tabs — Popular / Live / Upcoming / Predictions / Bets Feed / Playtracker.
 *
 * Pills, not the `.tabs-*` family this project already has. That family is bc.game's own tab
 * chrome (a `bg-tab_nopadding` strip with a `bg-tab_selected` pill sliding inside it); these
 * are free-standing rounded buttons on the page background with a gap between them, no strip
 * behind them, and a coloured glyph each. Different control, so it gets its own rules rather
 * than `.tabs-*` bent out of shape — and bending it would also drag in the layer/utility
 * ordering that block is written around.
 *
 * Glyphs are BetBy's own SVGs (`ic-top`, `ic-live-simple`, …), lifted from the live widget's
 * shadow root; their colours are its computed `fill` on each one. Both come from lobby.js. The
 * tone is applied inline because these six are the only non-monochrome marks on the page and
 * three of them are BetBy-specific colours that deliberately do not exist in @theme.
 *
 * The label colour is NOT constant: the selected tab's is white and the rest are `secondary`
 * (rgb(179,190,193)), which is the widget's own computed `color` on each. It reads as a much
 * bigger difference than the background change alone.
 *
 * State is local and presentational: nothing is wired to a feed, so switching tabs changes the
 * selected pill and nothing else. It is still worth having — the selected/unselected treatment
 * is half of what this component is for, and a static `Popular` would leave it unverifiable.
 */
export default function LobbyTabs({ active, onChange }) {
  const { data: tabs } = useResource(getLobbyTabs);

  return (
    <div className="sports-tabs hide-scroll">
      {(tabs ?? []).map((tab) => {
        const selected = tab.id === active;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            aria-pressed={selected}
            className={`sports-tab ${selected ? 'is-active' : ''}`}
          >
            <BetbyIcon
              name={tab.chrome}
              className="sports-tab-glyph"
              style={{ '--glyph': tab.tone }}
            />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
