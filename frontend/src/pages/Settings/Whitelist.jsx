import React from 'react';
import { useNavigate } from 'react-router-dom';
import Select from '../../components/shared/Select';
import Switch from '../../components/shared/Switch';
import Loading from '../../components/shared/Loading';
import EmptyPlaceholder from '../../components/shared/EmptyPlaceholder';
import PopCenter from '../../components/shared/PopCenter';
import { toast, toastError } from '../../components/shared/Toast/toast';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { useEventRevision, WHITELIST_CHANGED } from '../../context/appEvents';
import { useResource } from '../../hooks/useResource';
import {
  getWhitelist,
  getWhitelistEnabled,
  removeWhitelistAddress,
  setWhitelistEnabled,
} from '../../services/settings';
import { getAlias } from '../../utils/currency';
import { coinIcon } from '../../utils/coinArt';
import { IconAdd, IconEdit, IconDelete, IconMoreVertical } from './icons';
import { useButtonSize } from './buttonSize';
import confirmArt from '../../assets/whitelist-confirm.png';

/* `/settings/whitelist` — Whitelist Management, `index-D7PTq2J_.js`, 13 KB. The withdrawal address
 * book: a switch that arms it, two filters, and a table.
 *
 * THE FOUR WRITES ARE WIRED (2026-09-04). This pane rendered "Whitelist Disabled" over an empty
 * table for as long as it existed, because `POST /payment/withdraw/address/list/` and `/check/`
 * both answer 403 on the original and there was no platform route behind them either. Both halves
 * are real now — `user_withdrawal_whitelist` and its five routes, migration 039 — so the switch
 * arms, the pencil renames, the bin deletes and Add Address opens a form. The two dialog routes
 * behind Add and Edit are `components/modals/WhitelistAddress`, matched in App.jsx.
 *
 * THE ROUTE AND THE MENU DISAGREE ON CASE ON THE ORIGINAL — the router declares this child as
 * `/whiteList` and the rail links to `/settings/whitelist`. Both resolve either way, since both
 * routers match case-insensitively by default; see menu.js.
 *
 * ── WHAT IS NOT PORTED, AND IT IS THE SAME OMISSION IN THREE PLACES ───────────────────────────
 *
 * Every write on this pane runs `promisify_new("new-verify")({scenario: "WITHDRAW_ADDRESS_EDIT"})`
 * first and carries the resulting `flowId` into the request — an e-mail or 2FA code before the
 * address book changes. Nothing behind this build issues that code, so all three skip it, exactly
 * as the password dialog does and for the reason written down there. It is the single most
 * valuable thing to add to this pane the day an OTP rail exists: the whole point of a whitelist is
 * that a stolen session cannot add to it, and without the code step a stolen session can.
 */

/* `ge()` — the Address Type filter, three fixed options. `Y()` masks an address to its first and
   last six characters with ten stars between, and only above eleven characters. */
const TYPE_OPTIONS = [
  { label: 'All Type', value: '' },
  { label: 'Universal Address', value: 1 },
  { label: 'Standard Address', value: 0 },
];

const ALL_NETWORKS = { label: 'All Network', value: '' };

const maskAddress = (value) =>
  !value || value.length < 12 ? value : `${value.slice(0, 6)}**********${value.slice(-6)}`;

/* `ze` — the delete confirm, pushed onto the popup stack rather than rendered inline. `V` is the
   generic dialog card, which is `PopCenter` here; the two buttons are `flex-1` inside a
   `mt-6 flex w-full items-center gap-3` row, and the body is centred at `text-base text-secondary`
   with its own `px-4`.

   NOTE THE INTERPOLATION IS THE ADDRESS **NAME**, not the address — "Are you sure you want to
   delete address __addressname__ ?" — so the row's label is what a visitor is asked about. */
