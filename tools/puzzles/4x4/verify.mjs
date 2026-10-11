// verify.mjs (4x4) — Verificación del catálogo del 4x4 con el motor lógico.
//
// «Resuelto» se decide por colores de pegatina. Además de las comprobaciones comunes:
//   - centros: el caso solo tiene centros fuera de sitio (esquinas y alas resueltas);
//   - aristas: centros y esquinas resueltos y un número exacto de aristas sin emparejar;
//   - paridades: el caso tiene centros, esquinas y aristas bien emparejadas, y su vista 3x3
//     es ilegal del tipo indicado (arista volteada o aristas intercambiadas), es decir,
//     NO se puede alcanzar solo con giros de las caras exteriores.

import { CubeModel, parseAlg, invertMoves } from '../../../js/cube-model.js';
import { identity } from '../../lib/comun.mjs';
import { PUZZLE_IDS } from '../index.mjs';
import { goalReached, centersSolved, cornersSolved, edgesPaired, unpairedEdges, parityKind } from './firmas.mjs';

const SIZE = 4;
const EXPECTED = { 'red-centros': 4, 'red-aristas': 4, 'red-3x3': 0, 'red-paridad-oll': 1, 'red-paridad-pll': 1 };
const sameSet = (a, b) => [...a].sort().join('|') === [...b].sort().join('|');
const wingsAt = (m) => [...new Set(m.slots().filter((s) => s.kind === 2 && s.color !== s.face).map((s) => s.pos.join()))];

export const caseState = (moves) => new CubeModel(SIZE).applyMoves(invertMoves(moves));

export function verifyCatalog(catalog) {
  const errors = [];
  const stats = {};
  const ids = new Set();
  const states = new Set();

  for (const etapa of catalog.etapas) {
    const casos = catalog.casos.filter((c) => c.etapa === etapa.id);
    stats[etapa.id] = { casos: casos.length, alternativas: 0 };
    if (etapa.tipo === 'enlace') {
      if (!PUZZLE_IDS.includes(etapa.enlace) || etapa.enlace === catalog.cubo) errors.push(`${etapa.id}: enlace a un puzzle que no existe o al mismo cubo (${etapa.enlace})`);
      if (casos.length) errors.push(`${etapa.id}: una etapa de enlace no lleva casos`);
    }
    if (EXPECTED[etapa.id] !== undefined && casos.length !== EXPECTED[etapa.id]) errors.push(`${etapa.id}: se esperaban ${EXPECTED[etapa.id]} casos y hay ${casos.length}`);

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
      if (/[MES]/.test(c.algoritmo)) err('usa M, E o S, que no existen en el 4x4');
      const groups = new Set(moves.map((m) => m.group)).size;
      if (c.notas && c.notas.length !== groups) err(`tiene ${c.notas.length} notas para ${groups} grupos`);

      const tipo = etapa.tipo;
      const state = new CubeModel(SIZE).applyMoves(prep);
      if (!identity(state)) err('el caso deja el cubo girado');
      if (goalReached(tipo, state)) err('el caso generado ya cumple el objetivo de la etapa');
      const key = state.slots().map((s) => s.color).join('');
      if (states.has(key)) err('es el mismo estado que otro caso del catálogo');
      states.add(key);

      
      const v = c.verificacion || {};
      if (tipo === 'centros') {
        if (!cornersSolved(state) || !state.stickersSolved([2])) err('en un caso de centros, esquinas y alas deben estar resueltas');
        const bad = state.slots().filter((s) => s.kind === 1 && s.color !== s.face).map((s) => `${s.color}@${s.face}[${s.pos}]`);
        if (!v.centros || !sameSet(bad, v.centros)) err(`los centros fuera de sitio son ${bad.join(' ')} y se declaró ${(v.centros || []).join(' ')}`);
        if (bad.length !== 3) err('un conmutador de centros debe mover exactamente tres piezas');
      } else if (tipo === 'aristas') {
        if (!centersSolved(state) || !cornersSolved(state)) err('los centros y las esquinas deben estar resueltos en el caso');
        const edges = unpairedEdges(state).map((e) => e.caras.join(''));
        if (!v.aristas || !sameSet(edges, v.aristas)) err(`las aristas sin emparejar son ${edges.join(',')} y se declararon ${(v.aristas || []).join(',')}`);
        const wings = wingsAt(state);
        if (!v.alas || !sameSet(wings, v.alas.map((w) => w.join()))) err(`las alas fuera de sitio están en ${wings.join(' ')} y se declararon otras`);
      } else {
        if (!centersSolved(state) || !cornersSolved(state) || !edgesPaired(state)) err('la paridad exige centros, esquinas y aristas resueltos y emparejados');
        const kind = parityKind(state);
        if (kind !== tipo.slice('paridad-'.length)) err(`la vista 3x3 es "${kind}" y no una paridad ${tipo.slice(8)}: se podría alcanzar con giros exteriores`);
        if (kind !== v.paridad) err(`la paridad es "${kind}" y se declaró "${v.paridad}"`);
        const wings = wingsAt(state);
        if (!v.alas || !sameSet(wings, v.alas.map((w) => w.join()))) err(`las alas afectadas están en ${wings.join(' ')} y se declararon otras`);
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
  }
  return { errors, stats };
}
