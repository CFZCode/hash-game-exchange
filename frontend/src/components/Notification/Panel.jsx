import React from 'react';
import EmptyPlaceholder from '../shared/EmptyPlaceholder';
import Loading from '../shared/Loading';
import NoticeItem from './NoticeItem';
import { IconDoubleCheck } from './icons';
import {
  NOTICE_TYPE,
  totalUnread,
  deleteNotice,
  readNotice,
  readAllNotices,
  noticesChanged,
} from '../../services/notification';
import { useNoticeStore } from './store';
import { useGates } from '../../context/gates';

/* The drawer's contents — TWO components on the original, stitched here the way it stitches them:
 *
 *   Header-CTF5n6al.js  `_e`, the shell: a title bar over a lazy `<Suspense>` around the body.
 *   Main-_tXJgJzI.js    `Cn`, the body: the tab strip, the three panes and the sticky bottom bar.
 *
 * The first IS in the saved mirror; the second is not and came off `hash.game/assets/`. Every
 * class list below is one of those two templates' own and every string is verbatim i18n.
 *
 * THE SAME BODY IS THE `/notification` ROUTE. `index-CwG2ydUc.js` is three lines —
 * `<PageLayout title="Notification" class="max-width-dialog"><Main/></PageLayout>` — so on a
 * phone this is a full-screen dialog route and the shell above it is the router's rather than
 * `_e`. Only the desktop drawer is built, as on `/wallet/withdraw` and `/quests`; the mobile
 * header's bell still navigates to `/notification`, which falls through to the catch-all.
 */

/* `Ce`'s three call sites differ only in their message, and `ks` defaults to the type's own
   string — which is why Promotions and System print "Stay tuned-something's coming!" and only
   Transactions overrides it. */
const TRANSACTIONS_EMPTY = 'Only the last 10 days of records are displayed.';

/* `hh` with its default `type: "number"` and `overflow: 99`.
 *
 * A ZERO VALUE RENDERS NOTHING AT ALL — `<Show when={value !== 0}>` wraps the whole pill, so the
 * capture's three bare tab labels are the component working rather than a badge that happens to
 * be invisible. `.badge` is already in index.css from the account dropdown's row counts. */
function Badge({ value, overflow = 99 }) {
  if (!value) return null;
  return <div className="badge">{value > overflow ? `${overflow}+` : value}</div>;
}

/* `CO` — the site's Switch, `size="small"` mapping to `.switch.switch-xs`. A `<div>` and not a
   `<button>`, the same call `DisturbSetting` documents: the original's is a div, and here it is
   also the only shape available, since a nested button inside the row would be invalid markup.
   This row is a `<section>`, so only the second half of that reasoning applies — the first is
   what matters, which is that it is the chunk's own element. */
function Switch({ value, onChange, label }) {
  return (
    <div
      role="switch"
      aria-checked={!!value}
      aria-label={label}
      className="switch switch-xs"
      onClick={() => onChange(!value)}
    >
      {/* The knob. `.switch > div` is what index.css moves and recolours — without this child
          the track renders and nothing slides inside it. */}
      <div />
    </div>
  );
}

/* `ht` — the bar pinned to the bottom of the scroller.
 *
 * `sticky bottom-0` rather than fixed, so it sits at the end of the list and rises with it when
 * the content is short. Its `bg-layer4` is not decoration: rows scroll under it. The shadow is
 * written inline on the original and is kept inline for the same reason a one-off `box-shadow`
 * has nowhere better to live. */
function BottomBar({ showUnread, onToggleUnread, unreadTotal, onReadAll }) {
  return (
    <div
      className="sticky bottom-0 left-0 flex w-full items-center justify-between bg-layer4 p-4"
      style={{ boxShadow: '0px -8px 20px 0px rgba(0, 0, 0, 0.14)' }}
    >
      <section className="flex items-center gap-1">
        <label className="text-sm font-semibold text-primary">Show unread</label>
        <Switch value={showUnread} onChange={onToggleUnread} label="Show unread" />
      </section>

      {unreadTotal > 0 && (
        <section className="flex items-center gap-1 sm:cursor-pointer" onClick={onReadAll}>
          <IconDoubleCheck className="size-5 fill-brand" />
          <label className="text-sm font-semibold text-brand sm:cursor-pointer">
            mark all as read
          </label>
        </section>
      )}
    </div>
  );
}

/* `ne` — the list, or the empty state, or the spinner. Its `<Suspense>` fallback is unreachable
   with a synchronous fixture, exactly as on the Free Plays dialog. */
function NoticeList({ list, empty, onRead, onDelete }) {
  if (!list.length) return <EmptyPlaceholder>{empty}</EmptyPlaceholder>;
  return list.map((notice) => (
    <NoticeItem
      key={notice.afficheId}
      notice={notice}
      onRead={onRead}
      onDelete={onDelete}
    />
  ));
}

