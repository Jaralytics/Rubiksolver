// verify-catalog.mjs — Verificación automática del catálogo con el motor lógico.
//
// Para cada caso comprueba que:
//   1. El algoritmo (y cada alternativa) se puede interpretar.
//   2. El caso se genera desde el cubo resuelto (inverso del algoritmo o `preparacion`)
//      y NO cumple ya el objetivo de la etapa.
//   3. El estado generado es realmente el caso que se describe: lo que debe estar
//      resuelto antes lo está, y su "firma" coincide con la del mismo caso en la
//      referencia (SpeedSolving Wiki), sin duplicados dentro de la etapa.
//   4. Aplicar el algoritmo cumple el objetivo de la etapa, sin dejar el cubo girado.
//   5. Cada alternativa cumple el objetivo partiendo del mismo estado.
//
// Uso: node tools/verify-catalog.mjs [ruta/al/catalogo.json]

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CubeModel, parseAlg, invertMoves, IDENTITY } from '../js/cube-model.js';
import {
  ollSignature, pllSignature, f2lSignature, majoritySignature, goalReached, stickerIs,
  crossSolved, firstLayerSolved, f2lSolved, llOriented, eollShape, cpllShape, isCorner, isEdge,
} from './lib/firmas.mjs';

const REF_STAGE = { OLL: ollSignature, PLL: pllSignature, F2L: f2lSignature };
const EXPECTED = { 'cfop-f2l': 41, 'cfop-oll': 57, 'cfop-pll': 21 };
const COVERAGE = { 'cfop-f2l': 'F2L', 'cfop-oll': 'OLL', 'cfop-pll': 'PLL' };
const identity = (m) => m.frame().every((v, i) => v === IDENTITY[i]);
const key = (sig) => (sig && typeof sig === 'object' ? sig.key : sig);

export function loadReference() {
  return JSON.parse(readFileSync(new URL('./referencia/speedsolving-wiki.json', import.meta.url)));
}

/** Firma mayoritaria de un caso de la referencia, p. ej. "OLL 27" o "PLL Ua". */
export function referenceSignatures(ref) {
  const cache = new Map();
  return (name) => {
    if (!cache.has(name)) {
      const [stage, id] = name.split(' ');
      const entry = ref[stage]?.[id];
      cache.set(name, entry ? majoritySignature(entry.algs, REF_STAGE[stage]).signature : null);
    }
    return cache.get(name);
  };
}

