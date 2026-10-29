#!/usr/bin/env node
// Static scan: the reference brand's name, or a link / asset URL to its domains, in code that can
// reach the UI (strings, JSX text), with comments stripped. Usage: node .claude/skills/no-reference-brand/scan.mjs
// Exit 1 when a hit is found.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOTS = ['frontend/src', 'admin/src', 'owner-panel/src'];
const EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.json', '.html']);
const SKIP = /(__tests__|\.test\.|\.spec\.|\.globs\.js$)/;
// The name (hash.game / hash game / hashgame — the repo's folder "hash-game-exchange" is not UI
// text) and any link / asset URL on the reference's domains (hash.game, bc.game, bcgame.*).
const NAME = /hash[\s.]?game(?![-_]exchange)|\/\/([\w-]+\.)*(bc\.game|bcgame\.[a-z]+)/i;

// Blank out comments, keeping line numbers. Strings are skipped over so "https://…" survives.
function stripComments(src) {
  let out = '';
  for (let i = 0; i < src.length; ) {
    const c = src[i];
    const n = src[i + 1];
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < src.length && src[j] !== c) j += src[j] === '\\' ? 2 : 1;
      out += src.slice(i, j + 1);
      i = j + 1;
    } else if (c === '/' && n === '*') {
      const j = src.indexOf('*/', i + 2);
      const end = j < 0 ? src.length : j + 2;
      out += src.slice(i, end).replace(/[^\n]/g, ' ');
      i = end;
    } else if (c === '/' && n === '/' && src[i - 1] !== ':') {
      const j = src.indexOf('\n', i);
      const end = j < 0 ? src.length : j;
      out += ' '.repeat(end - i);
      i = end;
    } else {
      out += c;
      i += 1;
    }
  }
  return out;
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (EXT.has(extname(p)) && !SKIP.test(p)) yield p;
  }
}

let hits = 0;
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const src = readFileSync(file, 'utf8');
    if (!NAME.test(src)) continue;
    const code = /\.(json|html)$/.test(file) ? src : stripComments(src);
    code.split('\n').forEach((line, i) => {
      if (NAME.test(line)) {
        hits += 1;
        console.log(`${file}:${i + 1}: ${line.trim().slice(0, 160)}`);
      }
    });
  }
}
console.log(hits ? `\n${hits} line(s) can put the reference name on screen.` : 'Clean: no reference name outside comments.');
process.exit(hits ? 1 : 0);
