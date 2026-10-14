import { brandName } from '../../../services/siteBranding';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import RouteDialog from '../../shared/RouteDialog';
import Input from '../../shared/Input';
import { IconCheck } from '../../shared/icons';
import { IconEye, IconEyeSquint } from '../UserAction/icons';
import { useResource } from '../../../hooks/useResource';
import { getAntiPhishingCode } from '../../../services/settings';
import workArt from '../../../assets/phishing-work.png';
import resultArt from '../../../assets/phishing-result.png';

/* The Anti-Phishing Code — THREE dialog routes, not one, and the Security tile picks between
 * them by whether a code already exists.
 *
 *   { path: "/settings/phishing/enter",  component: w("DialogPhishingEnter")  }   Enter-CKlrJB3N.js
 *   { path: "/settings/phishing/create", component: w("DialogPhishingCreate") }   Create-omu97aad.js
 *   { path: "/settings/phishing/detail", component: w("DialogPhishingDetail") }   Detail-DzfqJDj3.js
 *
 * in the same `{ dialog: !0, guards: [ce] }` group as `/user-action/:action`, so dialogs at every
 * width. All three off `hash.game/modules/account/assets/`; both illustrations came with them.
 *
 * The flow is: no code -> **enter** (what it is, one Create button) -> **create** (the field and
 * its two rules) -> **detail** (the code, masked, with a How-does-it-work link that pushes the
 * enter dialog's own body into a popup). With a code, the tile goes straight to **detail**, whose
 * button routes back to **create** with `{replace: true}` — so changing a code and setting a
 * first one are the same screen.
 *
 * ── NOTHING IS BEHIND ANY OF IT, ON EITHER SIDE ──────────────────────────────────────────────
 *
 * `POST /account/setting/anti-phishing-code/add/` answers 403 on bc.game (the whole `/account/*`
 * family does for a logged-out probe), and this platform has no anti-phishing feature at all —
 * no table, no column, no route; `services/settings.js` reads the code from the chunk's own
 * declared default, which is empty. So Create is drawn, its two rules are live and check as you
 * type, and the button says why it cannot save. That is the state the pane's own note already
 * describes for these three, now with the screens in place rather than the route unreachable.
 *
 * ── THE RULES ARE THE CHUNK'S OWN REGEX, TRANSCRIBED ─────────────────────────────────────────
 *
 * `length` is `> 5 && < 9`, printed as "6-8 characters". `char` is a monster of six negative
 * lookaheads that reduces to "at least three of: uppercase, lowercase, digit, underscore" — the
 * label under it says so and the four bullets name them. Kept as the original writes it, because
 * a rewritten regex would be a different rule wearing the same label.
 */

const LENGTH_OK = (value) => value.length > 5 && value.length < 9;

/* `Create-omu97aad.js`'s own, character for character. Six negative lookaheads, each excluding a
   string made of only one or two of the four classes; what survives has at least three. */
