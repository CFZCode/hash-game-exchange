import React from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import Tabbar from './Tabbar';
import FloatingActions from './FloatingActions';
import Footer from './Footer';
import Explore from '../../components/Explore';
import RightDrawer from '../../components/RightDrawer';
import ToastLayer from '../../components/shared/Toast';
import './MainLayout.css';

/* The width at or above which the sidebar shows its labels. Also `openRight`'s own test, because
   it is the same sum: 240 (rail) + the page + 380 (drawer). */
const SIDEBAR_UNFOLD_WIDTH = 1280;

export default function MainLayout({ children }) {
  /* ── THE SIDEBAR FOLDS ITSELF BELOW 1280, AND THAT IS THE SAME LINE THE DRAWER USES ────────
   *
   * Measured on the live site rather than inferred: resized through the band, `.app-root` carries
   * `side-unfold` with a 240px rail at 1280 and `side-fold` with a 72px one at 1279, and a resize
   * re-derives it either way — a rail folded by hand comes back unfolded as soon as the window
   * crosses back up. So the width decides the state and the toggle only holds between ticks,
   * which is what the resize effect below reproduces.
   *
   * It is the same 1280 as `openRight`'s, and for the same arithmetic: 240 + the page + 380 does
   * not fit under it. This was `useState(true)`, so every width from `lg` up rendered the rail
   * expanded and the whole page column sat 168px to the right of where the live site puts it
   * between 1024 and 1279. Read at mount as well as on resize, so the first paint is already
   * right rather than expanding and then folding. */
  const [sidebarExpanded, setSidebarExpanded] = React.useState(
    () => document.documentElement.clientWidth >= SIDEBAR_UNFOLD_WIDTH,
  );
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const location = useLocation();

  /* The mobile menu closes on navigation — every row inside it is a link, so leaving it open
     across a route change would leave the sheet sitting over the page you just asked for.
     ADJUSTED DURING RENDER, keyed on the pathname, rather than in an effect: this is the
     "adjust state when a prop changes" pattern React documents, and it is what
     `react-hooks/set-state-in-effect` is steering towards — an effect here schedules a second
     commit, so the new page paints for one frame with the old page's menu still over it. `App`'s
     background-location and dialog-depth state are the same pattern for the same reason.

     The tracked pathname is what makes it terminate: the setState pair runs once per entry, the
     extra pass is discarded before commit, and no child re-renders. */
  const [menuPath, setMenuPath] = React.useState(location.pathname);
  if (menuPath !== location.pathname) {
    setMenuPath(location.pathname);
    if (mobileMenuOpen) setMobileMenuOpen(false);
  }

  /* The second signal the layout owns. On the original both live in the same place — Enter's
     root creates `[i, s]` for explore alongside the fold state and hands the setter down to
     the header, which is the only thing that opens it. */
  const [exploreOpen, setExploreOpen] = React.useState(false);

  const closeExplore = React.useCallback(() => setExploreOpen(false), []);

  /* The third signal, and it is now the same STRING the original's is — `[e, n] = S("")` in `ia`
   * (Enter-MsmOuq5R.js), naming WHICH right-hand drawer is open rather than whether one is:
   * "" / "notice" / "chat" / "private-chat". It was a boolean while `notice` was the only arm
   * built, with a note to widen it the day the chat landed; two of the three are built now and
   * they share one container, one close button and one transition. `private-chat` is the TypeX
   * SDK panel and has no entry point here.
   *
   * IT LIVES HERE RATHER THAN IN THE DRAWER because two of the three things hanging off it are
   * the layout's, not the panel's — see the note at the top of components/RightDrawer. */
  const [right, setRight] = React.useState('');
  const closeRight = React.useCallback(() => setRight(''), []);

  /* `d(g) { g !== "" && u() && o(!0); n(g) }`, where `u()` is `clientWidth < 1280` — opening a
     drawer FOLDS THE SIDEBAR on anything narrower than 1280, because 240 + the page + 380 does
     not fit. Read at the moment of the click, as the original reads it. Note the fold happens for
     ANY drawer, which is why this takes the name rather than being one per panel — and why
     switching straight from the bell to the chat button does not re-fold anything, since the
     sidebar is already closed. */
  const openRight = React.useCallback((which) => {
    if (document.documentElement.clientWidth < SIDEBAR_UNFOLD_WIDTH) setSidebarExpanded(false);
    setRight(which);
  }, []);

  /* `l` on the original — the last non-empty value, which is what a resize back above 1024
     restores. Kept here so the toggle below can ask "is THIS drawer the open one?" without the
     header needing to know about the other. */
  const toggleRight = React.useCallback(
    (which) => (right === which ? closeRight() : openRight(which)),
    [right, closeRight, openRight],
  );

  /* `M(() => { o(clientWidth < 1280); d(clientWidth > 1024 ? l : "") })` — the drawer is closed
     on every resize tick below 1025 and RESTORED above it from `l`, the last non-empty value.
     Only the closing half is reproduced: restoring needs the string signal above, and a drawer
     that reopens itself when you widen the window is the half worth having last, not first.
     This is also the whole of what makes the panel desktop-only; nothing else tests a width. */
  React.useEffect(() => {
    const onResize = () => {
      const width = document.documentElement.clientWidth;
      if (width <= 1024) setRight('');
      /* The fold rule, read from the same tick rather than from a second listener — the original
         reads `clientWidth` once per resize and settles both. */
      setSidebarExpanded(width >= SIDEBAR_UNFOLD_WIDTH);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* `f("chat-unfold", "chat-fold", () => right() !== "")` — both classes, because the pair is
     what `.chat-notice`'s width and the page's own `margin-inline-end` key off. Removed on
     unmount so a hot reload cannot leave the page pushed. Note it goes off the INSTANT the
     drawer closes, not when its exit animation finishes: the container collapses to 0 over its
     own 0.2s while the panel inside slides out over 0.3s and is clipped away by it, which is the
     original's behaviour and reads as one gesture. */
  React.useEffect(() => {
    const list = document.body.classList;
    list.toggle('chat-unfold', right !== '');
    list.toggle('chat-fold', right === '');
    return () => {
      list.remove('chat-unfold');
      list.add('chat-fold');
    };
  }, [right]);

  return (
    <div className="main-layout-wrapper">
      <Header
        sidebarExpanded={sidebarExpanded}
        onToggleSidebar={() => setSidebarExpanded(!sidebarExpanded)}
        onOpenExplore={() => setExploreOpen(true)}
        onToggleNotice={() => toggleRight('notice')}
        onToggleChat={() => toggleRight('chat')}
        mobileMenuOpen={mobileMenuOpen}
      />
      <div className="main-layout-body">
        <Sidebar
          sidebarExpanded={sidebarExpanded}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />
        <main className={`main-layout-content ${sidebarExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
          {/* The original's `mx-auto max-w-[1248px]` page wrapper. Its 1248 is a border box
              including its own px-4, so the cap on the content itself is 1216. */}
          <div className="main-layout-container">{children}</div>
          {/* Outside the container on purpose — the footer's rules run wider than its
              1248px cap, and the original mounts the footer from the layout shell too. */}
          <Footer />
        </main>
      </div>
      <Tabbar
        isMenuOpen={mobileMenuOpen}
        onToggleSidebar={() => setMobileMenuOpen(prev => !prev)}
      />
      <FloatingActions />
      {/* Portals itself to <body> — it is above everything (z-index 9999) and must not sit
          inside the layout's stacking or scroll context. */}
      <Explore open={exploreOpen} onClose={closeExplore} />
      {/* Portalled to <body> for the same reason, and it must be: `.chat-notice` is
          `position: fixed` at z-102, above the header — mounted inside the layout it would still
          be fixed, but the page's own `margin-inline-end` would then be shifting an ancestor of
          it and the drawer would slide away from the edge it is pinned to. */}
      <RightDrawer right={right} onClose={closeRight} />
      {/* Portalled to <body> like the two above, and highest of the three: `.toast-layer` is
          z-10000, over the dialog manager's own 1100, because a confirmation raised from inside a
          dialog has to be readable on top of it. Mounted once here rather than per page — the
          queue is a module store, so anything can raise one without this component's existence
          being a prop somebody has to thread. */}
      <ToastLayer />
    </div>
  );
}
