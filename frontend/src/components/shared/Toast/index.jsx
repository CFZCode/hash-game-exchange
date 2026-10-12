import React from 'react';
import { createPortal } from 'react-dom';
import { subscribe, getToasts, dismissToast } from './toast';
import { useIsDesktop } from '../../../hooks/useMediaQuery';
import './Toast.css';

/* The toast layer — `o3` and `Lx` in index-BsFv7ByC.js, checked against the live page.
 *
 * The markup is the original's own templates, and the live DOM matches them node for node:
 *
 *   Ax = <div class=toast-layer>
 *   Px = <div class="overflow-hidden flex"><div class=toast><div class="pl-2 pr-4 flex">
 *   kx = <div class="ml-auto relative size-6"><div>            ← the ring's box
 *   Rx = <svg class="circle-countdown w-6 h-6 flex-none -mt-0.5" viewBox="0 0 32 32">
 *          <circle cx=16 cy=16 r=8>
 *   Ox = <button>                                                ← the cross
 *
 * EACH TOAST IS AS WIDE AS THE LAYER. The row is a ROW flex container and `.toast` is `flex: 1`,
 * so it fills it — on a desktop the layer is `.pc .toast-layer { width: 24rem }` pinned to the
 * right (a 376px toast at 1440), and on a phone it runs 1rem to 1rem. Measured on the live page.
 *
 * THE ICON IS PART OF THE MESSAGE. `Br.success(t)` passes `() => [<Te.Success class="w-6 h-6 mr-2
 * -mt-0.5 flex-none fill-success"/>, t]` as the message, so the icon sits INSIDE the `pl-2 pr-4`
 * box ahead of the text. The three paths were read off the live DOM.
 *
 * THE RING IS THE CLOCK. `Mx` animates the svg's `stroke-dashoffset` from the stylesheet's 50.265
 * to 0, linear, over `duration` seconds, and dismisses when it finishes — the arc DRAWS IN rather
 * than draining. It runs even when `countdown: false` hides it (`class="hidden"`), which is how a
 * bonus toast still leaves after 7s with only a cross showing.
 *
 * HOVER PAUSES, AND THE PAUSE IS GLOBAL. `s` emits `toast-pause` on the app bus, and EVERY ring
 * listens, so pointing at one toast stops all their clocks; only the hovered one swaps its ring
 * (`opacity-0`) for a cross. The original toggles on both enter and leave, so a ring mounted mid-
 * hover ends up out of phase and never finishes; this sends an explicit pause and play instead,
 * which is the same behaviour without that trap. On a phone there is no hover — a TAP toggles.
 *
 * ENTER AND EXIT ARE A HEIGHT TWEEN on the row (`Xc` with `exitMethod: "keep-index"`): an added
 * row is measured, set to 0 and transitioned to its height over `.5s var(--ease-out)`; a removed
 * one stays where it was, goes to 0 and is dropped 550ms later.
 */

