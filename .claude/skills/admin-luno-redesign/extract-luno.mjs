// Measure the Luno reference over CDP: COMPUTED styles (never its CSS files), hover/active states, pseudo
// elements, motion (transitions + keyframes), ApexCharts options, light + dark, screenshots.
// usage: node .claude/skills/admin-luno-redesign/extract-luno.mjs <target-id> logs/qa/redesign/luno-spec.json [page-name …]
// <target-id>: a tab YOU opened at Luno (chrome-devtools MCP, isolatedContext "redesign-audit"). CDP_PORT=9333.
// Screenshots go next to the output: luno-<page>-1280.png / luno-<page>-390.png.
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { attach, wait } from '../luno-icons/cdp.mjs';

const [, , target, out = 'logs/qa/redesign/luno-spec.json', ...only] = process.argv;
if (!target) { console.error('usage: extract-luno.mjs <target-id> <out.json> [page …]'); process.exit(2); }
const BASE = 'https://wrraptheme.com/templates/luno/';
const PAGES = {
  dashboard: 'index.html', table: 'account-invoices.html', form: 'account-settings.html', profile: 'page-profile.html',
  project: 'app-project.html', modals: 'modals.html', signin: 'auth-signin.html',
  tabs: 'docs/ui-navs.html', buttons: 'docs/ui-buttons.html', badges: 'docs/ui-badge.html', alerts: 'docs/ui-alerts.html',
  toasts: 'docs/ui-toasts.html', tooltips: 'docs/ui-tooltips.html', dropdowns: 'docs/ui-dropdowns.html',
  pagination: 'docs/ui-pagination.html', modal: 'docs/ui-modal.html', forms: 'docs/form-bootstrap.html', progress: 'docs/ui-progress.html',
  cards: 'docs/ui-card.html', charts: 'docs/chart-apex.html',
};