const CHAR_OK = (value) =>
  /^(?![a-zA-Z]+$)(?![A-Z0-9]+$)(?![A-Z\W_!@#$%^&*`~()\-+=]+$)(?![a-z0-9]+$)(?![a-z\W_!@#$%^&*`~()\-+=]+$)(?![0-9\W_!@#$%^&*`~()\-+=]+$)[a-zA-Z0-9\W_!@#$%^&*`~()\-+=]{6,8}$/.test(
    value,
  );

/* `y` in `Enter-CKlrJB3N.js`, exported as `HowWork` and used TWICE — as the enter dialog's whole
   body and, from the detail dialog, pushed into a popup under the same heading. One component
   there and one here.

   `__ENV_HOST__` is expanded through `license.host.toUpperCase()` on the original — "BC.GAME",
   the same substitution the Buy Crypto disclaimer documents. */
export function HowWork() {
  return (
    <div className="mt-4 flex w-full flex-col items-center">
      <img className="h-48" alt="" src={workArt} />
      <div className="mt-8 w-full font-semibold text-secondary">
        You can create your own anti-phishing code to appear in official {brandName()} emails and SMS
        messages. This feature helps you verify the authenticity of communications from {brandName()}
      </div>
    </div>
  );
}

export default function AntiPhishingDialog({ step, onClose, onBack, enter }) {
  const { data: code } = useResource(getAntiPhishingCode);

  if (step === 'create') {
    return (
      <RouteDialog
        title={code ? 'Change Anti-Phishing Code' : 'Create Anti-Phishing Code'}
        onClose={onClose}
        onBack={onBack}
        enter={enter}
      >
        <Create />
      </RouteDialog>
    );
  }

  if (step === 'detail') {
    return (
      <RouteDialog title="Anti-phishing code" onClose={onClose} onBack={onBack} enter={enter}>
        <Detail code={code} />
      </RouteDialog>
    );
  }

  return (
    <RouteDialog
      title="How does the anti-phishing code work?"
      onClose={onClose}
      onBack={onBack}
      enter={enter}
    >
      <Enter />
    </RouteDialog>
  );
}

/* `k` — the explainer, and its Create button `replace`s rather than pushes, so Back from the
   create screen returns to the pane rather than to this. */
function Enter() {
  const navigate = useNavigate();
  return (
    <>
      <HowWork />
      <button
        type="button"
        className="button button-brand mt-4 w-full"
        onClick={() => navigate('/settings/phishing/create', { replace: true })}
      >
        Create
      </button>
    </>
  );
}

/* `Z` — the bullet before each character class. A 4px dot, `mx-1`. */
const Dot = () => <div className="mx-1 size-1 rounded-full bg-secondary" />;

/* `j` — the form. `B` is its template: a label, the field, then two rule rows and a four-item
   list indented under the second one. `IconCheck` turns `fill-success` as each rule passes. */
function Create() {
  const [value, setValue] = React.useState('');
  const lengthOk = LENGTH_OK(value);
  const charOk = CHAR_OK(value);

  return (
    <div className="mt-4 flex w-full flex-col">
      <div className="mb-2 text-secondary">Anti-Phishing Code</div>
      {/* `PasteInput` on the original — a field with its own paste handling. The plain `.input`
          is what this build uses for the same job elsewhere on this pane. */}
      <Input value={value} onChange={setValue} className="bg-layer3" />

      <div className="mt-3 flex items-center">
        <IconCheck className={`mr-1 size-4 ${lengthOk ? 'fill-success' : 'fill-secondary'}`} />
        <div className="text-secondary">6-8 characters</div>
      </div>
      <div className="flex items-center">
        <IconCheck className={`mr-1 size-4 ${charOk ? 'fill-success' : 'fill-secondary'}`} />
        {/* "At lest" is the chunk's own typo, in the i18n bundle as well. Kept. */}
        <div className="text-secondary">At lest 3 of the following types:</div>
      </div>
      <div className="ml-6 flex flex-col text-secondary">
        {['Uppercase letter', 'lowercase letter', 'Digit', 'Underscore'].map((label) => (
          <div key={label} className="flex items-center">
            <Dot />
            {label}
          </div>
        ))}
      </div>

      {/* `disabled: !(f().length && f().char)` is the chunk's own — the two rules above gate the
          button and nothing else does. Inert beyond that and silent about it: there is no route
          to post to. See the note at the head of this file. */}
      <button
        type="button"
        className="button button-brand mt-4 w-full"
        disabled={!(lengthOk && charOk)}
      >
        Create
      </button>
    </div>
  );
}

/* `q` — the detail screen. The code is masked except its last five characters, an eye toggles it,
   and "How does the Anti-Phishing Code work?" pushes `HowWork` into a popup rather than routing.
   That popup is not built here (this build has no dialog STACK — see PopCenter), so the link
   navigates to the enter dialog instead, which shows the identical body under the identical
   heading. Same destination, one fewer layer. */
function Detail({ code }) {
  const navigate = useNavigate();
  const [shown, setShown] = React.useState(false);

  /* `e().slice(0, len - 5) + e().slice(len - 5).replace(/./g, "*")` — so the LAST five are
     starred and the front is shown, which is the opposite of most masking on this site. The
     chunk's own, and it is what the reference shows. */
  const masked = React.useMemo(() => {
    const text = code ?? '';
    if (!text) return '';
    if (shown) return text;
    const cut = text.length - 5;
    return text.slice(0, cut) + text.slice(cut).replace(/./g, '*');
  }, [code, shown]);

  return (
    <div className="mt-4 flex w-full flex-col items-center">
      <img className="h-40" alt="" src={resultArt} />
      <div className="mt-8 flex items-center text-secondary">
        <div className="mr-2">Anti-phishing code</div>
        {/* `IconVisibilityon-BUAnaIn7.js` exports the pair — `E` open, `P` squinted — and the
            chunk swaps them on the same `mt-1 size-4 cursor-pointer` box. This build already has
            both, as the password field's own toggle. */}
        <button
          type="button"
          aria-label={shown ? 'Hide' : 'Show'}
          className="mt-1 size-4 cursor-pointer"
          onClick={() => setShown((value) => !value)}
        >
          {shown ? (
            <IconEye className="size-4 fill-secondary" />
          ) : (
            <IconEyeSquint className="size-4 fill-secondary" />
          )}
        </button>
      </div>
      <div className="mt-8 text-4xl font-extrabold">{masked}</div>
      <button
        type="button"
        className="mt-4 cursor-pointer text-brand"
        onClick={() => navigate('/settings/phishing/enter')}
      >
        How does the Anti-Phishing Code work?
      </button>
      <button
        type="button"
        className="button button-brand mt-1 w-full"
        onClick={() => navigate('/settings/phishing/create', { replace: true })}
      >
        Change Anti-phishing code
      </button>
    </div>
  );
}
