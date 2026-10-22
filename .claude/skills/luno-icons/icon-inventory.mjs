// Every icon on the Luno reference pages, and which free library glyph it is.
// usage: node icon-inventory.mjs <target-id> <out.json> <luno-url> [<luno-url> …]
// Inline SVGs are matched path-by-path against Bootstrap Icons (admin/node_modules/bootstrap-icons); a path
// that is in no library glyph is reported as Luno's own (the two-tone overlay) — its markup is NOT kept,
// only which glyph it sits on and where. <i class="fa …|la …|bi …"> font icons are listed by class.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { attach } from './cdp.mjs';

const [, , target, out, ...urls] = process.argv;
const BI = join(process.cwd(), 'admin/node_modules/bootstrap-icons/icons');
const norm = (d) => String(d ?? '').replace(/\s+/g, ' ').replace(/(\d)-/g, '$1 -').trim();

// d → [glyph names] for every Bootstrap Icons path.
const byPath = new Map();
for (const f of readdirSync(BI)) {
  const svg = readFileSync(join(BI, f), 'utf8');
  for (const m of svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)) {
    const k = norm(m[1]);
    byPath.set(k, [...(byPath.get(k) ?? []), f.replace(/\.svg$/, '')]);
  }
}

const READ = `(() => {
  const near = (el) => el.closest('a,button,li,.card,.card-header,.nav-item,.dropdown')?.innerText?.trim().split('\\n')[0].slice(0, 40) || '';
  const zone = (el) => el.closest('.sidebar') ? 'sidebar' : el.closest('.page-header') ? 'header' : el.closest('.page-toolbar') ? 'toolbar' : el.closest('.modal') ? 'modal' : 'body';
  const svgs = [...document.querySelectorAll('svg')].filter((s) => s.getAttribute('viewBox') && s.getBoundingClientRect().width > 0 && s.getBoundingClientRect().width < 64 && !s.closest('.apexcharts-canvas'));
  const fonts = [...document.querySelectorAll('i[class]')].filter((i) => /\\b(fa|la|lab|las|bi|icon)\\b|\\b(fa|la|bi|wi)-/.test(i.className));
  return {
    svgs: svgs.map((s) => {
      const r = s.getBoundingClientRect(), cs = getComputedStyle(s);
      return { zone: zone(s), near: near(s), size: Math.round(r.width) + 'x' + Math.round(r.height), viewBox: s.getAttribute('viewBox'), color: cs.color,
        paths: [...s.querySelectorAll('path')].map((p) => ({ d: p.getAttribute('d'), two: p.getAttribute('fill') === 'var(--secondary-color)' || /secondary/.test(p.getAttribute('class') || '') || /secondary/.test(p.getAttribute('style') || ''), opacity: p.getAttribute('opacity') || getComputedStyle(p).opacity })) };
    }),
    fonts: fonts.map((i) => ({ zone: zone(i), near: near(i), cls: i.className, size: getComputedStyle(i).fontSize, color: getComputedStyle(i).color })),
  };
})()`;

const cdp = await attach(target);
const result = [];
for (const url of urls) {
  await cdp.go(url);
  const { svgs, fonts } = await cdp.ev(READ);
  for (const s of svgs) {
    const parts = s.paths.map((p) => {
      const hits = byPath.get(norm(p.d)) ?? [];
      return { glyphs: hits.slice(0, 5), two: p.two, opacity: p.opacity, own: hits.length === 0 };
    });
    // The glyph the icon is built on: the library name most of its paths agree on.
    const votes = {};
    parts.forEach((p) => p.glyphs.forEach((g) => (votes[g] = (votes[g] ?? 0) + 1)));
    const base = Object.entries(votes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    result.push({ url, kind: 'svg', zone: s.zone, near: s.near, size: s.size, viewBox: s.viewBox, color: s.color, base, library: base ? 'bootstrap-icons' : null,
      twoTone: parts.map((p, i) => (p.two ? i : null)).filter((i) => i != null), ownPaths: parts.filter((p) => p.own).length, paths: parts.length });
  }
  for (const f of fonts) result.push({ url, kind: 'font', zone: f.zone, near: f.near, cls: f.cls, size: f.size, color: f.color });
}
cdp.close();
writeFileSync(out, JSON.stringify(result, null, 1));
const svg = result.filter((r) => r.kind === 'svg');
console.log(JSON.stringify({ icons: result.length, svg: svg.length, matched: svg.filter((r) => r.base).length, fonts: result.length - svg.length, withOwnPaths: svg.filter((r) => r.ownPaths).length }));
