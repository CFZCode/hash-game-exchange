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

/* Exposure only moves when a bet is placed (refreshed at once on `bet:placed`), matched or
   settled, so an idle page reads it every 5s; with an unmatched order open — the one case where
   it changes with nothing on this page doing anything — every 2s. Was 2s always, which with the
   1s markets poll was most of an idle match page's ~140 requests a minute. */
const EXPOSURE_IDLE_MS = 5000;
const EXPOSURE_OPEN_ORDER_MS = 2000;

/**
 * The player's exposure on a match, every 5s (2s while `hasOpenOrder`) and at once on `bet:placed`.
 * Signed out → never fetches (data undefined).
 * @param {string|number} gmid
 * @param {object[]} [markets]  the live list from useMatchMarkets — when given, `book` is mapped
 * @param {{ hasOpenOrder?: boolean }} [opts]  an unmatched order is open on this match
 * @returns {{ data: rows[]|undefined, book: { ['<mid>:<runner lowercase>']: number },
 *   error, loading, refresh }}   `book` is what cashout and the runner P/L cells read.
 */
export function useMatchExposure(gmid, markets, { hasOpenOrder = false } = {}) {
  const fetcher = React.useCallback((signal) => getMatchExposure(gmid, { signal }), [gmid]);
  const res = usePolling(fetcher, {
    intervalMs: hasOpenOrder ? EXPOSURE_OPEN_ORDER_MS : EXPOSURE_IDLE_MS,
    enabled: Boolean(gmid) && isSignedIn(), key: String(gmid ?? ''), refreshEvent: BET_PLACED_EVENT,
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
