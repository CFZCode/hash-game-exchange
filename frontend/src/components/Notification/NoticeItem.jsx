import React from 'react';
import PopCenter from '../shared/PopCenter';
import { IconArrow } from '../shared/icons';
import { IconDelete } from './icons';
import { NOTICE_TYPE } from '../../services/notification';
import { useSettings } from '../../context/settings';
import topDark from '../../assets/notification/top_dark.png';
import topLight from '../../assets/notification/top_light.png';

/* `Yt` in `Main-_tXJgJzI.js` — one row in any of the three panes.
 *
 * IT IS BUILT EVEN THOUGH THE FEED CAN NEVER REACH IT, the call the Free Plays row got: the
 * chunk gives the template in full, the one image it needs was recoverable, and a row is the
 * whole point of the panel. Every class list below is the Solid template's own.
 *
 * FIVE THINGS THE CHUNK SETTLES that a screenshot could not, since no capture shows a row:
 *
 * - THE BODY IS A BLOCK LIST, NOT A STRING. `contentV3[0].content` is an array of typed blocks:
 *   1 is a paragraph, 3 is an image (fetched at `?width=640`), and 2 is NOT content at all — it
 *   carries the row's call-to-action link in `content` and its label in `desc`, and renders
 *   nothing where it sits. See the note on `cta` below for the one divergence that forces.
 * - ONLY A PROMOTIONS ROW COLLAPSES. The 220px test is gated on `Ls.includes(type)`, so a
 *   transaction or system notice is never clamped however long it is, and the Show all / Hide
 *   button never appears on one.
 * - THE THRESHOLD IS MEASURED IN DESIGN PIXELS, not CSS pixels — `remScale * offsetHeight`. Below
 *   640 this project's root font-size grows with the viewport (see `utils/remScale.js`), so a
 *   raw `offsetHeight` would clamp a shorter body at 639px than at 430px. The original divides it
 *   out and so does this.
 * - THE WHOLE CARD IS THE READ TARGET. `onClick` sits on the outer div, so reading a notice is
 *   opening it; the CTA link marks it read a second time on its way out, which is a no-op after
 *   the first because `unread` has already gone false.
 * - `isTop` PUTS ART IN THE CORNER, and that art is `position: absolute` against the CARD while
 *   its caption is in a `mb-3` block in flow — the `<img>` is a sibling of the `<p>` inside that
 *   block, but nothing between them is positioned, so it anchors to the card's own padding box.
 *
 * TWO THINGS ON THIS ROW BRANCH ON THE THEME IN JS RATHER THAN IN CSS, and both are the
 * original's own `le.darken` reads: the corner artwork is a different FILE per theme, and the
 * Show all button's background is an inline `rgba()` that no token covers. Both pairs are
 * written, since this build's theme toggle is live — the corner art's light twin
 * (`top-light-Bo57KVJd.png`) is fetched alongside the dark one.
 */

/* `j.remScale` — the factor `utils/remScale.js` writes into the root font-size. Read back off
   the document rather than exported from that module, because the module SETS it and the value
   the original compares against is whatever is live at the moment of measurement. */
const remScale = () =>
  parseFloat(getComputedStyle(document.documentElement).fontSize || '16') / 16;

/* `At` — the delete confirmation. A `.pop-center` on the original, pushed onto the popup stack;
   `components/shared/PopCenter` is that shell. All three strings are verbatim i18n.
   `button-m` on both buttons is `ot`'s own, not the call site's — the rule the account dropdown's
   rows document, and `h-12` beats its 2.5rem the same way. */
function DeleteConfirm({ open, onClose, onConfirm }) {
  return (
    <PopCenter open={open} onClose={onClose} title="Confirm">
      <p className="mt-4 text-center text-secondary">Are you sure to delete this notice?</p>
      <div className="mt-8 flex w-full items-center justify-between gap-3">
        <button
          type="button"
          className="button button-m button-second h-12 flex-1 text-lg font-extrabold text-primary"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className="button button-m button-brand h-12 flex-1 text-lg font-extrabold text-primary_brand"
          onClick={onConfirm}
        >
          Confirm
        </button>
      </div>
    </PopCenter>
  );
}

