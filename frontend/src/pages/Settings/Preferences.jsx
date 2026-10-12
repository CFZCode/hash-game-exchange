import React from 'react';
import Switch from '../../components/shared/Switch';
import LanguageCurrencyModal from '../../components/modals/LanguageCurrencyModal';
import { languageName } from '../../components/modals/LanguageCurrencyModal/languages';
import { useSession } from '../../context/session';
import { useSettings } from '../../context/settings';
import { useResource } from '../../hooks/useResource';
import { getPrivacy, setRefuseTip, updatePreferences } from '../../services/settings';
import { USE_FIXTURES } from '../../services/client';
import { toast, toastError } from '../../components/shared/Toast/toast';
import { getAlias } from '../../utils/currency';
import { coinIcon } from '../../utils/coinArt';
import { IconEdit, IconMoon, IconSun } from './icons';

/* `/settings/preferences` — `index-BgFc4GKH.js`, 8 KB, and the whole pane is one Solid template
 * plus `Privacy-ydLbf0kB.js`'s four rows. Four cards, and the last two are gated on the
 * `isOfflineAgent` white-label flag that also decides the rail's bottom three rows.
 *
 * Every row is the same shape — `<div class="mt-3 flex h-12 w-full items-center">` with a
 * `font-semibold` label and an `ml-auto flex flex-none items-center` control — and every card is
 * `rounded-lg bg-layer4 p-3 sm:px-6 sm:py-4` under an `h-11 border-b border-third pb-3` heading.
 * That pair is written out once each here rather than abstracted, because the chunk writes them
 * out too and the first card's rows each differ in their control.
 */

/* One card. `mt-3 … sm:mt-4` on every card but the first, whose margin comes from the page root's
   own `py-4 sm:py-0` instead. */
function Card({ title, className = '', children }) {
  return (
    <div className={`w-full rounded-lg bg-layer4 p-3 sm:px-6 sm:py-4 ${className}`}>
      <div className="flex h-11 items-center border-b border-third pb-3">
        <span className="font-extrabold">{title}</span>
      </div>
      {children}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="mt-3 flex h-12 w-full items-center">
      <span className="font-semibold">{label}</span>
      <div className="ml-auto flex flex-none items-center">{children}</div>
    </div>
  );
}

/* `he` — the Display mode control, and THE THIRD THEME CONTROL IN THIS BUILD after the sidebar's
 * pair and the mobile account page's. None of them owns the state: all three read `darken` and
 * write through `setTheme`, so they cannot disagree.
 *
 *   <div class="ml-auto flex items-center flex-none cursor-pointer">
 *     <div class="h-11 p-1 rounded-lg bg-layer5 relative flex">
 *       <div class="w-9 h-9 rounded-lg bg-layer6 absolute top-1 transition-all ease-out"
 *            style={{left: darken ? "0.25rem" : "2.625rem"}}/>
 *       <div class="w-9 h-9 center relative" onClick={() => setTheme("theme","dark")}>…</div>
 *       <div class="w-9 h-9 center ml-0.5 relative" onClick={() => setTheme("theme","light")}>…</div>
 *
 * TWO CELLS THAT SET A THEME rather than one that toggles, so clicking the one you are on is a
 * no-op — the same arrangement `/user/enter` has. The sliding block is a sibling of both cells and
 * is positioned by an inline `left`, which is why the two offsets are written as rem strings: 0.25
 * is the track's own `p-1`, 2.625 is that plus a 36px cell and the second cell's `ml-0.5`.
 *
 * ONE LINE OF `he` IS DELIBERATELY NOT PORTED, exactly as on the account page: it also runs
 * `document.documentElement.classList.toggle("dark", darken)`. Here that would make every element
 * a `.dark` descendant and keep every `dark:` utility applying in the light theme — this build's
 * variant is `&:where(.dark, .dark *)` and the class lives on `<body>`. */
function ThemeToggle() {
  const { darken, setTheme } = useSettings();

  return (
    <div className="ml-auto flex flex-none cursor-pointer items-center">
      <div className="relative flex h-11 rounded-lg bg-layer5 p-1">
        <div
          className="absolute top-1 h-9 w-9 rounded-lg bg-layer6 transition-all ease-out"
          style={{ left: darken ? '0.25rem' : '2.625rem' }}
        />
        <button
          type="button"
          className="center relative h-9 w-9"
          aria-label="Dark"
          onClick={() => setTheme('dark')}
        >
          <IconMoon className={`size-5 ${darken ? 'fill-primary' : 'fill-quarterary'}`} />
        </button>
        <button
          type="button"
          className="center relative ml-0.5 h-9 w-9"
          aria-label="Light"
          onClick={() => setTheme('light')}
        >
          <IconSun className={`size-5 ${darken ? 'fill-quarterary' : 'fill-primary'}`} />
        </button>
      </div>
    </div>
  );
}

/* `ce` — Privacy Preferences, `Privacy-ydLbf0kB.js` whole. Four rows over two different stores:
 * the first three are the server's (`GET /account/setting/privacy/<uid>/`, written back with
 * `POST /account/setting/privacy/set/`) and the fourth is the LOCAL account setting the wallet
 * pill also reads. The endpoint is shut, so the three render the module's own declared initial
 * state — all off, which is the capture — and only Max profit alert can actually be moved here.
 *
 * The third row is gated on `isOfflineAgent`, like the two cards below. */
