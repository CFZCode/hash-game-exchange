import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import RouteDialog from '../../shared/RouteDialog';
import Input from '../../shared/Input';
import Select from '../../shared/Select';
import { showToast } from '../../shared/Toast/toast';
import { useSession } from '../../../context/session';
import { useIsDesktop } from '../../../hooks/useMediaQuery';
import { addWhitelistAddress, renameWhitelistAddress } from '../../../services/settings';
import { emit, WHITELIST_CHANGED } from '../../../context/appEvents';
import { getAlias } from '../../../utils/currency';
import { tokensFor } from '../../../data/currencyTokens';

/* `/settings/whitelist/add` and `/settings/whitelist/edit` — the two forms behind the Whitelist
 * Management pane's Add Address button and each row's pencil.
 *
 * ── WHAT THEY ARE ON THE ORIGINAL ─────────────────────────────────────────────────────────────
 *
 *   { path: "/settings/whitelist/add",  component: w("DialogAddWhite")  }
 *   { path: "/settings/whitelist/edit", component: w("DialogEditWhite") }
 *
 * in the group closed with `{ dialog: !0, guards: [ce] }` — so login-guarded DIALOG routes at
 * every width, not the `dialog: m.mobile` device test the six settings panes carry. That is why
 * they are matched on the pathname in App.jsx beside `<Routes>` like `/user-action/:action`, and
 * why this one component serves both a desktop and a phone.
 *
 * Both resolve through the `account` remote's manifest — `Add-b1yefrqj.js` (5.6 KB) and
 * `Edit-B-e1jOSZ.js` (4.9 KB), neither in the mirror, both off `hash.game/modules/account/assets/`
 * under the hashes `manifest-zssWG_dx.js` already lists. Every string, class list and element
 * order below is theirs. The edit chunk imports `useCurrencyTokens` FROM the add chunk, which is
 * why the two arms are one file here as well.
 *
 * ── THREE DEPARTURES, EACH FORCED BY THE PLATFORM ─────────────────────────────────────────────
 *
 * 1. NO `new-verify` STEP. Both forms `await promisify_new("new-verify")({scenario:
 *    "WITHDRAW_ADDRESS_EDIT"}) `and carry the resulting `flowId` into the write. There is no
 *    code-issuing endpoint behind this build, so it is skipped — the same call and the same
 *    reasoning as `components/modals/UserAction`: inventing a code step with nothing issuing the
 *    code is a dead end, not a port. It is the one thing on this pane worth building the day an
 *    OTP rail exists, because it is what stops a stolen session adding an address.
 *
 * 2. NO UNIVERSAL ADDRESS. The add form's third control is a checkbox — "Set as a universal
 *    address, without specific currency" — which drops `currencyName` from the payload and sends
 *    `addressType: 1` with a bare chain. This platform cannot store that: `currency` is NOT NULL
 *    on `user_withdrawal_whitelist` and the unique key is `(user_id, currency, address)`. A
 *    checkbox that submits a body the server refuses is the defect this codebase keeps writing
 *    down — a control that silently does nothing — so it is not drawn, and `toWhitelistRow`
 *    reports every row as Standard to match. The `disabled` prop it needed on `Select` was added
 *    anyway, because that is the original's own prop and the day this arm exists it is what
 *    greys the coin picker out.
 *
 * 3. EDIT RENAMES, IT DOES NOT RE-POINT. `PATCH /user/withdrawals/whitelist/:id` takes a label
 *    and nothing else, deliberately: changing an address in place is indistinguishable from
 *    substituting an attacker's, so the platform makes it delete-then-add. The form is the
 *    original's, with Currency, Network and Address rendered as the values they hold and
 *    disabled — the pane's own `.input[data-disabled]` and `button:disabled` rules were already
 *    in the stylesheet for exactly this. The one line of copy explaining it is this build's, and
 *    is flagged at its call site.
 *
 * THE EDIT DIALOG'S TITLE IS "Add Address" ON THE ORIGINAL — `f(O,{get title(){return m("Add
 * Address")}})` in `Edit-B-e1jOSZ.js`, plainly a copy-paste from the file it was forked out of,
 * since the i18n bundle carries no "Edit Address" key at all. Kept, for the reason `f-ull` and
 * the disable confirm's "Remove Passkey" heading are kept; `EDIT_TITLE` below is the one-line
 * revert if it should ever read truthfully instead.
 */

