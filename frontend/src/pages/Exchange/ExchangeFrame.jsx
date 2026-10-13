import MenuPageLayout from '../../components/shared/MenuPageLayout';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import ExchangeRail, { ExchangeTools } from './ExchangeRail';
import Notice from '../../components/shared/Notice';
import { useSession } from '../../context/session';
import { getAlias } from '../../utils/currency';

/**
 * The exchange books, settles and shows every figure in INR (₹) whatever the header wallet is,
 * so a player on any other currency (USDT, BTC…) is told so before staking — otherwise "100" on
 * the slip reads as 100 of their own coin. Signed-in, non-INR wallets only. Says nothing about
 * how funds move between wallets: that is not this note's to promise.
 */
export function ExchangeCurrencyNote({ className = 'mt-3' }) {
  const { session } = useSession();
  const code = String(session?.setting?.currencyName ?? '');
  if (!session?.login || !code || code === 'BCD' || /^INR(FIAT)?$/i.test(code)) return null;
  return (
    <Notice type="warning" className={className}>
      Sports exchange bets are in INR (₹). Stakes, profit, liability and exposure on these pages are
      shown in INR, not in {getAlias(code)}.
    </Notice>
  );
}

/**
 * The exchange's page frame: the sports rail across the top, then the page.
 *
 * `px-4 sm:px-0` is the sports page's own gutter pair (pages/Sports/index.jsx carries why
 * `.main-layout-content` leaves the phone gutter to each page); the rail cancels it with
 * `-mx-4 sm:mx-0` so the bar runs edge to edge on a phone, as the BetBy rail did.
 */
export default function ExchangeFrame({ children }) {
  return (
    <div className="px-4 pb-4 sm:px-0">
      <div className="-mx-4 sm:mx-0">
        <ExchangeRail />
      </div>
      <ExchangeCurrencyNote />
      {children}
    </div>
  );
}

const MENU = [
  { key: 'lobby', title: 'Exchange', href: '/sports' },
  { key: 'my-bets', title: 'My Bets', href: '/sports/my-bets' },
  { key: 'statement', title: 'Statement', href: '/sports/statement' },
];

/**
 * My Bets / Statement: an account-like page, so on a desktop it is the site's MenuPageLayout
 * (sticky heading, left menu, pane) with the exchange tools at the heading's right; below `lg`,
 * where MenuPageLayout's 240px rail has no room, the exchange frame and a heading.
 *
 * The tools carry `-my-1`: they are 40px against the heading's 32px line, and MenuPageLayout
 * pins its menu at `top-30` — the heading's height — so the row must not grow.
 */
export function ExchangeAccountPage({ title, children }) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <MenuPageLayout
        menu={MENU}
        title={
          <div className="flex items-center justify-between gap-4">
            <span>{title}</span>
            <div className="-my-1">
              <ExchangeTools />
            </div>
          </div>
        }
      >
        <ExchangeCurrencyNote className="mb-3" />
        {children}
      </MenuPageLayout>
    );
  }

  return (
    <ExchangeFrame>
      <h1 className="pb-3 pt-4 text-lg font-extrabold leading-8">{title}</h1>
      {children}
    </ExchangeFrame>
  );
}
