// Player side, on /wallet/deposit (Fiat tab): fills amount + UTR, attaches a generated TEST screenshot, submits.
async () => {
  const AMOUNT = '__AMOUNT__', UTR = '__UTR__';
  const sleep = t => new Promise(r => setTimeout(r, t));
  for (let i = 0; i < 40 && !document.querySelector('main button'); i++) await sleep(500);
  await sleep(1500);
  const fiat = [...document.querySelectorAll('button,div')].find(e => e.childElementCount === 0 && e.textContent.trim() === 'Fiat');
  fiat?.click(); await sleep(2500);
  const label = t => [...document.querySelectorAll('main *')].find(e => e.childElementCount === 0 && e.textContent.trim().startsWith(t));
  const inputAfter = t => { let el = label(t); for (let i = 0; i < 5 && el; i++) { const inp = el.parentElement?.querySelector('input'); if (inp) return inp; el = el.parentElement; } return null; };
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  const texts = [...document.querySelectorAll('main input')].filter(i => i.type === 'text' || i.type === 'number'); const amt = texts[0], utr = texts[1];
  if (!amt || !utr) return { error: 'deposit form not found', text: document.querySelector('main')?.innerText.slice(0, 300) };
  set.call(amt, AMOUNT); amt.dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(500);
  const extra = document.querySelector('main').innerText.match(/Extra[^\n]*/)?.[0] ?? null;
  set.call(utr, UTR); utr.dispatchEvent(new Event('input', { bubbles: true }));
  const cv = document.createElement('canvas'); cv.width = 320; cv.height = 180; const c = cv.getContext('2d');
  c.fillStyle = '#fff'; c.fillRect(0, 0, 320, 180); c.fillStyle = '#000'; c.font = '20px sans-serif';
  c.fillText('TEST DOCUMENT', 70, 80); c.fillText('UTR ' + UTR, 40, 120);
  const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
  const file = new File([blob], 'test-receipt.png', { type: 'image/png' });
  const fileInput = document.querySelector('main input[type=file]');
  const dt = new DataTransfer(); dt.items.add(file); fileInput.files = dt.files;
  fileInput.dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(800);
  [...document.querySelectorAll('main button')].find(b => b.textContent.trim() === 'Submit Deposit').click();
  await sleep(4000);
  const toast = [...document.querySelectorAll('[role=status],[role=alert],.toast,[class*=toast]')].map(e => e.innerText).filter(Boolean).join(' | ');
  const s = JSON.parse(localStorage['api-session']);
  const h = await (await fetch('https://api.parker567.com/api/v1/user/history/deposits?limit=3', { headers: { authorization: 'Bearer ' + s.accessToken } })).json();
  return { extra, toast, latest: JSON.stringify(h.data?.items ?? h.data).slice(0, 400) };
}
