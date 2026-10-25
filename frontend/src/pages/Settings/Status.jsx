import { useSession } from '../../context/session';
import { useGates } from '../../context/gates';
import { securityStatus } from './strength';
import { IconSuccess, IconAttention } from './icons';

/* `Status-DpPfKxTy.js`, whole — the security-strength mark, in two forms off one prop:
 *
 *   <Show when={withImg}
 *         fallback={<div class={clsx("absolute -left-3.5 top-2 h-2 w-2 rounded-full sm:relative
 *                                     sm:left-0 sm:top-0 sm:ml-1",
 *                                    strong && "bg-brand", medium && "bg-warning", weak && "bg-error")}/>}>
 *     <Show when={strong} fallback={<IconAttention class="fill-setting-yellow size-5"/>}>
 *       <IconSuccess class="size-5 fill-brand"/>
 *     </Show>
 *   </Show>
 *
 * The rail passes `withImg`, so it draws the icon; the dot arm is the mobile menu list's, where the
 * mark sits in the row's own flow. Note the dot's colours and the icon's do not agree — a Medium
 * account gets `bg-warning` as a dot and the SAME amber attention icon a Weak one gets, because the
 * icon arm only branches on strong. The original's, reproduced.
 *
 * `fill-setting-yellow` is `#ff9820` out of the remote's own bootstrap CSS, which is `--warning`'s
 * value exactly — the class exists because the remote ships its own Tailwind build and cannot see
 * the host's token. Written out in index.css beside `bg-setting-red`; see the note there.
 */
export default function Status({ withImg = false, className = '' }) {
  const { session } = useSession();
  const { agentPlayer } = useGates();
  const { isWeak, isMedium, isStrong } = securityStatus(session);
  // An agent's player only has Change Password, so there is no strength to warn about.
  if (agentPlayer) return null;

  if (!withImg) {
    return (
      <div
        className={`absolute -left-3.5 top-2 h-2 w-2 rounded-full sm:relative sm:left-0 sm:top-0 sm:ml-1 ${
          isStrong ? 'bg-brand' : isMedium ? 'bg-warning' : isWeak ? 'bg-error' : ''
        } ${className}`}
      />
    );
  }

  return isStrong ? (
    <IconSuccess className={`size-5 fill-brand ${className}`} />
  ) : (
    <IconAttention className={`size-5 fill-setting-yellow ${className}`} />
  );
}
