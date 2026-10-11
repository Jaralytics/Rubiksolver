// Ayuda de autoría: no la usan la generación del catálogo (build.mjs) ni las pruebas (verify.mjs).
// Sirve para encontrar o revisar algoritmos nuevos y ejecuta su trabajo al importarse o al lanzarse.
// Se ejecuta a mano desde la raíz del repositorio con node; sus argumentos se explican más abajo.
// conjugados.mjs (Megaminx) — Ayuda de autoría: toma algoritmos «generales» G (que solo cambian un
// hueco bajo la capa U) y busca conjugadores B cortos tales que B G B' cambie un único hueco bajo U,
// pero otro. Sirve para llegar a huecos que la búsqueda directa no alcanza.
// Uso: node tools/puzzles/megaminx/autoria/conjugados.mjs <caras de G> <profundidad de G> <profundidad de B> [hueco filtrado]
import { movesToString, parseAlg, invertMoves } from '../../../../js/megaminx-model.js';
import { componer, inverso, efectoMovimiento, identidad, cambiados, bajoU, SLOTS } from './tablas.mjs';

const [, , carasG = 'R,U', profG = '8', profB = '3', filtro = ''] = process.argv;
const giros = ['', "'", '2', "2'"];
const tok = (caras) => caras.flatMap((f) => giros.map((g) => f + g));
const inv = (alg) => movesToString(invertMoves(parseAlg(alg)));

// 1. Algoritmos generales G: secuencias que cambian un solo hueco bajo U (el más corto por conjunto de cambios).
const G = new Map();
(function dfs(path, E, last) {
  if (path.length) {
    const ch = cambiados(E);
    if (ch.filter(bajoU).length === 1) {
      const k = ch.join();
      if (!G.has(k) || G.get(k).alg.split(' ').length > path.length) G.set(k, { alg: path.join(' '), E, ch });
    }
  }
  if (path.length === Number(profG)) return;
  for (const t of tok(carasG.split(','))) {
    const f = t.replace(/[2']/g, '');
    if (f !== last) dfs([...path, t], componer(E, efectoMovimiento(t)), f);
  }
})([], identidad(), null);
console.error(`${G.size} algoritmos generales`);

// 2. Conjugadores B.
const hallados = new Map();
const todas = tok(['U', 'F', 'R', 'BR', 'BL', 'L', 'D', 'B', 'DBL', 'DL', 'DR', 'DBR']);
(function dfs(path, B, last) {
  if (path.length) {
    const Bi = inverso(B);
    for (const g of G.values()) {
      const C = componer(componer(B, g.E), Bi);
      const ch = cambiados(C);
      const bajo = ch.filter(bajoU);
      if (bajo.length !== 1) continue;
      const nombre = SLOTS[bajo[0]].faces.join('-');
      if (filtro && nombre !== filtro) continue;
      const clave = `${bajo[0]}|${ch.join()}`;
      const texto = `(${path.join(' ')}) (${g.alg}) (${inv(path.join(' '))})`;
      const largo = path.length * 2 + g.alg.split(' ').length;
      const prev = hallados.get(clave);
      if (!prev || prev.largo > largo) hallados.set(clave, { texto, largo, nombre, ch });
    }
  }
  if (path.length === Number(profB)) return;
  for (const t of todas) {
    const f = t.replace(/[2']/g, '');
    if (f !== last) dfs([...path, t], componer(B, efectoMovimiento(t)), f);
  }
})([], identidad(), null);
for (const v of [...hallados.values()].sort((a, b) => a.nombre.localeCompare(b.nombre) || a.largo - b.largo)) console.log(v.nombre.padEnd(12), String(v.largo).padStart(3), v.ch.map((c) => SLOTS[c].faces.join('')).join(',').padEnd(40), v.texto);
