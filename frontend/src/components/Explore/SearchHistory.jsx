import { CloseIcon } from './icons';
import { GAMES } from '../../data/games';
import { writeHistory } from './history';

/* `ge` in index-DrTwTnbT.js - the panel that hangs under the search box while the query is
 * still too short to run. It is not a dropdown component; it is an absolutely positioned
 * sibling inside the search row's `relative` wrapper, which is why that row carries the
 * class.
 *
 * Storage lives in ./history.js. The mobile-only close button (`x.mobile`) is left out: this
 * panel is only reachable from the desktop header. Suggested comes from the `hot_games`
 * selection, which is what `ce` fetches (`{sectionName: "hot_games"}`).
 */

const SUGGESTED = GAMES.filter((game) => game.sections.includes('hot_games')).map(
  (game) => game.name,
);

const CHIP = 'flex h-5 items-center rounded-md bg-layer5 px-2 sm:cursor-pointer';
const CHIP_TEXT = 'text-xs text-secondary hover:text-primary';

export default function SearchHistory({ history, setHistory, onPick }) {
  const remove = (value) => {
    const next = history.filter((item) => item !== value);
    setHistory(next);
    writeHistory(next);
  };

  return (
    <div
      className="absolute left-0 right-0 top-full z-20 w-full rounded-lg border border-input bg-layer3 p-4"
      style={{
        boxShadow: '0px 4px 8px 0px rgba(0, 0, 0, 0.10)',
        transform: 'translateY(0.5rem)',
      }}
    >
      <p className="text-center text-secondary">Search requires at least 2 characters.</p>

      {history.length > 0 && (
        <>
          <div className="mt-4 flex items-center">
            <p className="font-extrabold">History</p>
            <div
              className="ml-auto text-secondary hover:text-brand hover:underline sm:cursor-pointer"
              onClick={() => {
                setHistory([]);
                writeHistory([]);
              }}
            >
              Clear search ({history.length})
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {history.map((item) => (
              <div key={item} className={`${CHIP} gap-0.5`}>
                <span className={CHIP_TEXT} onClick={() => onPick(item, 'history')}>
                  {item}
                </span>
                <CloseIcon
                  className="size-3 fill-secondary hover:scale-125 hover:fill-brand"
                  onClick={() => remove(item)}
                />
              </div>
            ))}
          </div>
        </>
      )}

      <p className="mt-4 font-extrabold">Suggested</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {SUGGESTED.map((name) => (
          <div key={name} className={CHIP} onClick={() => onPick(name, 'recommed')}>
            <span className={CHIP_TEXT}>{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

