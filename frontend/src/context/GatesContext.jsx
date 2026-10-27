import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { USE_FIXTURES } from '../services/client';
import {
  ALL_ON,
  capabilitiesOf,
  gateOf,
  loadCapabilities,
  loadPublicGates,
  makeGates,
  publicGatesFrom,
} from '../services/gates';
import { onLiveState } from '../services/realtime';
import { agentBaseTarget } from '../services/agentBase';
import { useGates } from './gates';
import { GatesContext } from './gates';
import { useSession } from './session';
import { showToast } from '../components/shared/Toast/toast';
import { useSettings } from './settings';
import Loading from '../components/shared/Loading';

/* Signed in, /me not answered yet: capability gates read as CLOSED rather than open for a
   moment (SmartBet's UNKNOWN_CAPS), and a gated route waits for `ready` before redirecting. */
const UNKNOWN_CAPS = { promotions: false, vault: false, deposit: false, swap: false, withdraw: false, tips: false };

/* How often a refocus may re-read. A signed-in player also gets every owner / admin change from
   the realtime socket within ~2 s (services/realtime.js); the refocus read covers visitors and a
   socket that is down. */
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
  const { session, setSetting, signOut } = useSession();
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

  /* The realtime socket's state, every ~2 s and at once on a push. Set only when something
     actually changed, so an unchanged tick re-renders nothing. */
  React.useEffect(() => {
    let pubKey = null;
    let capsKey = null;
    return onLiveState((state) => {
      const nextPubKey = JSON.stringify([state.flags, state.features]);
      if (state.flags && nextPubKey !== pubKey) {
        pubKey = nextPubKey;
        setPub(publicGatesFrom(state));
      }
      if (userId && state.signedIn && state.me) {
        const value = capabilitiesOf(state.me);
        const nextCapsKey = JSON.stringify(value);
        if (nextCapsKey !== capsKey) {
          capsKey = nextCapsKey;
          setCaps({ userId, value });
        }
      }
    });
  }, [userId]);

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

  /* An agent's player runs on INR alone (user, 2026-10-18): "View in currency" off and the header
     coin INR, whatever an older session left in the stored setting. */
  const agentInr = ready && value.agentPlayer;
  const { enableLocaleCurrency, currencyName } = session.setting ?? {};
  React.useEffect(() => {
    if (!agentInr) return;
    if (enableLocaleCurrency) setSetting('enableLocaleCurrency', false);
    if (currencyName !== 'INRFIAT') setSetting('currencyName', 'INRFIAT');
  }, [agentInr, enableLocaleCurrency, currencyName, setSetting]);

  /* A demo account ends with its 30 minutes (backend `demo_expires_at`): signed out then, with a word. */
  const demoEndsAt = ready && value.demo ? capabilities?.demoEndsAt : null;
  React.useEffect(() => {
    if (!demoEndsAt) return undefined;
    const timer = setTimeout(() => {
      signOut();
      showToast('Your demo session has ended.');
    }, Math.max(0, new Date(demoEndsAt).getTime() - Date.now()));
    return () => clearTimeout(timer);
  }, [demoEndsAt, signOut]);

  /* Light theme switched off by the owner: back to dark, whatever an older visit saved. */
  const { theme, setTheme } = useSettings();
  const darkOnly = pub !== null && !value.themeSwitch();
  React.useEffect(() => {
    if (darkOnly && theme !== 'dark') setTheme('dark');
  }, [darkOnly, theme, setTheme]);

  const { pathname } = useLocation();
  const navigate = useNavigate();
  const off = ready && !value.routeOn(pathname);
  React.useEffect(() => {
    if (off) navigate('/', { replace: true });
  }, [off, navigate]);

  /* An agent's player lives under /agent, everyone else outside it (services/agentBase.js). The
     basename is fixed at mount, so crossing it is a full load; waits for `ready` (capabilities
     answered), or an agent's player would read as direct for an instant and be sent out. */
  const agentMove = ready && signedIn ? agentBaseTarget(window.location, value.agentPlayer) : null;
  React.useEffect(() => {
    if (agentMove) window.location.replace(agentMove);
  }, [agentMove]);

  return <GatesContext.Provider value={value}>{children}</GatesContext.Provider>;
}

/**
 * Holds a GATED page back until the gates have answered, and keeps it unmounted when its
 * section is off — so a page an agent-tree player cannot use never mounts and never fires its
 * reads in the instant before the provider's redirect to `/`. Pages with no gate (`gateOf` is
 * null) render straight through, and with fixtures on the gates are `ALL_ON` and always ready,
 * so neither changes by a pixel.
 */
export function RouteGate({ pathname, children }) {
  const gates = useGates();
  if (!gateOf(pathname)) return children;
  /* Off: the provider is redirecting to `/` — draw nothing for that instant. */
  if (gates.ready && !gates.routeOn(pathname)) return null;
  /* Not answered yet: a spinner rather than an empty page. A cold load that met the gateway's
     rate limit (429) used to sit here as a BLANK page for as long as the session read failed;
     the session now retries with backoff (SessionContext), and this says so after a moment. */
  if (!gates.ready) return <GateWaiting />;
  return children;
}

function GateWaiting() {
  const [slow, setSlow] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="flex min-h-60 flex-col items-center justify-center gap-3 py-10" role="status" aria-live="polite">
      <Loading className="size-6" />
      {slow && <p className="text-sm font-semibold text-secondary">The server is busy — still loading, retrying…</p>}
    </div>
  );
}
