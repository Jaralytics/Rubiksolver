// fetch-reference.mjs — Descarga las listas de algoritmos de SpeedSolving Wiki
// (wikitexto) y las extrae a tools/referencia/speedsolving-wiki.json.
// Ese archivo se usa solo como referencia cruzada al verificar el catálogo.
//
// Uso: node tools/fetch-reference.mjs [--refresh]

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const rawDir = join(here, 'referencia', 'raw');
const outFile = join(here, 'referencia', 'speedsolving-wiki.json');
const refresh = process.argv.includes('--refresh');

const PAGES = {
  'OLL.txt': 'OLL',
  'T_OCLL.txt': 'Template:OCLL',
  'F2L.txt': 'First Two Layers',
  'PLL.txt': 'PLL',
  'T_H.txt': 'Template:H-PLL',
  'T_Ua.txt': 'Template:U-PLL(a)',
  'T_Ub.txt': 'Template:U-PLL(b)',
  'T_Z.txt': 'Template:Z-PLL',
  'T_Aa.txt': 'Template:A-PLL(a)',
  'T_Ab.txt': 'Template:A-PLL(b)',
  'T_E.txt': 'Template:E-PLL',
};

async function page(file) {
  const path = join(rawDir, file);
  if (existsSync(path) && !refresh) return readFile(path, 'utf8');
  const url = `https://www.speedsolving.com/wiki/index.php?title=${encodeURIComponent(PAGES[file])}&action=raw`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (rubiksolver catalog builder)' } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  const text = await res.text();
  await mkdir(rawDir, { recursive: true });
  await writeFile(path, text);
  return text;
}

const algsIn = (text) =>
  [...text.matchAll(/\{\{[Aa]lg\|([^|}]*)/g)]
    .map((m) => m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);

function sections(text, headingRe) {
  const out = [];
  const re = new RegExp(headingRe, 'gm');
  let m;
  let prev = null;
  while ((m = re.exec(text))) {
    if (prev) prev.body = text.slice(prev.start, m.index);
    prev = { id: m[1], start: m.index + m[0].length };
    out.push(prev);
  }
  if (prev) prev.body = text.slice(prev.start);
  return out;
}

const result = {
  fuente: 'SpeedSolving Wiki (https://www.speedsolving.com/wiki/) — páginas OLL, PLL y First Two Layers',
  extraido: new Date().toISOString().slice(0, 10),
  OLL: {},
  PLL: {},
  F2L: {},
};

const oll = (await page('OLL.txt')) + '\n' + (await page('T_OCLL.txt'));
for (const s of sections(oll, '^=== OLL (\\d+) ===')) {
  const name = /\|name=\s*([^\n]*)/.exec(s.body)?.[1].trim() ?? '';
  result.OLL[s.id] = { nombre: name, algs: algsIn(s.body.split(/^==[^=]/m)[0]) };
}

const f2l = await page('F2L.txt');
for (const s of sections(f2l, '^=== F2L (\\d+) ===')) {
  // Los algoritmos "si el hueco X está libre" no conservan el resto del F2L.
  const body = s.body.split(/^==[^=]/m)[0].split(/slot is open/i)[0];
  result.F2L[s.id] = { algs: algsIn(body) };
}

let pll = await page('PLL.txt');
for (const f of ['T_H.txt', 'T_Ua.txt', 'T_Ub.txt', 'T_Z.txt', 'T_Aa.txt', 'T_Ab.txt', 'T_E.txt']) pll += '\n' + (await page(f));
for (const s of sections(pll, '^==\\s*(\\w+) Permutation\\s*==\\s*$')) {
  const body = s.body.split(/^==[^=]/m)[0].split(/===\s*Optimal Algorithms\s*===/)[0];
  result.PLL[s.id] = { algs: algsIn(body) };
}

await writeFile(outFile, JSON.stringify(result, null, 1));
console.log(
  `OLL: ${Object.keys(result.OLL).length} casos · PLL: ${Object.keys(result.PLL).length} casos · F2L: ${Object.keys(result.F2L).length} casos → ${outFile}`,
);
