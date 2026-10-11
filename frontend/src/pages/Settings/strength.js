import React from 'react';

/* NAMED `strength.js` RATHER THAN `status.js`, AND THAT IS THE WINDOWS TRAP THIS PROJECT HAS NOW
 * HIT TWICE — the profile dialog's medal catalogue documents the first. The filesystem is
 * case-insensitive, so `import Status from './Status'` resolved to THIS module rather than to
 * `Status.jsx` beside it, and the build failed with "default is not exported" pointing at a file
 * that never claimed to export one. Same fix as there: give the data module a name of its own.
 */

/* `V` in `Tools-DlgQcNJh.js` — the account's security strength, verbatim:
 *
 *   const password = passwordExist,
 *         email    = emailVerified && !!email,
 *         phone    = hasPhone,
 *         twofa    = google2StepAuth;
 *   isWeak   = !email && !phone && !twofa
 *   isMedium = email || phone || twofa
 *   isStrong = password && email && phone && twofa
 *
 * TWO THINGS ABOUT IT THAT READ AS BUGS AND ARE THE ORIGINAL'S. `isMedium` and `isStrong` are not
 * exclusive — a fully-set-up account is both — which is fine because every consumer tests strong
 * first. And `isWeak` ignores the password entirely, so an account with a password and nothing
 * else is Weak while one with only a verified email is Medium.
 *
 * Two consumers: the Security pane's badge (Weak red / Medium amber / Strong brand) and the rail's
 * attention mark, which is the same reading of the same four fields.
 *
 * BOTH READ "Weak" NOW, and getting there was a fixture edit rather than a change here: `SIGNED_IN`
 * carried `emailVerified: true` on a stale note about the account menu, which made this Medium
 * where the capture is Weak — and made the e-mail surfaces show their settled halves. The field is
 * false, and note it is `isWeak`'s indifference to the password that lets an account with one still
 * read Weak.
 */
export function securityStatus(session) {
  const password = Boolean(session.passwordExist);
  const email = Boolean(session.emailVerified && session.email);
  const phone = Boolean(session.hasPhone);
  const twofa = Boolean(session.google2StepAuth);

  const isStrong = password && email && phone && twofa;
  const isMedium = email || phone || twofa;
  const isWeak = !email && !phone && !twofa;

  return {
    isWeak,
    isMedium,
    isStrong,
    statusText: isStrong ? 'Strong' : isMedium ? 'Medium' : 'Weak',
  };
}

/* `ge` in `index-baue7lPM.js`, exported as `useRedDotStorage` and imported BY THE LAYOUT from the
 * Account Info pane — a `localStorage` flag under `exclusive_communities` that the rail reads to
 * decide whether to draw a red dot on the Account Info row.
 *
 * It is written by the pane, not by the hook: the community-links fetch sets `"true"` when the
 * account has none and `"false"` when it has some and the visitor has not opened the row yet;
 * clicking a community square sets `"true"` and the dot goes. So the dot means "there is something
 * here you have not seen", and with no communities in this build's fixture it is never drawn.
 *
 * The `storage` listener plus the hand-dispatched `StorageEvent` is the chunk's own: `localStorage`
 * fires `storage` only in OTHER tabs, so writing the event by hand is what makes the rail in THIS
 * tab notice. Reproduced, since two components genuinely read one key.
 */
const KEY = 'exclusive_communities';

const read = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    /* Private windows and disabled site data throw on read, the same guard `context/persist.js`
       documents. A rail that cannot render is worse than a dot that never shows. */
    return null;
  }
};

export function useRedDot() {
  const [value, setValue] = React.useState(read);

  React.useEffect(() => {
    const onStorage = (event) => {
      if (event.key === KEY) setValue(event.newValue);
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const write = React.useCallback((next) => {
    try {
      localStorage.setItem(KEY, next);
      window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: next }));
    } catch {
      /* As above. */
    }
    setValue(next);
  }, []);

  return [value, write];
}
