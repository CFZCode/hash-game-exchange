// node signup.mjs <origin> <credsFile> — signs a NEW test player up through the page's own form on a LOCAL
// dev origin (whose API is the local backend). Credentials are generated here, appended to the
// gitignored credentials file, and never printed.
import fs from 'node:fs'
import crypto from 'node:crypto'
const [origin, credsFile] = process.argv.slice(2)
if (!/^http:\/\/localhost:\d+$/.test(origin)) throw new Error('local origins only')
const user = 'qa' + crypto.randomBytes(3).toString('hex')
const pass = 'Qa!' + crypto.randomBytes(6).toString('base64url') + '9a'
const t = await (await fetch('http://127.0.0.1:9333/json/new?about:blank', { method: 'PUT' })).json()
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => (ws.onopen = r)); let id = 0
const call = (method, params = {}) => new Promise(res => { const my = ++id; const h = ev => { const m = JSON.parse(ev.data); if (m.id === my) { ws.removeEventListener('message', h); res(m.result) } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: my, method, params })) })
const ev = async (e) => (await call('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.value
const sleep = ms => new Promise(r => setTimeout(r, ms))
await call('Emulation.setDeviceMetricsOverride', { width: 440, height: 956, deviceScaleFactor: 2, mobile: true })
// Start signed OUT: an earlier QA player's tokens live in this origin's localStorage (local origin only).
await call('Page.navigate', { url: origin + '/' }); await sleep(5000)
await ev('localStorage.clear(), sessionStorage.clear(), true')
await call('Page.navigate', { url: origin + '/login/regist' }); await sleep(9000)
const fill = `(() => { const set = (el, v) => { const d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value'); d.set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
  const form = [...document.querySelectorAll('form')].find(f => f.offsetParent); if (!form) return 'no form';
  const inputs = [...form.querySelectorAll('input')].filter(i => i.offsetParent && i.type !== 'checkbox');
  const text = inputs.find(i => i.type === 'text' || i.type === 'email'); const pw = inputs.find(i => i.type === 'password');
  if (!text || !pw) return 'fields: ' + inputs.map(i => i.type + ':' + i.placeholder).join(',');
  set(text, ${JSON.stringify(user)}); set(pw, ${JSON.stringify(pass)});
  return 'filled ' + inputs.map(i => i.placeholder).join(' | ') })()`
console.log(await ev(fill))
await sleep(400)
console.log(await ev(`(() => { const b = [...document.querySelectorAll('form button[type=submit]')].find(b => b.offsetParent); if (!b) return 'no submit'; b.click(); return 'submitted: ' + b.textContent.trim() })()`))
await sleep(6000)
const state = await ev(`({ path: location.pathname, signedIn: !!localStorage.getItem('account') && JSON.parse(localStorage.getItem('account').slice(localStorage.getItem('account').indexOf('{'))).login, err: [...document.querySelectorAll('.text-error, [class*=error]')].map(e => e.textContent.trim()).filter(Boolean).slice(0,3) })`)
console.log(JSON.stringify(state))
if (state?.signedIn) fs.appendFileSync(credsFile, `\n\n## Local QA player (${new Date().toISOString().slice(0,10)}) — localhost:5195 → local backend :4700 only\n\n| QA player | ${user} | ${pass} |\n`)
const { data } = await call('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(process.argv[4] ?? '/dev/null', Buffer.from(data, 'base64'))
await fetch(`http://127.0.0.1:9333/json/close/${t.id}`); process.exit(0)
