import React from 'react';
import { liveState, onLiveState } from '../services/realtime';

/**
 * The signed-in player's open sports liability, INR, as a positive number — off the realtime
 * socket's state (services/realtime.js), so it follows a bet placed, cancelled or settled within a
 * moment. `null` until the first state lands, or when `enabled` is false (the caller is not on a
 * sports page and should not re-render on every tick).
 */
export default function useLiveExposure(enabled = true) {
  const [exposure, setExposure] = React.useState(() => toExposure(liveState()));

  React.useEffect(() => {
    if (!enabled) return undefined;
    return onLiveState((state) => {
      const next = toExposure(state);
      if (next !== null) setExposure(next);
    });
  }, [enabled]);

  return enabled ? exposure : null;
}

function toExposure(state) {
  if (!state?.signedIn || state.exposure == null) return null;
  const n = Math.abs(Number(state.exposure));
  return Number.isFinite(n) ? n : null;
}
