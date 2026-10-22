// Tiny CDP client for the skills' scripts. Attach to ONE page by target id (or a URL substring of a page
// you opened yourself — never someone else's tab). CDP_PORT defaults to 9333.
export async function attach(target) {
  const port = process.env.CDP_PORT || 9333;
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const t = pages.find((x) => x.type === 'page' && (x.id === target || x.url.includes(target)));
  if (!t) throw new Error(`no page matching ${target}`);
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id) { pending.get(m.id)?.(m); pending.delete(m.id); } else listeners.forEach((fn) => fn(m));
  });
  const send = (method, params = {}) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? 'evaluate failed');
    return r.result?.result?.value;
  };
  const go = async (url, settleMs = Number(process.env.SETTLE_MS || 4000)) => {
    await send('Page.navigate', { url });
    await new Promise((r) => setTimeout(r, settleMs));
  };
  const shot = async (path, { fullPage = false } = {}) => {
    const { writeFileSync } = await import('node:fs');
    const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: fullPage });
    writeFileSync(path, Buffer.from(r.result.data, 'base64'));
  };
  return { send, ev, go, shot, on: (fn) => listeners.push(fn), close: () => ws.close(), id: t.id };
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