const ICONS = {
  success:
    'M14.5151 5.85694C15.4036 5.22477 16.5954 5.22477 17.4839 5.85694L19.104 7.00929C19.4192 7.23358 19.7811 7.38346 20.1626 7.44776L22.1235 7.77882C23.1986 7.9602 24.041 8.80234 24.2222 9.87745L24.5523 11.8374C24.6166 12.2189 24.7664 12.5818 24.9907 12.897L26.1441 14.5161C26.7762 15.4045 26.7761 16.5964 26.1441 17.4849L24.9907 19.105C24.7665 19.4202 24.6165 19.7822 24.5523 20.1636L24.2222 22.1245C24.0408 23.1995 23.1985 24.0418 22.1235 24.2232L20.1626 24.5532C19.7812 24.6175 19.4192 24.7675 19.104 24.9917L17.4839 26.145C16.5954 26.7771 15.4036 26.7772 14.5151 26.145L12.896 24.9917C12.5808 24.7674 12.2179 24.6175 11.8364 24.5532L9.87648 24.2232C8.80136 24.042 7.95922 23.1996 7.77784 22.1245L7.44679 20.1636C7.38249 19.7821 7.2326 19.4202 7.00831 19.105L5.85597 17.4849C5.22379 16.5964 5.22379 15.4046 5.85597 14.5161L7.00831 12.897C7.23261 12.5818 7.38249 12.2189 7.44679 11.8374L7.77784 9.87745C7.95907 8.80219 8.80122 7.96005 9.87648 7.77882L11.8364 7.44776C12.2179 7.38347 12.5808 7.23359 12.896 7.00929L14.5151 5.85694ZM21.5659 12.3726C21.078 11.8612 20.2678 11.8419 19.7564 12.3296L14.6987 17.1538L12.5425 15.189C12.0199 14.7131 11.2099 14.7514 10.7339 15.2739C10.2584 15.7964 10.2958 16.6056 10.8179 17.0816L13.8374 19.8306C13.965 19.9523 14.1117 20.0422 14.2681 20.1011C14.282 20.1063 14.296 20.111 14.3101 20.1157C14.332 20.1231 14.3542 20.1291 14.3765 20.1353C14.3928 20.1398 14.4089 20.1451 14.4253 20.1489C14.4535 20.1556 14.4818 20.1608 14.5103 20.1655C14.521 20.1673 14.5317 20.1689 14.5425 20.1704C14.5746 20.1749 14.6068 20.1782 14.6392 20.1802C14.647 20.1807 14.6548 20.1818 14.6626 20.1821C14.6987 20.1837 14.7349 20.1836 14.771 20.1821C14.7749 20.182 14.7788 20.1814 14.7827 20.1812C14.8125 20.1797 14.842 20.1769 14.8716 20.1734C14.8856 20.1717 14.8996 20.1706 14.9136 20.1685C14.9405 20.1644 14.967 20.1587 14.9937 20.1528C15.0063 20.1501 15.0192 20.1482 15.0317 20.145C15.0637 20.137 15.0951 20.1272 15.1265 20.1167C15.1326 20.1147 15.1389 20.113 15.145 20.1109C15.1712 20.1017 15.1966 20.0906 15.2222 20.0796C15.2391 20.0724 15.2563 20.0661 15.273 20.0581C15.2926 20.0487 15.3113 20.0374 15.3306 20.0269C15.3466 20.0182 15.3628 20.0099 15.3784 20.0005C15.3999 19.9875 15.421 19.9738 15.4419 19.9595C15.4571 19.9491 15.472 19.9384 15.4868 19.9273C15.5064 19.9126 15.5256 19.8973 15.5444 19.8814C15.5597 19.8684 15.5746 19.8551 15.5894 19.8413C15.5936 19.8374 15.5989 19.8346 15.603 19.8306L21.523 14.1821C22.0343 13.6942 22.0536 12.884 21.5659 12.3726Z',
  error:
    'M16 5.43945C21.832 5.43945 26.5603 10.1671 26.5605 15.999C26.5605 21.8312 21.8321 26.5596 16 26.5596C10.1681 26.5593 5.44043 21.831 5.44043 15.999C5.44066 10.1672 10.1682 5.43969 16 5.43945ZM20.1543 11.8721C19.6544 11.3722 18.8436 11.3722 18.3438 11.8721L16.0244 14.1914L13.7051 11.8721C13.2052 11.3722 12.3944 11.3722 11.8945 11.8721C11.3947 12.3719 11.3947 13.1827 11.8945 13.6826L14.2139 16.002L11.8945 18.3213C11.395 18.8212 11.3948 19.6321 11.8945 20.1318C12.3943 20.6316 13.2052 20.6313 13.7051 20.1318L16.0244 17.8125L18.3438 20.1318C18.8437 20.6313 19.6546 20.6316 20.1543 20.1318C20.654 19.6321 20.6538 18.8212 20.1543 18.3213L17.835 16.002L20.1543 13.6826C20.6541 13.1828 20.6541 12.3719 20.1543 11.8721Z',
  warning:
    'M13.9728 6.92847C14.8874 5.39101 17.1129 5.39105 18.0275 6.92847L26.9045 21.8503C27.8399 23.4229 26.7068 25.4157 24.8771 25.4158H7.12418C5.29437 25.4158 4.1604 23.423 5.09586 21.8503L13.9728 6.92847ZM16.0002 20.3201C15.2935 20.3203 14.7209 20.8936 14.7209 21.6003C14.7209 22.3071 15.2934 22.8804 16.0002 22.8806C16.7071 22.8806 17.2804 22.3073 17.2804 21.6003C17.2804 20.8934 16.7071 20.3201 16.0002 20.3201ZM16.0002 10.8787C15.2935 10.8788 14.7201 11.4523 14.7199 12.1589V17.4392C14.72 18.1459 15.2934 18.7184 16.0002 18.7185C16.707 18.7185 17.2803 18.146 17.2804 17.4392V12.1589C17.2802 11.4522 16.707 10.8787 16.0002 10.8787Z',
};