// name → selector (first VISIBLE match, else first match). Missing ones are skipped.
const ONE = {
  body: 'body', sidebar: '.sidebar', sidebarTitle: '.sidebar .sidebar-title', projectSelect: '.sidebar .create-new .form-select',
  projectAddBtn: '.sidebar .create-new .btn', menuGroupTitle: '.menu-list li.divider .small', menuGroupSubtitle: '.menu-list li.divider small',
  menuLink: '.menu-list a.m-link:not(.active)', menuLinkActive: '.menu-list a.m-link.active', menuArrow: '.menu-list .m-link .arrow',
  subMenu: '.sub-menu', subMenuItem: '.sub-menu li', subLink: '.sub-menu a.ms-link:not(.active)', subLinkActive: '.sub-menu a.ms-link.active',
  menuFooterLink: '.menu-footer-link a', header: '.page-header', headerSearch: '.page-header input', headerNavLink: '.page-header .nav-link',
  headerAvatar: '.page-header .avatar, .page-header img', toolbar: '.page-toolbar', breadcrumb: '.page-toolbar .breadcrumb',
  breadcrumbLink: '.page-toolbar .breadcrumb a', breadcrumbItem: '.page-toolbar .breadcrumb-item.active', breadcrumbDivider: '.breadcrumb-item + .breadcrumb-item',
  title: '.page-toolbar h1', subtitle: '.page-toolbar small', toolbarBtn: '.page-toolbar .btn', toolbarInput: '.page-toolbar .form-control',
  pageBody: '.page-body', footer: '.page-footer, footer',
  card: '.page-body .card:not(.bg-primary):not(.bg-primary-gradient)', cardHeader: '.page-body .card-header', cardTitle: '.page-body .card-title',
  cardBody: '.page-body .card-body', cardFooter: '.page-body .card-footer', cardGradient: '.card.bg-primary-gradient', cardLift: '.card.lift',
  statCard: '.row-deck .card.overflow-hidden', statTitle: '.row-deck .card.overflow-hidden .text-uppercase', statValue: '.row-deck .card.overflow-hidden .h4',
  statDelta: '.row-deck .card.overflow-hidden .small.text-muted', statFoot: '.row-deck .card.overflow-hidden small.text-muted',
  statIcon: '.row-deck .card.overflow-hidden svg', statProgress: '.row-deck .card.overflow-hidden .progress', statProgressBar: '.row-deck .card.overflow-hidden .progress-bar',
  cardMoreIcon: '.card-header .more-icon', cardFullscreen: '.card-header .card-fullscreen',
  table: '.page-body table.table', th: '.page-body table.table thead th', td: '.page-body table.table tbody td',
  tdStriped: '.table-striped > tbody > tr:nth-of-type(odd) > *', tdStripedEven: '.table-striped > tbody > tr:nth-of-type(even) > *',
  tableHoverRow: '.table-hover > tbody > tr > *',
  input: '.page-body .form-control:not(.form-control-lg):not(.form-control-sm)', inputLg: '.form-control-lg', inputSm: '.form-control-sm',
  select: '.page-body .form-select', selectPillSm: '.form-select.rounded-pill.form-select-sm', label: '.form-label', formText: '.form-text',
  checkbox: '.form-check-input[type=checkbox]', checkboxChecked: '.form-check-input[type=checkbox]:checked', radio: '.form-check-input[type=radio]',
  switch: '.form-switch .form-check-input', switchChecked: '.form-switch .form-check-input:checked', checkLabel: '.form-check-label',
  inputGroupText: '.input-group-text',
  navTabs: '.nav-tabs', navTabsLink: '.nav-tabs .nav-link:not(.active)', navTabsActive: '.nav-tabs .nav-link.active',
  navPills: '.nav-pills', navPillsLink: '.nav-pills .nav-link:not(.active)', navPillsActive: '.nav-pills .nav-link.active',
  dropdownMenu: '.dropdown-menu', dropdownItem: '.dropdown-menu .dropdown-item', dropdownHeader: '.dropdown-header', dropdownDivider: '.dropdown-divider',
  pagination: '.pagination', pageLink: '.pagination .page-link', pageLinkActive: '.pagination .active .page-link, .pagination .page-link.active',
  pageLinkDisabled: '.pagination .disabled .page-link', paginationSm: '.pagination-sm .page-link', paginationLg: '.pagination-lg .page-link',
  alert: '.alert', toast: '.toast', toastHeader: '.toast-header', toastBody: '.toast-body', progress: '.progress', progressBar: '.progress-bar',
  avatar: '.avatar', listGroupItem: '.list-group-item', authCard: '.card.auth-card, .auth-full, .page-body .card',
};
// name → selector: one record per distinct className (variants).
const MANY = { btn: '.btn', badge: '.badge', alert: '.alert', progressBar: '.progress-bar', bgUtility: '[class*="bg-"]:not(.btn):not(.badge)' };
// hover / active / focus via CSS.forcePseudoState.
const STATES = [
  ['menuLink', '.menu-list a.m-link:not(.active)', ['hover']], ['subLink', '.sub-menu a.ms-link:not(.active)', ['hover']],
  ['btnPrimary', '.btn-primary', ['hover', 'active', 'focus']], ['btnOutlinePrimary', '.btn-outline-primary', ['hover']],
  ['btnLight', '.btn-light', ['hover']], ['btnSecondary', '.btn-secondary', ['hover']], ['tableHoverRow', '.table-hover > tbody > tr', ['hover']],
  ['dropdownItem', '.dropdown-menu .dropdown-item', ['hover', 'active']], ['navTabsLink', '.nav-tabs .nav-link:not(.active)', ['hover']],
  ['navPillsLink', '.nav-pills .nav-link:not(.active)', ['hover']], ['pageLink', '.pagination .page-link', ['hover', 'focus']],
  ['input', '.page-body .form-control', ['focus']], ['select', '.page-body .form-select', ['focus']], ['cardLift', '.card.lift', ['hover']],
  ['headerNavLink', '.page-header .nav-link', ['hover']], ['breadcrumbLink', '.page-toolbar .breadcrumb a', ['hover']],
];
const PSEUDO = ['.sub-menu', '.sub-menu li', '.sub-menu a.ms-link', '.sub-menu a.ms-link.active', '.menu-list .m-link', '.breadcrumb-item + .breadcrumb-item',
  '.form-check-input:checked', '.dropdown-toggle', '.card.lift', '.page-header .nav-link', '.tooltip-arrow', '.progress-bar'];