/* THE SIX MESSAGES ARE THE CHUNK'S OWN, both arms of each, read out of `Privacy-ydLbf0kB.js` and
 * cross-checked against the account remote's locale bundle (`index-B9isM8z3.js`, which is in the
 * mirror and carries the first pair verbatim). "You are Hidden" capitalises the H; that is the
 * site's and is kept.
 *
 * The handler shape is theirs too: `r = (e, a) => setPrivacy(e).then(() => { store(e); toast(a) })`
 * — so the message fires only AFTER the write succeeds, never beside it. Here the write is local
 * and cannot fail, which is the one part of that arrangement this build cannot demonstrate. */
const PRIVACY_ROWS = [
  {
    key: 'hideGameData',
    label: 'Hide my gaming data on profile',
    on: 'Your gaming data is now invisible to others.',
    off: 'Your gaming data is now visible to others.',
  },
  {
    key: 'hideName',
    label: 'Hide my username from public lists',
    on: 'You are Hidden in all public lists now.',
    off: 'You are visible in all public lists now.',
  },
  {
    key: 'refuseTip',
    label: 'Refuse tip from strangers',
    on: 'Strangers can not tip you anymore.',
    off: 'You can receive tip from all users now.',
  },
];

function PrivacyRows() {
  const { session, setSetting } = useSession();
  const { privacy, setPrivacy } = useSettings();

  /* THE READ IS STILL MADE AND ITS ANSWER IS STILL THE SHUT ONE. `getPrivacy` is left in place
     rather than deleted: it is the real path, its 403 is the documented finding, and the day it
     answers this is where the server's values arrive. Until then the switches show the LOCAL
     store, which is what a visitor last set — see the note in `context/settings.js` for why that
     is a divergence worth taking over a control that does not move. */
  const read = React.useCallback(() => getPrivacy(session.uid), [session.uid]);
  const { data: served } = useResource(read);

  /* Live, `refuseTip` IS server state (SmartBet's tip settings), so the switch adopts the server's
     answer once it lands, and a flip is written there before the toast — the original's
     write-then-toast order. A refusal flips it back and shows the server's message. */
  /* Applied ONCE per served value: `setPrivacy` changes identity with every privacy change, so
     without the guard the effect would re-apply the served value after each flip and undo it. */
  const serverRefuseTip = served?.refuseTip;
  const applied = React.useRef(null);
  React.useEffect(() => {
    if (USE_FIXTURES || typeof serverRefuseTip !== 'boolean' || applied.current === serverRefuseTip) return;
    applied.current = serverRefuseTip;
    setPrivacy({ refuseTip: serverRefuseTip });
  }, [serverRefuseTip, setPrivacy]);

  /* `g(a)` and `.catch(g)` — a BARE toast for the confirmation, so it is error-typed with no icon
     and each flip replaces the last, and the refusal itself handed to the same function, which
     unwraps an Error into `.error(message)` with the server's own words. */
  const toggle = (row, next) => {
    setPrivacy({ [row.key]: next });
    if (row.key !== 'refuseTip' || USE_FIXTURES) {
      toast(next ? row.on : row.off);
      return;
    }
    Promise.resolve(setRefuseTip(next)).then(
      () => toast(next ? row.on : row.off),
      (failure) => {
        setPrivacy({ [row.key]: !next });
        toastError(failure);
      },
    );
  };

  return (
    <>
      {PRIVACY_ROWS.map((row) => (
        <Row key={row.key} label={row.label}>
          <Switch
            size="small"
            value={privacy[row.key]}
            onChange={(next) => toggle(row, next)}
          />
        </Row>
      ))}
      <Row label="Max profit alert">
        <Switch
          size="small"
          value={session.setting.maxbetAlert}
          onChange={(next) => setSetting('maxbetAlert', next)}
        />
      </Row>
    </>
  );
}

