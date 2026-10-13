import React from 'react';
import RouteDialog from '../../shared/RouteDialog';
import Input from '../../shared/Input';
import { IconGift } from '../../../layouts/MainLayout/Header/AfterLogin/icons';
import { IconRedeem } from '../../../pages/Bonus/icons';
import { coinIcon } from '../../../utils/coinArt';
import { useSession } from '../../../context/session';
import { redeemGiftCard } from '../../../services/giftCards';

/* The sidebar's Gift Card dialog — this build's own screen (bc.game has no gift cards; the user
 * asked for one in the BC Token card's slot), assembled only out of the site's own parts so it
 * reads as hash.game: `RouteDialog` (the shell every dialog here uses, both arms), the shared
 * `.input`, the header's gift glyph (`$r` in Enter-MsmOuq5R.js) and the `/bonus` Redeem bar's
 * own button + `IconRedeem`.
 *
 * Mounted from the Sidebar as local state rather than as a dialog route, the same arrangement the
 * Refer and Earn dialog has there. The redeem is `services/giftCards.js`: activate by code, then
 * claim straight away when the card has no deposit / wager condition. A refusal shows the
 * platform's own message under the field.
 */

/* `"25.00000000"` -> `"25"`, the same trim the `/bonus` redeem toast uses. */
const trimAmount = (value) =>
  String(value).includes('.') ? String(value).replace(/0+$/, '').replace(/\.$/, '') : String(value);

function Conditions({ card }) {
  const parts = [];
  if (card.depositRequired) parts.push(`a single deposit of ${trimAmount(card.depositAmount ?? 0)} ${card.currency ?? ''}`.trim());
  if (card.wagerRequired) parts.push(`wagering ${card.wagerTimes ?? 0}x`);
  return parts.join(' and ');
}

export default function GiftCardDialog({ onClose }) {
  const { refreshBalances } = useSession();
  const [code, setCode] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState('');
  const [result, setResult] = React.useState(null);

  const submit = async (event) => {
    event?.preventDefault();
    const value = code.trim();
    if (!value || pending) return;
    setPending(true);
    setError('');
    try {
      const answer = await redeemGiftCard(value);
      setResult(answer);
      if (answer.status === 'claimed') refreshBalances?.();
    } catch (failure) {
      setError(failure?.message || 'Gift card not found');
    } finally {
      setPending(false);
    }
  };

  const coin = result?.currency ? coinIcon(result.currency) : null;

  return (
    <RouteDialog title="Gift Card" onClose={onClose}>
      <div className="flex w-full flex-col items-center pb-6 pt-8">
        <div className="center size-20 rounded-full bg-layer4">
          <IconGift className="size-12 fill-current text-brand" />
        </div>

        {result?.status === 'claimed' ? (
          <>
            <div className="mt-6 text-2xl font-extrabold text-primary">REDEEMED!</div>
            <div className="mt-3 flex items-center gap-2 text-xl font-extrabold text-brand">
              {coin ? <img alt={result.currency} className="size-6" src={coin} /> : null}
              <span>
                +{trimAmount(result.amount ?? 0)} {result.currency ?? ''}
              </span>
            </div>
            <p className="mt-2 text-center text-sm font-semibold text-secondary">
              Added to your {result.currency ?? ''} balance.
            </p>
            <button type="button" className="button button-brand button-m mt-6 w-full" onClick={onClose}>
              Done
            </button>
          </>
        ) : result?.status === 'activated' ? (
          <>
            <div className="mt-6 text-2xl font-extrabold text-primary">Gift card activated</div>
            <div className="mt-3 flex items-center gap-2 text-xl font-extrabold text-brand">
              <span>
                {trimAmount(result.card.amount ?? 0)} {result.card.currency ?? ''}
              </span>
            </div>
            <p className="mt-2 text-center text-sm font-semibold text-secondary">
              Complete <Conditions card={result.card} /> to unlock it, then enter the code again to claim.
            </p>
            <button type="button" className="button button-brand button-m mt-6 w-full" onClick={onClose}>
              OK
            </button>
          </>
        ) : (
          <form className="mt-6 flex w-full flex-col" onSubmit={submit}>
            <p className="mb-4 text-center text-sm font-semibold text-secondary">
              Enter your gift card code to add its reward to your balance.
            </p>
            <div className="mb-2 text-secondary">Gift card code</div>
            <Input
              value={code}
              onChange={(value) => {
                setCode(value);
                if (error) setError('');
              }}
              className="!h-[52px] bg-input_darken [&>input::placeholder]:text-tertiary [&>input]:text-base [&>input]:font-semibold"
              placeholder="Enter code here..."
              autoFocus
              autoComplete="off"
            />
            {error ? <p className="mt-2 text-xs font-semibold text-error">{error}</p> : null}
            <button
              type="submit"
              disabled={!code.trim() || pending}
              className="button button-brand button-m mt-6 flex w-full gap-x-1"
            >
              <IconRedeem className="icon size-5 fill-current" />
              {pending ? 'Redeeming…' : 'Redeem'}
            </button>
          </form>
        )}
      </div>
    </RouteDialog>
  );
}
