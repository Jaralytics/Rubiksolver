// build-catalog.mjs — Genera data/algorithms.json a partir de catalog-source.mjs.
//
// Además de dar formato, este script:
//   - ajusta cada alternativa (giro previo de U, rotación o ajuste final) para que
//     resuelva exactamente el mismo caso que el algoritmo principal;
//   - compone los casos del método principiante repitiendo un único algoritmo;
//   - calcula las soluciones óptimas de los ejemplos de cruz;
//   - redacta las partes de la descripción que se deducen del estado del cubo;
//   - verifica el resultado completo y NO escribe el archivo si algo falla.
//
// Uso: node tools/build-catalog.mjs

import { writeFileSync } from 'node:fs';
import { CubeModel, parseAlg, invertMoves, movesToString } from '../js/cube-model.js';
import {
  caseState, ollSignature, pllSignature, goalReached, mirrorMoves, stickerFacing,
  crossSolved, firstLayerSolved, f2lSolved, eollShape, cpllShape, headlights, bars,
  orientedEdges, orientedCorners, isEdge, isCorner, LL_CORNERS, LL_EDGES, indexIn,
} from './lib/firmas.mjs';
import { verifyCatalog, loadReference, referenceSignatures } from './verify-catalog.mjs';
import { FUENTES, METODOS, ETAPAS, CRUZ_EJEMPLOS, BLOQUES, PR_GENERADOS } from './catalog-source.mjs';

const ref = loadReference();
const refSignature = referenceSignatures(ref);
const AUF = ['', 'U', "U'", 'U2'];
const problems = [];

// ---------------------------------------------------------------------------
// Alternativas
// ---------------------------------------------------------------------------

const LL_TYPES = ['oll', 'ocll', 'eoll', 'pll', 'epll', 'cpll'];
const F2L_PREFIXES = ['', 'U', "U'", 'U2', 'y', "y'", 'y2', 'y U', "y U'", 'y U2', "y' U", "y' U'", "y' U2", 'y2 U', "y2 U'", 'y2 U2'];

