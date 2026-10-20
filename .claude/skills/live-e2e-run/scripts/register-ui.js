// Run on https://parker567.com/referal/<CODE> (or /login/regist) in a fresh isolated context.
// Fills the Sign Up form like a person: username, password, keeps the 18+ tick, submits.
async () => {
  const USER = '__USER__', PASS = '__PASS__'; // filled per player by sed; the password comes from credentials.local.md
  const sleep = t => new Promise(r => setTimeout(r, t));
  for (let i = 0; i < 30 && !document.querySelector('form input'); i++) {
    const up = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Sign Up');
    if (up && !document.querySelector('form')) up.click();
    await sleep(500);
  }
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  const inputs = [...document.querySelectorAll('form input')].filter(i => i.type !== 'checkbox');
  set.call(inputs[0], USER); inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
  set.call(inputs[1], PASS); inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
  const code = inputs[2]?.value ?? '';
  await sleep(400);
  [...document.querySelectorAll('form button')].find(b => b.textContent.trim() === 'Sign Up').click();
  for (let i = 0; i < 30 && !localStorage['api-session']; i++) await sleep(500);
  const s = JSON.parse(localStorage['api-session'] || '{}');
  const me = await (await fetch('https://api.parker567.com/api/v1/user/auth/me', { headers: { authorization: 'Bearer ' + s.accessToken } })).json();
  return { user: USER, referralCodeUsed: code, id: me.data?.id, myCode: me.data?.referalcode, error: me.error?.code, alert: document.querySelector('[role=alert]')?.innerText };
}