// Runs in the page: computed style record of an element.
const LIB = `
window.__rec = (el, pseudo) => {
  if (!el) return null;
  const c = getComputedStyle(el, pseudo || null), r = pseudo ? null : el.getBoundingClientRect();
  const side = (s) => c['border' + s + 'Width'] === '0px' ? '0' : c['border' + s + 'Width'] + ' ' + c['border' + s + 'Style'] + ' ' + c['border' + s + 'Color'];
  const o = {
    color: c.color, background: c.backgroundColor, backgroundImage: c.backgroundImage === 'none' ? undefined : c.backgroundImage,
    borderTop: side('Top'), borderRight: side('Right'), borderBottom: side('Bottom'), borderLeft: side('Left'), radius: c.borderRadius,
    padding: c.padding, margin: c.margin, gap: c.gap === 'normal' ? undefined : c.gap, display: c.display,
    fontFamily: c.fontFamily, fontSize: c.fontSize, fontWeight: c.fontWeight, lineHeight: c.lineHeight,
    letterSpacing: c.letterSpacing === 'normal' ? undefined : c.letterSpacing, textTransform: c.textTransform === 'none' ? undefined : c.textTransform,
    shadow: c.boxShadow === 'none' ? undefined : c.boxShadow, opacity: c.opacity === '1' ? undefined : c.opacity,
    transform: c.transform === 'none' ? undefined : c.transform, outline: c.outlineStyle === 'none' ? undefined : c.outline,
    transition: c.transitionDuration === '0s' ? undefined : { property: c.transitionProperty, duration: c.transitionDuration, timing: c.transitionTimingFunction, delay: c.transitionDelay },
    animation: c.animationName === 'none' ? undefined : { name: c.animationName, duration: c.animationDuration, timing: c.animationTimingFunction, fill: c.animationFillMode },
    width: r ? Math.round(r.width * 10) / 10 : c.width, height: r ? Math.round(r.height * 10) / 10 : c.height,
    position: c.position === 'static' ? undefined : c.position, zIndex: c.zIndex === 'auto' ? undefined : c.zIndex,
  };
  if (pseudo) Object.assign(o, { content: c.content, left: c.left, top: c.top, bottom: c.bottom });
  if (el.matches?.('input[type=checkbox],input[type=radio]')) o.checkedImage = c.backgroundImage;
  Object.keys(o).forEach((k) => o[k] === undefined && delete o[k]);
  return o;
};
window.__pick = (sel) => { const all = [...document.querySelectorAll(sel)]; return all.find((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }) || all[0]; };
window.__label = (el) => (el?.innerText || el?.value || el?.getAttribute?.('aria-label') || '').trim().split('\\n')[0].slice(0, 40);
`;
const READ = (one, many, pseudo) => `(() => {
  const one = {}, many = {}, pseudo = {};
  for (const [k, s] of Object.entries(${JSON.stringify(one)})) { try { const el = __pick(s); if (el) one[k] = { sel: s, text: __label(el), ...__rec(el) }; } catch {} }
  for (const [k, s] of Object.entries(${JSON.stringify(many)})) {
    const seen = {}; for (const el of document.querySelectorAll(s)) { const cls = el.className?.baseVal ?? el.className; if (!cls || seen[cls] || Object.keys(seen).length >= 40) continue; seen[cls] = { text: __label(el), ...__rec(el) }; }
    if (Object.keys(seen).length) many[k] = seen;
  }
  for (const s of ${JSON.stringify(pseudo)}) for (const p of ['::before', '::after']) { const el = document.querySelector(s); if (!el) continue; const c = getComputedStyle(el, p); if (c.content && c.content !== 'none' && c.content !== 'normal') pseudo[s + p] = __rec(el, p); }
  const vars = {}; const cs = getComputedStyle(document.body); for (let i = 0; i < cs.length; i++) { const n = cs[i]; if (n.startsWith('--')) vars[n] = cs.getPropertyValue(n).trim(); }
  return { one, many, pseudo, vars, theme: { html: [...document.documentElement.attributes].map((a) => a.name + '=' + a.value), body: [...document.body.attributes].map((a) => a.name + '=' + a.value.slice(0, 80)) } };
})()`;

