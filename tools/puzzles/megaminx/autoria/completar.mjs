// Ayuda de autoría: no la usan la generación del catálogo (build.mjs) ni las pruebas (verify.mjs).
// Sirve para encontrar o revisar algoritmos nuevos y ejecuta su trabajo al importarse o al lanzarse.
// Se ejecuta a mano desde la raíz del repositorio con node; sus argumentos se explican más abajo.
// completar.mjs (Megaminx) — Ayuda de autoría: ejecuta el resolutor guiado sobre mezclas con semilla
// y, donde el catálogo se queda sin caso en una etapa de capas inferiores, busca por meet in the
// middle un algoritmo que resuelva una pieza atascada conservando todas las demás de la etapa. Lo
// añade a una copia en memoria del catálogo y sigue, para descubrir los siguientes huecos. Imprime
// los algoritmos nuevos (candidatos a casos de source.mjs).
// Uso: node tools/puzzles/megaminx/autoria/completar.mjs <etapa> <primera semilla> <última semilla>
import { readFileSync } from 'node:fs';
import { SLOTS } from '../../../../js/megaminx-geometry.js';
import { FACE_INDEX, adjacent, FACES } from '../../../../js/megaminx-geometry.js';
import { stagePieces, ownPiece, pieceClass } from '../firmas.mjs';
import { resolverConCatalogo } from '../solucionador.mjs';
import { buscarCamino } from './mitm.mjs';

const [, , etapaArg, desde = '1', hasta = '10'] = process.argv;
const catalogo = JSON.parse(readFileSync(new URL('../../../../data/megaminx.json', import.meta.url)));
const anteriores = catalogo.metodos[0].etapas;
const corte = anteriores.indexOf(etapaArg);
const tipo = catalogo.etapas.find((e) => e.id === etapaArg).tipo;
catalogo.metodos[0].etapas = anteriores.slice(0, corte + 1);

const vecinas = (caras) => FACES.filter((f) => !caras.has(f) && [...caras].some((g) => adjacent(FACE_INDEX[f], FACE_INDEX[g])));

function candidato(m) {
  const todas = stagePieces(tipo, m);
  const piezas = todas; // se siguen todas; las demás sin resolver se tratan como libres más abajo
  const sin = piezas.filter((p) => !m.isPieceSolved(p) && ownPiece(tipo, p));
  let mejor = null;
  for (const t of sin) {
    const piezas = todas.filter((p) => p === t || m.isPieceSolved(p));
    const inicio = piezas.flatMap((p) => (p === t ? [p.pos, p.rot] : [p.slot, 0]));
    const meta = piezas.flatMap((p) => [p.slot, 0]);
    const base = new Set([...SLOTS[t.pos].faces, ...SLOTS[t.slot].faces]);
    for (const caras of [base, new Set([...base, ...vecinas(base)].filter((f, i, a) => a.indexOf(f) === i))]) {
      const tokens = [...caras].flatMap((f) => [f, `${f}'`, `${f}2`, `${f}2'`]);
      const alg = buscarCamino(inicio, meta, tokens, tokens.length > 28 ? 4 : 4, tokens.length > 28 ? 3 : 4);
      if (alg && (!mejor || alg.split(' ').length < mejor.alg.split(' ').length)) mejor = { alg, pieza: t, libres: todas.length - piezas.length };
      if (alg) break;
    }
  }
  return mejor;
}

const nuevos = [];
for (let semilla = Number(desde); semilla <= Number(hasta); semilla++) {
  for (let intento = 0; intento < 12; intento++) {
    const r = resolverConCatalogo(catalogo, semilla);
    if (r.ok) {
      console.log(semilla, 'resuelta');
      break;
    }
    if (r.etapa !== etapaArg) {
      console.log(semilla, 'atascada antes, en', r.etapa, (r.detalle.sinCaso || []).join(' '));
      break;
    }
    const c = candidato(r.detalle.modelo);
    if (!c) {
      console.log(semilla, 'sin candidato para', (r.detalle.sinCaso || []).join(' '));
      break;
    }
    const clase = pieceClass(r.detalle.modelo, c.pieza);
    console.log(semilla, 'nuevo caso:', c.alg, '|', c.pieza.home.join('-'), 'en', SLOTS[c.pieza.pos].faces.join('-'), '|', clase);
    nuevos.push(`${c.alg} | pieza ${c.pieza.home.join('-')}`);
    catalogo.casos.push({ etapa: etapaArg, algoritmo: c.alg, verificacion: { pieza: c.pieza.home } });
  }
}
console.log(JSON.stringify(nuevos, null, 1));
