#!/usr/bin/env node
/**
 * Writes the explicit import maps that replace Vite's `import.meta.glob`.
 *
 *   node scripts/gen-glob-maps.mjs           write every map (runs before `dev` and `build`)
 *   node scripts/gen-glob-maps.mjs --check   exit 1 if any written map is missing or stale
 *
 * `import.meta.glob` is Vite-only. Every call in this project was eager with `import: 'default'`,
 * so each one is an object of `relative path -> default export`, keyed RELATIVE TO THE FILE THE
 * CALL WAS WRITTEN IN. The callers derive names from those keys (strip the folder, strip the
 * extension), so the keys have to stay byte-for-byte what Vite produced, in the same order.
 *
 * Each caller `dir/name.js(x)` gets a sibling `dir/name.globs.js` with one named export per glob
 * it used, and the call became `globMaps.<name>`. The sibling sits in the same folder so the
 * import specifiers ARE the keys, exactly as Vite wrote them.
 *
 * Values: images resolve to a URL string (next.config's `turbopack.rules` type `asset`, the same
 * thing Vite's default asset import returns); `?raw` keeps its query and resolves to the file's
 * text. `?url` is dropped from the specifier: an image import is already its URL.
 *
 * The file set is re-globbed on every run, so adding an asset behaves as it did under Vite as
 * long as `dev`/`build` run through npm (the `predev`/`prebuild` hooks). The proof that the keys
 * match Vite's is `scripts/check-glob-maps.mjs`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Every `import.meta.glob` call the Vite build had: caller, variable, pattern, query. */
export const GLOBS = [
  { caller: 'src/utils/channelArt.js', name: 'ART', pattern: '../assets/deposit/channels/*.png' },
  { caller: 'src/utils/coinArt.js', name: 'coins', pattern: '../assets/coins/*.png' },
  { caller: 'src/utils/gameArt.js', name: 'art', pattern: '../assets/games/*.{avif,png,jpg}' },
  { caller: 'src/pages/WeeklyRaffle/index.jsx', name: 'art', pattern: '../../assets/raffle/ticket-*.png' },
  { caller: 'src/pages/WeeklyRaffle/index.jsx', name: 'avatars', pattern: '../../assets/raffle/avatars/*.png' },
  { caller: 'src/pages/VIP/index.jsx', name: 'art', pattern: '../../assets/vip/*.png' },
  { caller: 'src/pages/Sports/sportArt.js', name: 'art', pattern: '../../assets/sports/{sport,ic}-*.svg', query: '?raw' },
  { caller: 'src/pages/Sports/sportArt.js', name: 'flags', pattern: '../../assets/sports/flag-*.svg' },
  { caller: 'src/pages/Responsible/index.jsx', name: 'docs', pattern: '../Help/topics/*.html', query: '?raw' },
  { caller: 'src/pages/Referral/socials.js', name: 'socialArt', pattern: '../../assets/referral/socials/*.png' },
  { caller: 'src/pages/Referral/Dashboard.jsx', name: 'art', pattern: '../../assets/referral/*.png' },
  { caller: 'src/pages/Referral/blocks.jsx', name: 'art', pattern: '../../assets/referral/*.png' },
  { caller: 'src/pages/Referral/blocks.jsx', name: 'coins', pattern: '../../assets/coins/*.png' },
  { caller: 'src/pages/Referral/index.jsx', name: 'art', pattern: '../../assets/referral/*.png' },
  { caller: 'src/pages/Promotions/index.jsx', name: 'art', pattern: '../../assets/promotions/*.{png,avif,jpg}' },
  { caller: 'src/pages/Home/PayYourWay/index.jsx', name: 'coinIcons', pattern: '../../../assets/coins/*.png' },
  { caller: 'src/pages/Home/LotteryDraws/draws.js', name: 'backgrounds', pattern: '../../../assets/lottery/bg-*.png' },
  { caller: 'src/pages/Home/LotteryDraws/draws.js', name: 'balls', pattern: '../../../assets/lottery/ball-*.png' },
  { caller: 'src/pages/Home/LatestBets/bets.js', name: 'icons', pattern: '../../../assets/gameicons/*.png' },
  { caller: 'src/pages/Home/LatestBets/bets.js', name: 'coins', pattern: '../../../assets/coins/*.png' },
  { caller: 'src/pages/Home/Highlights/matches.js', name: 'flags', pattern: '../../../assets/sports/flag-*.svg' },
  { caller: 'src/pages/Home/Hero/Banner/card.js', name: 'art', pattern: '../../../../assets/banners/*.png' },
  { caller: 'src/pages/Help/index.jsx', name: 'docs', pattern: './fairness/*.html', query: '?raw' },
  { caller: 'src/pages/Help/index.jsx', name: 'topicDocs', pattern: './topics/*.html', query: '?raw' },
  { caller: 'src/pages/DepositOffer/DetailDialog.jsx', name: 'art', pattern: '../../assets/deposit-offer/*.{png,avif,jpg}' },
  { caller: 'src/pages/DepositOffer/DetailDialog.jsx', name: 'coins', pattern: '../../assets/coins/*.png' },
  { caller: 'src/pages/DepositOffer/index.jsx', name: 'art', pattern: '../../assets/deposit-offer/*.{png,avif,jpg}' },
  { caller: 'src/layouts/MainLayout/Footer/badges.js', name: 'awardFiles', pattern: '../../../assets/footer/awards/*.png', query: '?url' },
  { caller: 'src/layouts/MainLayout/Footer/badges.js', name: 'partnerFiles', pattern: '../../../assets/footer/partners/*.png', query: '?url' },
  { caller: 'src/data/providers.js', name: 'logos', pattern: '../assets/providers/*.{png,avif}' },
  { caller: 'src/components/modals/Profile/catalogue.js', name: 'art', pattern: '../../../assets/profile/medal_*.png' },
];