/* `Te.Close` as the toast draws it — two strokes, which is NOT the single-path cross the dialogs
   use. Read off the live DOM. */
function IconClose() {
  return (
    <svg viewBox="0 0 32 32" className="icon size-4 fill-secondary">
      <path d="M24.9446 21.7276C25.8191 22.6023 25.8186 24.0203 24.9439 24.895C24.0692 25.7697 22.6512 25.7703 21.7764 24.8957L7.1053 10.2246C6.23053 9.34987 6.23053 7.93125 7.1053 7.05647C7.98007 6.1817 9.39869 6.1817 10.2735 7.05647L24.9446 21.7276Z" />
      <path d="M10.2735 24.8957C9.39868 25.7703 7.98069 25.7697 7.10599 24.895C6.23128 24.0203 6.23073 22.6023 7.1053 21.7276L21.7764 7.05647C22.6512 6.1817 24.0698 6.1817 24.9446 7.05647C25.8193 7.93125 25.8193 9.34987 24.9446 10.2246L10.2735 24.8957Z" />
    </svg>
  );
}

/* `Yn.emit("toast-pause")` — the app-wide bus every ring listens on. */
const pauseListeners = new Set();
const emitPause = (action) => {
  for (const fn of [...pauseListeners]) fn(action);
};

/* `Mx` — the ring, and the toast's clock. */
function Countdown({ duration, onEnd }) {
  const ref = React.useRef(null);
  const onEndRef = React.useRef(onEnd);
  React.useEffect(() => {
    onEndRef.current = onEnd;
  });

  React.useEffect(() => {
    const node = ref.current;
    if (!node || typeof node.animate !== 'function') {
      const timer = setTimeout(() => onEndRef.current?.(), duration * 1000);
      return () => clearTimeout(timer);
    }
    const animation = node.animate([{ strokeDashoffset: '50.265' }, { strokeDashoffset: '0' }], {
      duration: duration * 1000,
      easing: 'linear',
      fill: 'forwards',
    });
    let alive = true;
    animation.finished.then(() => alive && onEndRef.current?.()).catch(() => {});

    const onPause = (action) => {
      const pause = action === 'pause' || (action === 'toggle' && animation.playState === 'running');
      if (pause) animation.pause();
      else animation.play();
    };
    pauseListeners.add(onPause);
    return () => {
      alive = false;
      pauseListeners.delete(onPause);
      animation.cancel();
    };
  }, [duration]);

  return (
    <svg ref={ref} className="circle-countdown w-6 h-6 flex-none -mt-0.5" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="8" />
    </svg>
  );
}

