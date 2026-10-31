import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSession } from '../../../context/session';
import { toast } from '../../shared/Toast/toast';
import { GOOGLE_ERRORS, handToOpener, takeGoogleNonce } from '../../../services/googleAuth';

/* `/login/google?code=…` (or `?error=…`) — where the backend's Google callback sends the browser.
 * Trades the one-time code for a session through the same commit the sign-in dialog uses, then
 * goes home; an error goes back to the sign-in dialog with the reason. Renders nothing. */
export default function GoogleCallback() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const { authenticateGoogle, signIn } = useSession();
  const started = React.useRef(false);

  React.useEffect(() => {
    if (started.current) return; // the code is single use
    started.current = true;
    const params = new URLSearchParams(search);
    const code = params.get('code');
    const fail = (errorCode) => {
      toast.error(GOOGLE_ERRORS[errorCode] ?? 'Google sign-in did not complete. Try again.');
      navigate('/login/signin', { replace: true });
    };
    const finish = () => {
      const nonce = takeGoogleNonce();
      if (!code) return fail(params.get('error'));
      // No nonce: this tab never started a Google sign-in, so the link is someone else's.
      if (!nonce) return fail('AUTH_GOOGLE_CODE_INVALID');
      authenticateGoogle(code, nonce).then(
        (session) => {
          signIn(session);
          navigate('/', { replace: true });
        },
        (error) => fail(error?.code)
      );
    };
    // The Google popup: the tab that opened it finishes the sign-in, so this window closes.
    handToOpener(search.replace(/^\?/, '')).then((taken) => {
      if (!taken) return finish();
      window.close();
      // A browser that will not let it close: show the site rather than a blank page.
      setTimeout(() => navigate('/', { replace: true }), 300);
    });
  }, [search, navigate, authenticateGoogle, signIn]);

  return null;
}
