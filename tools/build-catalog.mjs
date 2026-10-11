// build-catalog.mjs — Genera data/<puzzle>.json a partir de la fuente de cada puzzle
// (tools/puzzles/<id>/source.mjs).
//
// Cada catálogo se verifica completo antes de escribirse: si algo falla, ese archivo NO
// se toca y el proceso termina con error.
//
// Uso: node tools/build-catalog.mjs [2x2] [3x3] [4x4] [megaminx]      (sin argumentos, todos)

import { writeFileSync } from 'node:fs';
import { PUZZLE_IDS, loadPuzzle } from './puzzles/index.mjs';

const ids = process.argv.slice(2).length ? process.argv.slice(2) : PUZZLE_IDS;
let failed = 0;

for (const id of ids) {
  const puzzle = await loadPuzzle(id);
  const { catalog, problems } = puzzle.build();
  const { errors, stats } = puzzle.verify(catalog);
  const all = [...problems, ...errors];
  if (all.length) {
    failed++;
    console.error(`${id}: no se generó el catálogo (${all.length} problema(s)).`);
    for (const e of all) console.error('  - ' + e);
    continue;
  }
  writeFileSync(new URL(`../data/${id}.json`, import.meta.url), JSON.stringify(catalog, null, 1) + '\n');
  for (const [etapa, s] of Object.entries(stats)) console.log(`${etapa.padEnd(24)} ${String(s.casos).padStart(3)} casos, ${String(s.alternativas).padStart(3)} alternativas`);
  console.log(`data/${id}.json escrito: ${catalog.casos.length} casos verificados.\n`);
}
process.exit(failed ? 1 : 0);