export function verifyCatalog(catalog, ref = loadReference()) {
  const errors = [];
  const stats = {};
  const referenceSignature = referenceSignatures(ref);

  const ids = new Set();
  for (const etapa of catalog.etapas) {
    const casos = catalog.casos.filter((c) => c.etapa === etapa.id);
    const seen = new Map();
    stats[etapa.id] = { casos: casos.length, alternativas: 0 };
    if (EXPECTED[etapa.id] && casos.length !== EXPECTED[etapa.id]) {
      errors.push(`${etapa.id}: se esperaban ${EXPECTED[etapa.id]} casos y hay ${casos.length}`);
    }

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
        moves = parseAlg(c.algoritmo);
        prep = c.preparacion ? parseAlg(c.preparacion) : invertMoves(moves);
      } catch (e) {
        err(e.message);
        continue;
      }
      if (!moves.length) {
        err('algoritmo vacío');
        continue;
      }
      const groups = new Set(moves.map((m) => m.group)).size;
      if (c.notas && c.notas.length !== groups) err(`tiene ${c.notas.length} notas para ${groups} grupos`);

      const tipo = etapa.tipo;
      const state = new CubeModel(3).applyMoves(prep);
      if (!identity(state)) err('el caso deja el cubo girado: el algoritmo principal no debe tener rotación neta');
      if (goalReached(tipo, state)) err('el caso generado ya cumple el objetivo de la etapa');

      // --- 3. ¿Es el caso que dice ser? ---
      const v = c.verificacion || {};
      let sig = null;
      if (tipo === 'cruz' && !c.preparacion) {
        const hidden = (c.ocultar || []).map((h) => h.join());
        const others = state.pieces.filter((p) => isEdge(p) && p.home[1] === -1 && p.home.join() !== v.pieza?.join() && !hidden.includes(p.home.join()));
        if (others.length + hidden.length !== 3 || !others.every((p) => state.isPieceSolved(p))) err('las otras tres aristas de la cruz no están resueltas');
        if (!v.pieza || !stickerIs(state, v)) err('la arista no está donde indica "verificacion"');
      } else if (tipo === 'capa1') {
        if (!crossSolved(state)) err('la cruz no está resuelta en el caso');
        const bad = state.pieces.filter((p) => isCorner(p) && p.home[1] === -1 && !state.isPieceSolved(p));
        if (bad.length !== 1 || bad[0].home.join() !== v.pieza?.join()) err('debe haber exactamente una esquina de la primera capa sin resolver');
        if (!v.pieza || !stickerIs(state, v)) err('la esquina no está donde indica "verificacion"');
      } else if (tipo === 'capa2') {
        if (!firstLayerSolved(state)) err('la primera capa no está resuelta en el caso');
        const bad = state.pieces.filter((p) => isEdge(p) && p.home[1] === 0 && !state.isPieceSolved(p));
        if (bad.length !== 1 || bad[0].home.join() !== v.pieza?.join()) err('debe haber exactamente una arista de la capa media sin resolver');
        if (!v.pieza || !stickerIs(state, v)) err('la arista no está donde indica "verificacion"');
      } else if (tipo === 'f2l') {
        sig = f2lSignature(moves);
        if (!sig) err('no es un caso F2L válido (cruz resuelta y un único hueco sin resolver)');
        else if (sig.slot.join() !== '1,1') err('el hueco sin resolver no es el del frente a la derecha');
      } else if (tipo === 'oll' || tipo === 'ocll') {
        sig = ollSignature(moves);
        if (!sig) err('no es un caso OLL válido (el algoritmo altera las dos primeras capas)');
        if (tipo === 'ocll' && eollShape(state) !== 'hecha') err('las aristas deberían estar ya orientadas');
      } else if (tipo === 'eoll') {
        if (!f2lSolved(state)) err('las dos primeras capas no están resueltas en el caso');
        if (eollShape(state) !== v.forma) err(`la forma es "${eollShape(state)}" y se declaró "${v.forma}"`);
      } else if (tipo === 'cpll') {
        if (!f2lSolved(state) || !llOriented(state)) err('el caso debe tener F2L resuelto y la última capa orientada');
        if (cpllShape(state) !== v.forma) err(`la forma es "${cpllShape(state)}" y se declaró "${v.forma}"`);
      } else if (tipo === 'pll' || tipo === 'epll') {
        sig = pllSignature(moves);
        if (!sig) err('no es un caso PLL válido (el algoritmo altera F2L o la orientación)');
      }

      if (['f2l', 'oll', 'ocll', 'pll', 'epll'].includes(tipo)) {
        const k = key(sig);
        if (k) {
          if (seen.has(k)) err(`es el mismo caso que ${seen.get(k)}`);
          seen.set(k, c.id);
        }
        if (!c.referencia) err('falta "referencia"');
        else {
          const expected = referenceSignature(c.referencia);
          if (!expected) err(`referencia "${c.referencia}" no encontrada`);
          else if (k && k !== expected) err(`no coincide con ${c.referencia} de la referencia`);
        }
      }

      // --- 4. El algoritmo resuelve el caso ---
      const after = state.clone().applyMoves(moves);
      if (!goalReached(tipo, after)) err('el algoritmo no cumple el objetivo de la etapa');
      if (!identity(after)) err('el algoritmo deja el cubo girado');

      // --- 5. Alternativas ---
      for (const alt of c.alternativas || []) {
        stats[etapa.id].alternativas++;
        try {
          const end = state.clone().applyMoves(parseAlg(alt)).normalize();
          if (!goalReached(tipo, end)) err(`la alternativa "${alt}" no resuelve el caso`);
        } catch (e) {
          err(`alternativa "${alt}": ${e.message}`);
        }
      }
    }

    // Cobertura: todos los casos de la referencia deben estar presentes.
    const stage = COVERAGE[etapa.id];
    if (stage) {
      const used = new Set(casos.map((c) => c.referencia));
      for (const id of Object.keys(ref[stage])) {
        if (ref[stage][id].algs.length && !used.has(`${stage} ${id}`)) errors.push(`${etapa.id}: falta el caso ${stage} ${id}`);
      }
    }
  }
  return { errors, stats };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = process.argv[2] || new URL('../data/algorithms.json', import.meta.url);
  const catalog = JSON.parse(readFileSync(file));
  const { errors, stats } = verifyCatalog(catalog);
  console.log('Etapa                    casos  alternativas');
  for (const [id, s] of Object.entries(stats)) console.log(`${id.padEnd(24)} ${String(s.casos).padStart(5)}  ${String(s.alternativas).padStart(12)}`);
  const total = Object.values(stats).reduce((a, s) => a + s.casos + s.alternativas, 0);
  if (errors.length) {
    console.error(`\n${errors.length} error(es):`);
    for (const e of errors) console.error('  - ' + e);
    process.exit(1);
  }
  console.log(`\nCatálogo verificado: ${total} algoritmos, 0 errores.`);
}
