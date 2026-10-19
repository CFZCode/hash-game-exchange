import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../../context/session';
import { useGates } from '../../../context/gates';
import { walletCoins } from '../../../services/gates';
import { amount2usd, walletCode } from '../../../utils/currency';
import { useResource } from '../../../hooks/useResource';
import { getBonusBalance, claimUnlockedBonus } from '../../../services/bonus';
import { useSelectedCurrency } from '../../../hooks/useSelectedCurrency';
import SelectCurrencyContent from './CurrencyList';
import LocalAmountItem from '../../../components/shared/LocalAmountItem';
import { groupWallet, passesHideSmall } from './utils';
import coinImg from '../../../assets/wallet/coin.png';

/* `/wallet/balance` — `index-gRxyMfB6.js`, off `hash.game/assets/`. It is 4 KB and is almost
 * entirely wiring: a summary card it defines itself, and the currency list, which is
 * `SelectCurrencyContent` configured with eleven props. See CurrencyList.jsx for that half.
 *
 * The page is `<div class="rounded-xl bg-layer4 p-4 lg:px-8">` holding the two.
 *
 * DESKTOP ONLY ON THE ORIGINAL, by its route rather than by its markup:
 * `guards: [() => (mobile || isFiat) && "/deposit"]` — a phone never sees this page, it is sent to
 * the deposit dialog. `/deposit` is not built here, so the guard is not reproduced; below 1100 the
 * wallet layout's own strip arm renders and this pane comes with it.
 */

/* `ot` — one of the three cells. `first` decides only the divider: the leading cell pads right,
   the other two carry a left border. */
function SummaryCell({ title, amount, first }) {
  return (
    <div className={first ? 'pr-4' : 'border-l border-third px-4'}>
      <div className="text-secondary">{title}</div>
      <div className="text-lg font-extrabold text-brand">{amount}</div>
    </div>
  );
}

/* `it` — the card.
 *
 * `bg-layer5` IS THE CAPTURE'S AND `bg-layerx` IS THE CHUNK'S, and the difference is recorded
 * rather than resolved. The file on `hash.game` writes `bg-layerx` — a Tailwind class over a
 * `--layerx` custom property, which `index-DxOqNczA.css` only ever declares inside
 * `.light-layer2-tabs` and a couple of `[data-selected]` blocks, i.e. nowhere that reaches this
 * card. The rendered DOM says `bg-layer5`, the capture samples as layer5 against the layer4 panel,
 * and layer5 is a real token here — so the DOM wins. Do not "correct" this to `layerx`.
 *
 * The three figures are sums over the WHOLE wallet, each converted to the display currency first:
 *
 *   Total Balance    sumBy(coins, c => convertCurrency(c.amount,        c.currencyName))
 *   Deposit Balance  sumBy(coins, c => convertCurrency(c.generalAmount, c.currencyName))
 *   Bonus Balance    sumBy(coins, c => convertCurrency(c.bonusAmount,   c.currencyName))
 *
 * `convertCurrency` with its target left at the default is plain USD, which is exactly what
 * `amount2usd` is in this project — see the note on it in utils/currency.js. The original then
 * printed the USD total as dollars; this build prints it in the player's SELECTED currency
 * (`useSelectedCurrency`, the selected-currency skill), so the cards agree with the header.
 *
 * Deposit Balance and Bonus Balance are therefore NOT independent numbers — `amount` is the sum of
 * the other two on every row, so the first cell is the sum of the next two. That is worth knowing
 * before anyone "fixes" a fixture where they disagree.
 */
const noBonus = () => Promise.resolve(null);

