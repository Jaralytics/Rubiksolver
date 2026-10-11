// verify.mjs (2x2) — Verificación del catálogo del 2x2 con el motor lógico.
//
// Además de las comprobaciones comunes (ver tools/verify-catalog.mjs) comprueba que:
//   - los casos de OLL cubren exactamente las 7 formas posibles de la capa superior, que se
//     calculan enumerando las torsiones de las cuatro esquinas (suma múltiplo de 3);
//   - los de PBL cubren las 5 combinaciones de clases de permutación de las dos capas;
//   - ningún algoritmo usa M, E, S ni giros anchos (no existen en un 2x2).

import { CubeModel, parseAlg, invertMoves, faceOfNormal, matVec, faceNormal } from '../../../js/cube-model.js';
import { identity } from '../../lib/comun.mjs';
import { goalReached, ollClass, pblSignature, firstLayerSolved } from './firmas.mjs';

const SIZE = 2;
const EXPECTED = { 'pr-capa1': 5, 'pr-oll': 7, 'pr-pll': 2, 'or-cara': 5, 'or-oll': 7, 'or-pbl': 5 };

/** Formas de OLL posibles: torsiones con suma múltiplo de 3, salvo la resuelta, módulo el giro de U. */
function expectedOllClasses() {
  const out = new Set();
  for (let n = 0; n < 81; n++) {
    const t = [n % 3, Math.floor(n / 3) % 3, Math.floor(n / 9) % 3, Math.floor(n / 27)];
    if (t.reduce((a, b) => a + b, 0) % 3 !== 0) continue;
    out.add([0, 1, 2, 3].map((k) => t.map((_, i) => t[(i + k) % 4]).join('')).sort()[0]);
  }
  out.delete('0000');
  return [...out].sort();
}

const LAYERS = ['solved', 'adj', 'diag'];
function expectedPbl() {
  const out = new Set();
  for (const a of LAYERS) for (const b of LAYERS) out.add([a, b].sort().join('+'));
  out.delete('solved+solved');
  return [...out].sort();
}

export function verifyCatalog(catalog) {
  const errors = [];
  const stats = {};
  const ids = new Set();
  const facing = (p, f) => faceOfNormal(matVec(p.rot, faceNormal(f)));

  for (const etapa of catalog.etapas) {
    const casos = catalog.casos.filter((c) => c.etapa === etapa.id);
    const seen = new Set();
    stats[etapa.id] = { casos: casos.length, alternativas: 0 };
    if (EXPECTED[etapa.id] && casos.length !== EXPECTED[etapa.id]) errors.push(`${etapa.id}: se esperaban ${EXPECTED[etapa.id]} casos y hay ${casos.length}`);

    for (const c of casos) {
      const err = (msg) => errors.push(`${c.id} (${c.nombre}): ${msg}`);
      if (ids.has(c.id)) err('id duplicado');
      ids.add(c.id);
      for (const campo of ['etapa', 'id', 'nombre', 'algoritmo', 'alternativas', 'descripcion']) {
        if (c[campo] === undefined || c[campo] === '') err(`falta el campo "${campo}"`);
      }
      let moves;
      let prep;
      try {
        moves = parseAlg(c.algoritmo, SIZE);
        prep = c.preparacion ? parseAlg(c.preparacion, SIZE) : invertMoves(moves);
      } catch (e) {
        err(e.message);
        continue;
      }
      if (/[MES]|w|[a-w]/.test(c.algoritmo)) err('usa M, E, S o giros anchos, que no existen en el 2x2');
      const groups = new Set(moves.map((m) => m.group)).size;
      if (c.notas && c.notas.length !== groups) err(`tiene ${c.notas.length} notas para ${groups} grupos`);

      const tipo = etapa.tipo;
      const state = new CubeModel(SIZE).applyMoves(prep);
      if (!identity(state)) err('el caso deja el cubo girado');
      if (goalReached(tipo, state)) err('el caso generado ya cumple el objetivo de la etapa');

      const v = c.verificacion || {};
      if (tipo === 'capa1' || tipo === 'cara') {
        const bad = state.pieces.filter((p) => p.home[1] < 0 && !state.isPieceSolved(p));
        if (bad.length !== 1 || bad[0].home.join() !== v.pieza?.join()) err('debe haber exactamente una esquina de la primera capa sin resolver');
        const p = state.pieceByHome(v.pieza || [0.5, -0.5, 0.5]);
        if (p.pos.join() !== v.pos?.join() || facing(p, v.pegatina) !== v.cara) err('la esquina no está donde indica "verificacion"');
      } else {
        if (tipo !== 'pbl' && !firstLayerSolved(state)) err('la primera capa debe estar resuelta en el caso');
        const sig = tipo === 'oll' ? ollClass(state) : pblSignature(state);
        if (!sig) err('no es un caso válido de esta etapa');
        if (sig !== v.clase) err(`la clase es "${sig}" y se declaró "${v.clase}"`);
        if (seen.has(sig)) err(`es el mismo caso que otro de la etapa (${sig})`);
        seen.add(sig);
        if (tipo === 'pll' && !['adj+solved', 'diag+solved'].includes(sig)) err('el PLL del 2x2 debe tener la capa inferior resuelta');
      }

      const after = state.clone().applyMoves(moves);
      if (!goalReached(tipo, after)) err('el algoritmo no cumple el objetivo de la etapa');
      if (!identity(after)) err('el algoritmo deja el cubo girado');
      for (const alt of c.alternativas || []) {
        stats[etapa.id].alternativas++;
        try {
          if (!goalReached(tipo, state.clone().applyMoves(parseAlg(alt, SIZE)).normalize())) err(`la alternativa "${alt}" no resuelve el caso`);
        } catch (e) {
          err(`alternativa "${alt}": ${e.message}`);
        }
      }
    }

    // Cobertura frente a la enumeración independiente de formas posibles.
    if (etapa.tipo === 'oll' && [...seen].sort().join() !== expectedOllClasses().join()) errors.push(`${etapa.id}: las formas no cubren las 7 posibles (${expectedOllClasses().join(' ')})`);
    if (etapa.tipo === 'pbl' && [...seen].sort().join() !== expectedPbl().join()) errors.push(`${etapa.id}: las clases no cubren las 5 combinaciones (${expectedPbl().join(' ')})`);
  }
  return { errors, stats };
}
