import React from 'react';
import { useSession } from '../../../context/session';
import { splitAmount } from './format';

/* The component half of `X`; the formatter it renders is `format.js`, split out for the reason
   `pages/Referral/format.js` is — `react-refresh/only-export-components` forbids a module that
   exports a component from exporting anything else. */
export default function BonusCurrencyAmount({ currency, amount, target, className = '' }) {
  const { session } = useSession();
  const to =
    target ?? (session.setting?.enableLocaleCurrency ? session.setting.localeCurrencyName : currency);

  const parts = React.useMemo(
    () => splitAmount(currency, amount, to),
    [currency, amount, to],
  );

  return (
    <span className={`inline-flex min-w-0 items-center overflow-hidden ${className}`}>
      {parts.prefix && <span className="shrink-0">{parts.prefix}</span>}
      <span className="truncate">{parts.amount}</span>
      {parts.suffix && <span className="ml-0.5">{parts.suffix}</span>}
    </span>
  );
}
