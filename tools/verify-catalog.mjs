// verify-catalog.mjs — Verificación automática de los catálogos con el motor lógico.
//
// Cada puzzle define sus comprobaciones en tools/puzzles/<id>/verify.mjs. En común, para
// cada caso: el algoritmo (y cada alternativa) se puede interpretar en ese tamaño de
// cubo; el caso se genera desde el cubo resuelto (inverso del algoritmo o `preparacion`)
// y NO cumple ya el objetivo de la etapa; el estado es realmente el caso que se describe
// (su "firma"); aplicar el algoritmo cumple el objetivo sin dejar el cubo girado, y cada
// alternativa lo cumple partiendo del mismo estado.
//
// Uso: node tools/verify-catalog.mjs [2x2|3x3|4x4 | ruta/al/catalogo.json]   (sin argumentos, todos)

import { readFileSync } from 'node:fs';
import { PUZZLE_IDS, loadPuzzle } from './puzzles/index.mjs';

const arg = process.argv[2];
const targets = !arg ? PUZZLE_IDS.map((id) => ({ id, file: new URL(`../data/${id}.json`, import.meta.url) })) : PUZZLE_IDS.includes(arg) ? [{ id: arg, file: new URL(`../data/${arg}.json`, import.meta.url) }] : [{ file: arg }];

let total = 0;
let failed = 0;
for (const t of targets) {
  const catalog = JSON.parse(readFileSync(t.file));
  const puzzle = await loadPuzzle(t.id || catalog.cubo);
  const { errors, stats } = puzzle.verify(catalog);
  console.log(`\nCatálogo ${puzzle.id}\nEtapa                    casos  alternativas`);
  for (const [id, s] of Object.entries(stats)) console.log(`${id.padEnd(24)} ${String(s.casos).padStart(5)}  ${String(s.alternativas).padStart(12)}`);
  const count = Object.values(stats).reduce((a, s) => a + s.casos + s.alternativas, 0);
  total += count;
  if (errors.length) {
    failed += errors.length;
    console.error(`\n${puzzle.id}: ${errors.length} error(es):`);
    for (const e of errors) console.error('  - ' + e);
  } else {
    console.log(`\nCatálogo ${puzzle.id} verificado: ${count} algoritmos, 0 errores.`);
  }
}
console.log(`\nTotal: ${total} algoritmos, ${failed} error(es).`);
process.exit(failed ? 1 : 0);
