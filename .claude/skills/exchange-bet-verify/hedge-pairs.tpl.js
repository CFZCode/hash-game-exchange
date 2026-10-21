// Rollover on a thin wallet (real money — budget rules apply): sed __MARKET__ (a Match Odds card), __RUNNER__, __STAKE__,
// __PAIRS__. Each pair = LAY __STAKE__ then BACK __STAKE__ on the same runner. The lay needs only its liability and the
// back then needs only the change in worst case (TENEXCH's wallet gate), so a ₹100 wallet can run it; the wager grows by
// 2 × stake per pair (counted when the market settles) for about ₹1 of exposure.
async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const [M, R, STAKE, PAIRS] = ['__MARKET__', '__RUNNER__', __STAKE__, __PAIRS__];
  window.__toasts = window.__toasts || [];
  if (!window.__toastObs) {
    window.__toastObs = new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => {
      const t = n.innerText?.trim();
      if (t && t.length < 160 && /placed|not confirm|limit|balance|suspend|odds change/i.test(t)) window.__toasts.push(t);
    })));
    window.__toastObs.observe(document.body, { childList: true, subtree: true });
  }
  const one = async (side) => {
    let best = null;
    for (let i = 0; i < 40 && !best; i++) {
      const sec = [...document.querySelectorAll('section')].find((x) => x.innerText.split('\n')[0].trim() === M);
      const rows = sec ? [...sec.querySelectorAll('div')].filter((d) => d.innerText.trim().startsWith(R) && d.querySelector('button[aria-label]')) : [];
      const row = rows[rows.length - 1];
      const cells = row ? [...row.querySelectorAll('button[aria-label]')].filter((b) => !b.disabled && b.getAttribute('aria-label').startsWith(side + ' ') && /\d/.test(b.getAttribute('aria-label'))) : [];
      const pick = side === 'back' ? cells[cells.length - 1] : cells[0];
      if (pick) best = pick; else await wait(500);
    }
    if (!best) return { side, error: 'no open price' };
    best.click(); await wait(600);
    const input = document.querySelector('input[aria-label="Stake"]');
    if (!input) return { side, error: 'slip did not open' };
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, String(STAKE));
    input.dispatchEvent(new Event('input', { bubbles: true })); await wait(400);
    const before = window.__toasts.length;
    [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Place Bet')?.click();
    for (let i = 0; i < 60 && window.__toasts.length === before; i++) await wait(250);
    await wait(800);
    return { side, price: best.getAttribute('aria-label'), toast: window.__toasts.slice(before).filter((t) => !/^SUSPENDED$/i.test(t)).slice(0, 1) };
  };
  const log = [];
  for (let p = 0; p < PAIRS; p++) {
    const l = await one('lay');
    log.push(l);
    if (l.error) break;
    const b = await one('back');
    log.push(b);
    if (b.error) break;
  }
  return log;
}
