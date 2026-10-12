import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { USE_FIXTURES } from '../services/client';
import { ALL_ON, loadCapabilities, loadPublicGates, makeGates } from '../services/gates';
import { GatesContext } from './gates';
import { useSession } from './session';

/* Signed in, /me not answered yet: capability gates read as CLOSED rather than open for a
   moment (SmartBet's UNKNOWN_CAPS), and a gated route waits for `ready` before redirecting. */
const UNKNOWN_CAPS = { promotions: false, vault: false, deposit: false, swap: false, withdraw: false, tips: false };

/* How often a refocus may re-read. SmartBet re-reads on the backend's `featuresUpdated` /
   `siteConfigUpdated` socket pushes; this build has no socket client, so an owner or admin
   change is picked up on the next load and whenever the tab regains focus. */
const REFRESH_MS = 10_000;

/**
 * The owner's plan, the site admin's switches and the player's capabilities, read once at the
 * root and shared (services/gates.js). With fixtures on it provides `ALL_ON` and reads nothing.
 *
 * Also the route guard: a direct visit to a switched-off section goes to `/`, once every read
 * that could switch it has answered.
 */
export function GatesProvider({ children }) {
  if (USE_FIXTURES) return <GatesContext.Provider value={ALL_ON}>{children}</GatesContext.Provider>;
  return <LiveGates>{children}</LiveGates>;
}

function LiveGates({ children }) {
  const { session } = useSession();
  const signedIn = Boolean(session.login);
  const userId = signedIn ? session.userId : 0;

  const [pub, setPub] = React.useState(null);
  /* Keyed on the user the answer belongs to, so a sign-out or account switch reads as unknown
     during render rather than through a reset effect. */
  const [caps, setCaps] = React.useState({ userId: 0, value: null });

  const readPublic = React.useCallback(() => {
    loadPublicGates().then(setPub);
  }, []);
  const readCaps = React.useCallback(() => {
    if (!userId) return;
    loadCapabilities().then((value) => setCaps({ userId, value }));
  }, [userId]);

  React.useEffect(readPublic, [readPublic]);
  React.useEffect(readCaps, [readCaps]);

  React.useEffect(() => {
    let last = Date.now();
    const refresh = () => {
      if (document.visibilityState !== 'visible' || Date.now() - last < REFRESH_MS) return;
      last = Date.now();
      readPublic();
      readCaps();
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [readPublic, readCaps]);

  /* `userId` is 0 while a restored session's account is still pending (signed in, profile not
     read yet). That must read as UNKNOWN, not as "caps 0 answered null" — the latter failed open
     and mounted the header's bonus gift for an agent player, which then called /user/bonus. */
  const capsKnown = !signedIn || (Boolean(userId) && caps.userId === userId);
  const capabilities = !signedIn ? null : capsKnown ? caps.value : UNKNOWN_CAPS;
  const ready = pub !== null && capsKnown;

  const value = React.useMemo(
    () => makeGates({ flags: pub?.flags, features: pub?.features, capabilities, ready }),
    [pub, capabilities, ready],
  );

  const { pathname } = useLocation();
  const navigate = useNavigate();
  const off = ready && !value.routeOn(pathname);
  React.useEffect(() => {
    if (off) navigate('/', { replace: true });
  }, [off, navigate]);

  return <GatesContext.Provider value={value}>{children}</GatesContext.Provider>;
}