/* `Edit-B-e1jOSZ.js`'s own, and it is wrong on the original. See the note above. */
const EDIT_TITLE = 'Add Address';

/* `le`/`Q` — `useCurrencyTokens`, a resource over
   `/game/support/system/conf/currencyTokens?currencyName=<COIN>` keyed on the picked currency,
   with `initialValue: []` and a ten-minute cache. That feed is CAPTURED for all 89 coins in
   `data/currencyTokens.js` (a `system/conf` path, so it answered unauthenticated), which makes
   this a table lookup rather than a read — no request, no loading arm, and the original's own
   `k(() => setToken(tokens()[0]))` becomes a plain derivation. */
const useTokens = (currency) => React.useMemo(() => tokensFor(currency), [currency]);

/* `O` in the add chunk: every wallet currency that is not fiat, is displayed, and is not an
   `mnft`. `balances` is this build's equivalent of the original's `H` currency map and carries
   the same `display` flag; the mnft test has no counterpart here, since no row in the captured
   catalogue declares that type. Filtered to coins that HAVE tokens as well — a coin with no
   chain in the table cannot fill the Network select, and the original's list is drawn from the
   same feed one step earlier. */
const useCurrencies = (balances) =>
  React.useMemo(
    () =>
      (balances ?? [])
        .filter((row) => row.display && !row.currencyName.includes('FIAT'))
        .map((row) => row.currencyName)
        .filter((name) => tokensFor(name).length > 0),
    [balances],
  );

export default function WhitelistAddressDialog({ mode, onClose, onBack, enter }) {
  return (
    <RouteDialog
      title={mode === 'edit' ? EDIT_TITLE : 'Add Address'}
      onClose={onClose}
      onBack={onBack}
      enter={enter}
    >
      {mode === 'edit' ? <EditAddress /> : <AddAddress />}
    </RouteDialog>
  );
}

/* `ne` — the shared form template. Both chunks build the same four label rows out of it; the
   edit one simply stops after three. `mt-4 flex items-center` with a `<p class=text-secondary>`
   and a brand asterisk beside it. */
function FieldLabel({ children, required = true, className = 'mt-4' }) {
  return (
    <div className={`${className} flex items-center`}>
      <p className="text-secondary">{children}</p>
      {required && <span className="mx-1 text-brand">*</span>}
    </div>
  );
}

/* `<Button class="mb-8 mt-6 w-full" type="brand" submit>Save</Button>`, and the size class is
   the component's job on the original rather than the call site's: `s = L(() => t.size || !mobile
   && "m")`, so this is `.button`'s own 3rem on a phone and `.button-m`'s 2.5rem from `lg` up.
   `Dropdown` one file over resolves the identical rule the identical way; written out here
   because this project has no shared Button and three call sites have each pinned a size by hand
   instead. */
function SaveButton({ pending }) {
  const isDesktop = useIsDesktop();
  return (
    <button
      type="submit"
      className={`button button-brand ${isDesktop ? 'button-m ' : ''}mb-8 mt-6 w-full`}
      disabled={pending}
    >
      Save
    </button>
  );
}

/* The Network select, identical in both arms. `De` is the label — `ellipsis w-0 flex-auto
   text-left` keeps a long chain name from pushing the chevron out of the box, the same shape
   the withdraw form's own Network field uses. */
function NetworkSelect({ tokens, chain, onChange, disabled = false }) {
  const labelOf = (value) => tokens.find((token) => token.chain === value)?.label ?? value;

  return (
    <Select
      className="mt-2 w-full bg-input_bright"
      title="Network"
      value={chain}
      options={tokens.map((token) => token.chain)}
      onChange={onChange}
      disabled={disabled}
      labelFormat={(value) => (
        <div className="ellipsis w-0 flex-auto text-left">{labelOf(value)}</div>
      )}
    >
      {(value) => labelOf(value)}
    </Select>
  );
}