function DeleteConfirm({ row, onCancel, onDeleted }) {
  const [pending, setPending] = React.useState(false);

  const confirm = async () => {
    if (pending) return;
    setPending(true);
    try {
      await removeWhitelistAddress(row.id);
      /* `F.success(s("Delete Success"))` — the chunk's own string. */
      toast.success('Delete Success');
      onDeleted();
    } catch (failure) {
      setPending(false);
      toastError(failure, 'Something went wrong. Please try again.');
    }
  };

  return (
    <PopCenter open title="Delete Address" onClose={onCancel}>
      <p className="px-4 text-center text-base text-secondary">
        Are you sure you want to delete address {row.addressName} ?
      </p>
      <div className="mt-6 flex w-full items-center gap-3">
        <button type="button" className="button button-second flex-1" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="button button-brand flex-1"
          disabled={pending}
          onClick={confirm}
        >
          Delete
        </button>
      </div>
    </PopCenter>
  );
}

/* `Ie` — the confirm that stands between the switch and turning enforcement OFF. Arming it needs
 * no confirm; disarming does, which is the right way round: one of those states protects money
 * and the other does not.
 *
 * ITS TITLE IS "Remove Passkey" ON THE ORIGINAL. `n(V, {get title(){return s("Remove Passkey")}})`
 * — a copy-paste from the passkey dialog this was forked out of, plainly wrong on a withdrawal
 * screen, and kept for the reason `f-ull` and the edit dialog's "Add Address" heading are kept.
 * `DISABLE_TITLE` is the one-line revert.
 *
 * `w-ful` on the image row is the chunk's own typo and generates nothing; kept, like the rest of
 * the dead classes. `-mt-8` on it and `-mt-20` on the paragraph are what pull a 320px-tall
 * illustration back into a dialog that is not 320px tall — the art is mostly transparent halo.
 */
const DISABLE_TITLE = 'Remove Passkey';

