/* The referral code a visitor arrived with, kept until they sign up.
 *
 * Two link shapes reach this site: the one the Referral page prints (`/i-<code>-n/`, built from
 * this app's origin — see services/referral.js) and the platform's own `referralLink`
 * (`/referal/<code>`). App reads either off the path, stores the code here and opens Sign Up;
 * the Sign Up form starts with it filled in. localStorage so the code survives the visitor
 * browsing around (or reloading) before they register; cleared once an account is made with it.
 * Every access is guarded — storage throws in some private modes, and a lost code only means
 * the field starts empty. */

const KEY = 'pending-referral';

/* `/referal/` with ONE r is the platform's spelling. `/referral/<x>` is the signed-in Referral
   dashboard's own tabs and must never be read as a code. */
const LINK_PATTERNS = [/^\/i-([A-Za-z0-9_]+)-n\/?$/, /^\/referal\/([A-Za-z0-9_]+)\/?$/];

/** The code in a referral link's path, or null when the path is not one. */
export function referralCodeFromPath(pathname) {
  for (const pattern of LINK_PATTERNS) {
    const match = pattern.exec(pathname);
    if (match) return match[1];
  }
  return null;
}

export function savePendingReferral(code) {
  try {
    if (code) localStorage.setItem(KEY, code);
  } catch {
    /* storage unavailable */
  }
}

export function readPendingReferral() {
  try {
    return localStorage.getItem(KEY) || '';
  } catch {
    return '';
  }
}

export function clearPendingReferral() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}
