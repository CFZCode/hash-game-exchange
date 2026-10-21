// ONE real bet end to end (real money — budget rules apply): sed __MARKET__ (card title), __RUNNER__ (row prefix),
// __SIDE__ (back|lay), __STAKE__, __PLACE__ (true|false). Opens the slip on the best price, types the stake through
// React's value setter, reads the slip, and presses Place Bet only when __PLACE__ is true; returns the toasts.
async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const [M, R, S, STAKE, PLACE] = ['__MARKET__', '__RUNNER__', '__SIDE__', '__STAKE__', __PLACE__];
  window.__toasts = window.__toasts || [];
  if (!window.__toastObs) {
    window.__toastObs = new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => {
      const t = n.innerText?.trim();
      if (t && t.length < 160 && /bet|limit|minimum|maximum|active|accepted|balance|success|error|suspend|odds/i.test(t)) window.__toasts.push(t);
    })));
    window.__toastObs.observe(document.body, { childList: true, subtree: true });
  }
  // Session markets suspend every ball: wait up to 60 s for the row's price to open, then act at once.
  let best = null;
  let labels = [];
  for (let i = 0; i < 120 && !best; i++) {
    const sec = [...document.querySelectorAll('section')].find((s) => s.innerText.split('\n')[0].trim() === M);
    // An empty __RUNNER__ takes the market's first row with an open price (session rows change every ball).
    const openCells = (row) => [...row.querySelectorAll('button[aria-label]')].filter((b) => !b.disabled && /^(back|lay) \d/.test(b.getAttribute('aria-label')) && b.getAttribute('aria-label').startsWith(S + ' '));
    const rows = sec ? [...sec.querySelectorAll('div')].filter((d) => d.innerText.trim().startsWith(R) && d.querySelector('button[aria-label]')) : [];
    const row = R ? rows[rows.length - 1] : rows.reverse().find((d) => openCells(d).length && d.querySelectorAll('button[aria-label]').length <= 4);
    const cells = row ? openCells(row) : [];
    labels = row ? [...row.querySelectorAll('button[aria-label]')].map((b) => b.getAttribute('aria-label')) : [];
    const pick = S === 'back' ? cells[cells.length - 1] : cells[0];
    if (pick && !pick.disabled) best = pick;
    else await wait(500);
  }
  if (!best) return { error: 'no open ' + S + ' price within 60 s', market: M, runner: R, labels };
  best.click();
  await wait(700);
  const input = document.querySelector('input[aria-label="Stake"]');
  if (!input) return { error: 'slip did not open' };
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, String(STAKE));
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await wait(500);
  const slip = (input.closest('form') || input.parentElement?.parentElement?.parentElement)?.innerText.replace(/\s+/g, ' ').slice(0, 400);
  if (!PLACE) {
    [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Cancel')?.click();
    return { price: best.getAttribute('aria-label'), slip };
  }
  const before = window.__toasts.length;
  const btn = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Place Bet');
  if (!btn || btn.disabled) return { error: 'Place Bet unavailable', slip };
  btn.click();
  for (let i = 0; i < 80 && window.__toasts.length === before; i++) await wait(250);
  await wait(800);
  return { price: best.getAttribute('aria-label'), slip, toasts: window.__toasts.slice(before) };
}
