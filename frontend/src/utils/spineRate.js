/* How fast the block modal's globe turns.
 *
 * The original's Spine loop advances the skeleton by a FIXED 1/60s per animation frame
 * instead of by the real elapsed time (SpineAnimation-DK0wix3y.js):
 *
 *   const J = () => {
 *     if (s) {
 *       try { D(1 / 60) } catch (N) { console.error(...); return }
 *       t = requestAnimationFrame(J)
 *     }
 *   };
 *
 * `D(delta)` is `F.update(delta); F.apply(R); ...`, so one displayed frame always advances
 * `z3` by exactly 1/60s no matter how often the display actually refreshes. The animation
 * therefore plays at refreshRate / 60: 1x on a 60Hz panel, 2x at 120Hz, 2.4x at 144Hz,
 * 2.75x at 165Hz. The dotted ring, the globe and the pin all speed up together, and the
 * pin's bob covers its same 4.98px in proportionally less time, which reads as a bigger
 * bounce.
 *
 * Our version is CSS, and CSS animations run on wall-clock time. Left alone they sit at the
 * 60Hz speed on every machine, which is correct only on a 60Hz display and visibly sluggish
 * above it. So measure the display's real cadence once and publish `--z3-rate` = 60/Hz;
 * RegionBlock.css multiplies it into every duration and delay. That reproduces the
 * original's behaviour on whatever panel the page lands on rather than hard-coding one
 * monitor's speed.
 *
 * This is faithfulness to a bug, not an endorsement of it — pin `--z3-rate: 1` on :root to
 * opt out and get frame-rate-independent timing.
 */

/* Estimating the refresh rate is the fiddly part, and the naive version is wrong in a way
   that makes things WORSE than not measuring at all.
 *
 * The first cut here averaged 20 frame intervals starting at import time — i.e. straight
 * through module evaluation, the first React render and the first paint, when frames are
 * being dropped wholesale. On a real machine it reported 41.4Hz, which is not a display
 * rate, and `60/41.4 = 1.45` then stretched every duration by 45%.
 *
 * Two properties make this robust. Dropped frames only ever make an interval LONGER — the
 * display cannot refresh faster than it refreshes — so the estimator wants the fast tail,
 * not the mean. And the whole sample is only as good as how idle the page was, so it is
 * worth taking twice and keeping the better one.
 *
 * Hence: wait for `load`, sample for a window, take the 10th percentile interval (the
 * minimum invites a freak coalesced pair), then repeat once and keep the higher rate.
 */

const SAMPLE_MS = 500;
const PERCENTILE = 0.1;
/* Below 50Hz we assume a bad sample rather than an exotic display. The cost of being wrong
   is small either way: a genuine 30Hz panel plays z3 at half speed on the original, and we
   would run it at 1x — noticeable but far less than the 45% error the mean produced. */
const MIN_HZ = 50;
const MAX_HZ = 480;

let bestHz = 0;

function publish(hz) {
  if (hz <= bestHz) return;
  bestHz = hz;
  const clamped = Math.min(MAX_HZ, Math.max(MIN_HZ, hz));
  document.documentElement.style.setProperty('--z3-rate', String(60 / clamped));
}

/* Resolves to an estimated Hz, or 0 if the tab went hidden — rAF stops entirely in a hidden
   tab, so a run that spans one is meaningless rather than merely noisy. */
function sample() {
  return new Promise((resolve) => {
    if (document.visibilityState === 'hidden') {
      resolve(0);
      return;
    }

    const stamps = [];
    let spoiled = false;
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') spoiled = true;
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const step = (now) => {
      stamps.push(now);
      if (!spoiled && now - stamps[0] < SAMPLE_MS) {
        requestAnimationFrame(step);
        return;
      }
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (spoiled || stamps.length < 8) {
        resolve(0);
        return;
      }
      const gaps = stamps.slice(1).map((v, i) => v - stamps[i]).sort((a, b) => a - b);
      resolve(1000 / gaps[Math.floor(gaps.length * PERCENTILE)]);
    };

    requestAnimationFrame(step);
  });
}

async function run() {
  publish(await sample());
  await new Promise((resolve) => {
    setTimeout(resolve, 2000);
  });
  publish(await sample());
}

export function measureSpineRate() {
  if (typeof requestAnimationFrame !== 'function') return;
  if (document.readyState === 'complete') {
    run();
    return;
  }
  window.addEventListener('load', run, { once: true });
}
