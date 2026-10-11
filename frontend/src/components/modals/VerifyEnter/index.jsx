import React from 'react';
import { useNavigate } from 'react-router-dom';
import RouteDialog from '../../shared/RouteDialog';
import Select from '../../shared/Select';
import { useSession } from '../../../context/session';
import { COUNTRIES, OTHER_COUNTRY, countryByCode } from '../../../data/countries';

/* `R` in `CockpitEnter-ztfv3WYR.js` — `/settings/verify/enter/:levelName`, and THE MODAL BOTH GO
 * BUTTONS ACTUALLY OPEN on the original. It is a short card with one Select and one button, not
 * the form: the form is the NEXT route.
 *
 * The chunk, whole, is:
 *
 *   <Dialog title="Select Country">
 *     <div class="mt-4 flex h-full w-full flex-col items-center justify-around gap-4">
 *       <Select class="w-full bg-layer3" title="Country"
 *               value={picked() ?? state.areaCode}
 *               options={[...state.areaCodes, {areaCode:"", en:"Other", countryCode:"OTHER", …}]}
 *               onChange={setPicked}>
 *         {o => <span class="font-extrabold">{o.en}</span>}
 *       </Select>
 *       <Button type="brand" class="w-full" onClick={…}>Confirm</Button>
 *     </div>
 *   </Dialog>
 *
 * and Confirm navigates with `{replace: true}`:
 *
 *   const _ = ["PH"];
 *   navigate(`/settings/verify/${_.includes(e?.countryCode)
 *     ? "shufti/" + levelName + `?country=${e?.countryCode}`
 *     : levelName}`, {replace: !0})
 *
 * ── THE SIZE IS THE ONE ON THIS ROUTE'S OWN ENTRY ─────────────────────────────────────────────
 *
 * `info.dialog.size = m.mobile ? void 0 : [30, 12]`, and `v3` turns an ARRAY into inline
 * `width: 30rem; height: 12rem` — so this is a SHORT card, 480x192, where the cockpit next to it
 * declares no size at all and takes `.pc .dialog-list`'s 30rem x 40rem. That difference is the
 * whole visual character of this step and is why it is a class here rather than left to the
 * default: `verify-enter-dialog-size`, alongside the auth dialog's own.
 *
 * ── TWO DEPARTURES, BOTH FORCED ───────────────────────────────────────────────────────────────
 *
 * `state.areaCodes` comes from `POST /account/phone/get/area/`, which answers 403 on this deploy
 * for POST and GET alike. Its declared default is `[]`, so a faithful render of the shut feed is
 * a picker holding nothing but "Other" — not a port of anything. `data/countries.js` says what
 * stands in and why nothing in it is invented.
 *
 * `shufti/` is not built. Philippines is the one country the original routes to a different
 * provider, and that provider is as absent here as Sumsub is. PH therefore goes where every other
 * country goes, and the `?country=` the original only passes on the shufti arm is passed on BOTH,
 * because this build's next screen is a form with a country field rather than a hosted SDK — so
 * the answer to "which country" is worth carrying rather than dropping. That is what stops this
 * step being a screen that collects a value twice.
 */
export default function VerifyEnterDialog({ onClose, onBack, enter }) {
  const navigate = useNavigate();
  const { session } = useSession();

  /* `r.areaCodes.find(l => l.countryCode === r.areaCode.countryCode) ?? r.areaCodes[0]` — the
     account's own country when the list carries it, else the head of the list. `session.areaCode`
     is a bare string here ('US') where the original's is an object, so it is looked up. */
  const [picked, setPicked] = React.useState(
    () => countryByCode(session?.areaCode) ?? COUNTRIES[0],
  );

  const options = React.useMemo(() => [...COUNTRIES, OTHER_COUNTRY], []);

  const confirm = () => {
    const chosen = picked ?? COUNTRIES[0];
    const levelName = window.location.pathname.split('/').pop() || 'basic-kyc-level';
    const country = chosen.countryCode === 'OTHER' ? '' : chosen.en;
    /* `{replace: true}` is the original's: Confirm should not leave this step on the stack for
       the form's back arrow to return to, because coming back would re-ask a question already
       answered and then re-navigate forward over it. */
    navigate(`/settings/verify/${levelName}${country ? `?country=${encodeURIComponent(country)}` : ''}`, {
      replace: true,
    });
  };

  return (
    <RouteDialog
      title="Select Country"
      className="verify-enter-dialog-size"
      onClose={onClose}
      onBack={onBack}
      enter={enter}
    >
      <div className="mt-4 flex h-full w-full flex-col items-center justify-around gap-4">
        {/* NO `search`. The chunk's Select call is `{class, value, title, options, onChange,
            children}` and nothing else, and this shell's `search` is a PREDICATE — `(option,
            term) => boolean` — not a flag, so passing it bare threw `search is not a function`
            the moment the layer opened. The shared component supports a search box and the
            original's picker does not ask for one; a one-line predicate would add it if that is
            ever wanted, but it would be this build's feature and not a port. */}
        <Select
          className="w-full bg-layer3"
          title="Country"
          value={picked}
          options={options}
          onChange={setPicked}
        >
          {/* `children: e => <span class="font-extrabold">{e().en}</span>` — THE NAME ONLY. The
              row carries an `emoji` and the picker does not print it; an earlier pass here put
              the flag in front of the name, which on Windows has no flag glyphs and renders the
              two regional-indicator letters as text, so every option read "IN India". Matching
              the chunk fixes the platform difference for free. */}
          {(option) => <span className="font-extrabold">{option.en}</span>}
        </Select>

        <button type="button" className="button button-brand button-l w-full" onClick={confirm}>
          Confirm
        </button>
      </div>
    </RouteDialog>
  );
}
