// firmas.mjs — "Firmas" de casos del 3x3: identifican un caso con independencia
// del algoritmo usado para resolverlo, del ajuste previo de la capa superior (AUF)
// y del ángulo desde el que se mira. Dos algoritmos resuelven el mismo caso si y
// solo si sus firmas coinciden.

import { CubeModel, parseAlg, invertMoves, quarterTurns, matVec, faceOfNormal } from '../../../js/cube-model.js';

const U = parseAlg('U')[0];

export const kind = (p) => p.home.filter((v) => v !== 0).length; // 3 esquina, 2 arista, 1 centro
export const isCorner = (p) => kind(p) === 3;
export const isEdge = (p) => kind(p) === 2;

/** Estado del caso: resuelto + inverso del algoritmo, con los centros recolocados. */
export function caseState(moves) {
  return new CubeModel(3).applyMoves(invertMoves(moves)).normalize();
}

export const crossSolved = (m) => m.pieces.every((p) => !(isEdge(p) && p.home[1] === -1) || m.isPieceSolved(p));
export const firstLayerSolved = (m) => m.pieces.every((p) => p.home[1] !== -1 || m.isPieceSolved(p));
export const f2lSolved = (m) => m.pieces.every((p) => p.home[1] === 1 || m.isPieceSolved(p));

const LL_GRID = [];
for (let z = -1; z <= 1; z++) for (let x = -1; x <= 1; x++) LL_GRID.push([x, 1, z]);

/** Hacia qué cara apunta la pegatina amarilla de cada pieza de la última capa. */
export function ollPattern(m) {
  return LL_GRID.map((pos) => faceOfNormal(matVec(m.pieceAt(pos).rot, [0, 1, 0]))).join('');
}

export const llOriented = (m) => ollPattern(m) === 'UUUUUUUUU';

export function ollSignature(moves) {
  const s = caseState(moves);
  if (!f2lSolved(s)) return null;
  let best = null;
  for (let k = 0; k < 4; k++) {
    const p = ollPattern(s);
    if (best === null || p < best) best = p;
    s.applyMove(U);
  }
  return best === 'UUUUUUUUU' ? null : best;
}

function llPermString(m) {
  return LL_GRID.map((pos) => {
    const p = m.pieceAt(pos);
    return `${p.home[0]}${p.home[2]}`;
  }).join(',');
}

export function pllSignature(moves) {
  const inv = invertMoves(moves);
  let best = null;
  for (let i = 0; i < 4; i++) {
    const s = new CubeModel(3);
    for (let k = 0; k < i; k++) s.applyMove(U);
    s.applyMoves(inv).normalize();
    if (!f2lSolved(s) || !llOriented(s)) return null;
    for (let j = 0; j < 4; j++) {
      const str = llPermString(s);
      if (best === null || str < best) best = str;
      s.applyMove(U);
    }
  }
  return best === llPermString(new CubeModel(3)) ? null : best;
}

export const SLOTS = [
  [1, 1],
  [-1, 1],
  [-1, -1],
  [1, -1],
]; // FR, FL, BL, BR  (x, z)

export function slotSolved(m, [x, z]) {
  return m.isPieceSolved(m.pieceByHome([x, -1, z])) && m.isPieceSolved(m.pieceByHome([x, 0, z]));
}

/**
 * Firma F2L: posición y orientación de la esquina y la arista del hueco sin
 * resolver, llevado a la posición frente-derecha y normalizado respecto de U.
 * Exige cruz resuelta y exactamente un hueco sin resolver.
 */
