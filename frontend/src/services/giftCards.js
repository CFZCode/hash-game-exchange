import { request } from './client';
import { PLATFORM } from './endpoints';

/* The sidebar Gift Card dialog's two writes (user-service `modules/gift-cards`).
 *
 * The platform's gift card is ACTIVATE-THEN-CLAIM: `POST /redeem {code}` resolves the typed key to
 * a card and activates it for this player (an unknown key and a card targeted at someone else
 * both answer 404 GIFTCARD_NOT_FOUND, so the box cannot probe keys), and `POST /claim
 * {giftCardId}` checks the card's deposit / wager conditions and credits the reward currency.
 *
 * A card with no conditions is claimed straight away, so the player sees the credit in one step.
 * A card WITH conditions is left activated: the claim would only refuse
 * (GIFTCARD_DEPOSIT_CONDITION_UNMET / _WAGER_CONDITION_UNMET), so the dialog says what is still
 * owed instead of calling it. Every refusal reaches the caller as the platform's own message.
 */

const claim = async (giftCardId, currency) => {
  const claimed = await request(PLATFORM.user.giftCards.claim, {
    live: true,
    method: 'POST',
    json: { giftCardId },
  });
  return { status: 'claimed', ...claimed, currency: claimed?.currency ?? currency };
};

/** `{status: 'claimed', amount, currency, newBalance}` or `{status: 'activated', card}`. */
export async function redeemGiftCard(code) {
  let activated;
  try {
    activated = await request(PLATFORM.user.giftCards.redeem, {
      live: true,
      method: 'POST',
      json: { code },
    });
  } catch (error) {
    /* Typed again after the conditions were met: the card is already this player's and still
       unclaimed, so the claim is the step left (it refuses with its own message if not). */
    const id = error?.details?.giftCardId;
    if (error?.code === 'GIFTCARD_ALREADY_ACTIVATED' && error?.details?.status === 'Activated' && id) {
      return claim(id);
    }
    throw error;
  }
  const card = activated?.card ?? {};
  if (card.depositRequired || card.wagerRequired) return { status: 'activated', card };
  return claim(activated?.giftCardId ?? card.id, card.currency);
}
