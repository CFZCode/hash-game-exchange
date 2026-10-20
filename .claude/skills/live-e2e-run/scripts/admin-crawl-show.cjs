const fs = require('fs');
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8'); const j = JSON.parse(t.slice(t.indexOf('['), t.lastIndexOf(']') + 1));
  for (const r of j) {
    const tabIssues = r.tabs.filter(x => x.bad.length || x.errs.length).map(x => `${x.tab}:${JSON.stringify(x.bad.concat(x.errs))}`);
    console.log([r.page, r.at !== r.page ? '->' + r.at : '', `"${r.h1}"`, `${r.ms}ms`, `rows=${r.rows}`, `charts=${r.charts}`, r.empty ? 'EMPTY' : '', r.bad.length ? 'BAD=' + JSON.stringify(r.bad) : '', r.errs.length ? 'ERR=' + JSON.stringify(r.errs) : '', r.toasts.length ? 'TOAST=' + JSON.stringify(r.toasts) : '', `tabs=${r.tabs.length}`, tabIssues.join(' ; ')].filter(Boolean).join(' '));
  }
}
