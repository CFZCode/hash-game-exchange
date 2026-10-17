// node vshot.mjs <url> <width> <out.png> [jsBeforeShot] — viewport screenshot, optional page action first.
import fs from 'node:fs'
const [url, w, out, js] = process.argv.slice(2)
const t = await (await fetch('http://127.0.0.1:9333/json/new?about:blank', { method: 'PUT' })).json()
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => (ws.onopen = r)); let id = 0
const call = (method, params = {}) => new Promise(res => { const my = ++id; const h = ev => { const m = JSON.parse(ev.data); if (m.id === my) { ws.removeEventListener('message', h); res(m.result) } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: my, method, params })) })
const ev = async (e) => (await call('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.value
const sleep = ms => new Promise(r => setTimeout(r, ms))
const mobile = +w < 1024
await call('Emulation.setDeviceMetricsOverride', { width: +w, height: mobile ? 956 : 900, deviceScaleFactor: mobile ? 2 : 1, mobile })
if (mobile) await call('Emulation.setTouchEmulationEnabled', { enabled: true })
await call('Page.navigate', { url }); await sleep(9000)
if (js) { console.log(JSON.stringify(await ev(js))); await sleep(2000) }
console.log(JSON.stringify(await ev(`({ path: location.pathname, overflow: document.documentElement.scrollWidth > innerWidth, text: document.body.innerText.replace(/\\n+/g,' | ').slice(0, 700) })`)))
const { data } = await call('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(out, Buffer.from(data, 'base64'))
await fetch(`http://127.0.0.1:9333/json/close/${t.id}`); process.exit(0)