/** `src/pages/VIP/index.jsx` -> `src/pages/VIP/index.globs.js` */
export const mapFileFor = (caller) => caller.replace(/\.jsx?$/, '.globs.js');

/** The keys Vite's glob produced for this pattern: caller-relative, `./` for the caller's own
    folder, sorted by code unit. Same file set, re-read from disk. */
export function keysFor({ caller, pattern }) {
  const dir = path.join(root, path.dirname(caller));
  const files = fs.globSync(pattern, { cwd: dir }).map((f) => f.split(path.sep).join('/'));
  // fs.globSync normalises `./x/*` to `x/...` and keeps `../`; Vite keeps the pattern's own prefix.
  const prefixed = files.map((f) => (pattern.startsWith('./') && !f.startsWith('./') ? `./${f}` : f));
  return prefixed.sort();
}

export function render(caller, entries) {
  const self = path.basename(caller);
  const lines = [
    '// GENERATED by scripts/gen-glob-maps.mjs. Do not edit by hand: change the asset folder and',
    '// re-run it (`npm run dev` and `npm run build` do). Replaces the import.meta.glob call(s) in',
    `// ${self}; keys are exactly the ones Vite produced, in the same order.`,
    '',
  ];
  const body = [];
  entries.forEach((g, gi) => {
    const keys = keysFor(g);
    const spec = g.query === '?raw' ? '?raw' : '';
    const opts = `{ eager: true${g.query ? `, query: '${g.query}'` : ''}, import: 'default' }`;
    keys.forEach((k, i) => lines.push(`import g${gi}_${i} from '${k}${spec}';`));
    body.push('', `/* import.meta.glob('${g.pattern}', ${opts}) */`, `export const ${g.name} = {`);
    keys.forEach((k, i) => body.push(`  '${k}': g${gi}_${i},`));
    body.push('};');
  });
  return lines.concat(body).join('\n') + '\n';
}

export function byCaller() {
  const m = new Map();
  for (const g of GLOBS) m.set(g.caller, [...(m.get(g.caller) ?? []), g]);
  return m;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  let stale = 0;
  for (const [caller, entries] of byCaller()) {
    const file = path.join(root, mapFileFor(caller));
    const text = render(caller, entries);
    const cur = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    if (cur === text) continue;
    if (check) { stale++; console.error(`stale: ${mapFileFor(caller)}`); continue; }
    fs.writeFileSync(file, text);
    console.log(`wrote ${mapFileFor(caller)}`);
  }
  if (stale) process.exit(1);
}
