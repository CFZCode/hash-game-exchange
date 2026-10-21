// Rollover runner (real money — budget rules apply): sed __MARKET__ __SIDE__ __STAKE__ __COUNT__ __MINBAL__.
// Repeats: wait until the INR wallet ≥ __MINBAL__ (bets settled), wait for the market's first open row, place
// __STAKE__, record the toast + wallet + wager. Stops after __COUNT__ bets or when the rollover is met.
async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const [M, S, STAKE, COUNT, MINBAL] = ['__MARKET__', '__SIDE__', __STAKE__, __COUNT__, __MINBAL__];
  const s = JSON.parse(localStorage.getItem('api-session'));
  const h = { authorization: 'Bearer ' + s.accessToken };
  const g = async (p) => (await (await fetch('https://api.parker567.com/api/v1' + p, { headers: h })).json()).data;
  const log = [];
  window.__toasts = window.__toasts || [];
  if (!window.__toastObs) {
    window.__toastObs = new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => {
      const t = n.innerText?.trim();
      if (t && t.length < 160 && /placed|not confirm|limit|balance|suspend|odds change/i.test(t)) window.__toasts.push(t);
    })));
    window.__toastObs.observe(document.body, { childList: true, subtree: true });
  }
  for (let n = 0; n < COUNT; n++) {
    let bal = Number((await g('/user/wallet/balances')).INR);
    for (let i = 0; i < 20 && bal < MINBAL; i++) { await wait(5000); bal = Number((await g('/user/wallet/balances')).INR); }
    const wp = await g('/user/wager/progress');
    if (wp.met) { log.push({ stop: 'rollover met', wager: wp.wagered }); break; }
    if (bal < MINBAL) { log.push({ stop: 'wallet still below ' + MINBAL, bal }); break; }
    let best = null;
    for (let i = 0; i < 120 && !best; i++) {
      const sec = [...document.querySelectorAll('section')].find((x) => x.innerText.split('\n')[0].trim() === M);
      const cells = sec ? [...sec.querySelectorAll('button[aria-label]')].filter((b) => !b.disabled && b.getAttribute('aria-label').startsWith(S + ' ') && /\d/.test(b.getAttribute('aria-label'))) : [];
      if (cells.length) best = cells[0]; else await wait(500);
    }
    if (!best) { log.push({ n, error: 'no open price in 60 s' }); continue; }
    best.click(); await wait(600);
    const input = document.querySelector('input[aria-label="Stake"]');
    if (!input) { log.push({ n, error: 'slip did not open' }); continue; }
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, String(STAKE));
    input.dispatchEvent(new Event('input', { bubbles: true })); await wait(400);
    const before = window.__toasts.length;
    [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Place Bet')?.click();
    for (let i = 0; i < 60 && window.__toasts.length === before; i++) await wait(250);
    await wait(1500);
    log.push({ n, at: new Date().toISOString().slice(11, 19), price: best.getAttribute('aria-label'), toast: window.__toasts.slice(before).filter((t) => !/^SUSPENDED$/i.test(t)).slice(0, 2), walletBefore: bal, wager: (await g('/user/wager/progress')).wagered });
  }
  return log;
}