// Animation keyframes + motion rules (timings / transforms only, read from the live CSSOM).
const MOTION = `(() => {
  const frames = {}, rules = [];
  const want = /morph|scale|slide|fade|zoom|anim|collaps|modal|dropdown|tooltip|toast|lift|offcanvas|vertical|sidebar|sub-menu|spin|pulse|shimmer|placeholder/i;
  const walk = (list) => { for (const r of list) {
    if (r.cssRules && !(r instanceof CSSKeyframesRule)) walk(r.cssRules);
    if (r instanceof CSSKeyframesRule) frames[r.name] = [...r.cssRules].map((f) => f.keyText + ' { ' + f.style.cssText + ' }');
    else if (r.selectorText && want.test(r.selectorText)) {
      const s = r.style, keep = {}; for (let i = 0; i < s.length; i++) { const p = s[i]; if (/^(transition|animation|transform|opacity|visibility|transform-origin)/.test(p)) keep[p] = s.getPropertyValue(p); }
      if (Object.keys(keep).length) rules.push({ selector: r.selectorText.slice(0, 160), ...keep });
    } } };
  for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch {} }
  const probe = (cls, parentSel) => { const d = document.createElement('div'); d.className = cls; (document.querySelector(parentSel) || document.body).appendChild(d); const c = getComputedStyle(d); const o = { transition: c.transition, animation: c.animationName + ' ' + c.animationDuration + ' ' + c.animationTimingFunction }; d.remove(); return o; };
  return { keyframes: frames, rules, probes: { collapsing: probe('collapsing', '.sidebar'), fade: probe('fade', 'body'), modalFadeDialog: (() => { const m = document.createElement('div'); m.className = 'modal fade'; const d = document.createElement('div'); d.className = 'modal-dialog'; m.appendChild(d); document.body.appendChild(m); const c = getComputedStyle(d); const o = { transition: c.transition, transform: c.transform }; m.remove(); return o; })() } };
})()`;

// Wrap ApexCharts before page scripts run, so every chart instance is kept.
const APEX_HOOK = `(() => { let A; Object.defineProperty(window, 'ApexCharts', { configurable: true, get: () => A, set: (v) => { A = v; const r = v?.prototype?.render; if (r && !r.__hooked) { v.prototype.render = function () { (window.__apex ||= []).push(this); return r.apply(this, arguments); }; v.prototype.render.__hooked = 1; } } }); })()`;
const CHARTS = `(() => (window.__apex || []).map((ch) => { const c = ch.w?.config || {}; const el = ch.el; const card = el?.closest('.card');
  const pick = (o, keys) => o && Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));
  return JSON.parse(JSON.stringify({ el: el?.id, card: card?.querySelector('.card-title, h6, h5')?.innerText?.trim(), type: c.chart?.type,
    chart: pick(c.chart, ['type', 'height', 'stacked', 'stackType', 'fontFamily', 'foreColor', 'sparkline', 'toolbar', 'zoom', 'animations', 'dropShadow', 'background']),
    colors: c.colors, stroke: c.stroke, fill: c.fill, plotOptions: c.plotOptions, dataLabels: c.dataLabels, legend: c.legend, grid: c.grid,
    xaxis: pick(c.xaxis, ['type', 'labels', 'axisBorder', 'axisTicks', 'crosshairs', 'tooltip']), yaxis: (Array.isArray(c.yaxis) ? c.yaxis : [c.yaxis]).map((y) => pick(y, ['show', 'labels', 'axisBorder', 'axisTicks', 'min', 'max', 'tickAmount'])),
    markers: c.markers, tooltip: pick(c.tooltip, ['enabled', 'theme', 'shared', 'intersect', 'style']), states: c.states, responsive: c.responsive,
    labels: c.labels?.slice?.(0, 12), seriesCount: c.series?.length, theme: c.theme })); }))()`;

