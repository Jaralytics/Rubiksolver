// Ayuda de autoría: no la usan la generación del catálogo (build.mjs) ni las pruebas (verify.mjs).
// Sirve para encontrar o revisar algoritmos nuevos y ejecuta su trabajo al importarse o al lanzarse.
// Se ejecuta a mano desde la raíz del repositorio con node; sus argumentos se explican más abajo.
// candidatos.mjs (Megaminx) — Ayuda de autoría: reúne algoritmos «generales» (solo cambian un hueco
// bajo la capa U) para los huecos de s2l-alto y los clasifica por cómo llega la pieza desde la capa U
// (qué pegatina de la pieza mira arriba), para quedarse con el más corto de cada orientación.
// Uso: node tools/puzzles/megaminx/autoria/candidatos.mjs <profundidad de B> [huecos separados por coma]
import { movesToString, parseAlg, invertMoves } from '../../../../js/megaminx-model.js';
import { componer, inverso, efectoMovimiento, identidad, cambiados, bajoU, SLOTS } from './tablas.mjs';
import { caseState } from '../firmas.mjs';

const [, , profB = '2', huecosArg = 'F-R,F-DR,R-DR,F-R-DR'] = process.argv;
const huecos = new Set(huecosArg.split(','));
const giros = ['', "'", '2', "2'"];
const tok = (caras) => caras.flatMap((f) => giros.map((g) => f + g));
const inv = (alg) => movesToString(invertMoves(parseAlg(alg)));
const nombre = (s) => SLOTS[s].faces.join('-');

// Pool G: secuencias directas en R,U y conmutadores [A, U^k] con A en R,U,F; todas cambian un solo hueco bajo U.
const G = new Map();
const guardar = (alg, E) => {
  const ch = cambiados(E);
  if (ch.filter(bajoU).length !== 1) return;
  const k = ch.join();
  if (!G.has(k) || G.get(k).alg.split(' ').length > alg.split(' ').length) G.set(k, { alg, E });
};
(function dfs(path, E, last, caras, prof, cb) {
  if (path.length) cb(path.join(' '), E);
  if (path.length === prof) return;
  for (const t of tok(caras)) {
    const f = t.replace(/[2']/g, '');
    if (f !== last) dfs([...path, t], componer(E, efectoMovimiento(t)), f, caras, prof, cb);
  }
})([], identidad(), null, ['R', 'U'], 9, guardar);
const U_INV = { U: "U'", "U'": 'U', U2: "U2'", "U2'": 'U2' };
(function dfs(path, A, last) {
  if (path.length) {
    for (const u of Object.keys(U_INV)) {
      const E = componer(componer(componer(A, efectoMovimiento(u)), inverso(A)), efectoMovimiento(U_INV[u]));
      guardar(`(${path.join(' ')}) ${u} (${inv(path.join(' '))}) ${U_INV[u]}`, E);
    }
  }
  if (path.length === 4) return;
  for (const t of tok(['R', 'U', 'F'])) {
    const f = t.replace(/[2']/g, '');
    if (f !== last) dfs([...path, t], componer(A, efectoMovimiento(t)), f);
  }
})([], identidad(), null);
console.error(`${G.size} algoritmos generales`);

// Conjugación por B (profundidad ≤ profB) y clasificación de los que dan un hueco pedido.
const mejores = new Map();
const largo = (a) => a.replace(/[()]/g, '').trim().split(/\s+/).length;
function considerar(texto, E) {
  const ch = cambiados(E);
  const bajo = ch.filter(bajoU);
  if (bajo.length !== 1 || !huecos.has(nombre(bajo[0]))) return;
  const x = nombre(bajo[0]);
  const s = caseState(parseAlg(texto));
  const p = s.pieces.find((q) => q.home.join('-') === x);
  if (!p) return;
  const arriba = SLOTS[p.pos].faces.includes('U') ? SLOTS[p.pos].faces.map((g) => s.stickerAt(p.pos, g)).find((st, i) => SLOTS[p.pos].faces[i] === 'U')?.face : null;
  if (!arriba) return;
  const clave = `${x}|arriba=${arriba}`;
  if (!mejores.has(clave) || largo(mejores.get(clave)) > largo(texto)) mejores.set(clave, texto);
}
for (const g of G.values()) considerar(g.alg, g.E);
(function dfs(path, B, last) {
  if (path.length) {
    const Bi = inverso(B);
    for (const g of G.values()) considerar(`(${path.join(' ')}) (${g.alg}) (${inv(path.join(' '))})`, componer(componer(B, g.E), Bi));
  }
  if (path.length === Number(profB)) return;
  for (const t of tok(['U', 'F', 'R', 'BR', 'BL', 'L', 'D', 'B', 'DBL', 'DL', 'DR', 'DBR'])) {
    const f = t.replace(/[2']/g, '');
    if (f !== last) dfs([...path, t], componer(B, efectoMovimiento(t)), f);
  }
})([], identidad(), null);
for (const [k, v] of [...mejores].sort()) console.log(k.padEnd(24), String(largo(v)).padStart(3), v);
