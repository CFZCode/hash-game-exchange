import React from 'react';
import { usePolling } from './usePolling';
import { useSharedSportsTree } from './sharedSportsTree';
import { getSportEvents, getLatestEvents, getMatchHeader } from '../../services/exchange/feed';
import { getMatchExposure, getOpenBets } from '../../services/exchange/positions';
import { getBettingConfig } from '../../services/exchange/config';
import { getStakeButtons, getOneClickButtons } from '../../services/exchange/stakes';
import { BET_PLACED_EVENT } from '../../services/exchange/bets';
import { isSignedIn } from '../../services/tokens';
import { mapMatchExposures } from '../../utils/exchange/exposureMapping';

/* Every hook here returns { data, error, loading, refresh } (usePolling) unless noted. `data` is
   undefined until the first answer for the current arguments — render the section's loading
   state on `data === undefined`, never on a length test. */

/** Sport board, 5s. data: { t1, t2, events } (services/exchange/feed.js getSportEvents). */
export function useSportsList(sid) {
  const fetcher = React.useCallback((signal) => getSportEvents(sid, { signal }), [sid]);
  return usePolling(fetcher, { intervalMs: 5000, enabled: sid != null && sid !== '', key: String(sid ?? '') });
}

const readLatest = (signal) => getLatestEvents({ signal });
const readConfig = () => getBettingConfig();

/** Sidebar tree, 60s. data: { sports, racing }. ONE shared poll for every caller (the main
    sidebar's Sports group and anything else) — see sharedSportsTree.js. */
export function useSportsTree() {
  return useSharedSportsTree();
}

/** Latest-events strip, 30s. data: Array<{ id, lid, name, sportId }>. */
export function useLatestEvents() {
  return usePolling(readLatest, { intervalMs: 30000, key: 'latest' });
}

/** Match header, 5s (TENEXCH polls gamedetailPrivate every 5000ms). data: MatchHeader | null. */
export function useMatchHeader(gmid, sid) {
  const fetcher = React.useCallback((signal) => getMatchHeader(gmid, sid, { signal }), [gmid, sid]);
  return usePolling(fetcher, { intervalMs: 5000, enabled: Boolean(gmid && sid), key: `${gmid}|${sid}` });
}

/**
 * The player's exposure on a match, every 2s and at once on `bet:placed`.
 * Signed out → never fetches (data undefined).
 * @param {string|number} gmid
 * @param {object[]} [markets]  the live list from useMatchMarkets — when given, `book` is mapped
 * @returns {{ data: rows[]|undefined, book: { ['<mid>:<runner lowercase>']: number },
 *   error, loading, refresh }}   `book` is what cashout and the runner P/L cells read.
 */
export function useMatchExposure(gmid, markets) {
  const fetcher = React.useCallback((signal) => getMatchExposure(gmid, { signal }), [gmid]);
  const res = usePolling(fetcher, {
    intervalMs: 2000, enabled: Boolean(gmid) && isSignedIn(), key: String(gmid ?? ''), refreshEvent: BET_PLACED_EVENT,
  });
  const book = React.useMemo(() => mapMatchExposures(res.data || [], markets || []), [res.data, markets]);
  return { ...res, book };
}

/** Open bets on a match, every 5s and on `bet:placed`. data: { matched, unmatched }. */
export function useOpenBets(gmid) {
  const fetcher = React.useCallback((signal) => getOpenBets(gmid, { signal }), [gmid]);
  return usePolling(fetcher, {
    intervalMs: 5000, enabled: Boolean(gmid) && isSignedIn(), key: String(gmid ?? ''), refreshEvent: BET_PLACED_EVENT,
  });
}

/** Owner betting config (buffers, max odds, virtual limits), refreshed every 60s (module cache TTL). */
export function useBettingConfig() {
  return usePolling(readConfig, { intervalMs: 60000, key: 'betting-config' });
}

/**
 * Stake buttons + one-click buttons, read once. data: { stakes: [{label, value}], oneClick: number[] }.
 * Both fall back to the server's defaults when unreachable, so this never errors.
 */
export function useStakeButtons() {
  const fetcher = React.useCallback(async () => {
    const [stakes, oneClick] = await Promise.all([
      getStakeButtons(),
      isSignedIn() ? getOneClickButtons() : Promise.resolve(null),
    ]);
    return { stakes, oneClick };
  }, []);
  return usePolling(fetcher, { intervalMs: 0, key: 'stakes' });
}
