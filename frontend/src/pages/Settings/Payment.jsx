import React from 'react';
import Loading from '../../components/shared/Loading';
import EmptyPlaceholder from '../../components/shared/EmptyPlaceholder';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { useResource } from '../../hooks/useResource';
import { getPaymentCards, getPaymentHistory } from '../../services/settings';
import { IconAdd } from './icons';
import { useButtonSize } from './buttonSize';

/* `/settings/payment` — Payment Methods, `index-0oESBrPp.js`, 11 KB. Two cards: the saved cards
 * behind a three-tab filter, and the binding History.
 *
 * BOTH FEEDS ARE 403 AND THE CAPTURE IS WHAT AN EMPTY ACCOUNT LOOKS LIKE — "No card yet! Please
 * add a card" over the crocodile. Nothing is invented; see settings.js.
 */

const TABS = [
  { label: 'All Cards', value: 'all', types: '' },
  { label: 'Credit Cards', value: 'credit', types: 'CREDIT' },
  { label: 'Debit Cards', value: 'debit', types: 'DEBIT' },
];

/* `Qe` — the cards card. `var(--Chip-Group-Tab)` is the account remote's own token (#f5f5f5 light,
   #3a4142 dark) and is written INLINE by the chunk rather than through a class, which is why it is
   an inline style here too. See Settings.css for where the pair is declared. */