/** Devuelve la alternativa con los ajustes necesarios para resolver `state`. */
function fitAlternative(tipo, state, text) {
  let body = text;
  if (LL_TYPES.includes(tipo)) {
    // En la última capa, el giro previo de U (o mirar desde otro lado) se recalcula.
    const moves = parseAlg(text);
    let skip = 0;
    while (skip < moves.length && ['U', 'y'].includes(moves[skip].base)) skip++;
    if (skip) body = movesToString(moves.slice(skip));
  }
  const prefixes = LL_TYPES.includes(tipo) ? AUF : tipo === 'f2l' ? F2L_PREFIXES : [''];
  const suffixes = ['pll', 'epll', 'cpll'].includes(tipo) ? AUF : [''];
  for (const pre of prefixes) {
    for (const suf of suffixes) {
      const candidate = [pre && `(${pre})`, body, suf && `(${suf})`].filter(Boolean).join(' ');
      const end = state.clone().applyMoves(parseAlg(candidate)).normalize();
      if (goalReached(tipo, end)) return candidate;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Cruz óptima (búsqueda en anchura sobre las 4 aristas de la cruz)
// ---------------------------------------------------------------------------

const FACE_MOVES = ['U', 'D', 'R', 'L', 'F', 'B'].flatMap((f) => [f, f + "'", f + '2']).map((t) => parseAlg(t)[0]);

function solveCross(scramble) {
  const start = new CubeModel(3).applyAlg(scramble);
  start.pieces = start.pieces.filter((p) => isEdge(p) && p.home[1] === -1);
  const keyOf = (m) => m.pieces.map((p) => p.pos.join('') + p.rot.join('')).join('|');
  const solved = (m) => m.pieces.every((p) => m.isPieceSolved(p));
  let frontier = [{ m: start, path: [] }];
  const seen = new Set([keyOf(start)]);
  for (let depth = 0; depth <= 8; depth++) {
    const next = [];
    for (const node of frontier) {
      if (solved(node.m)) return movesToString(node.path);
      for (const mv of FACE_MOVES) {
        const last = node.path[node.path.length - 1];
        if (last && last.base === mv.base) continue;
        const m = node.m.clone().applyMove(mv);
        const k = keyOf(m);
        if (seen.has(k)) continue;
        seen.add(k);
        next.push({ m, path: [...node.path, mv] });
      }
    }
    frontier = next;
  }
  throw new Error('No se encontró cruz en 8 movimientos');
}

// ---------------------------------------------------------------------------
// Composición de casos repitiendo un bloque
// ---------------------------------------------------------------------------

/** Explora (bloque) (U?) (bloque)… y devuelve, por clase de caso, la secuencia más corta. */
function compose(block, maxBlocks, classify) {
  const found = new Map();
  for (let n = 1; n <= maxBlocks; n++) {
    const total = 4 ** (n - 1);
    for (let code = 0; code < total; code++) {
      const parts = [`(${block})`];
      let c = code;
      let aufs = 0;
      for (let i = 1; i < n; i++) {
        const a = AUF[c % 4];
        c = Math.floor(c / 4);
        if (a) {
          parts.push(`(${a})`);
          aufs++;
        }
        parts.push(`(${block})`);
      }
      const text = parts.join(' ');
      const cls = classify(parseAlg(text));
      if (cls && !found.has(cls)) found.set(cls, { text, blocks: n, aufs, parts });
    }
  }
  return found;
}

const blockNotes = (parts, nombre) => {
  let seenBlock = false;
  return parts.map((p) => {
    if (AUF.includes(p.slice(1, -1))) return 'Recoloca la capa superior';
    const note = seenBlock ? `Repite ${nombre}` : `Aplica ${nombre}`;
    seenBlock = true;
    return note;
  });
};

// ---------------------------------------------------------------------------
// Descripciones deducidas del estado
// ---------------------------------------------------------------------------

const HACIA = { U: 'arriba', D: 'abajo', F: 'el frente', B: 'atrás', R: 'la derecha', L: 'la izquierda' };
const LADO = ['atrás', 'a la derecha', 'al frente', 'a la izquierda'];
const RINCON = ['atrás a la izquierda', 'atrás a la derecha', 'delante a la derecha', 'delante a la izquierda'];

function describeF2L(state) {
  const corner = state.pieceByHome([1, -1, 1]);
  const edge = state.pieceByHome([1, 0, 1]);
  const white = stickerFacing(corner, 'D');
  const cornerUp = corner.pos[1] === 1;
  const cornerTxt = cornerUp
    ? `Esquina arriba (${RINCON[indexIn(LL_CORNERS, corner.pos)]}) con el blanco hacia ${HACIA[white]}`
    : white === 'D'
      ? 'Esquina resuelta en su hueco'
      : `Esquina en su hueco, girada, con el blanco hacia ${HACIA[white]}`;
  let edgeTxt;
  if (edge.pos[1] === 1) {
    const top = stickerFacing(edge, 'F') === 'U' ? 'verde' : 'naranja';
    edgeTxt = `arista arriba (${LADO[indexIn(LL_EDGES, edge.pos)]}) con el ${top} hacia arriba`;
  } else {
    edgeTxt = state.isPieceSolved(edge) ? 'arista resuelta en su hueco' : 'arista en su hueco, volteada';
  }
  // Pareja formada: misma orientación y misma posición relativa que en el cubo resuelto.
  const joined = corner.rot.join() === edge.rot.join() && [0, 1, 2].every((k) => {
    const d = [edge.home[0] - corner.home[0], edge.home[1] - corner.home[1], edge.home[2] - corner.home[2]];
    const r = corner.rot;
    return edge.pos[k] - corner.pos[k] === r[k * 3] * d[0] + r[k * 3 + 1] * d[1] + r[k * 3 + 2] * d[2];
  });
  return `${cornerTxt}; ${edgeTxt}.${joined ? ' La pareja ya está formada.' : ''}`;
}

/** Mejor alineación de la última capa: el giro de U que deja más piezas en su sitio. */
function aligned(state) {
  let best = null;
  for (let j = 0; j < 4; j++) {
    const t = state.clone().applyAlg(AUF[j]);
    const n = t.pieces.filter((p) => p.home[1] === 1 && t.isPieceSolved(p)).length;
    if (!best || n > best.n) best = { t, n };
  }
  return best.t;
}

/** Sentido de un ciclo de tres piezas de la última capa, o null si no lo hay. */
function cycleSense(state) {
  const t = aligned(state);
  for (const [list, test] of [[LL_EDGES, isEdge], [LL_CORNERS, isCorner]]) {
    const moving = list.map((pos, i) => ({ i, piece: t.pieceAt(pos) })).filter((x) => !t.isPieceSolved(x.piece));
    const others = t.pieces.filter((p) => p.home[1] === 1 && !test(p) && p.home[0] ** 2 + p.home[2] ** 2 > 0 && !t.isPieceSolved(p));
    if (moving.length === 3 && others.length === 0) {
      // `moving` está en orden horario; la primera pieza avanza si su destino es la siguiente posición.
      const target = indexIn(list, moving[0].piece.home);
      return target === moving[1].i ? 'sentido horario' : 'sentido antihorario';
    }
  }
  return null;
}

function fillPlaceholders(text, state) {
  const edges = orientedEdges(state);
  const values = {
    linea: () => (edges.includes(1) && edges.includes(3) ? 'en horizontal (de izquierda a derecha)' : 'en vertical (de frente a atrás)'),
    L: () => {
      // Las aristas i e i+1 se tocan en la esquina i+1.
      const [a, b] = edges;
      return RINCON[b - a === 1 ? b : 0];
    },
    faros: () => LADO[headlights(state)[0]],
    barra: () => LADO[bars(state)[0]],
    sentido: () => cycleSense(state),
  };
  return text.replace(/\{(\w+)\}/g, (_, k) => {
    const v = values[k]?.();
    if (!v) problems.push(`No se pudo calcular {${k}} en "${text}"`);
    return v;
  });
}

// ---------------------------------------------------------------------------
// Construcción
// ---------------------------------------------------------------------------

const casos = [];
const etapas = [];

function idFor(etapa, src, index) {
  if (etapa.id === 'cfop-oll') return `oll-${String(src.ref).padStart(2, '0')}`;
  if (etapa.id === 'cfop-pll') return `pll-${String(src.ref).toLowerCase()}`;
  if (etapa.id === 'cfop-f2l') return `f2l-${String(index + 1).padStart(2, '0')}`;
  return `${etapa.id}-${String(index + 1).padStart(2, '0')}`;
}

function generated(etapa) {
  const kind = etapa.generar;
  const block = BLOQUES[kind];
  const classify = {
    eoll: (mv) => {
      const s = eollShape(caseState(mv));
      return s === 'hecha' ? null : s;
    },
    ocll: (mv) => {
      const sig = ollSignature(mv);
      return PR_GENERADOS.ocll.find((c) => refSignature(`OLL ${c.ref}`) === sig)?.ref ?? null;
    },
    cpll: (mv) => {
      const s = cpllShape(caseState(mv));
      return s === 'hecha' ? null : s;
    },
    epll: (mv) => {
      const sig = pllSignature(mv);
      return PR_GENERADOS.epll.find((c) => refSignature(`PLL ${c.ref}`) === sig)?.ref ?? null;
    },
  }[kind];
  const found = compose(block.alg, 3, classify);
  return PR_GENERADOS[kind].map((c) => {
    const cls = c.clase ?? c.ref;
    const hit = found.get(cls);
    if (!hit) {
      problems.push(`${etapa.id}: no se encontró composición para "${c.nombre}"`);
      return null;
    }
    const direct = c.ref !== undefined ? casos.find((x) => x.referencia === `${kind === 'ocll' ? 'OLL' : 'PLL'} ${c.ref}`) : null;
    const alt = [...(c.alt || [])];
    // El algoritmo directo de CFOP es la alternativa natural cuando hacen falta varias repeticiones.
    if (direct && hit.blocks > 1) alt.push(direct.algoritmo);
    return {
      nombre: c.nombre,
      grupo: hit.blocks === 1 ? 'Una aplicación' : hit.blocks === 2 ? 'Dos aplicaciones' : 'Tres aplicaciones',
      alg: hit.text,
      alt,
      notas: blockNotes(hit.parts, block.nombre),
      descripcion: c.descripcion,
      ref: c.ref !== undefined ? `${kind === 'ocll' ? 'OLL' : 'PLL'} ${c.ref}` : undefined,
      forma: c.clase,
    };
  }).filter(Boolean);
}

for (const etapa of ETAPAS) {
  let fuente = etapa.casos ? etapa.casos.slice() : generated(etapa);

  if (etapa.tipo === 'capa2') {
    fuente = fuente.map((c) => {
      if (!c.bloques) return c;
      const found = compose(c.bloques, 2, (mv) => {
        const s = caseState(mv);
        const bad = s.pieces.filter((p) => isEdge(p) && p.home[1] === 0 && !s.isPieceSolved(p));
        return firstLayerSolved(s) && bad.length === 1 && bad[0].pos.join() === bad[0].home.join() && bad[0].home.join() === c.pieza.join() ? 'volteada' : null;
      });
      const hit = found.get('volteada');
      if (!hit) {
        problems.push(`${etapa.id}: no se encontró composición para "${c.nombre}"`);
        return null;
      }
      return { ...c, alg: hit.text, notas: hit.parts.length === c.notaBloque.length ? c.notaBloque : blockNotes(hit.parts, 'el algoritmo de inserción') };
    }).filter(Boolean);
  }

  if (etapa.ejemplos) {
    for (const ej of CRUZ_EJEMPLOS) {
      const alg = solveCross(ej.mezcla);
      const n = parseAlg(alg).length;
      fuente.push({
        nombre: ej.nombre,
        grupo: 'Cruz completa desde una mezcla',
        alg,
        preparacion: ej.mezcla,
        descripcion: `Mezcla: ${ej.mezcla}. Solución óptima de la cruz en ${n} movimientos; fíjate en cómo cada giro coloca una arista sin estropear las anteriores.`,
      });
    }
  }

  const first = casos.length;
  fuente.forEach((src, i) => {
    const moves = parseAlg(src.alg);
    const state = new CubeModel(3).applyMoves(src.preparacion ? parseAlg(src.preparacion) : invertMoves(moves));
    const c = {
      etapa: etapa.id,
      id: idFor(etapa, src, i),
      nombre: src.nombre,
      grupo: src.grupo,
      algoritmo: src.alg,
      alternativas: [],
      descripcion: src.descripcion || '',
    };

    for (const alt of src.alt || []) {
      let fitted = null;
      try {
        fitted = fitAlternative(etapa.tipo, state, alt);
      } catch (e) {
        problems.push(`${c.id}: alternativa "${alt}": ${e.message}`);
        continue;
      }
      if (!fitted) problems.push(`${c.id} (${c.nombre}): la alternativa "${alt}" no resuelve este caso`);
      else if (movesToString(parseAlg(fitted)) !== movesToString(moves) && !c.alternativas.includes(fitted)) c.alternativas.push(fitted);
    }

    if (etapa.tipo === 'f2l') {
      c.descripcion = describeF2L(state);
      c.referencia = `F2L ${src.ref}`;
    } else if (etapa.tipo === 'oll') {
      c.descripcion = `${src.forma} Aristas orientadas: ${orientedEdges(state).length} de 4; esquinas orientadas: ${orientedCorners(state).length} de 4.`;
      c.referencia = `OLL ${src.ref}`;
    } else if (etapa.tipo === 'pll') {
      c.referencia = `PLL ${src.ref}`;
    } else if (src.ref) {
      c.referencia = src.ref;
    }
    c.descripcion = fillPlaceholders(c.descripcion, state);
    c.nombre = fillPlaceholders(c.nombre, state);
    if (src.notas) c.notas = src.notas;
    if (src.preparacion) c.preparacion = src.preparacion;
    if (src.ocultar) c.ocultar = src.ocultar;

    if (etapa.tipo === 'cruz' && !src.preparacion) c.verificacion = { pieza: [0, -1, 1], pegatina: 'D', ...src.espera };
    if (etapa.tipo === 'capa1') c.verificacion = { pieza: [1, -1, 1], pegatina: 'D', ...src.espera };
    if (etapa.tipo === 'capa2') c.verificacion = { pieza: src.pieza, ...src.espera };
    if (etapa.tipo === 'eoll' || etapa.tipo === 'cpll') c.verificacion = { forma: src.forma };
    casos.push(c);
  });

  const grupos = [...new Set(casos.slice(first).map((c) => c.grupo))];
  etapas.push({
    id: etapa.id,
    metodo: etapa.metodo,
    nombre: etapa.nombre,
    tipo: etapa.tipo,
    mascara: etapa.mascara,
    miniatura: etapa.miniatura,
    flechas: Boolean(etapa.flechas),
    descripcion: etapa.descripcion,
    grupos,
  });
}

// ---------------------------------------------------------------------------
// Afirmaciones de las descripciones (inverso / espejo) comprobadas con firmas
// ---------------------------------------------------------------------------

const pll = (id) => parseAlg(casos.find((c) => c.id === `pll-${id}`).algoritmo);
const claim = (text, ok) => {
  if (!ok) problems.push(`Afirmación falsa: ${text}`);
};
claim('Ub es el inverso de Ua', pllSignature(invertMoves(pll('ua'))) === pllSignature(pll('ub')));
claim('Ab es el inverso de Aa', pllSignature(invertMoves(pll('aa'))) === pllSignature(pll('ab')));
claim('Gb es el inverso de Ga', pllSignature(invertMoves(pll('ga'))) === pllSignature(pll('gb')));
claim('Gd es el inverso de Gc', pllSignature(invertMoves(pll('gc'))) === pllSignature(pll('gd')));
claim('Jb es el espejo de Ja', pllSignature(mirrorMoves(pll('ja'))) === pllSignature(pll('jb')));
claim('Rb es el espejo de Ra', pllSignature(mirrorMoves(pll('ra'))) === pllSignature(pll('rb')));
claim('Nb es el espejo de Na', pllSignature(mirrorMoves(pll('na'))) === pllSignature(pll('nb')));

const catalog = {
  version: 1,
  cubo: '3x3',
  generado: new Date().toISOString().slice(0, 10),
  convencion: 'Cruz blanca abajo, amarillo arriba, verde al frente. Cada caso se genera aplicando al cubo resuelto el inverso de "algoritmo" (o "preparacion" si existe).',
  fuentes: FUENTES,
  metodos: METODOS.map((m) => ({ ...m, etapas: etapas.filter((e) => e.metodo === m.id).map((e) => e.id) })),
  etapas,
  casos,
};

const { errors, stats } = verifyCatalog(catalog, ref);
const all = [...problems, ...errors];
if (all.length) {
  console.error(`No se generó el catálogo: ${all.length} problema(s).`);
  for (const e of all) console.error('  - ' + e);
  process.exit(1);
}

writeFileSync(new URL('../data/algorithms.json', import.meta.url), JSON.stringify(catalog, null, 1) + '\n');
for (const [id, s] of Object.entries(stats)) console.log(`${id.padEnd(24)} ${String(s.casos).padStart(3)} casos, ${String(s.alternativas).padStart(3)} alternativas`);
console.log(`data/algorithms.json escrito: ${casos.length} casos verificados.`);