/* `Xt` / `en` / `tn` — the three panes, and note only the first two are the same shape. Each
   waits on `httpLoading` behind an absolutely centred spinner, then filters the ONE notice list.
   The System pane's own `<Show>` is different and is written out at the call site. */
function Pending() {
  return (
    <div className="center absolute bottom-0 left-0 right-0 top-0 flex">
      <Loading />
    </div>
  );
}

const TABS = [
  { key: 'promotion', label: 'Promotions' },
  { key: 'transaction', label: 'Transactions' },
  { key: 'system', label: 'System' },
];

export default function NotificationPanel({ className = '', onAnimationEnd, title = true }) {
  const store = useNoticeStore();
  const { state } = store;

  const filtered = React.useMemo(() => {
    const rows = state.noticeList;
    return {
      promotion: rows.filter((r) => NOTICE_TYPE.promotion.includes(r.type)),
      transaction: rows.filter((r) => r.type === NOTICE_TYPE.transaction),
      system: rows.filter((r) => r.type === NOTICE_TYPE.system),
    };
  }, [state.noticeList]);

  const badges = {
    promotion: state.unreadCount.promotion,
    transaction: state.unreadCount.transaction,
    /* The System tab counts BOTH its own notices and the comment replies — the one badge on the
       strip that sums two feeds. */
    system: state.unreadCount.system + state.unreadCount.comment,
  };

  const onRead = (id, type) => {
    readNotice(id, type).then(noticesChanged);
    store.markRead(type);
  };
  const onDelete = (id, type) => {
    deleteNotice(id, type);
    store.removeNotice(id);
  };
  const onReadAll = () => {
    readAllNotices().then(noticesChanged);
    store.markAllRead();
  };

  // Agent's player (or promotions off): no Promotions tab — Transactions opens instead.
  const promoOn = useGates().on('promotions');
  const current = !promoOn && !state.currentType ? 1 : state.currentType;
  const active = TABS[current] ?? TABS[0];

  return (
    /* `_e`'s shell. THE HEIGHT LOOKS WRONG AND IS NOT: the shell is `calc(100% - 3.75rem)` — a
       header's height short of the drawer — while the scroller inside it is `h-full`, i.e. 100%
       of THAT box. So the scroller overflows its parent by exactly the title bar's own 60px and
       its bottom edge lands flush with the window's, which is what puts the sticky bottom bar on
       the last row of pixels. Nothing clips it: `.chat-notice` is `top: 0; bottom: 0`, so there
       is no vertical overflow to hide. Written as the original writes it, quirk included. */
    <div
      className={`w-full ${className}`}
      /* THE CALC ONLY MAKES SENSE WITH THE BAR INSIDE THIS BOX. It is `100% - 3.75rem` because
         the 60px title above it is a child, and the drawer's scroller then deliberately overflows
         by exactly that much — see the note above. In the `/notification` route there is no bar
         here (the dialog draws it) and no fixed-height ancestor either: `.scroll-container` is
         auto, so a percentage height resolves against an indefinite one and the calc would be
         doing nothing except inviting someone to "fix" it. Dropped on that arm rather than left
         to compute to `auto` by accident. */
      style={title ? { height: 'calc(100% - 3.75rem)' } : undefined}
      onAnimationEnd={onAnimationEnd}
    >
      {/* THE TITLE BAR BELONGS TO THE DRAWER'S SHELL, NOT TO THIS PANEL, and the split is the
          original's own: `_e` in `Header-CTF5n6al.js` draws the bar and `Main-_tXJgJzI.js` — this
          component — is only the body. It is written here because the drawer was the only
          consumer, and `/notification` is the second: that route is `<PageLayout
          title="Notification">` over the same body, so the ROUTE's own dialog bar carries the
          word and this one would print it twice. `title={false}` is how the dialog says so.

          Kept here rather than lifted into the drawer, because the height quirk above depends on
          it: the panel is `calc(100% - 3.75rem)` precisely because this 60px bar sits inside it.
          Move the bar and that arithmetic has to move with it. */}
      {title && (
        <div className="flex h-15 items-center justify-center bg-layer4 pl-4 text-base font-extrabold">
          Notification
        </div>
      )}

      {/* NO `hidden-scroll-bar`, and that is the chunk's own: `_e` hands its scroller exactly
          `class: "h-full"`, where the Explore overlay two functions up gets
          `"hidden-scroll-bar h-full w-full"`. So this panel keeps the site's 4px thumb — the
          `.app-root ::-webkit-scrollbar` pair in index.css, which reaches it because `app-root`
          is on `<body>` and the drawer portals into `<body>`. It carried the Explore class for
          one revision, copied along with the portal pattern, and a drawer whose content is
          taller than the window with no bar to show for it is the one thing here that cannot be
          right. */}
      <div className="scroll-y h-full">
        {/* `Cn`'s root. `min-h-[100vh]` is what guarantees the sticky footer has something to
            stick to even when every pane is empty. */}
        <div className="min-h-[100vh] px-4">
          {/* A ZERO-HEIGHT STICKY holding a 72px opaque block — it takes no space in flow and
              paints the backdrop the tab strip pins against, so rows scrolling past disappear
              behind the drawer's own colour instead of behind a transparent strip. `h-18` is
              4.5rem; `sm:dark:bg-layer3` is `.right-slide-content`'s exact fill, which is why
              you cannot see it. All four arms are written — `bg-layer2 sm:bg-layer1
              dark:bg-layer2 sm:dark:bg-layer3` — and note the light pair is NOT the dark pair's
              mirror: light steps layer2 → layer1 where dark steps layer2 → layer3. */}
          <div className="sticky top-0 z-10 h-0">
            <div className="h-18 bg-layer2 dark:bg-layer2 sm:bg-layer1 sm:dark:bg-layer3" />
          </div>

          {/* `class` ON A `TabItem` BELONGS TO THE CONTENT PANEL, NOT THE BUTTON — the fourth
              page in this project to need saying, after the deposit dialog and both referral
              tabs. The chunk hands each item `class: "mt-4 bg-transparent"`, which on the pane
              cancels `.tabs-content`'s layer4 fill and opens 16px above it; on the button it
              would beat `.tabs-btn[aria-selected]`'s layered pill and unlight the whole strip.

              No `type` on the Tabs, so `.tabs-title:not([data-type])` gives the track its
              `tab_nopadding` fill and the selected tab keeps the `tab_selected` pill. */}
          <div
            role="tablist"
            className="scroll-x tabs-title hide-scroll sticky top-4 z-10 mt-4 rounded-xl"
          >
            <div className="tabs-btn-group">
              {TABS.map((tab, index) => (promoOn || tab.key !== 'promotion') && (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={current === index || undefined}
                  className="tabs-btn btn-like"
                  onClick={() => store.setTab(index)}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>{tab.label}</span>
                    <Badge value={badges[tab.key]} />
                  </div>
                </button>
              ))}
            </div>
            <div className="tabs-indicator" />
          </div>

          {/* NO `relative` HERE, deliberately — the pending spinner below is `absolute inset-0`
              and the nearest positioned ancestor on the original is `.right-slide-content`, so it
              covers the WHOLE DRAWER rather than the pane. That is what the chunk does; adding
              `relative` would quietly shrink it to the list area. */}
          <div className="tabs-content mt-4 bg-transparent">
            {state.httpLoading ? (
              <Pending />
            ) : active.key === 'system' ? (
              /* `tn` is wrapped in a `<Show when={list.length > 0}>` of its own and the pane
                 above it tests BOTH lists — so an empty system list and an empty comment list
                 give one crocodile rather than two components each rendering nothing. The
                 comment half is not built; see the note at the bottom of this file. */
              filtered.system.length === 0 && state.commentData.list.length === 0 ? (
                <EmptyPlaceholder />
              ) : (
                <NoticeList list={filtered.system} onRead={onRead} onDelete={onDelete} />
              )
            ) : (
              <NoticeList
                list={filtered[active.key]}
                empty={active.key === 'transaction' ? TRANSACTIONS_EMPTY : undefined}
                onRead={onRead}
                onDelete={onDelete}
              />
            )}
          </div>
        </div>

        <BottomBar
          showUnread={state.showUnread}
          onToggleUnread={store.toggleShowUnread}
          unreadTotal={totalUnread(state.unreadCount)}
          onReadAll={onReadAll}
        />
      </div>
    </div>
  );
}