function DisableConfirm({ onCancel, onConfirm, pending }) {
  return (
    <PopCenter open title={DISABLE_TITLE} onClose={onCancel} className="pt-0">
      <div className="w-full">
        <div className="w-ful center flex -mt-8">
          <img alt="action" className="h-80 w-auto" src={confirmArt} />
        </div>
        <p className="-mt-20 text-center text-secondary">
          You will be able to withdraw to any withdrawal address, which may lead to greater risk.
          Are you sure you want to disable your withdrawal whitelist?
        </p>
        <div className="mt-6 flex w-full items-center gap-3">
          <button type="button" className="button button-second flex-1" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="button button-brand flex-1"
            disabled={pending}
            onClick={onConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </PopCenter>
  );
}

/* `De` — the phone row's three-dot menu. `Ae` is the anchor (`ml-auto size-8 relative`), `ke` the
   layer (`absolute top-full bg-layer2 px-3 py-1 w-40 right-0 rounded-xl`). It closes on any click
   outside, which is a directive on the original (`te(f => se(...))`) and a document listener here
   — the same shape `Select` and the Explore panel already use. */
function RowMenu({ onEdit, onDelete }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open]);

  return (
    <div ref={ref} className="relative ml-auto size-8">
      {/* `center flex` is NOT in the chunk's class list (`<button class=size-8>`) and is here
          deliberately: the original's icon wrapper prepends `icon`, whose own box fills the
          button, so its 32px target and its glyph coincide. This project's icons are the bare
          `<svg>`, so a `size-6` mark inside a `size-8` inline-block button sits at the start of
          the line box with the rest of the target empty — a 32px tap target whose middle is not
          over the dots. Centring it makes the box and the glyph agree again, which is what the
          `icon` class was doing. */}
      <button
        type="button"
        aria-label="More"
        className="center flex size-8"
        onClick={() => setOpen((v) => !v)}
      >
        <IconMoreVertical className="size-6 fill-secondary" />
      </button>
      {open && (
        <div className="absolute right-0 top-full w-40 rounded-xl bg-layer2 px-3 py-1">
          <button
            type="button"
            className="flex h-10 w-full items-center overflow-hidden whitespace-nowrap font-semibold"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
          >
            Edit
          </button>
          <button
            type="button"
            className="flex h-10 w-full items-center overflow-hidden whitespace-nowrap font-semibold"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

/* `Ce` — one address as a stack of label/value pairs, which is what the phone gets instead of the
   table. The Currency line is `Show`n only on a STANDARD address, because a universal one has no
   currency to name; every row on this platform is standard, so it always draws. `Se` is the
   fallback mark for a row with no currency at all — a `bg-quarterary` ring around a generic coin
   png that this build does not carry and cannot reach, since `currency` is NOT NULL on the table
   behind it. The ring is drawn empty rather than the row being left without one. */
function PhoneRow({ row, onEdit, onDelete }) {
  const art = row.currencyName ? coinIcon(row.currencyName) : null;

  return (
    <div className="w-full border-b border-b-third px-1 py-2">
      <div className="flex items-center">
        {art ? (
          <img alt="coin" className="size-6" src={art} />
        ) : (
          <div className="center flex size-6 rounded-full bg-quarterary" />
        )}
        <span className="ml-1 font-extrabold">{row.addressName}</span>
        <RowMenu onEdit={onEdit} onDelete={onDelete} />
      </div>
      {row.addressType === 0 && (
        <div className="mt-2 flex h-6 items-center justify-between">
          <span className="text-secondary">Currency</span>
          <span className="font-semibold">{getAlias(row.currencyName)}</span>
        </div>
      )}
      <div className="flex h-6 items-center justify-between">
        <span className="text-secondary">Address</span>
        <span className="font-semibold">{maskAddress(row.withdrawAddress)}</span>
      </div>
      <div className="flex h-6 items-center justify-between">
        <span className="text-secondary">Type</span>
        <span className="font-semibold">
          {row.addressType === 0 ? 'Standard Address' : 'Universal Address'}
        </span>
      </div>
      <div className="flex h-6 items-center justify-between">
        <span className="text-secondary">Network</span>
        <span className="font-semibold">{row.addressType === 0 ? row.label : row.chain}</span>
      </div>
      {/* "Last Updated" here where the desktop table's header says "Last Update". Both are the
          chunk's own; they really do differ by a letter. */}
      <div className="flex h-6 items-center justify-between">
        <span className="text-secondary">Last Updated</span>
        <span className="font-semibold">{new Date(Number(row.createTime)).toLocaleString()}</span>
      </div>
    </div>
  );
}

/* `J` — the filters and the table, returned as a fragment so the two are siblings of the card
   above rather than children of it. */
function AddressList({ reloads, onChanged }) {
  const isDesktop = useIsDesktop();
  const navigate = useNavigate();
  const read = React.useCallback(() => getWhitelist({ reloads }), [reloads]);
  const { data } = useResource(read);
  const [type, setType] = React.useState(TYPE_OPTIONS[0]);
  const [network, setNetwork] = React.useState(ALL_NETWORKS);
  /* The row a delete confirm is open for, or null. The original pushes the dialog onto a global
     popup stack; this build has none (see the note in PopCenter), so it is state here — which is
     also what keeps the row itself in hand for the confirm's message. */
  const [deleting, setDeleting] = React.useState(null);

  /* `data ?? []` wrapped rather than written inline, so the identity is stable across renders and
     the memo below does not rebuild its option list on every one. */
  const list = React.useMemo(() => data ?? [], [data]);

  /* THE NETWORK OPTIONS ARE BUILT FROM THE LIST, seeded with the All row — one entry per distinct
     `chain` — so an empty list leaves exactly that one option. The same arrangement the rollover
     pane's Bonus Type filter has, and it is why the filter is not a fixed table. */
  const networkOptions = React.useMemo(() => {
    const seen = [];
    list.forEach((row) => {
      if (!seen.some((option) => option.value === row.chain)) {
        seen.push({ label: row.chain, value: row.chain });
      }
    });
    return [ALL_NETWORKS, ...seen];
  }, [list]);

  const rows = list
    .filter((row) => (type.value === 0 || type.value === 1 ? row.addressType === type.value : true))
    .filter((row) => (network.value ? row.chain === network.value : true));

  /* `a("/settings/whitelist/edit", { state: b })` — the WHOLE ROW travels as router state, which
     is what lets the edit dialog render before any read lands. It is also why that dialog bails
     back out when there is none: a hand-typed URL has nothing to edit. */
  const edit = (row) => navigate('/settings/whitelist/edit', { state: row });

  return (
    <>
      <div className="mt-4 flex items-center gap-2">
        <Select
          className="h-10 flex-1 bg-input_darken"
          title="Address Type"
          value={type}
          options={TYPE_OPTIONS}
          onChange={setType}
          labelFormat={(option) => <span className="sm:text-secondary">{option.label}</span>}
        >
          {(option) => <span>{option.label}</span>}
        </Select>
        <Select
          className="h-10 flex-1 bg-input_darken"
          title="Network"
          value={network}
          options={networkOptions}
          onChange={setNetwork}
          labelFormat={(option) => <span className="sm:text-secondary">{option.label}</span>}
        >
          {(option) => <span>{option.label}</span>}
        </Select>
      </div>

      {/* `sm:px-0` — the card gives up its horizontal padding from `sm` up so the table's own
          header row can reach the card's edges. */}
      <div className="mt-3 w-full rounded-lg bg-layer4 p-3 sm:mt-4 sm:px-0 sm:py-4">
        {!data ? (
          <div className="center flex h-80 w-full">
            <Loading />
          </div>
        ) : rows.length === 0 ? (
          <div className="center flex h-80 w-full">
            <EmptyPlaceholder />
          </div>
        ) : isDesktop ? (
          <table className="w-full">
            <thead className="h-10 w-full">
              <tr className="h-10 bg-black_alpha5 text-secondary">
                <th className="px-2 text-left">Name</th>
                <th className="px-2">Currency</th>
                <th className="px-2">Address</th>
                <th className="px-2">Network</th>
                <th className="px-2">Last Update</th>
                <th className="px-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="h-[52px] w-full border-b border-b-third">
                  <td className="text-left font-semibold">{row.addressName}</td>
                  <td className="flex h-[52px] items-center justify-center">
                    {row.currencyName ? (
                      <>
                        <img alt="coin" className="w-6" src={coinIcon(row.currencyName)} />
                        <span className="ml-1 font-semibold">{getAlias(row.currencyName)}</span>
                      </>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="text-center text-secondary">{maskAddress(row.withdrawAddress)}</td>
                  {/* A STANDARD address prints its `label` and a UNIVERSAL one its `chain` — the
                      same cell, two fields, decided by `addressType === 0`. */}
                  <td className="text-center text-secondary">
                    {row.addressType === 0 ? row.label : row.chain}
                  </td>
                  <td className="text-center text-secondary">
                    {new Date(Number(row.createTime)).toLocaleString()}
                  </td>
                  <td className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      aria-label="Edit"
                      className="size-6"
                      onClick={() => edit(row)}
                    >
                      <IconEdit className="size-6 fill-secondary" />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete"
                      className="size-6"
                      onClick={() => setDeleting(row)}
                    >
                      <IconDelete className="size-6 fill-secondary" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          rows.map((row) => (
            <PhoneRow
              key={row.id}
              row={row}
              onEdit={() => edit(row)}
              onDelete={() => setDeleting(row)}
            />
          ))
        )}
      </div>

      {deleting && (
        <DeleteConfirm
          row={deleting}
          onCancel={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            /* NOT A LOCAL SPLICE, which is what the chunk does (`t(l => l.filter(...))`).
               Removing the LAST address turns enforcement off server-side, and the switch is read
               one component up — so the whole pane re-reads rather than this list editing itself
               and leaving the switch showing a state the server has already left. */
            onChanged();
          }}
        />
      )}
    </>
  );
}

export default function SettingsWhitelist() {
  const isDesktop = useIsDesktop();
  const buttonSize = useButtonSize();
  const navigate = useNavigate();

  /* ONE COUNTER FOR BOTH READS, and it moves for three reasons: a delete, a toggle, and a save in
     either of the two dialog routes. `useResource` reads once per distinct reader and has no
     refetch, so re-keying the reader is how this project re-runs one — the idiom `/bonus` and the
     affiliate dashboard already use.

     THE THIRD SOURCE COMES OVER THE EVENT BUS, which is the original's own answer: its add form
     ends `p(-1), B.emit("add-white-addresss")`. Add and Edit are separate ROUTES mounted beside
     `<Routes>`, so they are this pane's SIBLINGS rather than its children and there is no callback
     to hand down; and the location cannot stand in, because a page under an open dialog reads the
     frozen `pageLocation` and `navigate(-1)` restores the previous entry's own key. Both were
     tried. See context/appEvents.

     Local writes bump the same counter directly rather than emitting — nothing else is listening,
     and going through the bus would only add a hop. */
  const revision = useEventRevision(WHITELIST_CHANGED);
  const [reloads, setReloads] = React.useState(0);
  const readKey = `${revision}:${reloads}`;

  const read = React.useCallback(() => getWhitelistEnabled({ reloads: readKey }), [readKey]);
  const { data: enabled } = useResource(read);
  const on = Boolean(enabled);

  const [confirming, setConfirming] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const bump = React.useCallback(() => setReloads((n) => n + 1), []);

  /* `c` in `Ve`. Turning it ON goes straight to the write; turning it OFF asks first. The verify
     step both arms run afterwards is the omission documented at the head of this file. */
  const write = async (next) => {
    setPending(true);
    try {
      await setWhitelistEnabled(next);
      /* `t(s), I(l("Success"))` — a BARE toast, unlike the delete's `.success`. */
      toast('Success');
    } catch (failure) {
      /* `WHITELIST_EMPTY_WHITELIST` lands here — arming against an empty list is refused, and its
         message ("Add an address before turning whitelist-only withdrawals on") is exactly what a
         visitor needs at that moment, so it is shown as the server words it. */
      toastError(failure, 'Something went wrong. Please try again.');
    } finally {
      setPending(false);
      setConfirming(false);
      /* READ IT BACK rather than trusting the argument. The service's own note records why:
         `setEnforcement` used to echo its input, which hid a write that had not landed. */
      bump();
    }
  };

  const toggle = (next) => {
    if (pending) return;
    if (!next) {
      setConfirming(true);
      return;
    }
    write(true);
  };

  const addAddress = () => navigate('/settings/whitelist/add');

  const confirmDialog = confirming ? (
    <DisableConfirm
      pending={pending}
      onCancel={() => setConfirming(false)}
      onConfirm={() => write(false)}
    />
  ) : null;

  if (!isDesktop) {
    /* The phone arm — the state line and the switch sit above the filters with no card, because
       the dialog's own title bar carries the heading and an Add action. That action is
       `titleActions` on the original's `PageLayout` and this build's `RouteDialog` has no such
       slot, so the Add button sits with the switch instead: the one control it must not be is
       absent, since the phone arm has no other way to reach the form. */
    return (
      <div className="py-4 sm:py-0">
        <div className="flex h-9 w-full items-center">
          <p className="text-secondary">{on ? 'Whitelist Enabled' : 'Whitelist Disabled'}</p>
          <Switch className="ml-auto" value={on} onChange={toggle} disabled={pending} />
        </div>
        <button
          type="button"
          className="button mt-3 h-10 w-full bg-button_bright px-3"
          onClick={addAddress}
        >
          <IconAdd className="size-4 fill-brand" />
          <span className="ml-2 font-extrabold text-brand">Add Address</span>
        </button>
        <AddressList reloads={readKey} onChanged={bump} />
        {confirmDialog}
      </div>
    );
  }

  return (
    <div className="mt-3 w-full rounded-lg bg-layer4 p-3 sm:mt-0 sm:px-6 sm:py-4">
      <div className="flex w-full items-center border-b border-solid border-third pb-4">
        <div className="flex flex-col">
          <span className="text-base font-extrabold">Whitelist Management</span>
          <div className="mt-2 flex items-center text-secondary">
            <span>{on ? 'Whitelist Enabled' : 'Whitelist Disabled'}</span>
            <Switch
              className="ml-2"
              size="small"
              value={on}
              onChange={toggle}
              disabled={pending}
            />
          </div>
        </div>
        {/* `bg-button_bright` is the raised fill `.setting-button` also uses; written as the
            utility here because that is what the chunk writes. */}
        <button
          type="button"
          className={`button ${buttonSize} ml-auto h-10 bg-button_bright px-3`}
          onClick={addAddress}
        >
          <IconAdd className="size-4 fill-brand" />
          <span className="ml-2 font-extrabold text-brand">Add Address</span>
        </button>
      </div>
      <AddressList reloads={readKey} onChanged={bump} />
      {confirmDialog}
    </div>
  );
}