function Cards() {
  const isDesktop = useIsDesktop();
  const buttonSize = useButtonSize();
  const [tab, setTab] = React.useState(TABS[0]);
  const { data } = useResource(getPaymentCards);

  const list = data ?? [];
  const rows = tab.types === '' ? list : list.filter((row) => row.cardType === tab.types);

  const addButton = (className) => (
    <button
      type="button"
      className={`button ${buttonSize} ${className}`}
      style={{ background: 'var(--Chip-Group-Tab)' }}
    >
      <IconAdd className="size-5 fill-brand" />
      <span className="ml-2 font-extrabold text-brand">Add New Method</span>
    </button>
  );

  return (
    <div className="relative w-full rounded-lg bg-layer4 p-3 sm:px-6 sm:py-4">
      {/* THE ADD BUTTON IS ABSOLUTE ON A DESKTOP AND A FULL-WIDTH ROW ON A PHONE, and they are two
          separate elements in the chunk rather than one responsive button: the desktop one sits
          `absolute right-4` over the tab strip and opens an inline dropdown, the phone one sits
          under the divider and opens a bottom sheet. Only the desktop arm's placement is
          reproduced; both open a sheet listing the one method type, which is not built. */}
      {isDesktop ? addButton('absolute right-4 h-10 w-auto rounded-lg px-2 py-0') : null}

      <div className="hidden-scroll-bar flex h-9 w-full items-center overflow-x-auto">
        {TABS.map((row) => {
          const active = tab.value === row.value;

          return (
            <button
              key={row.value}
              type="button"
              className="center mr-1 h-9 rounded-lg p-2 sm:h-10 sm:px-4"
              style={{ background: active ? 'var(--Chip-Group-Tab)' : 'transparent' }}
              onClick={() => setTab(row)}
            >
              <span
                className={`whitespace-nowrap ${
                  active ? 'font-extrabold text-primary' : 'text-secondary'
                }`}
              >
                {row.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 w-full border-t border-solid border-third pt-3 sm:mt-4 sm:flex sm:flex-wrap sm:gap-2 sm:pt-4">
        {!isDesktop ? addButton('rounded-x mb-3 w-full') : null}
        {/* Both bind lists are shut (a bare 403 with `code: 4001`), so the message below is what
            lands — but it lands a beat later now, and the Add button above stays live throughout
            because it does not read the list. Same 60px box the History card below uses for its
            own pending arm, which is what keeps the two cards from jumping past each other. */}
        {!data ? (
          <div className="center h-60 w-full">
            <Loading className="w-full" />
          </div>
        ) : rows.length > 0 ? null : (
          /* THE EMPTY STATE IS DESKTOP-ONLY, which reads as an oversight and is the chunk's:
             `A(() => !!C.mobile)() ? null : <p>No card yet! …</p>`. A phone with no cards gets an
             empty box under the Add button and no message at all. */
          isDesktop ? (
            <p className="w-full text-center text-secondary">No card yet! Please add a card</p>
          ) : null
        )}
      </div>
    </div>
  );
}

/* `Pe` — the History card. `Me` maps a row's `reviewStatus` onto its colour and label: PENDING is
   amber "Pending", FAIL is red "Declined", anything else is brand "Passed". Note "Pending" is the
   one of the three the chunk does NOT pass through `t()`, so it is untranslated on the live site
   as well. Unreachable here — the list is empty. */
function History() {
  const isDesktop = useIsDesktop();
  const { data } = useResource(getPaymentHistory);

  return (
    <div className="mt-3 w-full rounded-lg bg-layer4 p-3 sm:mt-4 sm:px-6 sm:py-4">
      <div className="flex h-11 w-full items-center border-b border-solid border-third pb-3">
        <span className="text-base font-extrabold">History</span>
      </div>
      <div className="py-3 sm:py-4">
        {!data ? (
          <div className="center h-60 w-full">
            <Loading className="w-full" />
          </div>
        ) : data.length === 0 ? (
          <div className="center h-60 w-full">
            <EmptyPlaceholder className="w-full" />
          </div>
        ) : (
          <div className="w-full">
            <table className="w-full">
              <thead>
                <tr
                  className="h-12 font-extrabold text-secondary"
                  style={{ background: isDesktop ? 'rgba(0, 0, 0, 0.05)' : 'transparent' }}
                >
                  <th className="text-left sm:pl-2">Payment Method</th>
                  <th className="text-center">Payment Type</th>
                  <th className="text-right sm:pr-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr
                    key={row.cardId ?? row.accountId}
                    className="h-15 border-t border-solid border-third sm:h-12 sm:border-none"
                    style={{
                      background:
                        i % 2 === 1 && isDesktop ? 'rgba(0, 0, 0, 0.05)' : 'transparent',
                    }}
                  >
                    <td className="whitespace-nowrap text-left sm:pl-2">
                      {row.cardType === 'ACCOUNT' ? row.accountNumber : row.cardNumber || '-'}
                    </td>
                    <td className="text-center">{row.cardType || '-'}</td>
                    <td
                      className={`whitespace-nowrap text-right sm:pr-2 ${
                        row.reviewStatus === 'PENDING'
                          ? 'text-warning'
                          : row.reviewStatus === 'FAIL'
                            ? 'text-error'
                            : 'text-brand'
                      }`}
                    >
                      <span className="flex items-center justify-end gap-2">
                        {row.reviewStatus === 'PENDING'
                          ? 'Pending'
                          : row.reviewStatus === 'FAIL'
                            ? 'Declined'
                            : 'Passed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SettingsPayment() {
  return (
    /* `settings-page` IS THIS FILE'S ONLY ADDITION TO THE CHUNK'S CLASS LIST, and it carries the
       two `--Chip-Group-*` custom properties the tab pills and the Add button read INLINE. The
       remote declares them on its own root; scoping them to the one pane that reads them keeps the
       host's own `--Chip-Group-Tab`, which has a different light value, untouched everywhere else.
       See Settings.css. */
    <div className="settings-page py-4 sm:py-0">
      <Cards />
      <History />
    </div>
  );
}

/* Not built, each inert at its call site: Add New Method's picker (a popup listing "Card", gated
   behind `/account/kyc/statusV2/`'s `basicKycStatus === "approved"` and otherwise routing to
   `/wallet/intercept`), the `/wallet/card` and `/wallet/bank` forms behind it, a saved card's
   delete (`POST /payment/card/delete/` or `/payment/account/delete/` behind a confirm naming the
   card number), and the "Card Binding Failed" explainer behind a failed history row's mark, whose
   six numbered reasons are verbatim i18n in the chunk. */
