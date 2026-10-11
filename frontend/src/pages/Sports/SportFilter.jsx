import { getSportFilters } from '../../services/sports';
import { useResource } from '../../hooks/useResource';
import { SportIcon } from './icons';
import { hasSportIcon } from './sportArt';

/* The sport filter above the grid.
 *
 * Same pill geometry as the lobby tabs but a different selected treatment, and the difference
 * is worth keeping straight: a selected lobby tab is a lighter grey (`layer5`), a selected
 * sport is filled with brand green and its label goes black. That green pill is the only
 * brand-filled control anywhere on the page, which is presumably why it is the one that
 * carries the current filter.
 *
 * Black-on-brand is `--color-primary_brand`, which already exists for exactly this — it is the
 * text colour the contest's Active flag and Winner ribbon use on the same green.
 */
export default function SportFilter({ active, onChange }) {
  const { data: sports } = useResource(getSportFilters);

  return (
    <div className="sports-filter hide-scroll">
      {(sports ?? []).map((sport) => {
        const selected = sport.id === active;

        return (
          <button
            key={sport.id}
            type="button"
            onClick={() => onChange(sport.id)}
            aria-pressed={selected}
            className={`sports-filter-pill ${selected ? 'is-active' : ''}`}
          >
            {hasSportIcon(sport.icon) && (
              <SportIcon sport={sport.icon} className="sports-filter-icon" />
            )}
            <span>{sport.label}</span>
          </button>
        );
      })}
    </div>
  );
}