/* `fe` — the add form. */
function AddAddress() {
  const navigate = useNavigate();
  const { balances } = useSession();
  const currencies = useCurrencies(balances);

  /* `F.setting.currencyName.includes("FIAT") ? "USDT" : …` — the form opens on the wallet's own
     currency, and on USDT when that is a fiat one, since a fiat currency has no chains to pick
     from. Derived through a null sentinel rather than seeded into `useState`, because
     `currencies` arrives with the session and an initialiser would capture the empty first pass —
     the trap CLAUDE.md names and this project has hit twice. */
  const [picked, setPicked] = React.useState(null);
  const fallback = currencies.includes('USDT') ? 'USDT' : (currencies[0] ?? '');
  const currency = picked && currencies.includes(picked) ? picked : fallback;

  const tokens = useTokens(currency);
  /* `k(() => { const c = tokens(); setToken(c[0]) })` — the first token, re-derived whenever the
     currency changes. Same sentinel, for the same reason. */
  const [pickedChain, setPickedChain] = React.useState(null);
  const chain =
    pickedChain && tokens.some((token) => token.chain === pickedChain)
      ? pickedChain
      : (tokens[0]?.chain ?? '');

  const [addressName, setAddressName] = React.useState('');
  const [address, setAddress] = React.useState('');
  /* `t.alert` — the popover under the info mark — is gone with the universal-address row it
     belonged to. It was the last piece of that block still here after the row came out. */
  const [pending, setPending] = React.useState(false);

  /* The memo/tag field. TEN of the 186 captured tokens carry a `tagName` (XLM "Memo", XRP "Tag");
     the rest render no second input. bc.game's add form has no such field — it saves the memo
     with the withdrawal instead — but this platform stores one on the row and refusing to
     collect it would make those ten addresses unusable, so it is drawn where the token asks for
     it and nowhere else. The label is the token's own word, not an invented one. */
  const tagName = tokens.find((token) => token.chain === chain)?.tagName ?? '';
  const [memo, setMemo] = React.useState('');

  const submit = async (event) => {
    event.preventDefault();
    /* `if (!t.address || !t.addressName) return` — the original's own guard, ahead of the
       browser's, and the same belt-and-braces the password dialog keeps. */
    if (!address || !addressName || pending) return;

    setPending(true);
    try {
      await addWhitelistAddress({
        label: addressName,
        currency,
        network: chain || undefined,
        address,
        memo: tagName ? memo || undefined : undefined,
      });
      /* `p(-1), B.emit("add-white-addresss"), A(t("You have successfully added new address."))`,
         in that order and with the same event: the pane behind this dialog is a SIBLING of it,
         not a child, so the bus is what tells it to re-read. See context/appEvents. */
      emit(WHITELIST_CHANGED);
      showToast('You have successfully added new address.', { type: 'success' });
      navigate(-1);
    } catch (failure) {
      setPending(false);
      /* THE SERVER'S OWN MESSAGE. `ALREADY_WHITELISTED` and `TOO_MANY_ADDRESSES` both already
         read as something worth a visitor's time, and the auth dialog's note on `AUTH_MESSAGES`
         says why overriding one is a last resort rather than a habit. */
      showToast(failure?.message || 'Something went wrong. Please try again.', { type: 'error' });
    }
  };

  return (
    <form onSubmit={submit}>
      <FieldLabel>Address Name</FieldLabel>
      <Input
        className="mt-2"
        value={addressName}
        placeholder="e.g, Alison's Wallet (4-20 characters)"
        onChange={setAddressName}
      />

      {/* `re` — `mt-3`, and no asterisk, where every other label on this form is `mt-4` with one.
          Both differences are the chunk's; do not normalise them. */}
      <FieldLabel required={false} className="mt-3">
        Currency
      </FieldLabel>
      <Select
        className="mt-2 w-full bg-input_bright"
        title="Currency"
        value={currency}
        options={currencies}
        onChange={setPicked}
      >
        {(name) => <span>{getAlias(name)}</span>}
      </Select>

      <FieldLabel>Network</FieldLabel>
      <NetworkSelect tokens={tokens} chain={chain} onChange={setPickedChain} />

      <FieldLabel>Address</FieldLabel>
      <Input
        className="mt-2"
        value={address}
        placeholder="Enter Address"
        onChange={setAddress}
      />

      {tagName && (
        <>
          <FieldLabel required={false}>{tagName}</FieldLabel>
          <Input
            className="mt-2"
            value={memo}
            required={false}
            placeholder={`Enter ${tagName}`}
            onChange={setMemo}
          />
        </>
      )}

      {/* THE UNIVERSAL-ADDRESS ROW IS NOT DRAWN AT ALL — see departure 2 at the head of this
          file. It was briefly drawn without its checkbox, carrying a sentence of this build's own
          about the address being saved for one currency; that sentence is not in the chunk, so it
          is gone. The row's real content is the checkbox, its caption and an info popover, and all
          three are about a feature this platform cannot store. Restore the whole block together
          the day `currency` stops being NOT NULL. */}

      <SaveButton pending={pending} />
    </form>
  );
}

