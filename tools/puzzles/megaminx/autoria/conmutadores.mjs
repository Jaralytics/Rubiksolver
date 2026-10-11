// Ayuda de autoría: no la usan la generación del catálogo (build.mjs) ni las pruebas (verify.mjs).
// Sirve para encontrar o revisar algoritmos nuevos y ejecuta su trabajo al importarse o al lanzarse.
// Se ejecuta a mano desde la raíz del repositorio con node; sus argumentos se explican más abajo.
// conmutadores.mjs (Megaminx) — Ayuda de autoría: busca A tales que [A, U^k] = A U^k A' U^-k deje
// intacto todo lo que hay bajo la capa U salvo un único hueco. Uso:
//   node tools/puzzles/megaminx/autoria/conmutadores.mjs <caras separadas por coma> <profundidad>
import { movesToString, parseAlg, invertMoves } from '../../../../js/megaminx-model.js';
import { componer, inverso, efectoMovimiento, identidad, cambiados, bajoU, SLOTS } from './tablas.mjs';

const [, , carasArg = 'R,U,F', profArg = '5'] = process.argv;
const caras = carasArg.split(',');
const giros = ['', "'", '2', "2'"];
const tokens = caras.flatMap((f) => giros.map((g) => f + g));
const Uk = ['U', "U'", 'U2', "U2'"].map((t) => ({ t, e: efectoMovimiento(t), i: inverso(efectoMovimiento(t)) }));
const inversoTexto = (alg) => movesToString(invertMoves(parseAlg(alg)));
const vistos = new Map();

function evaluar(alg, A) {
  const Ai = inverso(A);
  for (const u of Uk) {
    const C = componer(componer(componer(A, u.e), Ai), u.i);
    const ch = cambiados(C);
    const bajo = ch.filter(bajoU);
    if (bajo.length !== 1 || ch.length !== 3) continue;
    const x = bajo[0];
    const clave = `${x}|${ch.join()}|${u.t}`;
    const texto = `(${alg}) ${u.t} (${inversoTexto(alg)}) ${movesToString(parseAlg(u.t).map((m) => parseAlg(m.text)[0])).replace(u.t, u.t.endsWith("'") ? u.t.replace("'", '') : u.t.replace(/2$/, "2'").replace(/^U$/, "U'"))}`;
    const prev = vistos.get(clave);
    if (!prev || prev.alg.split(' ').length > alg.split(' ').length) vistos.set(clave, { alg, u: u.t, x, ch, texto });
  }
}

function dfs(path, A, last, prof) {
  if (path.length) evaluar(path.join(' '), A);
  if (path.length === prof) return;
  for (const t of tokens) {
    const f = t.replace(/[2']/g, '');
    if (f === last) continue;
    dfs([...path, t], componer(A, efectoMovimiento(t)), f, prof);
  }
}
dfs([], identidad(), null, Number(profArg));
const filas = [...vistos.values()].sort((a, b) => a.x - b.x || a.alg.length - b.alg.length);
for (const v of filas) console.log(SLOTS[v.x].faces.join('-').padEnd(12), v.ch.map((c) => SLOTS[c].faces.join('')).join(',').padEnd(30), v.texto);
