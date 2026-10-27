import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../../context/session';
import { showToast } from '../../../components/shared/Toast/toast';
import { useGates } from '../../../context/gates';

/* THIS BUILD'S — the Demo button beside Sign In (TENEXCH's): one tap makes a throwaway demo account
   (₹1500, sports exchange only, 30 minutes; backend `AuthService.demoLogin`), signs it in and
   opens the exchange. `className` is the Sign In button's own, desktop or mobile. */
export default function DemoButton({ className }) {
  const { authenticateDemo, signIn } = useSession();
  // The owner panel's Demo login switch (site-config public `demo_login`).
  const on = useGates().flag('demo_login');
  const navigate = useNavigate();
  const [busy, setBusy] = React.useState(false);

  const start = () => {
    if (busy) return;
    setBusy(true);
    Promise.resolve(authenticateDemo())
      .then((result) => {
        signIn(result);
        navigate('/sports');
      })
      .catch((error) => showToast(error?.message || 'Could not start a demo. Try again.', { type: 'error' }))
      .finally(() => setBusy(false));
  };

  if (!on) return null;
  return (
    <button className={className} type="button" disabled={busy} onClick={start}>
      Demo
    </button>
  );
}
