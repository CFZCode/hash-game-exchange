import React from 'react';
import { useSession } from '../../../../context/session';
import { IconDoNotDisturb } from './icons';

/* The account dropdown's last row — `DialogDisturbSetting`, which is NOT part of
 * `AfterLogin-Xr01UEkM.js`. It is a federated component: `Enter-MsmOuq5R.js` resolves it out of
 * the `account` remote, whose manifest maps the expose to `Disturb-CUKXIk9c.js`. The mirror saved
 * that remote but not its lazy chunks, so the file came off
 * `hash.game/modules/account/assets/Disturb-CUKXIk9c.js` — the same trick the Help Center's
 * documents needed, one directory up from `/assets/`. It is 3.3 KB and holds the whole component:
 *
 *   const N = () => {
 *     const [t, n] = w(y(!0), {name: "first-set-disturb-" + f.userId});
 *     const s = e => u(null, null, function*() {
 *       e && t()
 *         ? (yield x.confirm(() => d("When Do Not Disturb is on, all notifications will be
 *                                     paused, including bonus and transaction updates."),
 *                            () => ({title: h(() => d("Turn on Do Not Disturb"))})))
 *           && (m("setting", "noDisturb", e), n(!1))
 *         : m("setting", "noDisturb", e)
 *     });
 *     return l(v, { class: "header-nav-item max-sm: relative h-11 w-full justify-between
 *                           border-third px-3 max-sm:rounded-b-none max-sm:border-b
 *                           max-sm:hover:text-primary sm:rounded-t-none sm:border-t",
 *                   onClick: e => { e.stopPropagation() },
 *                   children: [<span class="flex items-center justify-center">
 *                                <IconDisturb class="size-6 flex-none fill-secondary"/>
 *                                <span class="ml-2 ...">{d("Do Not Disturb")}</span></span>,
 *                              l(D, {size: "small", onChange: s, value: f.setting.noDisturb})] })
 *   }
 *
 * All three strings are verbatim en-US out of the account remote's own locale bundle
 * (`index-B9isM8z3.js`, which IS in the mirror), where each maps to itself. Nothing here is read
 * off a screenshot.
 *
 * THE ROW ITSELF DOES NOTHING. Its `onClick` is `e => e.stopPropagation()` and nothing else, so
 * clicking the label or the icon is inert and only the switch toggles — the stop is there to keep
 * that click from reaching the panel behind it. Every other row in the dropdown navigates; this
 * one is a control, and it is the only row whose click handler is not `go(row)`.
 *
 * `<div dir="ltr" class="contents" data-remote-ltr="">` around it is the shell's wrapper for a
 * federated child, not this component's own markup — it is in the rendered DOM and is kept for
 * that reason. `display: contents` makes it layout-neutral, so the row is still a direct flex
 * child of the panel.
 *
 * `max-sm:` with nothing after it is the original's own dead class, out of a `clsx` call that
 * was handed an empty string. Kept for the reason `f-ull` and `texxt-sm` are kept elsewhere in
 * this project: it generates nothing in Tailwind v3 or v4, and removing it invents a diff the
 * live page does not have. Every OTHER `max-sm:` variant on the row is live but unreachable
 * here — the dropdown is desktop-only (a phone's avatar navigates to `/user/enter` instead), so
 * the bottom-border/rounded-bottom arm never renders and the `sm:` arm always does.
 */

/* `w(y(!0), {name: ...})` is `makePersisted(createSignal(true), ...)` from
 * `@solid-primitives/storage` — `nv` in index-BsFv7ByC.js, whose key is `e.name` with NO prefix
 * and whose value is `JSON.stringify`d. So the original writes literally
 * `first-set-disturb-105522617: true` into localStorage, and that is what this reads and writes.
 *
 * Re-read on every mount rather than held above, which is the original's behaviour too: the
 * signal is created inside the dropdown's tree, and the dropdown unmounts when it closes.
 */
function useFirstSetFlag(name) {
  const [value, setValue] = React.useState(() => {
    try {
      const raw = window.localStorage.getItem(name);
      return raw === null ? true : JSON.parse(raw);
    } catch {
      return true;
    }
  });

  const write = React.useCallback(
    (next) => {
      setValue(next);
      try {
        window.localStorage.setItem(name, JSON.stringify(next));
      } catch {
        /* Private-mode localStorage throws on write. The original's helper swallows it too. */
      }
    },
    [name],
  );

  return [value, write];
}

/* `CO` in index-BsFv7ByC.js — the site's Switch, `size: "small"` giving it `switch-xs`:
 *
 *   <div class={Y("switch", size === "small" && "switch-xs", class)}
 *        data-disabled={disabled} aria-checked={value || void 0}
 *        onClick={() => onChange(!value)}><div/></div>
 *
 * A `<div>` and not a `<button>`, unlike the Hide Small switch in CurrencySelect — and that is
 * forced rather than copied: this switch sits INSIDE the row's `<button>`, and a nested button is
 * invalid markup that browsers do not deliver clicks to. `role="switch"` carries the semantics
 * instead. It is not keyboard-reachable, which is the original's behaviour as well.
 *
 * `aria-checked` is written as a VALUE (`"true"`/`"false"`) where the original writes the
 * attribute or omits it; index.css's `.switch[aria-checked='true']` rules are already written to
 * match that, for the reason given there.
 */
function Switch({ value, onChange }) {
  return (
    <div
      role="switch"
      aria-checked={!!value}
      aria-label="Do Not Disturb"
      className="switch switch-xs"
      onClick={() => onChange(!value)}
    >
      <div />
    </div>
  );
}

const CONFIRM_BODY =
  'When Do Not Disturb is on, all notifications will be paused, including bonus and transaction updates.';

export default function DisturbSetting({ confirm }) {
  const { session, setSetting } = useSession();
  const [firstSet, setFirstSet] = useFirstSetFlag(`first-set-disturb-${session.userId}`);

  /* Turning it ON for the first time asks; turning it OFF never does, and neither does turning
     it on again afterwards. The flag is only cleared when the confirm is ANSWERED — cancel
     leaves both the setting and the flag alone, so the next attempt asks again. */
  const onChange = async (next) => {
    if (next && firstSet) {
      if (await confirm(CONFIRM_BODY, { title: 'Turn on Do Not Disturb' })) {
        setSetting('noDisturb', next);
        setFirstSet(false);
      }
      return;
    }
    setSetting('noDisturb', next);
  };

  return (
    <div dir="ltr" className="contents" data-remote-ltr="">
      <button
        type="button"
        className="button button-m header-nav-item max-sm: relative h-11 w-full justify-between border-third px-3 max-sm:rounded-b-none max-sm:border-b max-sm:hover:text-primary sm:rounded-t-none sm:border-t"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="flex items-center justify-center">
          <IconDoNotDisturb className="icon size-6 flex-none fill-secondary" />
          {/* `max-sm:ml-3` IS DROPPED, and it is the one departure on this row. The chunk writes
              `ml-2 … max-sm:ml-3`, so below 640 the label sits 12px from its icon where the
              dropdown's other rows sit 8px — invisible while this component was desktop-only, and
              visible the moment `/user/enter` started rendering it on a phone, where its own icon
              is a wide speaker whose ink reaches further left than the bell and gear beside it.
              The row then read as indented against every other row in the card. 8px at every
              width is what the desktop dropdown already gets, so nothing above 640 moves. */}
          <span className="ml-2 overflow-hidden whitespace-nowrap font-semibold max-sm:text-base">
            Do Not Disturb
          </span>
        </span>
        <Switch value={session.setting.noDisturb} onChange={onChange} />
      </button>
    </div>
  );
}
