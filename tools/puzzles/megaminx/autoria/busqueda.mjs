// Ayuda de autoría: no la usan la generación del catálogo (build.mjs) ni las pruebas (verify.mjs).
// Sirve para encontrar o revisar algoritmos nuevos y ejecuta su trabajo al importarse o al lanzarse.
// Se ejecuta a mano desde la raíz del repositorio con node; sus argumentos se explican más abajo.
// busqueda.mjs (Megaminx) — Ayuda de autoría, no forma parte de la verificación: busca, para
// cada clase de EO y de EP, la secuencia más corta formada por los algoritmos base y giros de U.
// Uso: node tools/puzzles/megaminx/autoria/busqueda.mjs

import { parseAlg, movesToString } from '../../../../js/megaminx-model.js';
import { caseState, eoClass, epClass, goalReached } from '../firmas.mjs';

const BASE = {
  eo: ["F R U R' U' F'", "F U R U' R' F'"],
  ep: ["R U R' U R U2' R'", "R U2 R' U' R U' R'"],
};
const GIROS = ['', 'U', 'U2', "U2'", "U'"];

function buscar(tipo, clasificar, maxBase) {
  const best = new Map();
  const visit = (parts) => {
    const alg = parts.filter(Boolean).join(' ');
    if (!alg) return;
    const moves = parseAlg(alg);
    const s = caseState(moves);
    if (s.frame() !== 0) return;
    const clase = clasificar(s);
    if (!clase || goalReached(tipo, s)) return;
    if (!goalReached(tipo, s.clone().applyMoves(moves))) return;
    if (!best.has(clase) || best.get(clase).length > moves.length) best.set(clase, { alg: movesToString(moves), length: moves.length });
  };
  const rec = (parts, n) => {
    visit(parts);
    if (n === maxBase) return;
    for (const b of BASE[tipo]) for (const g of GIROS) rec([...parts, g, b], n + 1);
  };
  rec([], 0);
  return best;
}


// ---------------------------------------------------------------------------
// Capas inferiores: BFS sobre un conjunto restringido de caras. Parte del puzzle resuelto,
// aplica secuencias y se queda con los estados donde solo una pieza de la etapa está sin
// resolver; el algoritmo del caso es la secuencia inversa.
// Uso: node tools/puzzles/megaminx/autoria/busqueda.mjs <etapa> <caras separadas por coma> <profundidad> [giros, p. ej. -,' ]
// ---------------------------------------------------------------------------

import { MegaminxModel as Modelo, invertMoves as invertir } from '../../../../js/megaminx-model.js';
import { SLOTS as SLOTS_ } from '../../../../js/megaminx-geometry.js';
import { layerClass, STAGE_TYPES, unsolvedOf } from '../firmas.mjs';

export function buscarCapas(tipo, caras, profundidad, giros = ['', "'", '2', "2'"]) {
  const tokens = caras.flatMap((f) => giros.map((g) => f + g));
  const found = new Map();
  const visto = new Set();
  const key = (m) => m.pieces.map((p) => p.pos * 64 + p.rot).join();
  const inicio = new Modelo();
  visto.add(key(inicio));
  let frontera = [{ m: inicio, path: [], last: null }];
  for (let nivel = 1; nivel <= profundidad && frontera.length; nivel++) {
    const siguiente = [];
    for (const { m, path, last } of frontera) {
      for (const f of caras) {
        if (f === last) continue;
        for (const g of giros) {
          const t = f + g;
          const n = m.clone().applyAlg(t);
          const k = key(n);
          if (visto.has(k)) continue;
          visto.add(k);
          const p = [...path, t];
          siguiente.push({ m: n, path: p, last: f });
          const clase = layerClass(tipo, n);
          if (clase && !found.has(clase)) found.set(clase, { n: p.length, alg: movesToString(invertir(parseAlg(p.join(' ')))), real: describe(n, unsolvedOf(tipo, n)[0]) });
        }
      }
    }
    frontera = siguiente;
  }
  return found;
}

if (process.argv[2] && STAGE_TYPES.includes(process.argv[2])) {
  const [tipo, caras, prof, giros] = process.argv.slice(2);
  const found = buscarCapas(tipo, caras.split(','), Number(prof), giros ? giros.split(',').map((g) => (g === '-' ? '' : g)) : undefined);
  for (const [clase, v] of [...found].sort((a, b) => a[1].n - b[1].n)) console.log(String(v.n).padStart(2), v.alg.padEnd(36), v.real);
}

function describe(m, p) {
  return `${p.home.join('-')} en ${SLOTS_[p.pos].faces.join('-')} (${SLOTS_[p.pos].faces.map((g) => g + '<' + m.stickerAt(p.pos, g).face).join(' ')})`;
}
