import { useNavigate } from 'react-router-dom';
import { SETTINGS_MENU } from './menu';
import { useRedDot } from './strength';
import Status from './Status';
import { IconArrow } from './icons';

/* `DialogPageSetting` — the default export of `index-B0Ab1fJ8.js`, and the bare `/settings` child
 * on a phone. On a desktop that child's own guard redirects to `/settings/account-info` and this
 * never renders, which is why it is a separate component from the rail rather than a narrow arm of
 * it: the same six rows, a different list.
 *
 *   <PageLayout title={t("Global Settings")}>
 *     <div class="mt-4 rounded-lg bg-layer4 px-3 pb-1">
 *       <For each={menu()}>{row =>
 *         isFiat && row.link === "/settings/whitelist" ? null :
 *         <Button class="mt-1 h-12 w-full justify-normal p-0" onClick={() => navigate(row.link)}>
 *           <row.iconName class="size-6 fill-secondary"/>
 *           <span class="ml-3 font-semibold text-primary">{row.label()}</span>
 *           <div class="center relative ml-auto h-6 w-6 rounded bg-layer5 p-0">
 *             <IconArrow class="size-4 rotate-180 fill-secondary"/>
 *             <Show when={row.haveDont || redDot() === "false" && row.link === "/settings/account-info"}>
 *               <Status/>
 *             </Show>
 *           </div>
 *         </Button>}
 *     </div>
 *   </PageLayout>
 *
 * THE WHITELIST ROW IS DROPPED ON A FIAT-ONLY WHITE LABEL and nowhere else — `isFiat` is false on
 * this deploy, so all six render. It is the only per-row test on the list and it is not on the
 * rail, which drops the same row through the `isOfflineAgent` filter in `menu.js` instead.
 *
 * `Status` here takes its DOT arm rather than the icon: it is the same component the rail draws
 * with `withImg`, and inside this `relative` box the dot's own `absolute -left-3.5 top-2` puts it
 * over the chevron square's top-left corner.
 *
 * `justify-normal` on the button is what stops `.button`'s own `justify-content: center` from
 * bunching the three children together — the row is icon, label, then an `ml-auto` chevron.
 */
export default function SettingsMenuPage() {
  const navigate = useNavigate();
  const [redDot] = useRedDot();

  return (
    <div className="mt-4 rounded-lg bg-layer4 px-3 pb-1">
      {SETTINGS_MENU.map((row) => (
        <button
          key={row.key}
          type="button"
          className="button mt-1 h-12 w-full justify-normal p-0"
          onClick={() => navigate(row.href)}
        >
          <row.icon className="size-6 fill-secondary" />
          <span className="ml-3 font-semibold text-primary">{row.label}</span>
          <div className="center relative ml-auto h-6 w-6 rounded bg-layer5 p-0">
            <IconArrow className="size-4 rotate-180 fill-secondary" />
            {row.haveDont || (redDot === 'false' && row.href === '/settings/account-info') ? (
              <Status />
            ) : null}
          </div>
        </button>
      ))}
    </div>
  );
}
