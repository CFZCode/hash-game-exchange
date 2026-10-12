import { SportIcon } from './icons';
import { cx } from './utils';

/**
 * SportTabs — the lobby's sport pills (Cricket / Football / Tennis …), the sports lobby's own
 * pill style (`.sports-tab` in pages/Sports/Sports.css) with BetBy's sport art.
 *
 * @param {object}   props
 * @param {Array<{id:string, label:string, icon?:string, count?:number}>} props.sports
 *        `icon` is the sport-art key: 'cricket' | 'soccer' | 'tennis' | 'basketball' … (src/assets/sports/sport-<key>.svg).
 *        Defaults to `id`.
 * @param {string}   props.active
 * @param {(id:string)=>void} props.onChange
 * @param {string}   [props.className]
 */
export default function SportTabs({ sports = [], active, onChange, className = '' }) {
  return (
    <div role="tablist" className={cx('hide-scroll flex items-center gap-2 overflow-x-auto sm:gap-3', className)}>
      {sports.map((s) => {
        const on = s.id === active;
        return (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange?.(s.id)}
            className={cx(
              'flex h-9 flex-none items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors',
              on ? 'bg-layer5 text-primary' : 'bg-layer3 text-secondary hover:bg-layer4',
            )}
          >
            <SportIcon sport={s.icon ?? s.id} className="size-[1.125rem] flex-none [&_svg]:size-full [&_svg]:fill-current" />
            <span>{s.label}</span>
            {s.count != null && (
              <span
                className={cx(
                  'rounded-full px-1.5 text-[0.6875rem] font-extrabold leading-4',
                  on ? 'bg-button-brand text-alw_dark' : 'bg-layer5 text-secondary',
                )}
              >
                {s.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
