#!/usr/bin/env node
/**
 * Proves the generated glob maps (scripts/gen-glob-maps.mjs) hold exactly the keys, in exactly
 * the order, that Vite's `import.meta.glob` produced.
 *
 *   node scripts/check-glob-maps.mjs [viteOrigin]
 *
 * 1. Filesystem: re-lists each pattern with an independent matcher (brace expansion + `*`, no
 *    glob library) and compares it with the keys written in the `.globs.js` file.
 * 2. Vite (when a Vite dev server of the ORIGINAL source is given, e.g. the hash-games reference
 *    on http://localhost:5191): fetches the caller as Vite transformed it, reads the keys out of
 *    its `Object.assign({...})`, and compares them, in order, with the generated map.
 * 3. No `import.meta.glob(` call is left anywhere in src/.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GLOBS, byCaller, mapFileFor } from './gen-glob-maps.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vite = process.argv[2]?.replace(/\/$/, '');
let bad = 0;
const fail = (msg) => { bad++; console.error(`FAIL ${msg}`); };
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

const expand = (p) => {
  const m = /\{([^}]*)\}/.exec(p);
  return m ? m[1].split(',').flatMap((alt) => expand(p.slice(0, m.index) + alt + p.slice(m.index + m[0].length))) : [p];
};
function listFs(caller, pattern) {
  const dir = path.join(root, path.dirname(caller));
  const out = [];
  for (const p of expand(pattern)) {
    const slash = p.lastIndexOf('/');
    const folder = p.slice(0, slash), leaf = p.slice(slash + 1);
    const re = new RegExp('^' + leaf.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*') + '$');
    for (const f of fs.readdirSync(path.join(dir, folder))) if (!f.startsWith('.') && re.test(f)) out.push(`${folder}/${f}`);
  }
  return [...new Set(out)].sort();
}

function generatedKeys(caller, name) {
  const text = fs.readFileSync(path.join(root, mapFileFor(caller)), 'utf8');
  const block = new RegExp(`export const ${name} = \\{\\n([\\s\\S]*?)\\n\\};`).exec(text);
  if (!block) return null;
  return [...block[1].matchAll(/^ {2}'([^']+)': g\d+_\d+,$/gm)].map((m) => m[1]);
}

async function viteKeys(caller) {
  const src = await (await fetch(`${vite}/${caller}`)).text();
  return [...src.matchAll(/Object\.assign\(\{([^}]*)\}\)/g)].map((m) => [...m[1].matchAll(/"([^"]+)":/g)].map((k) => k[1]));
}

let total = 0;
for (const [caller, entries] of byCaller()) {
  const fromVite = vite ? await viteKeys(caller) : null;
  if (fromVite && fromVite.length !== entries.length) fail(`${caller}: Vite shows ${fromVite.length} globs, config has ${entries.length}`);
  entries.forEach((g, i) => {
    const gen = generatedKeys(caller, g.name);
    if (!gen) return fail(`${mapFileFor(caller)} has no export ${g.name}`);
    const fsKeys = listFs(caller, g.pattern);
    if (!same(gen, fsKeys)) fail(`${caller} ${g.name}: generated ${gen.length} keys, filesystem ${fsKeys.length}`);
    if (fromVite && !same(gen, fromVite[i] ?? [])) fail(`${caller} ${g.name}: generated keys differ from Vite's (${gen.length} vs ${fromVite[i]?.length})`);
    total += gen.length;
    console.log(`ok  ${caller.padEnd(46)} ${g.name.padEnd(12)} ${String(gen.length).padStart(4)} keys${fromVite ? '  = Vite' : ''}  = fs`);
  });
}

const left = fs.globSync('src/**/*.{js,jsx,ts,tsx}', { cwd: root })
  .filter((f) => /import\.meta\.glob\(/.test(fs.readFileSync(path.join(root, f), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')));
if (left.length) fail(`import.meta.glob still called in: ${left.join(', ')}`);

console.log(`\n${GLOBS.length} globs, ${total} keys, ${bad ? `${bad} FAILED` : 'all identical'}${vite ? ` (checked against Vite at ${vite})` : ''}`);
process.exit(bad ? 1 : 0);