export default function SettingsPreferences() {
  const { session, setSetting, setAccountField } = useSession();
  const [modal, setModal] = React.useState(null);

  /* `getAlias(localeCurrencyName).replace(/FIAT$/, "")` — the chunk strips the suffix at the call
     site even though `getAlias` is the alias lookup rather than the stripper, which is why both
     appear. `enableLocaleCurrency` off prints "None" instead of the coin. */
  const localeCurrency = getAlias(session.setting.localeCurrencyName).replace(/FIAT$/, '');

  return (
    /* `w-full py-4 text-base sm:py-0` — the page's own vertical rhythm on a phone, where the
       dialog's scroller supplies no padding of its own, and nothing from `sm` up, where the first
       card's own padding is the whole of it. `text-base` is what makes every row's label 16px;
       the controls set their own `text-sm`. */
    <div className="w-full py-4 text-base sm:py-0">
      <Card title="Account Preferences">
        <Row label="View in currency">
          {/* The trigger is the ROW'S trailing div rather than the button — `S.$$click` lands on
              the `ml-auto` container, so the pencil is inside the hit area too. `open-fiat` is the
              event; this build routes it to the same modal the header and sidebar open, on its
              currency tab. */}
          <div className="flex items-center" onClick={() => setModal('currency')}>
            <button type="button" className="button setting-button h-8 px-2 py-0 pb-0.5">
              {session.setting.enableLocaleCurrency ? (
                <>
                  <img
                    alt="coin"
                    className="size-4"
                    src={coinIcon(session.setting.localeCurrencyName)}
                  />
                  <span className="ml-1 text-sm font-semibold">{localeCurrency}</span>
                </>
              ) : (
                <span className="text-sm font-semibold">None</span>
              )}
            </button>
            <IconEdit className="ml-1.5 size-5 cursor-pointer fill-secondary" />
          </div>
        </Row>

        <Row label="Change Language">
          <div className="flex items-center" onClick={() => setModal('language')}>
            <button type="button" className="button setting-button h-8 px-2 py-0 pb-0.5">
              {/* `e.langs[M.lang][0]` on the original — the display name of the store's `lang`,
                  looked up in the site's own code→name map. IT PRINTS THE CHOICE NOW: this used
                  to be the literal "English" on the reasoning that the build ships one locale and
                  so has nothing to store, which made the modal beside it a control that moved and
                  changed nothing. The field is `setting.lang`, which `SessionProvider` already
                  persists, so a pick survives a reload. What is still true is that only the NAME
                  changes — nothing translates. */}
              <span className="text-sm font-semibold">{languageName(session.setting.lang)}</span>
            </button>
            <IconEdit className="ml-1.5 size-5 cursor-pointer fill-secondary" />
          </div>
        </Row>

        <Row label="Show full name of currency in Crypto list">
          <Switch
            size="small"
            value={session.setting.currencyFullName}
            onChange={(next) => setSetting('currencyFullName', next)}
          />
        </Row>

        {/* The Display mode row has NO trailing container in the template — the toggle is appended
            to the row itself and brings its own `ml-auto`, which is why this one is not a `Row`. */}
        <div className="mt-3 flex h-12 w-full items-center">
          <span className="font-semibold">Display mode</span>
          <ThemeToggle />
        </div>
      </Card>

      <Card title="Privacy Preferences" className="mt-3 sm:mt-4">
        <PrivacyRows />
      </Card>

      {/* `<Show when={!isOfflineAgent}>` around both — one flag, and it is false on this deploy. */}
      <Card title="Email Notifications" className="mt-3 sm:mt-4">
        <Row label="Receive deposit successful email">
          {/* Stored as 1/0 rather than a boolean, which is the payload's own shape: the chunk
              compares `=== 1` on the way in and writes `next ? 1 : 0` on the way out. */}
          <Switch
            size="small"
            value={session.setting.allowRechargeSuccessEmail === 1}
            onChange={(next) => setSetting('allowRechargeSuccessEmail', next ? 1 : 0)}
          />
        </Row>
        <Row label="Receive withdraw successful email">
          <Switch
            size="small"
            value={session.setting.allowWithdrawSuccessEmail === 1}
            onChange={(next) => setSetting('allowWithdrawSuccessEmail', next ? 1 : 0)}
          />
        </Row>
      </Card>

      {/* THE MARKETING PAIR IS ONE REQUEST FOR BOTH ON THE ORIGINAL, debounced by a full second:
          `pe(fn, 1000)` — lodash `throttle` with `maxWait` — around
          `POST /account/setting/resetAcceptPromotion/ {acceptPromotion, acceptSmsPromotion}`. So
          flipping both quickly sends one body carrying both, which is why each of its handlers
          reads the OTHER switch's current value rather than sending its own field alone.

          THAT ARRANGEMENT IS NOT REPRODUCED, because only one of the two has anywhere to go. The
          platform's `PATCH /user/preferences` carries `emailNotifications`, which is this row; its
          `pushNotifications` is a different channel from SMS and mapping one onto the other would
          be inventing a meaning the server does not have. So the email switch reads and writes and
          the SMS switch is left as it was — see `services/settings.js` for the full field-by-field
          reckoning.

          The write is OPTIMISTIC and reverts on failure. The alternative is a switch that does not
          move until a round trip lands, which reads as a broken control on a slow connection; the
          revert is what keeps it honest when the server refuses. */}
      <Card title="Marketing" className="mt-3 sm:mt-4">
        <Row label="Receive marketing promotions by Email">
          <Switch
            size="small"
            value={session.acceptPromotion}
            onChange={(next) => {
              setAccountField('acceptPromotion', next);
              updatePreferences({ emailNotifications: next }).catch(() =>
                setAccountField('acceptPromotion', !next),
              );
            }}
          />
        </Row>
        <Row label="Receive marketing promotions by SMS">
          <Switch size="small" value={session.acceptSmsPromotion} onChange={() => {}} />
        </Row>
      </Card>

      <LanguageCurrencyModal
        isOpen={modal !== null}
        initialTab={modal === 'currency' ? 'currency' : 'language'}
        onClose={() => setModal(null)}
      />
    </div>
  );
}