function Summary({ balances }) {
  // Summed in USD (amount2usd), then printed in the header's selected currency: the
  // wallet columns are the deposit money; bonus money is held apart (`/user/bonus-balance`).
  const cur = useSelectedCurrency();
  // Agent's player: no bonus at all — no read, no Bonus cell (user, 2026-10-18).
  const bonusOn = useGates().on('bonus');
  const [reloads, setReloads] = React.useState(0);
  const readBonus = React.useCallback(() => (bonusOn ? getBonusBalance() : noBonus()), [bonusOn, reloads]); // eslint-disable-line react-hooks/exhaustive-deps
  const { data: bonus } = useResource(readBonus);
  const depositUsd = balances.reduce((sum, coin) => sum + amount2usd(coin.generalAmount, coin.currencyName), 0);
  const bonusUsd = (bonus?.balances ?? []).reduce((sum, b) => sum + amount2usd(b.amount, walletCode(b.currency)), 0);
  const cells = [
    { title: 'Total Balance', usd: depositUsd + bonusUsd },
    { title: 'Deposit Balance', usd: depositUsd },
    { title: 'Bonus Balance', usd: bonusUsd },
  ].filter((cell) => bonusOn || cell.title !== 'Bonus Balance').map(({ title, usd }) => ({ title, amount: cur.show(usd, 'USDFIAT') }));

  /* hash.game's locked deposit bonus: what is still locked, what has unlocked, and a Claim button. */
  const gradual = (bonus?.active ?? []).filter((b) => b.unlockMode === 'gradual');
  const lockedUsd = gradual.reduce((sum, b) => sum + amount2usd(b.locked, walletCode(b.currency)), 0);
  const claimableUsd = gradual.reduce((sum, b) => sum + amount2usd(b.claimable, walletCode(b.currency)), 0);
  const [claiming, setClaiming] = React.useState(false);
  const claim = () => {
    setClaiming(true);
    Promise.resolve(claimUnlockedBonus())
      .catch((error) => console.warn('[bonus] claim refused', error?.code ?? error))
      .finally(() => {
        setClaiming(false);
        setReloads((n) => n + 1);
      });
  };

  return (
    <>
      <div className="mb-5 flex items-center rounded-xl bg-layer5 p-5">
        <img className="mr-4 h-6 w-6" alt="coin" src={coinImg} />
        {cells.map((cell, index) => (
          <SummaryCell key={cell.title} title={cell.title} amount={cell.amount} first={index === 0} />
        ))}
      </div>
      {gradual.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-4 rounded-xl bg-layer5 p-5">
          <SummaryCell title="Locked Bonus" amount={cur.show(lockedUsd, 'USDFIAT')} first />
          <SummaryCell title="Unlocked" amount={cur.show(claimableUsd, 'USDFIAT')} />
          <button type="button" className="button button-brand button-m ml-auto px-6" disabled={claiming || claimableUsd <= 0} onClick={claim}>
            Claim
          </button>
          <p className="w-full text-xs text-secondary">Every bet unlocks part of your bonus (wager × house edge × 1%). Claim it any time — no expiry.</p>
        </div>
      )}
    </>
  );
}

/* `D` in `tt` — the header slot handed to `SelectCurrencyContent`, which is why the switch and the
   search field share one sticky row. `mr-10` is the 40px between them. */
function HideZeroBalance({ on, onToggle }) {
  return (
    <div className="mr-10 flex flex-auto items-center">
      {/* `<Switch size="small">`, the same `.switch.switch-xs` the account dropdown's Do Not
          Disturb row uses. A `<button role="switch">` here rather than the chunk's bare `<div>`,
          because unlike that row this one is not nested inside another button. */}
      <button
        type="button"
        role="switch"
        aria-checked={!!on}
        aria-label="Hide 0 balance"
        className="switch switch-xs flex items-center"
        onClick={onToggle}
      >
        <div />
      </button>
      <div className="ml-2 text-secondary">Hide 0 balance</div>
    </div>
  );
}

