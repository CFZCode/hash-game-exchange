// Open the slip on one price: sed __MARKET__ (card title), __RUNNER__ (row name, prefix match), __SIDE__ (back|lay;
// fancy "No" = lay, "Yes" = back). Clicks the BEST price (back: the cell nearest the middle). Then fill "Stake" with
// the fill tool (React input) and run slip-read.js. Never clicks Place Bet.
async () => {
  const [M, R, S] = ['__MARKET__', '__RUNNER__', '__SIDE__'];
  const sec = [...document.querySelectorAll('section')].find((s) => s.innerText.split('\n')[0].trim() === M);
  if (!sec) return { error: 'no market ' + M };
  const rows = [...sec.querySelectorAll('div')].filter((d) => d.innerText.trim().startsWith(R) && d.querySelector('button[aria-label]'));
  const row = rows[rows.length - 1];
  if (!row) return { error: 'no runner ' + R };
  const cells = [...row.querySelectorAll('button[aria-label]')].filter((b) => b.getAttribute('aria-label').startsWith(S + ' '));
  const best = S === 'back' ? cells[cells.length - 1] : cells[0];
  if (!best) return { error: 'no ' + S + ' cell', labels: [...row.querySelectorAll('button[aria-label]')].map((b) => b.getAttribute('aria-label')) };
  best.click();
  await new Promise((r) => setTimeout(r, 600));
  return { clicked: best.getAttribute('aria-label') };
}
