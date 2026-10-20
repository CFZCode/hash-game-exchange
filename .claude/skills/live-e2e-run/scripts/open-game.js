// On a /game/<uuid> page: press "Play With Deposit Balance", wait for the provider iframe to load.
async () => {
  const sleep = t => new Promise(r => setTimeout(r, t));
  for (let i = 0; i < 30 && ![...document.querySelectorAll('button')].some(b => /Play With Deposit Balance/.test(b.textContent)); i++) await sleep(500);
  [...document.querySelectorAll('button')].find(b => /Play With Deposit Balance/.test(b.textContent))?.click();
  for (let i = 0; i < 30 && !document.querySelector('iframe'); i++) await sleep(1000);
  await sleep(14000);
  const s = JSON.parse(localStorage['api-session']);
  const b = await (await fetch('https://api.parker567.com/api/v1/user/wallet/balances', { headers: { authorization: 'Bearer ' + s.accessToken } })).json();
  return { iframe: !!document.querySelector('iframe'), usdt: b.data?.USDT };
}