export function f2lSignature(moves) {
  const s = caseState(moves);
  if (!crossSolved(s)) return null;
  const open = SLOTS.filter((sl) => !slotSolved(s, sl));
  if (open.length !== 1) return null;
  for (let k = 0; k < 4; k++) {
    const c = s.clone().conjugate(quarterTurns(1, k));
    if (!slotSolved(c, SLOTS[0])) {
      let best = null;
      for (let j = 0; j < 4; j++) {
        const corner = c.pieceByHome([1, -1, 1]);
        const edge = c.pieceByHome([1, 0, 1]);
        const str = [corner.pos, corner.rot, edge.pos, edge.rot].map((a) => a.join('')).join('|');
        if (best === null || str < best) best = str;
        c.applyMove(U);
      }
      return { key: best, slot: open[0] };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Formas y objetivos por tipo de etapa
// ---------------------------------------------------------------------------

// Posiciones de la última capa en sentido horario visto desde arriba.
export const LL_CORNERS = [
  [-1, 1, -1],
  [1, 1, -1],
  [1, 1, 1],
  [-1, 1, 1],
]; // atrás-izq, atrás-der, frente-der, frente-izq
export const LL_EDGES = [
  [0, 1, -1],
  [1, 1, 0],
  [0, 1, 1],
  [-1, 1, 0],
]; // atrás, derecha, frente, izquierda  (la arista i está entre las esquinas i e i+1)

const FACE_VECTORS = { U: [0, 1, 0], D: [0, -1, 0], R: [1, 0, 0], L: [-1, 0, 0], F: [0, 0, 1], B: [0, 0, -1] };
const same = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
export const indexIn = (list, pos) => list.findIndex((p) => same(p, pos));
const isUp = (m, pos) => m.pieceAt(pos).rot[4] === 1;

/** Índices (en LL_EDGES) de las aristas de la última capa ya orientadas. */
export const orientedEdges = (m) => LL_EDGES.map((p, i) => (isUp(m, p) ? i : -1)).filter((i) => i >= 0);
export const orientedCorners = (m) => LL_CORNERS.map((p, i) => (isUp(m, p) ? i : -1)).filter((i) => i >= 0);

export function eollShape(m) {
  const o = orientedEdges(m);
  if (o.length === 4) return 'hecha';
  if (o.length === 0) return 'punto';
  if (o.length === 2) return (o[1] - o[0]) % 2 === 0 ? 'linea' : 'L';
  return null;
}

/** Lados (índices de LL_EDGES) con "faros": dos esquinas en el orden relativo correcto. */
export function headlights(m) {
  const out = [];
  for (let i = 0; i < 4; i++) {
    const a = indexIn(LL_CORNERS, m.pieceAt(LL_CORNERS[i]).home);
    const b = indexIn(LL_CORNERS, m.pieceAt(LL_CORNERS[(i + 1) % 4]).home);
    if (b === (a + 1) % 4) out.push(i);
  }
  return out;
}

export function cpllShape(m) {
  const n = headlights(m).length;
  return n === 4 ? 'hecha' : n === 1 ? 'adyacente' : n === 0 ? 'diagonal' : null;
}

/** Lados con barra completa: dos esquinas y su arista en el orden relativo correcto. */
export function bars(m) {
  return headlights(m).filter((i) => {
    const a = indexIn(LL_CORNERS, m.pieceAt(LL_CORNERS[i]).home);
    return indexIn(LL_EDGES, m.pieceAt(LL_EDGES[i]).home) === a;
  });
}

const llCornersSolved = (m) => LL_CORNERS.every((p) => m.isPieceSolved(m.pieceAt(p)));

/** ¿El estado `m` cumple el objetivo de una etapa de tipo `tipo`? */
export function goalReached(tipo, m) {
  switch (tipo) {
    case 'cruz':
      return crossSolved(m);
    case 'capa1':
      return firstLayerSolved(m);
    case 'capa2':
    case 'f2l':
      return f2lSolved(m);
    case 'eoll':
      return f2lSolved(m) && eollShape(m) === 'hecha';
    case 'oll':
    case 'ocll':
      return f2lSolved(m) && llOriented(m);
    case 'cpll':
      return f2lSolved(m) && llOriented(m) && llCornersSolved(m);
    case 'pll':
    case 'epll':
      return m.pieces.every((p) => m.isPieceSolved(p));
    default:
      throw new Error(`Tipo de etapa desconocido: ${tipo}`);
  }
}

/** Cara hacia la que mira la pegatina `pegatina` (cara de origen) de una pieza. */
export const stickerFacing = (piece, pegatina) => faceOfNormal(matVec(piece.rot, FACE_VECTORS[pegatina]));

/** ¿La pegatina `pegatina` de la pieza `pieza` está en `pos` mirando hacia `cara`? */
export function stickerIs(m, { pieza, pos, pegatina, cara }) {
  const p = m.pieceByHome(pieza);
  return same(p.pos, pos) && stickerFacing(p, pegatina) === cara;
}

/** Reflejo izquierda-derecha de una secuencia (solo geometría; sirve para firmas). */
export function mirrorMoves(moves) {
  return moves.map((m) => (m.axis === 0 ? { ...m, lo: -m.hi, hi: -m.lo } : { ...m, q: -m.q, dir: -m.dir }));
}