/* `Lx` — one toast. */
function ToastRow({ toast, leaving, onRemoved, mobile }) {
  const rowRef = React.useRef(null);
  const timed = toast.duration > 0; // `e()`
  const ring = timed && toast.countdown !== false; // `n()`
  const [paused, setPaused] = React.useState(false); // `r()`
  const onRemovedRef = React.useRef(onRemoved);
  React.useEffect(() => {
    onRemovedRef.current = onRemoved;
  });

  /* `Xc`'s `added`: measure, collapse to 0, then grow back on the next frame. */
  React.useEffect(() => {
    const row = rowRef.current;
    if (!row) return undefined;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      const height = row.clientHeight;
      row.style.height = '0px';
      row.style.transition = 'height .5s var(--toast-ease)';
      inner = requestAnimationFrame(() => {
        row.style.height = `${height}px`;
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, []);

  /* `Xc`'s `removed`: collapse in place, drop it 550ms later. */
  React.useEffect(() => {
    if (!leaving) return undefined;
    const row = rowRef.current;
    if (row) row.style.height = '0px';
    const timer = setTimeout(() => onRemovedRef.current?.(), 550);
    return () => clearTimeout(timer);
  }, [leaving]);

  const togglePause = (action) => {
    emitPause(action);
    setPaused((p) => (action === 'toggle' ? !p : action === 'pause'));
  };

  const onEnter = () => {
    if (!mobile && timed) togglePause('pause');
  };
  const onLeave = () => {
    if (!mobile && timed) togglePause('play');
  };
  const onClick = () => {
    toast.onClick?.();
    if (mobile && timed) togglePause('toggle');
  };

  /* `o(a)` — the cross, in its two placements. */
  const cross = (overRing = false) => (
    <button
      type="button"
      aria-label="Close"
      className={
        overRing
          ? 'size-6 flex center absolute top-0 left-0'
          : 'size-5 flex center absolute right-1.5 cursor-pointer'
      }
      onClick={(event) => {
        event.stopPropagation();
        dismissToast(toast.id);
      }}
    >
      <IconClose />
    </button>
  );

  return (
    <div ref={rowRef} className="overflow-hidden flex">
      <div
        className={`toast${toast.className ? ` ${toast.className}` : ''}`}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onClick={onClick}
      >
        <div className="pl-2 pr-4 flex">
          {toast.variant && (
            <svg viewBox="0 0 32 32" className={`icon w-6 h-6 mr-2 -mt-0.5 flex-none fill-${toast.variant}`}>
              <path fillRule="evenodd" clipRule="evenodd" d={ICONS[toast.variant]} />
            </svg>
          )}
          {toast.message}
        </div>
        {timed ? (
          <div className="ml-auto relative size-6">
            <div className={ring ? (paused ? 'opacity-0 select-none ml-auto size-6' : 'ml-auto size-6') : 'hidden'}>
              <Countdown duration={toast.duration} onEnd={() => dismissToast(toast.id)} />
            </div>
            {(!ring || paused) && cross(ring && paused)}
          </div>
        ) : (
          cross()
        )}
      </div>
    </div>
  );
}

export default function ToastLayer() {
  const toasts = React.useSyncExternalStore(subscribe, getToasts, getToasts);
  const mobile = !useIsDesktop();

  /* `exitMethod: "keep-index"` — a removed toast stays at the index it had until its collapse has
     run, so the rows below it close up rather than jump. */
  /* Merged DURING RENDER (React's "adjust state when a prop changes" idiom) rather than in an
     effect, so a toast's first paint and its store entry land in the same commit. */
  const [state, setState] = React.useState({ source: null, rows: [] });
  let rendered = state.rows;
  if (state.source !== toasts) {
    const live = new Set(toasts.map((t) => t.id));
    const next = toasts.map((toast) => ({ toast, leaving: false }));
    state.rows.forEach((item, index) => {
      if (!live.has(item.toast.id)) next.splice(Math.min(index, next.length), 0, { ...item, leaving: true });
    });
    rendered = next;
    setState({ source: toasts, rows: next });
  }

  const removeRow = React.useCallback((id) => {
    setState((previous) => ({ ...previous, rows: previous.rows.filter((item) => item.toast.id !== id) }));
  }, []);

  if (!rendered.length) return null;

  return createPortal(
    <div className="toast-layer">
      {rendered.map(({ toast, leaving }) => (
        <ToastRow
          key={toast.id}
          toast={toast}
          leaving={leaving}
          mobile={mobile}
          onRemoved={() => removeRow(toast.id)}
        />
      ))}
    </div>,
    document.body,
  );
}
