// firmas.mjs (2x2) — Objetivos de etapa y «firmas» de casos del 2x2. No hay centros: el
// marco de referencia es la esquina inferior-trasera-izquierda (CubeModel.frame()), y todo
// se lee por colores de pegatina.

import { CubeModel, parseAlg, invertMoves, matVec, faceOfNormal } from '../../../js/cube-model.js';

// Esquinas de una capa en sentido horario visto desde arriba: atrás-izq, atrás-der, frente-der, frente-izq.
const RING = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
const posOf = (m, y, [x, z]) => [x * m.h, y * m.h, z * m.h];

/** Estado del caso: resuelto + inverso del algoritmo. */
export const caseState = (moves) => new CubeModel(2).applyMoves(invertMoves(moves));

const layerSolved = (m, y) => m.slots().every((s) => s.pos[1] * y <= 0 || s.color === s.face);
export const firstLayerSolved = (m) => layerSolved(m, -1);
export const faceSolved = (m, face) => m.slots().every((s) => s.face !== face || s.color === face);
export const solved = (m) => m.stickersSolved();

/** Torsión (0, 1, 2) de cada esquina de la capa superior, en sentido horario, según dónde mira su pegatina U. */
export function topTwists(m) {
  return RING.map(([sx, sz]) => {
    const p = m.pieceAt(posOf(m, 1, [sx, sz]));
    const facing = faceOfNormal(matVec(p.rot, [0, 1, 0]));
    if (facing === 'U') return 0;
    const parity = sx * sz; // con y = +1
    const xFace = sx > 0 ? 'R' : 'L';
    return (facing === xFace) === (parity > 0) ? 1 : 2;
  });
}

const rotations = (arr) => arr.map((_, k) => arr.map((_, i) => arr[(i + k) % arr.length]));

/** Clase de orientación de la capa superior, sin depender del giro de U: "0120" … */
export function ollClass(m) {
  const t = topTwists(m);
  return rotations(t).map((r) => r.join('')).sort()[0];
}

export const ollOriented = (m) => topTwists(m).every((t) => t === 0);

/** Permutación de una capa: para cada hueco, el índice (en RING) del hueco de origen de su pieza. */
function layerPerm(m, y) {
  return RING.map((c) => {
    const p = m.pieceAt(posOf(m, y, c));
    return RING.findIndex(([x, z]) => x * m.h === p.home[0] && z * m.h === p.home[2]);
  });
}

/** 'solved', 'adj' (intercambio de esquinas adyacentes) o 'diag' según la clase de la permutación. */
function layerClass(perm) {
  const shifts = [0, 1, 2, 3];
  const orbit = new Set();
  for (const a of shifts) for (const b of shifts) orbit.add(perm.map((_, i) => (perm[(i + a) % 4] + b) % 4).join(''));
  if (orbit.has('0123')) return 'solved';
  return orbit.has('0321') ? 'diag' : 'adj';
}

/** Clase de permutación de una capa (0 abajo, 1 arriba) o null si hay piezas de la otra capa. */
export function pblClasses(m) {
  const perms = [-1, 1].map((y) => layerPerm(m, y));
  if (perms.some((p) => p.includes(-1))) return null;
  return perms.map(layerClass);
}

/** Firma PBL sin orden: las dos capas son intercambiables dando la vuelta al cubo. */
export function pblSignature(m) {
  const c = pblClasses(m);
  return c ? c.slice().sort().join('+') : null;
}

export function goalReached(tipo, m) {
  switch (tipo) {
    case 'capa1':
      return firstLayerSolved(m);
    case 'cara':
      return faceSolved(m, 'D');
    case 'oll':
      return firstLayerSolved(m) && faceSolved(m, 'U');
    case 'pll':
    case 'pbl':
      return solved(m);
    default:
      throw new Error(`Tipo de etapa desconocido: ${tipo}`);
  }
}

export { parseAlg };