/* `ce` — the edit form. Reached from a row's pencil, which navigates with the whole row as
   router state; `G(() => { s.state || p(-1) })` bails straight back out when there is none, which
   is what a hand-typed URL gets. */
function EditAddress() {
  const navigate = useNavigate();
  const location = useLocation();
  const row = location.state;

  const [addressName, setAddressName] = React.useState(row?.addressName ?? '');
  const [pending, setPending] = React.useState(false);

  const tokens = useTokens(row?.currencyName ?? '');

  const submit = async (event) => {
    event.preventDefault();
    if (!addressName || pending) return;

    setPending(true);
    try {
      await renameWhitelistAddress(row.id, { label: addressName });
      /* `C.success(m("Address Saved"))` — the edit chunk's own string, and a different one from
         the add chunk's. Both are in the account remote's i18n bundle. The edit chunk emits
         nothing, because on the original it re-points a row the list already holds and the
         resource is refetched by its own key; here a rename must reach the pane the same way an
         add does. */
      emit(WHITELIST_CHANGED);
      showToast('Address Saved', { type: 'success' });
      navigate(-1);
    } catch (failure) {
      setPending(false);
      showToast(failure?.message || 'Something went wrong. Please try again.', { type: 'error' });
    }
  };

  /* `G(() => { s.state || p(-1) })` — `onMount`, and it LEAVES rather than drawing anything. This
     rendered a line of its own ("This address is no longer open.") which is not in the chunk, so
     it is gone: the arm is only reachable by typing the URL, and going back is both the original's
     behaviour and the more useful one. An effect rather than a render-time navigate, because that
     is where the chunk puts it and because navigating during render of a dialog that App.jsx is
     itself mid-render of is how the two disagree about the location. */
  React.useEffect(() => {
    if (!row) navigate(-1);
  }, [row, navigate]);

  if (!row) return null;

  return (
    <form onSubmit={submit}>
      <FieldLabel>Address Name</FieldLabel>
      <Input
        className="mt-2"
        value={addressName}
        placeholder="e.g, Alison's Wallet (4-20 characters)"
        onChange={setAddressName}
      />

      <FieldLabel required={false} className="mt-3">
        Currency
      </FieldLabel>
      <Select
        className="mt-2 w-full bg-input_bright"
        title="Currency"
        value={row.currencyName}
        options={[row.currencyName]}
        onChange={() => {}}
        disabled
      >
        {(name) => <span>{getAlias(name)}</span>}
      </Select>

      <FieldLabel>Network</FieldLabel>
      <NetworkSelect tokens={tokens} chain={row.chain} onChange={() => {}} disabled />

      <FieldLabel>Address</FieldLabel>
      <Input className="mt-2" value={row.withdrawAddress} onChange={() => {}} disabled />

      {/* NO EXPLANATORY LINE HERE EITHER. There was one — a `Notice` saying only the name can be
          changed — and it is not in the chunk, so it is gone with the rest of this build's own
          copy. The three `disabled` controls stay: they are the honest signal, since a field that
          accepts an edit the server will not apply is a lie and a field that plainly cannot be
          edited is not. Drop them the day `PATCH` takes more than a label. */}
      <SaveButton pending={pending} />
    </form>
  );
}