/* NOT BUILT, each inert at its call site rather than removed:
 *
 * - THE WHOLE COMMENT HALF of the System tab — `Le` (a reply row with an avatar, a like toggle,
 *   the replied-to game's 3:4 cover and a delete), `de`/`me` (the unread and read lists, with a
 *   Load More pager), `Dt` (the reply dialog) and `yt` (a 200-emoji picker with a localStorage
 *   history under `emojiHistory`). All of it is in `Main-_tXJgJzI.js` and all of it needs
 *   `/comment/*`, which answers 403 with the notice feed. Five endpoints for it are recorded in
 *   `endpoints.js` so the work starts from real paths.
 * - `Mt`/`Et` — the comment body's own mini-markup, `[k=v,v]` tags parsed out of the string, of
 *   which exactly one type is handled: a `@user` mention linking to `/user/profile/<id>`.
 * - `Pt` — the relative timestamp ("now" / "3 m" / "2 h" / "5 d" / "1 y"), which only a comment
 *   row prints; a notice row prints `toLocaleString()` instead.
 * - The `<Show when={!0}>` around the tab strip, whose fallback is the comment lists on their
 *   own. Always true, so the fallback is dead code on the live site as well.
 * - `Main-_tXJgJzI.js` also carries an obfuscated anti-tamper snippet — a hex-XOR'd
 *   `document.domain` comparison armed on the first click. Deliberately not ported, the same
 *   call Vault Pro's `ht` got: it is anti-tampering, not UI.
 */
