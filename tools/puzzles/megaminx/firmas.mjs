// firmas.mjs (Megaminx) — Objetivos de etapa y «firmas» de casos del Megaminx. Hay centros,
// así que todo se lee respecto de ellos (MegaminxModel.isPieceSolved / frame()).
//
// Las aristas de la capa U ocupan los huecos 12..16 en sentido horario visto desde arriba
// (UF, UR, UBR, UBL, UL), de modo que un giro de U es un desplazamiento cíclico de esos índices.

import { MegaminxModel, parseAlg, invertMoves } from '../../../js/megaminx-model.js';
import { SLOTS } from '../../../js/megaminx-geometry.js';

const N = 5;
export const EDGE0 = 12; // primer hueco de arista de la capa U

/** Estado del caso: resuelto + inverso del algoritmo. */
export const caseState = (moves) => new MegaminxModel().applyMoves(invertMoves(moves));

/** Todo lo que no pertenece a la capa U (piezas sin la pegatina U) está resuelto. */
export const belowSolved = (m) => m.pieces.every((p) => p.home.includes('U') || m.isPieceSolved(p));

/** Orientación de las aristas de la capa U por hueco: 0 si su pegatina U mira arriba, 1 si no. */
export const edgeOrientation = (m) => Array.from({ length: N }, (_, i) => (m.stickerAt(EDGE0 + i, 'U').face === 'U' ? 0 : 1));

/** Permutación de las aristas de la capa U: para cada hueco, el índice (0..4) del hueco de origen de su pieza. */
export const edgePermutation = (m) => Array.from({ length: N }, (_, i) => m.pieceAt(EDGE0 + i).slot - EDGE0);

const rotations = (arr) => arr.map((_, k) => arr.map((_, i) => arr[(i + k) % arr.length]));

/** Clase de orientación de aristas, sin depender del giro de U: "11000" … (mínimo de las 5 rotaciones). */
export function eoClass(m) {
  if (!belowSolved(m)) return null;
  return rotations(edgeOrientation(m)).map((r) => r.join('')).sort()[0];
}

/**
 * Clase de permutación de aristas con las aristas orientadas, módulo giros de U antes y después
 * (sumar a los huecos y a los orígenes): "01234" es resuelta; null si hay aristas mal orientadas.
 */
export function epClass(m) {
  if (!belowSolved(m) || edgeOrientation(m).some((o) => o)) return null;
  return permClass(edgePermutation(m));
}

export function permClass(perm) {
  let best = null;
  for (let a = 0; a < N; a++) {
    for (let b = 0; b < N; b++) {
      const s = perm.map((_, i) => (perm[(i + a) % N] + b) % N).join('');
      if (best === null || s < best) best = s;
    }
  }
  return best;
}

export const EP_SOLVED = '01234';

// Esquinas de la capa U en sentido horario (UFR, URBR, UBRBL, UBLL, UFL): no coinciden con el
// orden de los huecos 42..46, que es el del motor.
export const CORNERS = [42, 44, 45, 46, 43];
const RING = ['F', 'R', 'BR', 'BL', 'L']; // caras laterales de la capa U en sentido horario

/** Las aristas de la capa U están todas resueltas (no solo salvo giro de U). */
export const edgesSolved = (m) => m.pieces.every((p) => p.kind !== 2 || !p.home.includes('U') || m.isPieceSolved(p));

/** Permutación de las esquinas de la capa U: para cada hueco, el índice del hueco de origen de su pieza. */
export const cornerPermutation = (m) => CORNERS.map((s) => CORNERS.indexOf(m.pieceAt(s).slot));

/**
 * Giro de cada esquina de la capa U (0, 1, 2) según qué pegatina de la pieza mira arriba, contando
 * en sentido horario desde U. Solo tiene sentido con las esquinas en su sitio.
 */
export const cornerTwists = (m) => CORNERS.map((s, j) => ['U', RING[j], RING[(j + 1) % 5]].indexOf(m.stickerAt(s, 'U').face));

export const cornersInPlace = (m) => cornerPermutation(m).every((v, i) => v === i);

/** Clase de permutación de las esquinas con todo lo demás resuelto, módulo la rotación del puzzle (conjugación). */
export function cpClass(m) {
  if (!belowSolved(m) || !edgesSolved(m)) return null;
  return cpClassOf(cornerPermutation(m));
}

export function cpClassOf(perm) {
  let best = null;
  for (let a = 0; a < N; a++) {
    const s = perm.map((_, i) => (perm[(i + a) % N] - a + N) % N).join('');
    if (best === null || s < best) best = s;
  }
  return best;
}

/** Clase de giro de las esquinas con todo lo demás resuelto, módulo la rotación del puzzle. */
export function coClass(m) {
  if (!belowSolved(m) || !edgesSolved(m) || !cornersInPlace(m)) return null;
  return rotations(cornerTwists(m)).map((r) => r.join('')).sort()[0];
}

export function goalReached(tipo, m) {
  switch (tipo) {
    case 'eo':
      return belowSolved(m) && edgeOrientation(m).every((o) => !o);
    case 'ep':
      return epClass(m) === EP_SOLVED;
    case 'cp':
      return belowSolved(m) && edgesSolved(m) && cornersInPlace(m);
    case 'co':
      return m.isSolved();
    default:
      if (SETS[tipo]) return stageSolved(tipo, m);
      throw new Error(`Tipo de etapa desconocido: ${tipo}`);
  }
}