const cdp = await attach(target);
await cdp.send('Page.enable'); await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: APEX_HOOK });
const dir = dirname(out);
const spec = existsSync(out) && only.length ? JSON.parse(readFileSync(out, 'utf8')) : { measuredAt: new Date().toISOString(), base: BASE, pages: {} };

const viewport = (w, h, mobile = false) => cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
const shots = async (name) => {
  for (const [w, h, m] of [[1280, 800, false], [390, 844, true]]) { await viewport(w, h, m); await wait(900); await cdp.shot(join(dir, `luno-${name}-${w}.png`)); }
  await viewport(1280, 800);
};
const forced = async () => {
  const out = {};
  const { result: { root } } = await cdp.send('DOM.getDocument', { depth: 0 });
  for (const [name, sel, states] of STATES) {
    const { result } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel });
    if (!result?.nodeId) continue;
    const base = await cdp.ev(`__rec(document.querySelector(${JSON.stringify(sel)}))`);
    for (const st of states) {
      await cdp.send('CSS.forcePseudoState', { nodeId: result.nodeId, forcedPseudoClasses: [st] });
      await wait(450); // let transitions finish
      const now = await cdp.ev(`__rec(document.querySelector(${JSON.stringify(sel)}))`);
      const diff = Object.fromEntries(Object.entries(now).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(base[k]) && !['width', 'height'].includes(k)));
      out[`${name}:${st}`] = diff;
      await cdp.send('CSS.forcePseudoState', { nodeId: result.nodeId, forcedPseudoClasses: [] });
    }
  }
  return out;
};
// Open overlays the page has (bootstrap API), measure, close.
const overlays = async () => cdp.ev(`(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const o = {};
  if (!window.bootstrap) return o;
  const dd = document.querySelector('.page-body .dropdown-toggle[data-bs-toggle=dropdown], .dropdown-toggle[data-bs-toggle=dropdown]');
  if (dd) { const i = bootstrap.Dropdown.getOrCreateInstance(dd); i.show(); const m = dd.parentElement.querySelector('.dropdown-menu'); const t0 = __rec(m); await sleep(600);
    o.dropdownOpen = { wrapper: dd.parentElement.className, atStart: { transform: t0.transform, opacity: t0.opacity, animation: t0.animation, transition: t0.transition }, open: __rec(m), item: __rec(m.querySelector('.dropdown-item')) }; i.hide(); }
  const tt = document.querySelector('[data-bs-toggle=tooltip]');
  if (tt) { const i = bootstrap.Tooltip.getOrCreateInstance(tt); i.show(); await sleep(400); const t = document.querySelector('.tooltip');
    if (t) o.tooltip = { tooltip: __rec(t), inner: __rec(t.querySelector('.tooltip-inner')), arrowBefore: __rec(t.querySelector('.tooltip-arrow'), '::before') }; i.hide(); await sleep(300); }
  for (const [k, sel] of [['modalVertical', '.modal .modal-dialog-vertical'], ['modalCentered', '.modal .modal-dialog-centered'], ['modal', '.modal .modal-dialog:not(.modal-dialog-vertical)']]) {
    const d = document.querySelector(sel); if (!d) continue; const m = d.closest('.modal'); const i = bootstrap.Modal.getOrCreateInstance(m);
    const frames = []; i.show(); for (let t = 0; t <= 450; t += 75) { frames.push({ t, transform: getComputedStyle(d).transform, opacity: getComputedStyle(m).opacity }); await sleep(75); }
    o[k] = { classes: d.className, frames, modal: __rec(m), dialog: __rec(d), content: __rec(m.querySelector('.modal-content')), header: __rec(m.querySelector('.modal-header')),
      title: __rec(m.querySelector('.modal-title')), body: __rec(m.querySelector('.modal-body')), footer: __rec(m.querySelector('.modal-footer')),
      close: __rec(m.querySelector('.btn-close')), backdrop: __rec(document.querySelector('.modal-backdrop')) };
    i.hide(); await sleep(500);
  }
  const col = document.querySelector('.sidebar .sub-menu.collapse:not(.show)');
  if (col) { const i = bootstrap.Collapse.getOrCreateInstance(col, { toggle: false }); i.show(); await sleep(20); o.collapseOpening = { classes: col.className, ...__rec(col) }; await sleep(600); i.hide(); await sleep(500); }
  return o;
})()`);

