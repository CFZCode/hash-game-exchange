// READ-ONLY slip probe: for each [market, runner, side] in __CASES__ (JSON), open the slip on the best price,
// type stake __STAKE__, read odds / rate / Profit / Liability and the card's projected book, then press Cancel.
// Never presses Place Bet. Compare the output with tenexch-calc.mjs (compare.mjs does it).
async () => {
  const CASES = __CASES__, STAKE = '__STAKE__';
  const sleep = (t) => new Promise((r) => setTimeout(r, t));
  const setVal = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
  const out = [];
  for (const [M, R, S] of CASES) {
    const sec = [...document.querySelectorAll('section')].find((s) => s.innerText.split('\n')[0].trim() === M);
    if (!sec) { out.push({ M, R, S, error: 'no market' }); continue; }
    const rows = [...sec.querySelectorAll('div')].filter((d) => d.innerText.trim().startsWith(R) && d.querySelector('button[aria-label]'));
    const row = rows[rows.length - 1];
    const cells = row ? [...row.querySelectorAll('button[aria-label]')].filter((b) => b.getAttribute('aria-label').startsWith(S + ' ') && b.getAttribute('aria-disabled') !== 'true') : [];
    const best = S === 'back' ? cells[cells.length - 1] : cells[0];
    if (!best) { out.push({ M, R, S, error: 'no open cell' }); continue; }
    const rowText = row.innerText.replace(/\n+/g, ' | ');
    best.click(); await sleep(500);
    const stake = document.querySelector('input[aria-label="Stake"]');
    if (!stake) { out.push({ M, R, S, error: 'slip did not open' }); continue; }
    setVal(stake, STAKE); await sleep(500);
    const slip = stake.closest('div[class*="rounded"]')?.parentElement?.closest('div');
    const all = sec.innerText.replace(/\n+/g, ' | ');
    const odds = document.querySelector('input[aria-label="Odds"]')?.value;
    const st = (window.__lastSlip = [...document.querySelectorAll('div')].filter((d) => /Profit/.test(d.innerText) && /Liability/.test(d.innerText) && d.querySelector('input[aria-label="Stake"]')).sort((a, b) => a.innerText.length - b.innerText.length)[0]?.innerText.replace(/\n+/g, ' | ')) || '';
    out.push({ M, R, S, cell: best.getAttribute('aria-label'), odds, row: rowText.slice(0, 160), profit: st.match(/Profit \|? ?(₹[\d,.-]+)/)?.[1], liability: st.match(/Liability \|? ?(₹[\d,.-]+)/)?.[1], range: st.match(/Stake \| ([\d,–-]+)/)?.[1], card: all.slice(0, 500) });
    [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Cancel')?.click(); await sleep(400);
  }
  return out;
}
