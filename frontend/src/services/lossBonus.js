import { request } from './client';

/* THIS BUILD'S — the loss bonus (lossback; user, 2026-10-28). `GET /user/loss-bonus` is the
   Super Admin's terms plus the last period's net loss and bonus; `POST …/claim` pays it once the
   player has confirmed. No fixture: with fixtures on there is no loss bonus to show. An agent
   player's read is refused (no promotions) and comes back as null, which hides the card. */
export const getLossBonus = () =>
  Promise.resolve(request('/api/v1/user/loss-bonus', { live: true, fixture: null })).catch(() => null);

export const claimLossBonus = () =>
  request('/api/v1/user/loss-bonus/claim', { live: true, method: 'POST', fixture: null });
