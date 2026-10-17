import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSession } from '../../../context/session';
import { toast } from '../../shared/Toast/toast';
import { GOOGLE_ERRORS } from '../../../services/googleAuth';

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
    if (!code) return fail(params.get('error'));
    authenticateGoogle(code).then(
      (session) => {
        signIn(session);
        navigate('/', { replace: true });
      },
      (error) => fail(error?.code)
    );
  }, [search, navigate, authenticateGoogle, signIn]);

  return null;
}
