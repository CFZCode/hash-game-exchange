import { request } from './client';

/* Player-to-player tips (backend modules/tip). Bare codes on the wire: `INRFIAT` → `INR`. */
const bare = (currency) => String(currency || '').replace(/FIAT$/, '');

/** Usernames matching `q` that can be tipped — `[{ name, … }]`. */
export const searchTipUsers = (q) =>
  Promise.resolve(request(`/api/v1/user/tip/users?q=${encodeURIComponent(q)}`, { live: true, fixture: [] }));

/** Sends the tip; `requestId` makes a retried press move the money once. */
export const sendTip = ({ toUsername, currency, amount, note, requestId }) =>
  Promise.resolve(
    request('/api/v1/user/tip/send', {
      live: true,
      method: 'POST',
      json: { toUsername, currency: bare(currency), amount: String(amount), note: note || null, requestId },
      fixture: null,
    }),
  );
