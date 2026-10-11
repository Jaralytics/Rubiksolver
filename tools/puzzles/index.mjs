// index.mjs — Registro de puzzles de las herramientas. Cada puzzle vive en su carpeta
// (tools/puzzles/<id>/index.mjs) y exporta { id, size, build(), verify(catalogo) }:
//   build()   → { catalog, problems }  construye el catálogo desde su fuente
//   verify()  → { errors, stats }      lo comprueba con el motor lógico

export const PUZZLE_IDS = ['2x2', '3x3', '4x4', 'megaminx'];

export async function loadPuzzle(id) {
  if (!PUZZLE_IDS.includes(id)) throw new Error(`Puzzle desconocido: "${id}" (hay: ${PUZZLE_IDS.join(', ')})`);
  return (await import(`./${id}/index.mjs`)).default;
}