export default function NoticeItem({ notice, onRead, onDelete }) {
  const { afficheId, type, isTop, createTime, isRead } = notice;
  const { darken } = useSettings();

  const [unread, setUnread] = React.useState(isRead === 0);
  const [expanded, setExpanded] = React.useState(true);
  const [clampable, setClampable] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  const bodyRef = React.useRef(null);

  const content = notice.contentV3?.[0];

  /* `oe(() => { u(w.content); b(w.desc) })` — the original discovers the CTA by running a
     `batch` SETTER from inside the block list's render, which React forbids outright (it is the
     cascading render `react-hooks/set-state-in-effect` exists for). Derived here instead, which
     is the same value one render earlier and needs no state at all. A `contentType: 2` block is
     the only place a link can come from, and the last one wins, as it does there. */
  const cta = React.useMemo(() => {
    let found = null;
    for (const block of content?.content ?? []) {
      if (block.contentType === 2) found = { href: block.content, label: block.desc };
    }
    return found;
  }, [content]);

  /* `Ze(...)` — onMount, once. A row's height cannot change afterwards: the blocks are static
     and the only thing that moves is this clamp. */
  React.useEffect(() => {
    if (!bodyRef.current) return;
    if (!NOTICE_TYPE.promotion.includes(type)) return;
    if (remScale() * bodyRef.current.offsetHeight <= 220) return;
    setExpanded(false);
    setClampable(true);
  }, [type]);

  if (!content) return null;

  const markRead = () => {
    if (!unread) return;
    onRead?.(afficheId, type);
    setUnread(false);
  };

  return (
    <div className="relative mb-3 rounded-lg bg-layer4 px-3 py-2" onClick={markRead}>
      {isTop === 1 && (
        <div className="mb-3">
          <p>Exclusive Notification</p>
          <img className="absolute right-0 top-0 w-15" alt="" src={darken ? topDark : topLight} />
        </div>
      )}

      <div className="flex items-center text-secondary">
        <div>{new Date(createTime).toLocaleString()}</div>
        {unread && <div className="ml-2 size-2.5 rounded-full bg-brand" />}
      </div>

      <div className="mt-2 text-base font-extrabold">{content.title}</div>

      <div
        ref={bodyRef}
        className="relative overflow-hidden"
        style={{ maxHeight: expanded ? undefined : '200px' }}
      >
        {/* `<Index each={...}>` on the original, which keys BY POSITION rather than by value —
            so the index key below is the faithful choice here rather than a fallback. A block
            carries no id and the array never reorders. */}
        {(content.content ?? []).map((block, index) => {
          const key = `${index}-${block.contentType}`;
          if (block.contentType === 3) {
            return (
              <img key={key} className="my-2 min-h-8" alt="" src={`${block.content}?width=640`} />
            );
          }
          if (block.contentType === 1) {
            return (
              <div key={key} className="my-2 whitespace-pre-wrap text-secondary">
                {block.content}
              </div>
            );
          }
          /* contentType 2 is the CTA and draws nothing here — see `cta` above. */
          return null;
        })}

        {clampable && (
          <button
            type="button"
            className="button button-m center absolute bottom-1 right-0 ml-auto h-8 rounded-md"
            /* `le.darken ? "rgba(58,65,66, 0.8)" : "rgba(240,242,242, 0.8)"` — layer5 at 80%
               against a light grey at 80%, written inline by the original because it is
               theme-dependent and neither is a token. Translucent on purpose: it sits over the
               clamped text it is hiding the bottom of. */
            style={{ background: darken ? 'rgba(58,65,66, 0.8)' : 'rgba(240,242,242, 0.8)' }}
            onClick={(event) => {
              event.stopPropagation();
              setExpanded((v) => !v);
            }}
          >
            <span>{expanded ? 'Hide' : 'Show all'}</span>
            <IconArrow
              className={`icon ml-1 size-6 ${expanded ? 'rotate-90' : '-rotate-90'}`}
            />
          </button>
        )}
      </div>

      {/* `h-13` IS DROPPED — the `w-30` / `h-22` trap a third time, and this build cannot keep it.
          The chunk writes this row `class="h-13 mt-2 flex items-center"`, and `.h-13` is in
          NEITHER the mirror's `index-DxOqNczA.css` NOR the current deploy's `index-DGr5jguQ.css`
          — both checked. Tailwind v3's height scale steps 12 → 14 → 16 and the site's own additions
          are 15, 18, 20; there is no 13. So the row is AUTO height on the live site, i.e. exactly
          `.button`'s 3rem, and Tailwind v4 — which generates the spacing scale on demand — would
          emit 3.25rem here and make it 4px too tall. Check any `h-*`/`w-*` outside v3's scale
          against the deploy's CSS before transcribing it. */}
      <div className="mt-2 flex items-center">
        {cta && (
          <a className="block" href={cta.href} target="_blank" rel="noreferrer" onClick={markRead}>
            {/* `type: "second"` plus `button-brightBg`, whose two declarations are the same two
                colours the pair of utilities beside it writes — the original's own belt and
                braces, reproduced rather than deduplicated. */}
            <button
              type="button"
              className="button button-m button-second button-brightBg h-10 bg-[#f2f2f2] px-5 text-brand dark:bg-[#464f50]"
            >
              {cta.label || 'View More'}
            </button>
          </a>
        )}

        <button
          type="button"
          className="button button-m ml-auto text-secondary"
          onClick={(event) => {
            event.stopPropagation();
            setConfirming(true);
          }}
          aria-label="Delete"
        >
          <IconDelete className="icon size-6" />
        </button>
      </div>

      <DeleteConfirm
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          onDelete?.(afficheId, type);
          setConfirming(false);
        }}
      />
    </div>
  );
}
