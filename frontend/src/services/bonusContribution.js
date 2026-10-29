import { request } from './client';

/* THIS BUILD'S — the game ratio (user, 2026-10-29: "Bonus will be used only on ratio of bettings"):
   how much of a bet on each game type / provider / game counts toward unlocking a locked bonus.
   `GET /user/bonus-balance/contribution` is public. No fixture: with fixtures on nothing is shown. */
// One read shared by every caller for a minute (the promotion page asks once per game tile).
let cached = { at: 0, promise: null };
export const getBonusContribution = () => {
  if (!cached.promise || Date.now() - cached.at > 60_000) {
    cached = {
      at: Date.now(),
      promise: Promise.resolve(request('/api/v1/user/bonus-balance/contribution', { live: true, fixture: null })).catch(() => null),
    };
  }
  return cached.promise;
};

const TYPE_LABEL = { slots: 'Slots', originals: 'Originals', live: 'Live casino', sports: 'Sports' };

/** The game types as rows, in a fixed order. */
export const typeRows = (table) =>
  Object.keys(TYPE_LABEL).map((key) => ({ key, label: TYPE_LABEL[key], percent: table?.types?.[key] ?? 100 }));

// An Original is linked by its slug (`classic-dice`, `mines`); its bets carry the game code.
const ORIGINAL_CODE = { mines: 'mine', 'tower-legend': 'tower', 'video-poker': 'videopoker' };

/** The % a game linked as `/game/<ref>` counts, or null when it has no rule of its own. */
export const percentForHref = (table, href) => {
  const ref = decodeURIComponent(/^\/game\/([^/?#]+)/.exec(href ?? '')?.[1] ?? '').toLowerCase();
  if (!ref) return null;
  const refs = [ref, ORIGINAL_CODE[ref], ref.replace(/-/g, '_')];
  const game = table?.games?.find((g) => refs.includes(g.ref));
  return game ? game.percent : null;
};