export { parseAlg };

// ---------------------------------------------------------------------------
// Capas inferiores: etapas intuitivas, una pieza cada vez
// ---------------------------------------------------------------------------

const UPPER = ['U', 'F', 'R', 'BR', 'BL', 'L'];
const LOWER_RING = ['B', 'DBL', 'DL', 'DR', 'DBR']; // las cinco caras que rodean a D

/** Piezas que cuenta cada etapa de capas inferiores (acumulativas): predicado sobre las caras de origen. */
const SETS = {
  estrella: (p) => p.kind === 2 && p.home.includes('D'),
  capa1: (p) => p.home.includes('D') && p.kind >= 2,
  's2l-bajo': (p) => SETS.capa2(p) || (p.kind === 3 && p.home.filter((f) => UPPER.includes(f)).length === 1 && p.home.filter((f) => LOWER_RING.includes(f)).length === 2),
  's2l-alto': (p) => !p.home.includes('U') && p.kind >= 2,
  capa2: (p) => (p.home.includes('D') && p.kind >= 2) || (p.kind === 2 && p.home.every((f) => LOWER_RING.includes(f))),
};

/** Etapas de capas inferiores en orden de resolución: cada una incluye las piezas de las anteriores. */
const ORDER = ['estrella', 'capa1', 'capa2', 's2l-bajo', 's2l-alto'];

/** Piezas que aporta solo la etapa `tipo` (las que las anteriores no incluyen). */
export const ownPiece = (tipo, p) => SETS[tipo](p) && !(ORDER.indexOf(tipo) > 0 && SETS[ORDER[ORDER.indexOf(tipo) - 1]](p));

/** Piezas de la etapa `tipo` (índices en `pieces`) */
export const stagePieces = (tipo, m) => m.pieces.filter(SETS[tipo]);
export const STAGE_TYPES = Object.keys(SETS);

/** Todas las piezas de la etapa y de las anteriores están resueltas. */
export const stageSolved = (tipo, m) => stagePieces(tipo, m).every((p) => m.isPieceSolved(p));

/** Piezas de la etapa sin resolver. */
export const unsolvedOf = (tipo, m) => stagePieces(tipo, m).filter((p) => !m.isPieceSolved(p));

/**
 * Clase de un caso de capas inferiores: la única pieza de la etapa sin resolver, descrita por
 * qué pegatina de la pieza (cara de origen) mira hacia cada cara del hueco donde está, la menor
 * de las cinco rotaciones del puzzle alrededor de D ("a<b": en la cara a se ve la pegatina de b).
 */
export function pieceClass(m, piece) {
  const idx = m.pieces.indexOf(piece);
  let best = null;
  let c = m.clone();
  for (let k = 0; k < N; k++) {
    const q = c.pieces[idx];
    // el color f se nombra por la cara donde está ahora su centro, para que girar el puzzle no cambie la clase
    const lugar = Object.fromEntries(c.pieces.filter((p) => p.kind === 1).map((p) => [p.home[0], SLOTS[p.pos].faces[0]]));
    const s = SLOTS[q.pos].faces.map((g) => `${g}<${lugar[c.stickerAt(q.pos, g).face]}`).sort().join(' ');
    if (best === null || s < best) best = s;
    c = c.applyAlg('y');
  }
  return best;
}

/** Firma de caso de etapa de capas inferiores: null si no hay exactamente una pieza sin resolver. */
export function layerClass(tipo, m) {
  const bad = unsolvedOf(tipo, m);
  return bad.length === 1 && ownPiece(tipo, bad[0]) ? pieceClass(m, bad[0]) : null;
}

// ---------------------------------------------------------------------------
// s2l-alto: pieza objetivo y piezas libres declaradas
// ---------------------------------------------------------------------------

const claveHome = (p) => p.home.join('-');

/** Piezas bajo la capa U (aristas y esquinas) que un algoritmo cambia al aplicarlo al puzzle resuelto. */
export function piezasBajoUCambiadas(moves) {
  const m = new MegaminxModel().applyMoves(moves);
  return m.pieces.filter((p) => p.kind >= 2 && !p.home.includes('U') && !m.isPieceSolved(p)).map(claveHome).sort();
}

/** Piezas de la etapa `tipo` (acumulada) que un algoritmo cambia al aplicarlo al puzzle resuelto. */
export function piezasEtapaCambiadas(tipo, moves) {
  const m = new MegaminxModel().applyMoves(moves);
  return stagePieces(tipo, m).filter((p) => !m.isPieceSolved(p)).map(claveHome).sort();
}

/** Pieza de `state` con esas caras de origen. */
export const piezaPorHome = (state, home) => state.pieces.find((p) => p.home.length === home.length && home.every((f) => p.home.includes(f)));

/** Clase de un caso de s2l-alto: la pieza objetivo como en las demás etapas, más las piezas libres. */
export function altoClass(state, pieza, libres) {
  const p = piezaPorHome(state, pieza);
  return p ? pieceClass(state, p) + (libres.length ? ` libres=${libres.join(',')}` : '') : null;
}
