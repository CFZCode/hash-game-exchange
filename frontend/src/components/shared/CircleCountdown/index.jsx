import React from 'react';

/* `C` in `CircleCountdown-C0Wkxy5W.js`, verbatim — the little ring that drains beside the Swap
 * page's Rate row and re-quotes when it empties.
 *
 * Two stacked circles at r=12 in a 32-viewBox, the second stroked `#24EE89` (brand green, and the
 * literal is the chunk's own) with `stroke-linecap: round` and a 0.2s linear transition on
 * `stroke-dashoffset`. The `-rotate-90` on the <svg> is what starts the arc at twelve o'clock.
 * Circumference is `2 * PI * 12`, written into `stroke-dasharray`, and `stroke-dashoffset` is
 * that times the remaining fraction — so it empties clockwise.
 *
 * TWO MODES, and the Swap page uses the second: `duration` runs a repeating tick that calls
 * `onTrigger` each time it laps, while `endTime` is a one-shot to an absolute instant that calls
 * `onComplete` and stops. Both are ported because they are ten lines together and picking one
 * would mean the next call site re-derives the other.
 *
 * `requestAnimationFrame` rather than an interval, as the original has it — a 30s countdown drawn
 * at 0.2s transition granularity looks wrong if it only updates once a second. The `alive` flag
 * mirrors the chunk's `r`, which stops a frame that lands after teardown.
 *
 * Progress is written straight onto the node rather than held in state, which is this build's
 * departure and the same one the promotions tab indicator, the referral ticker and the hero's
 * gsap dots make: sixty setStates a second for a value only CSS reads is a re-render per frame.
 */
export default function CircleCountdown({
  endTime,
  duration = 0,
  onComplete,
  onTrigger,
  className = '',
}) {
  const arcRef = React.useRef(null);
  /* Read during the frame loop, so they must not go stale between renders — but changing one
     must not restart the loop either, which is why they are refs and not deps. */
  const onCompleteRef = React.useRef(onComplete);
  const onTriggerRef = React.useRef(onTrigger);

  /* Synced in an effect rather than assigned during render, which the lint rule forbids — and it
     has to be its own effect with no dependency array so that a new callback identity does not
     restart the frame loop below. Declared first so it commits before the loop's first tick; the
     initialisers above already cover the mount. */
  React.useEffect(() => {
    onCompleteRef.current = onComplete;
    onTriggerRef.current = onTrigger;
  });

  React.useEffect(() => {
    const circumference = 2 * Math.PI * 12;
    let alive = true;
    let frame = 0;
    let last = Date.now();

    const draw = (fraction) => {
      if (arcRef.current) {
        arcRef.current.setAttribute('stroke-dashoffset', String(circumference * (1 - fraction)));
      }
    };

    const tick = () => {
      if (!alive) return;
      const now = Date.now();

      if (duration > 0) {
        const elapsed = now - last;
        draw(Math.max(0, 1 - elapsed / duration));
        if (elapsed >= duration) {
          onTriggerRef.current?.();
          last = now;
        }
      } else if (endTime) {
        const span = Math.max(0, endTime - last);
        const left = Math.max(0, endTime - now);
        draw(span > 0 ? left / span : 0);
        if (left <= 0) {
          onCompleteRef.current?.();
          return;
        }
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
    };
  }, [endTime, duration]);

  return (
    <div className={`relative size-4 ${className}`}>
      <svg width="100%" height="100%" viewBox="0 0 32 32" className="-rotate-90">
        <circle cx="16" cy="16" r="12" fill="none" stroke="transparent" strokeWidth="4" />
        <circle
          ref={arcRef}
          cx="16"
          cy="16"
          r="12"
          fill="none"
          stroke="#24EE89"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={2 * Math.PI * 12}
          style={{ stroke: 'var(--color-brand, #24EE89)', transition: 'stroke-dashoffset 0.2s linear' }}
        />
      </svg>
    </div>
  );
}
