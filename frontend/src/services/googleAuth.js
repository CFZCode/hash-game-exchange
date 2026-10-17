import { fetchSharedJson, USE_FIXTURES } from './client';
import { SOCKET_BASE } from './realtime';
import { useResource } from '../hooks/useResource';

/* Google sign-in (backend modules/auth/google.js). The button shows only while the backend has
 * its keys (`GET /user/auth/google/status`). The start URL is the API ORIGIN itself, never the
 * Vercel same-origin proxy: the state cookie it sets must come back to the API on Google's
 * redirect, so start and callback have to share that host (SOCKET_BASE is that origin). */
export const GOOGLE_START_URL = `${SOCKET_BASE}/api/v1/user/auth/google/start`;

export const getGoogleLogin = () =>
  USE_FIXTURES ? null : fetchSharedJson('/api/v1/user/auth/google/status').then((body) => Boolean(body?.data?.enabled));

/** True once the backend says Google sign-in is configured. */
export function useGoogleLogin() {
  const { data } = useResource(getGoogleLogin);
  return data === true;
}

export const startGoogleLogin = () => window.location.assign(GOOGLE_START_URL);

/* Platform error codes the callback can come back with → what the player reads. */
export const GOOGLE_ERRORS = {
  AUTH_GOOGLE_EMAIL_IN_USE: 'An account with this email already exists. Sign in with your password.',
  AUTH_GOOGLE_NOT_CONFIGURED: 'Sign in with Google is not available right now.',
  AUTH_ACCOUNT_LOCKED: 'This account is locked. Contact support.',
  AUTH_GOOGLE_CODE_INVALID: 'That sign-in link expired. Try again.',
};
