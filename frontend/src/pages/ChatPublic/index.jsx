import { Navigate, useNavigate } from 'react-router-dom';
import Chat from '../../components/Chat';
import { IconClose } from '../../components/shared/icons';
import useDialogScrollLock from '../../hooks/useDialogScrollLock';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import './ChatPublic.css';

/* `/chat-public` — GLOBAL CHAT AS A PAGE, which is what it is on a phone.
 *
 * The same feature exists twice on the original and this is the half that was missing, exactly as
 * `/explore` was: above the line the header's chat button opens the right-hand drawer
 * (`components/RightDrawer`, the `chat` arm), below it there is no drawer at all and the bottom
 * tabbar's fifth button is a LINK to this route. Its own entry says so — `mn(e)` in
 * Enter-MsmOuq5R.js, the tabbar's data:
 *
 *   { label: () => y("Chat"), icon: "chat", link: "/chat-public",
 *     buttonName: "tabbar_chat", hidden: !1 }
 *
 * and the consumer navigates with a bare `t(u.link)`, so there is nothing else to the button. It
 * had no handler here at all until this route existed, which is the one thing a tab must not do.
 *
 * THE ROUTE IS A PAGE, NOT A DIALOG, and it is guarded to a phone:
 *
 *   { path: "/chat-public", component: Sp, info: { guards: [() => !m.mobile && "/"] } }
 *
 * — Enter-MsmOuq5R.js:8460, sitting AFTER the `{dialog: !0}` group closes rather than inside it,
 * so none of this build's dialog-route machinery applies. The guard is the same
 * `() => !m.mobile && "/"` Explore's carries and is read the same way: a guard returning a path
 * is a redirect, `m.mobile` is a DEVICE test, and this build reads it as the 1024 line that
 * `useMediaQuery` documents and every other JS caller follows. 1024 is also where the two entry
 * points hand over — the tabbar that links here is `lg:hidden` and the header button that opens
 * the drawer is `hidden lg:flex` — so the redirect fires exactly when the drawer becomes
 * available and never leaves a width with neither. `replace`, so a desktop visitor bounced to
 * Home does not have this path one Back press away.
 *
 * ── WHAT THE LIVE SCREEN ACTUALLY IS, MEASURED ───────────────────────────────────────────────
 *
 * `Sp` resolves to `index-CUBJDfzw.js`, which is NOT in the saved mirror and came off
 * `hash.game/assets/` under the hash `__vite__mapDeps` already lists — rung 2 of the recovery
 * ladder. Its default export is thin:
 *
 *   <Show when={!initRoom() || transitioning} fallback={<Chat/>}>
 *     <Show when={O.mobile} fallback={<div class="size-full flex items-center justify-center">}>
 *       <div class="flex items-center justify-center fixed top-0 left-0 right-0 bottom-0">
 *
 * so the page IS the chat panel, with a loader in front of it while the room is joined — and on
 * a phone that loader is the whole viewport. Then hash.game/chat-public was loaded on a 390
 * phone and read off the DOM, because the shell around it is not in that chunk:
 *
 *   the chat's own header   `.header-layer` FIXED at 0,0 390x51, z-100 — 3.5rem at this width's
 *                           14.51px root, i.e. the panel's own `h-14`, not a bar this page adds
 *   the site's header       `.page-header` still mounted at z-99, covered by the above rather
 *                           than hidden. Reproduced by stacking, not by unmounting anything
 *   the tabbar              STAYS: fixed at y=779, 65 tall (4.5rem), z-110, and its Chat button
 *                           is lit green — the panel ends above it rather than under it
 *   the document            `scrollHeight === innerHeight`; nothing behind it scrolls
 *   the cross              navigates to `/` (clicked it live and read the URL back)
 *
 * `#root` measured 116px tall on that page, so the panel is fixed rather than flowed — which is
 * why this component's box is `position: fixed` off the tabbar's own height instead of a page
 * card in the layout column.
 *
 * ── THE ONE ARM NOT REPRODUCED ────────────────────────────────────────────────────────────────
 *
 * The full-screen loader above is `initRoom()` — the socket JOIN, which this build has no
 * analogue for: `components/Chat` reads a room LIST through `useResource(getChatRooms)` and
 * renders the site's own 12px inline spinner in the channel name while that lands, a choice
 * documented at its call site. A second, full-viewport spinner in front of it would be this
 * build's invention rather than a port, so it is not added — the same reasoning the loading notes
 * give for a declared `initialValue` not being a loading state.
 */
export default function ChatPublicPage() {
  const isDesktop = useIsDesktop();
  const navigate = useNavigate();

  /* Before the early return, or it is a conditional hook. The live page does not scroll behind
     the panel (measured above) and this page's own column is empty under it — the layout's
     footer would otherwise make the document scrollable behind a fixed panel. */
  useDialogScrollLock(!isDesktop);

  if (isDesktop) return <Navigate to="/" replace />;

  return (
    <div className="chat-public">
      {/* THE SAME CROSS AS THE DRAWER'S, to the class list — `end-2 top-3.5 z-[101] size-8
          rounded-lg bg-layer5 p-0` over a `size-4.5` glyph. It is the drawer's rather than this
          page's on the original too: the live phone header carries three squares and the third
          reports as `button.button.size-8.bg-layer5`, which is that button. Only the action
          differs, and it is the action the route implies — there is no drawer to close here, so
          it goes home, which is what clicking it live does. `z-[101]` beats the panel's own
          `header-layer` at z-10 for the reason the drawer records. */}
      <button
        type="button"
        className="button button-m absolute end-2 top-3.5 z-[101] size-8 rounded-lg bg-layer5 p-0"
        onClick={() => navigate('/')}
        aria-label="Close"
      >
        <IconClose className="size-4.5 fill-secondary" />
      </button>
      <Chat />
    </div>
  );
}
