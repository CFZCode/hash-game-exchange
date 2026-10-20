// Game pre-screen: choose the wallet the game plays in (INR or USDT), then press Play With Deposit Balance.
async () => {
  const CUR = '__CUR__';
  const sleep = t => new Promise(r => setTimeout(r, t));
  for (let i = 0; i < 30 && ![...document.querySelectorAll('main button')].some(b => /Play With Deposit Balance/.test(b.textContent)); i++) await sleep(500);
  const picker = [...document.querySelectorAll('main button')].find(b => /^(INR|USDT|BTC)/.test(b.textContent.trim()));
  if (!picker.textContent.trim().startsWith(CUR)) {
    picker.click(); await sleep(800);
    const o = [...document.querySelectorAll('[role=option],[role=menuitem],li,button')].filter(e => e.offsetParent && e.textContent.trim().startsWith(CUR) && e.textContent.length < 40)[0];
    o?.click(); await sleep(1000);
  }
  const chosen = [...document.querySelectorAll('main button')].find(b => /^(INR|USDT|BTC)/.test(b.textContent.trim()))?.textContent.trim();
  [...document.querySelectorAll('button')].find(b => /Play With Deposit Balance/.test(b.textContent))?.click();
  for (let i = 0; i < 30 && !document.querySelector('iframe'); i++) await sleep(1000);
  await sleep(8000);
  return { chosen, iframe: !!document.querySelector('iframe') };
}