const names = only.length ? only : [...Object.keys(PAGES), 'dark'];
for (const name of names) {
  const url = BASE + (PAGES[name] ?? PAGES.dashboard);
  try {
    await viewport(1280, 800);
    await cdp.go('about:blank', 200); // a hash-only change would not reload (no Apex hook)
    await cdp.go(url + '#redesign-audit', 5000);
    await cdp.ev(LIB);
    if (name === 'dark') {
      // Luno's own dark switch (theme settings panel): #theme-dark, else the header quick toggle.
      await cdp.ev(`(document.getElementById('theme-dark') || document.querySelector('.quick-light-dark'))?.click()`);
      await wait(1200);
    }
    const page = { url, ...(await cdp.ev(READ(ONE, MANY, PSEUDO))) };
    if (name !== 'dark') { page.states = await forced(); page.overlays = await overlays(); page.charts = await cdp.ev(CHARTS); }
    if (name === 'dashboard') spec.motion = await cdp.ev(MOTION);
    await shots(name);
    if (name === 'dark') {
      await cdp.ev(`(document.getElementById('theme-dark') || document.querySelector('.quick-light-dark'))?.click()`); // restore light
      await wait(600);
    }
    spec.pages[name] = page;
    console.log('ok', name, Object.keys(page.one).length, 'parts', page.charts?.length ?? 0, 'charts');
  } catch (e) { spec.pages[name] = { url, error: String(e.message || e) }; console.log('FAIL', name, e.message); }
}
await cdp.send('Emulation.clearDeviceMetricsOverride');
cdp.close();

// Summary tokens (light from dashboard, dark from dark).
const L = spec.pages.dashboard?.one ?? {}, D = spec.pages.dark?.one ?? {}, B = spec.pages.buttons?.many?.btn ?? {};
const t = (o) => o && { color: o.color, background: o.background, border: o.borderTop, radius: o.radius, padding: o.padding, font: `${o.fontWeight} ${o.fontSize}/${o.lineHeight} ${o.fontFamily}`, shadow: o.shadow };
spec.tokens = {
  light: Object.fromEntries(['body', 'sidebar', 'header', 'card', 'cardHeader', 'cardBody', 'menuLinkActive', 'subLinkActive', 'title', 'subtitle', 'statProgressBar', 'breadcrumbLink'].map((k) => [k, t(L[k])])),
  dark: Object.fromEntries(['body', 'sidebar', 'header', 'card', 'cardHeader', 'menuLink', 'menuLinkActive', 'title', 'subtitle', 'td', 'input'].map((k) => [k, t(D[k])])),
  buttons: Object.fromEntries(Object.entries(B).filter(([k]) => /btn-(primary|secondary|outline-primary|light|lg|sm)\b/.test(k) && k.split(' ').length <= 3).map(([k, v]) => [k, t(v)])),
  cssVars: spec.pages.dashboard?.vars, cssVarsDark: spec.pages.dark?.vars,
};
writeFileSync(out, JSON.stringify(spec, null, 1));
console.log('wrote', out);
