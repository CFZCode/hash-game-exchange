// Site admin crawl: opens each page in a same-origin iframe, clicks every tab in the page, records
// what a reviewer would look for (render errors, NaN/undefined/Invalid Date, error toasts, empty tables).
async () => {
  const PAGES = __PAGES__;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let f = document.getElementById('qa-crawl');
  if (!f) { f = document.createElement('iframe'); f.id = 'qa-crawl'; f.style.cssText = 'position:fixed;left:0;top:0;width:1400px;height:900px;opacity:0.01;pointer-events:none;z-index:-1'; document.body.appendChild(f); }
  const scan = (doc) => {
    const main = doc.querySelector('main main') || doc.querySelector('main') || doc.body;
    const txt = main?.innerText || '';
    const bad = [...new Set((txt.match(/[^\n]{0,30}\b(NaN|undefined|Infinity|Invalid Date|Something went wrong|Failed to load|Unexpected error|Internal Server Error|INTERNAL_ERROR|is not a function)\b[^\n]{0,30}/g) || []))].slice(0, 5);
    const errs = [...main.querySelectorAll('[role=alert]')].map(e => e.innerText.trim()).filter(Boolean).slice(0, 3);
    const rows = main.querySelectorAll('tbody tr').length;
    const empty = /No (results|data|records|rows)|Nothing (here|yet)/i.test(txt);
    const charts = main.querySelectorAll('svg.recharts-surface, canvas, [data-chart]').length;
    return { len: txt.length, bad, errs, rows, empty, charts };
  };
  const out = [];
  for (const p of PAGES) {
    const t0 = Date.now();
    await new Promise(res => { f.onload = res; f.src = p; setTimeout(res, 20000); });
    let doc = f.contentDocument;
    for (let i = 0; i < 20 && doc && !(doc.querySelector('main') && (doc.querySelector('main').innerText || '').length > 120); i++) await sleep(500);
    await sleep(3500);
    doc = f.contentDocument;
    const main = doc?.querySelector('main main') || doc?.querySelector('main');
    const rec = { page: p, at: f.contentWindow?.location.pathname, h1: main?.querySelector('h1,h2')?.innerText?.slice(0, 60), ms: Date.now() - t0, ...scan(doc), toasts: [...doc.querySelectorAll('[data-sonner-toast]')].map(t => t.innerText.trim().slice(0, 120)), tabs: [] };
    const tabs = [...(main?.querySelectorAll('[role=tab]') || [])].filter(t => t.getAttribute('aria-selected') !== 'true').slice(0, 8);
    for (const t of tabs) {
      const name = t.innerText.trim().slice(0, 30);
      t.click(); await sleep(2500);
      const s = scan(f.contentDocument);
      rec.tabs.push({ tab: name, rows: s.rows, bad: s.bad, errs: s.errs, charts: s.charts, empty: s.empty });
    }
    out.push(rec);
  }
  return out;
}