/* `tt` — the list half of the page. */
function CurrencyList() {
  const { session, balances, updateBalance, setSetting } = useSession();
  const navigate = useNavigate();
  const { on, agentPlayer } = useGates();
  const [searching, setSearching] = React.useState(false);

  /* `X(Q(h, "sort"), U)` — `partition(orderBy(wallet, "sort"), c => c.display)`. The wallet holds
     a row for every currency the site supports; `display` is what the account has switched on.
     `L()` (the hidden half) is `[]` when the deploy is `isFiat`, which bc.game's is not. */
  const ordered = React.useMemo(
    () => [...walletCoins(balances, agentPlayer)].sort((a, b) => a.sort - b.sort),
    [balances, agentPlayer],
  );
  const shown = React.useMemo(() => ordered.filter((coin) => coin.display), [ordered]);
  const hidden = React.useMemo(() => ordered.filter((coin) => !coin.display), [ordered]);

  /* `A()` — the hidden rows are appended as a "HIDE" group ONLY while something is typed, which is
     what gives that group's "Other Supported Coin(Click to add and use Coins)" heading something
     to list. Clicking one of those rows un-hides it; see `onChange`. */
  const groups = React.useMemo(() => {
    const base = groupWallet(shown);
    return searching ? [...base, ['HIDE', hidden]] : base;
  }, [shown, hidden, searching]);

  /* `E` in the chunk:
   *
   *   e.onChange(r);                                    // the wallet's selected coin
   *   h[r]?.display === false ? setWallet(r, "display", true)
   *                           : search && (bump(), setWallet(r, "displayStatus", 1))
   *
   * Two different writes. Picking a HIDDEN row adds it to the wallet. Picking a visible row while
   * a search is open PINS it (`displayStatus: 1`), so it survives "Hide 0 balance" once the search
   * clears — which is the mechanism context/account.js describes for INRFIAT.
   *
   * `e.onChange` is `wallet.updateCurrency`, the deposit/withdraw currency in `wallet-09IbmbkQ.js`.
   * That store is not built here and nothing on this page renders from it: `itemClass` is passed,
   * so the selected row takes no highlight, and `autoScroll` is off. The call is left out rather
   * than stubbed, and the two writes that DO show are what this does.
   */
  const onChange = (currencyName) => {
    const coin = balances.find((entry) => entry.currencyName === currencyName);
    if (coin && coin.display === false) updateBalance(currencyName, { display: true });
    else if (searching) updateBalance(currencyName, { displayStatus: 1 });
  };

  /* `I` — the right-hand end of every row. The two buttons are `.button.button-m` with the row's
     own padding; both navigate, and neither destination is built. */
  /* Gated like the header's Deposit button: an agent-tree player (or a closed cashier rail) gets
     no Deposit / Withdraw on the rows, since both routes would only bounce to `/`. */
  const renderRight = (coin) => (
    <>
      <LocalAmountItem item={coin} settings={session.setting} />
      {on('deposit') && (
      <button
        type="button"
        className="button button-m px-3 font-extrabold text-brand"
        onClick={(event) => {
          event.stopPropagation();
          navigate('/wallet/deposit');
        }}
      >
        Deposit
      </button>
      )}
      {on('withdraw') && (
      <button
        type="button"
        className="button button-m px-3 font-extrabold text-brand"
        onClick={(event) => {
          event.stopPropagation();
          navigate('/wallet/withdraw');
        }}
      >
        Withdraw
      </button>
      )}
    </>
  );

  return (
    <SelectCurrencyContent
      groups={groups}
      header={
        <HideZeroBalance
          on={session.setting.hideSmallCurrency}
          onToggle={() =>
            setSetting('hideSmallCurrency', !session.setting.hideSmallCurrency)
          }
        />
      }
      /* THE OFFSETS ARE THIS PAGE'S, because the chunk's measure a pane-local scroller this
         build does not have — the whole reasoning is on the prop in CurrencyList.jsx.
         `top-15` is 60px, the fixed header's own height, so a section title comes to rest
         directly against the header with the pane's rows passing under it. It shares that band
         with the page heading, which pins at the same 60 — but they are in different columns
         (the heading's text sits at the far left of a `w-full` row, the title in the pane), so
         only their backgrounds meet and both are opaque. The title is later in the DOM at the
         same `z-10`, so it paints over the heading's band rather than under it.
         `top-30` (120, below the heading) was tried first and reads worse: it floats the title a
         heading's height down from the header with its own rows already gone past.
         The search row's own pin stays dropped — it collided with the heading, and it is not a
         section title. */
      stickyClasses={{ header: '', group: 'sticky top-15 z-10' }}
      filter={(coin, query) => passesHideSmall(coin, query, session.setting)}
      onSearchChange={(value) => setSearching(!!value)}
      renderRight={renderRight}
      showBonus
      bgClass="bg-layer4"
      itemClass="cursor-default rounded-none border-t border-transparent px-3 py-2"
      groupItemClass="overflow-hidden rounded-xl bg-layer5 first:border-none [&>div+div]:border-third"
      onChange={onChange}
    />
  );
}

export default function Balance() {
  const { balances } = useSession();

  return (
    <div className="rounded-xl bg-layer4 p-4 lg:px-8">
      <Summary balances={balances} />
      <CurrencyList />
    </div>
  );
}
