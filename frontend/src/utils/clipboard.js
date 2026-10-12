import { toast } from '../components/shared/Toast/toast';

/* `A5` in index-BsFv7ByC.js (exported as `be`) — the site's one clipboard write. It tries the
 * async API and falls back to a hidden read-only <input> plus `execCommand("copy")` both when the
 * API is missing and when its promise rejects, which is what makes a copy work on a plain-http
 * origin or an unfocused document. Fire and forget: the caller never learns which arm ran.
 */
let fallbackInput = null;

function copyByInput(text) {
  try {
    if (!fallbackInput) {
      fallbackInput = document.createElement('input');
      document.body.appendChild(fallbackInput);
      fallbackInput.style.opacity = '0';
      /* Off-screen as well — the original's input sits in the flow at opacity 0, which here
         would add a line to the bottom of the page. */
      fallbackInput.style.position = 'fixed';
      fallbackInput.style.top = '-100px';
      fallbackInput.setAttribute('readonly', 'readonly');
    }
    fallbackInput.setAttribute('value', text);
    fallbackInput.select();
    document.execCommand('copy');
  } catch {
    /* Nothing left to try. */
  }
}

export function copyToClipboard(text) {
  const value = String(text);
  if (navigator.clipboard?.writeText) {
    let pending;
    try {
      pending = navigator.clipboard.writeText(value);
    } catch {
      copyByInput(value);
      return;
    }
    if (pending && typeof pending.then === 'function') pending.catch(() => copyByInput(value));
    else copyByInput(value);
  } else {
    copyByInput(value);
  }
}

/* `clipboard-Bk_Cr50k.js`, whole:
 *
 *   function f(e) { e ? (be(e), F(o("Copied"))) : F.error(o("Copy failed")) }
 *
 * — the copy every wallet, deposit and transaction screen uses. "Copied" is a BARE `F`, so it is
 * an error-TYPED toast with no icon (see `toast.js`), and an empty value is the only failure it
 * knows about. */
export function copyWithToast(text) {
  if (text || text === 0) {
    copyToClipboard(text);
    toast('Copied');
  } else {
    toast.error('Copy failed');
  }
}
