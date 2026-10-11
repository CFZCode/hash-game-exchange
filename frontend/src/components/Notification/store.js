import React from 'react';
import { useSession } from '../../context/session';
import useResource from '../../hooks/useResource';
import {
  getSystemNotices,
  getCommentReplies,
  reduceNotices,
  totalUnread,
  atLeastZero,
} from '../../services/notification';

/* `Us` in `Enter-MsmOuq5R.js`, ported — the notification drawer's store.
 *
 * ON THE ORIGINAL IT IS A SINGLETON (`gn = pt(Us)`, a `createRoot` around it), because two things
 * read it: this panel and the bell's red dot. Here it is a plain hook with one consumer, since
 * the dot reads `session.redDot.systemNotice` off the account fixture instead — see the note on
 * `Qe("redDot", …)` below. Lift it to a context the day the two have to agree on a live number.
 *
 * THE PERSISTED KEY IS THE ORIGINAL'S OWN, `noticeUnreadStatus_<userId>`, holding the strings
 * "on"/"off" rather than a boolean — the same shape `first-set-disturb-<userId>` uses one file
 * over. Per-account, so switching accounts does not inherit the last one's filter.
 *
 * WHAT THIS DOES NOT REPRODUCE, and why each is a no-op today:
 *
 * - `Qe("redDot", "systemNotice", total)`, which writes the header's dot count back into the
 *   account store on every read/delete. `SessionContext` exposes `setSetting` and
 *   `updateBalance` and nothing that reaches `redDot`; with every count at zero there is no
 *   number to write. Widen that setter the day a real feed lands.
 * - The `n` guard (`initFn` runs once unless forced). This hook fetches on mount and the panel
 *   only mounts while the drawer is open, so mount IS `initFn(!0)` — the same reasoning the Free
 *   Plays dialog's `open` gate is written under.
 * - The in-flight `e` lock around every write. It exists to stop a double click firing two
 *   POSTs; nothing here can reach a write, and `useResource` is not what would need it.
 */

const prefKey = (userId) => `noticeUnreadStatus_${userId}`;

/* localStorage is wrapped for the reason `context/persist.js` wraps it: a private window or
   disabled site data throws on access, and a filter that will not stick is better than a drawer
   that will not render. */
const readPref = (userId) => {
  try {
    return window.localStorage.getItem(prefKey(userId)) === 'on';
  } catch {
    return false;
  }
};

const writePref = (userId, value) => {
  try {
    window.localStorage.setItem(prefKey(userId), value ? 'on' : 'off');
  } catch {
    /* ignore — see above */
  }
};

/* `!n && C > 0 && (promotion > 0 ? 0 : transaction > 0 ? 1 : 2)` — on the FIRST load only, the
   drawer opens on whichever tab has something unread, preferring Promotions then Transactions
   and otherwise landing on System. With nothing unread it stays on 0, which is the capture. */
const pickTab = (counts) => {
  if (totalUnread(counts) <= 0) return 0;
  if (counts.promotion > 0) return 0;
  if (counts.transaction > 0) return 1;
  return 2;
};

export function useNoticeStore() {
  const { session } = useSession();
  const userId = session.userId;

  const [showUnread, setShowUnread] = React.useState(() => readPref(userId));

  /* Both reads are keyed on the filter, so flipping "Show unread" refetches — which is exactly
     what `u()` does on the original (`o("showUnread", f); localStorage.setItem(...); i(!0)`). */
  const readNotices = React.useCallback(
    () => getSystemNotices({ showUnread, userId }),
    [showUnread, userId],
  );
  const readComments = React.useCallback(() => getCommentReplies({ showUnread }), [showUnread]);

  const notices = useResource(readNotices);
  const comments = useResource(readComments);

  /* `Bs(v[0])` plus `k.unreadCount.comment = Number(v[1].extra || 0)` — the two responses are
     reduced together, because the comment count comes off the OTHER request's `extra` rather
     than out of the notice payload. */
  const base = React.useMemo(() => {
    const reduced = reduceNotices(notices.data, {
      areaCode: session.areaCode ?? '',
      userCountry: session.userCountry ?? '',
    });
    reduced.unreadCount.comment = Number(comments.data?.extra || 0);
    return reduced;
  }, [notices.data, comments.data, session.areaCode, session.userCountry]);

  /* The first render already has `base` — `useResource` returns a fixture synchronously — so the
     opening tab can be chosen in the initialiser rather than written from an effect. That is
     also the original's own timing: `currentType` is picked inside `initFn`, before the store
     ever hands the panel a list. */
  const [currentType, setCurrentType] = React.useState(() => pickTab(base.unreadCount));

  /* Local edits layered over the fetched list, rather than a mutable copy of it. The original
     rewrites its store in place because it owns the array; here the array belongs to
     `useResource`, and a refetch (which "Show unread" triggers) has to win over anything stale.
     `deleted` is a Set of afficheIds; `readIds` marks a row read without refetching. */
  const [edits, setEdits] = React.useState({ deleted: [], readIds: [], allRead: false });
  const [countPatch, setCountPatch] = React.useState(null);

  const state = React.useMemo(() => {
    const deleted = new Set(edits.deleted);
    const readIds = new Set(edits.readIds);
    const noticeList = base.noticeList
      .filter((row) => !deleted.has(row.afficheId))
      .map((row) =>
        edits.allRead || readIds.has(row.afficheId) ? { ...row, isRead: 1 } : row,
      );

    const unreadCount = edits.allRead
      ? { promotion: 0, transaction: 0, system: 0, comment: 0 }
      : (countPatch ?? base.unreadCount);

    return {
      currentType,
      showUnread,
      noticeList,
      unreadCount,
      commentData: comments.data ?? { list: [] },
      httpLoading: notices.loading || comments.loading,
    };
  }, [base, edits, countPatch, currentType, showUnread, comments.data, notices.loading, comments.loading]);

  const store = React.useMemo(
    () => ({
      state,

      setTab: setCurrentType,

      toggleShowUnread: (next) => {
        setShowUnread(next);
        writePref(userId, next);
        /* A refetch replaces the list, so local edits against the old one are dropped —
           the original does the same by rebuilding its store from the response. */
        setEdits({ deleted: [], readIds: [], allRead: false });
        setCountPatch(null);
      },

      /* `_(afficheId, type)` decrements whichever counter the CURRENT TAB owns, not the one the
         row's own type belongs to. That looks like a bug and is the original's, and it cannot
         diverge in practice: a row is only clickable inside the pane that lists it. */
      markRead: () => {
        setCountPatch((current) => {
          const from = current ?? state.unreadCount;
          const key = ['promotion', 'transaction', 'system'][currentType];
          return { ...from, [key]: atLeastZero(from[key] - 1) };
        });
      },

      markAllRead: () => setEdits((e) => ({ ...e, allRead: true })),

      removeNotice: (afficheId) =>
        setEdits((e) => ({ ...e, deleted: [...e.deleted, afficheId] })),
    }),
    [state, userId, currentType],
  );

  return store;
}

export default useNoticeStore;
