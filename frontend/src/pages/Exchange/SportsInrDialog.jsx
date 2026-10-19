import { useNavigate } from 'react-router-dom';
import DialogShell from '../../components/shared/DialogShell';
import { useSession } from '../../context/session';
import { exchangeCode } from '../../utils/exchange/stakeCurrency';

/**
 * The exchange is INR-only (owner, 2026-10-19): any `/sports` page with a non-INR header wallet
 * asks to switch. Switch to INR commits the same settings pair the header dropdown's pick does;
 * Go back, the cross and Escape all leave the sports pages for `/`. Mounted by App.jsx on `/sports*`.
 */
export default function SportsInrDialog() {
  const navigate = useNavigate();
  const { session, balances, setSetting } = useSession();
  if (!session?.login || exchangeCode(session.setting?.currencyName) === 'INR') return null;

  const leave = () => navigate('/');
  const switchToInr = () => {
    const row = balances?.find?.((b) => b.aliasCurrencyName === 'INR')?.currencyName ?? 'INRFIAT';
    setSetting('currencyBonusType', '');
    setSetting('currencyName', row);
  };

  return (
    <DialogShell title="Sports betting is in INR" onClose={leave} size="lg:!h-[15rem]">
      <div className="pb-4 pt-2">
        <p className="text-sm text-secondary">Sports betting is in INR — switch your currency to INR to continue.</p>
        <div className="mt-6 flex gap-3">
          <button type="button" className="button button-m button-second flex-1" onClick={leave}>
            Go back
          </button>
          <button type="button" className="button button-m button-brand flex-1" onClick={switchToInr}>
            Switch to INR
          </button>
        </div>
      </div>
    </DialogShell>
  );
}
