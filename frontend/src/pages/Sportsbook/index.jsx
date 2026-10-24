import React from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../../context/session';
import Loading from '../../components/shared/Loading';
import { launchSportsbook } from '../../services/sports';

/* `/sports/*` while the owner runs the SPORTSBOOK instead of the exchange (owner panel →
 * Products → Sportsbook; services/gates.js `sportsbook`). The book is a third-party app framed
 * whole, as smartbet's BookView/LaunchFrame does: launched once per sign-in through
 * services/sports.js (the Slotegrator book, else the LuckySports catalogue game), sized to the
 * screen by CSS rather than by postMessage. Signed out it asks for a sign-in instead of loading. */
export default function Sportsbook() {
  const { session } = useSession();
  // One launch per sign-in and per "Try again": a result is only shown for the attempt it answered.
  const [tries, setTries] = React.useState(0);
  const key = session.login ? `${session.userId}:${tries}` : null;
  const [result, setResult] = React.useState(null); // { key, url }

  React.useEffect(() => {
    if (!key) return undefined;
    let live = true;
    Promise.resolve(launchSportsbook()).then((url) => live && setResult({ key, url }));
    return () => {
      live = false;
    };
  }, [key]);

  const url = result?.key === key ? result.url : null;
  const state = !key ? 'idle' : result?.key !== key ? 'launching' : url ? 'ready' : 'error';
  const launch = () => setTries((n) => n + 1);

  return (
    <div className="px-4 sm:px-0">
      <div className="relative -mx-4 h-[calc(100dvh-var(--header-h)-4.5rem)] min-h-[30rem] overflow-hidden sm:mx-0 sm:rounded-xl lg:h-[calc(100dvh-var(--header-h)-1rem)]">
        {url && (
          <iframe
            key={url}
            src={url}
            title="Sportsbook"
            allow="autoplay; fullscreen; clipboard-write; encrypted-media; payment"
            allowFullScreen
            referrerPolicy="origin"
            className="absolute inset-0 block h-full w-full border-0"
          />
        )}
        {state === 'launching' && <Loading className="absolute inset-0" />}
        {state === 'idle' && (
          <div className="flex h-full flex-col items-center justify-center gap-4 bg-layer4 text-center">
            <p className="text-secondary">Sign in to open the sportsbook.</p>
            <Link to="/login/signin" className="button button-brand button-m w-40">Sign In</Link>
          </div>
        )}
        {state === 'error' && (
          <div className="flex h-full flex-col items-center justify-center gap-4 bg-layer4 text-center">
            <p className="text-secondary">The sportsbook could not be opened right now.</p>
            <button type="button" className="button button-brand button-m w-40" onClick={launch}>Try again</button>
          </div>
        )}
      </div>
    </div>
  );
}
