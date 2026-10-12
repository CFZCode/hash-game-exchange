#!/usr/bin/env node
/* Per-theme copies of the bc UI's raster icon sprites, plus the CSS that swaps them in.
 *
 *   node tools/gen-theme-sprites.mjs        → src/assets/themes/<key>/*.png + src/theme/sprites.css
 *
 * The sidebar, header, tabbar and category icons are PNG sprites with bc's colours baked in:
 * glyphs in bc green (#24EE89, active/selected), slate grey (#B3BEC1, resting) and white (hover).
 * A CSS mask would re-render the default theme, so instead each owner theme gets its own copy of
 * the DARK sheets with those three colours replaced (alpha kept, so edges stay identical) and
 * sprites.css points the same selectors at them under html[data-theme=<key>]. Pixels of any other
 * colour (the few multi-colour cells: hot, chat, notice, racing) are left as they are.
 * The default (`hash_game`, no data-theme) and the light theme never match: pixel-identical.
 * Palettes: keep in step with src/theme/palettes.css. Regenerate rather than hand-edit.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PNG } = require('pngjs');
const sharp = require('sharp');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ASSETS = path.join(ROOT, 'src/assets');

/* text, muted, primary — as in palettes.css (brands.css upstream). */
const THEMES = {
  carbon_gold: { text: '#f5f5f0', muted: '#9c9c94', primary: '#fcee0a' },
  violet_night: { text: '#f4f0ff', muted: '#a59cbd', primary: '#a78bfa' },
  emerald_dark: { text: '#eefcf3', muted: '#94ad9f', primary: '#22c55e' },
  neon_navy: { text: '#eef2ff', muted: '#98a2bf', primary: '#1aff00' },
};

const SHEETS = [
  'coloricon.png',
  'menuicon.png', 'menuicon_h.png', 'menuicon_g.png',
  'menuicon_retina.png', 'menuicon_h_retina.png', 'menuicon_g_retina.png',
  'gameicon.png', 'gameicon_h.png', 'gameicon_g.png',
  'gameicon_retina.png', 'gameicon_h_retina.png', 'gameicon_g_retina.png',
];

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => Math.round(v * t + b[i] * (1 - t)));
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

const REFS = { green: [36, 238, 137], grey: [179, 190, 193], white: [255, 255, 255] };

function recolour(png, theme) {
  const target = {
    green: hex(theme.primary),
    // --color-secondary in palettes.css: color-mix(text 45%, muted)
    grey: mix(hex(theme.text), hex(theme.muted), 0.45),
    white: hex(theme.text),
  };
  const out = new PNG({ width: png.width, height: png.height });
  png.data.copy(out.data);
  for (let k = 0; k < out.data.length; k += 4) {
    if (out.data[k + 3] === 0) continue;
    const c = [out.data[k], out.data[k + 1], out.data[k + 2]];
    let best = null;
    let bestD = 48;
    for (const [name, ref] of Object.entries(REFS)) {
      const d = dist(c, ref);
      if (d < bestD) [best, bestD] = [name, d];
    }
    if (!best) continue;
    const [r, g, b] = target[best];
    out.data[k] = r;
    out.data[k + 1] = g;
    out.data[k + 2] = b;
  }
  return out;
}

for (const [key, theme] of Object.entries(THEMES)) {
  const dir = path.join(ASSETS, 'themes', key);
  fs.mkdirSync(dir, { recursive: true });
  for (const sheet of SHEETS) {
    const png = PNG.sync.read(fs.readFileSync(path.join(ASSETS, sheet)));
    const raw = PNG.sync.write(recolour(png, theme), { colorType: 6 });
    // Lossless re-encode (no palette, so no colour is quantised): about a third of pngjs's size.
    fs.writeFileSync(path.join(dir, sheet), await sharp(raw).png({ compressionLevel: 9, adaptiveFiltering: true, effort: 10 }).toBuffer());
  }
}

/* The CSS: every DARK sprite rule from index.css / Sidebar.css, prefixed with the theme. */
const rules1x = [
  ['.color_icon_img', 'coloricon.png'],
  ['.menu_icon_img', 'menuicon.png'],
  ['.nav-link-item:hover .menu_icon_img_normal, .nav-link-item-game:hover .menu_icon_img_normal, .toggle-link-item:hover .menu_icon_img_normal', 'menuicon_h.png'],
  ['.menu_icon_img.menu_icon_img_active', 'menuicon_g.png'],
  ['.game_icon_img', 'gameicon.png'],
  ['.nav-link-item-game:hover .game_icon_img', 'gameicon_h.png'],
  ['.nav-link-item-game.active:hover .game_icon_img', 'gameicon_g.png'],
];
const rules2x = [
  ['.menu_icon_img', 'menuicon_retina.png'],
  ['.nav-link-item:hover .menu_icon_img_normal, .nav-link-item-game:hover .menu_icon_img_normal, .toggle-link-item:hover .menu_icon_img_normal', 'menuicon_h_retina.png'],
  ['.menu_icon_img.menu_icon_img_active', 'menuicon_g_retina.png'],
  ['.game_icon_img', 'gameicon_retina.png'],
  ['.nav-link-item-game:hover .game_icon_img', 'gameicon_h_retina.png'],
  ['.nav-link-item-game.active .game_icon_img, .nav-link-item-game.active:hover .game_icon_img', 'gameicon_g_retina.png'],
];
const block = (rules, indent = '') =>
  Object.keys(THEMES)
    .flatMap((key) =>
      rules.map(([sel, file]) => {
        const s = sel.split(',').map((x) => `${indent}html[data-theme='${key}'] .app-root.dark ${x.trim()}`).join(',\n');
        return `${s} {\n${indent}  background-image: url('../assets/themes/${key}/${file}');\n${indent}}`;
      }),
    )
    .join('\n\n');

const css = `/* GENERATED by tools/gen-theme-sprites.mjs — do not edit. The owner themes' recoloured icon
   sprites (see that script). Nothing here matches the default theme or the light theme. */

${block(rules1x)}

@media (min-resolution: 192dpi) {
${block(rules2x, '  ')}
}
`;
fs.writeFileSync(path.join(ROOT, 'src/theme/sprites.css'), css);
console.log(`wrote ${Object.keys(THEMES).length * SHEETS.length} sprites and src/theme/sprites.css`);
