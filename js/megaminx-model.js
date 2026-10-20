// megaminx-model.js — Estado lógico del Megaminx, independiente de la capa visual.
//
// Cada pieza guarda su hueco de origen (`slot`, 0..61), su hueco actual (`pos`) y su
// orientación (`rot`, índice 0..59 en el grupo de rotaciones del icosaedro). Un movimiento
// es "girar 72° las piezas cuyo hueco pertenece a una cara". Siempre se cumple
// pos === SLOT_ACT[rot][slot], así que `rot` basta para saber dónde está cada pegatina.
//
// Convención de sentido (ver megaminx-geometry.js): q se mide en unidades de 72° con la
// regla de la mano derecha alrededor de la normal saliente de la cara. Un giro horario
// visto desde fuera es q negativo, igual que en CubeModel.

import {
  FACES, FACE_INDEX, NORMALS, SLOTS, LAYER, MUL, INV, FACE_ACT, SLOT_ACT, TURN, FRAME,
} from './megaminx-geometry.js';

// ---------------------------------------------------------------------------
// Notación
// ---------------------------------------------------------------------------

// Las caras de dos letras van primero para que "BR" no se lea como "B" y "R".
// Los movimientos se separan con espacios: "B R" son dos movimientos y "BR" es una cara.
const TOKEN = /^(DBR|DBL|BR|BL|DR|DL|[UFRLDB]|y)(2?)('?)/;

/**
 * Convierte un token ("R", "U2", "BR'", "DBL2'", "y"…) en un movimiento
 * { face, q, whole, base, amount, prime, text }. X es 72° horarios, X2 son 144°
 * horarios y el apóstrofo invierte el sentido (X2' = 144° antihorarios).
 * "y" gira el puzzle entero alrededor de U.
 */
export function parseMove(token) {
  const m = TOKEN.exec(token);
  if (!m || m[0].length !== token.length) throw new Error(`Movimiento no reconocido: "${token}"`);
  const [, letter, amountTxt, primeTxt] = m;
  const whole = letter === 'y';
  return makeMove({
    face: whole ? 'U' : letter,
    whole,
    base: letter,
    amount: amountTxt ? 2 : 1,
    prime: primeTxt === "'",
  });
}

function makeMove({ face, whole, base, amount, prime, ...rest }) {
  // Horario = q negativo.
  const q = -amount * (prime ? -1 : 1);
  const text = base + (amount === 2 ? '2' : '') + (prime ? "'" : '');
  return { ...rest, face, whole, base, amount, prime, q, text };
}

export function invertMove(m) {
  return makeMove({ ...m, prime: !m.prime });
}

export function invertMoves(moves) {
  return moves
    .slice()
    .reverse()
    .map((m) => ({ ...invertMove(m), group: m.group }));
}

/**
 * Analiza un algoritmo. Los paréntesis agrupan movimientos y admiten repetición:
 * "(R U R' U')6". Devuelve la lista de movimientos; cada uno lleva `group` (índice de grupo).
 */
export function parseAlg(text) {
  const src = String(text || '')
    .replace(/[’‘`´]/g, "'")
    .replace(/[\[{]/g, '(')
    .replace(/[\]}]/g, ')');
  const moves = [];
  let group = 0;
  let groupStart = 0; // índice en `moves` donde empieza el grupo actual
  let inParens = false;
  let i = 0;
  const closeGroup = () => {
    if (moves.length > groupStart) {
      group++;
      groupStart = moves.length;
    }
  };
  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === ',' || c === '\t' || c === '\n' || c === '\r') {
      i++;
    } else if (c === '(') {
      closeGroup();
      inParens = true;
      i++;
    } else if (c === ')') {
      i++;
      let rep = '';
      while (i < src.length && src[i] >= '0' && src[i] <= '9') rep += src[i++];
      if (inParens && rep) {
        const body = moves.slice(groupStart);
        for (let k = 1; k < Number(rep); k++) body.forEach((b) => moves.push({ ...b }));
      }
      inParens = false;
      closeGroup();
    } else {
      const m = TOKEN.exec(src.slice(i));
      if (!m) throw new Error(`Notación no reconocida en "${text}" (posición ${i + 1})`);
      const move = parseMove(m[0]);
      move.group = group;
      moves.push(move);
      i += m[0].length;
    }
  }
  return moves;
}

export function movesToString(moves) {
  return moves.map((m) => m.text).join(' ');
}

// ---------------------------------------------------------------------------
// Modelo
// ---------------------------------------------------------------------------

export class MegaminxModel {
  constructor() {
    this.pieces = SLOTS.map((s, i) => ({
      home: s.faces.slice(),
      slot: i,
      pos: i,
      rot: 0,
      kind: s.faces.length, // 1 centro, 2 arista, 3 esquina
    }));
  }

  /** Radianes por unidad de `q`: un giro de 72°. */
  get unit() {
    return (2 * Math.PI) / 5;
  }

  /** Eje unitario [x, y, z] del giro: la normal saliente de la cara (q > 0 es antihorario). */
  axisVector(move) {
    return NORMALS[FACE_INDEX[move.face]];
  }

  /** Secuencia inversa (conserva la anotación `group`). */
  invertMoves(moves) {
    return invertMoves(moves);
  }

  reset() {
    for (const p of this.pieces) {
      p.pos = p.slot;
      p.rot = 0;
    }
    return this;
  }

  clone() {
    const c = Object.create(MegaminxModel.prototype);
    c.pieces = this.pieces.map((p) => ({ home: p.home, slot: p.slot, pos: p.pos, rot: p.rot, kind: p.kind }));
    return c;
  }

  copyFrom(other) {
    this.pieces.forEach((p, i) => {
      p.pos = other.pieces[i].pos;
      p.rot = other.pieces[i].rot;
    });
    return this;
  }

  /** Piezas afectadas por un movimiento en el estado actual. */
  piecesInMove(move) {
    if (move.whole) return this.pieces.slice();
    const layer = LAYER[FACE_INDEX[move.face]];
    return this.pieces.filter((p) => layer.includes(p.pos));
  }

  applyMove(move) {
    const t = TURN[FACE_INDEX[move.face]][((move.q % 5) + 5) % 5];
    for (const p of this.piecesInMove(move)) {
      p.rot = MUL[t][p.rot];
      p.pos = SLOT_ACT[t][p.pos];
    }
    return this;
  }

  applyMoves(moves) {
    for (const m of moves) this.applyMove(m);
    return this;
  }

  applyAlg(text) {
    return this.applyMoves(parseAlg(text));
  }

  pieceAt(pos) {
    return this.pieces.find((p) => p.pos === pos) || null;
  }

  /**
   * Pegatina visible en el hueco `slot` mirando hacia la cara `face` (nombre).
   * Devuelve { piece, face } donde `face` es la cara de origen de esa pegatina
   * (su color), o null si ahí no hay pegatina.
   */
  stickerAt(slot, face) {
    const piece = this.pieceAt(slot);
    if (!piece || !SLOTS[slot].faces.includes(face)) return null;
    const homeFace = FACE_ACT[INV[piece.rot]][FACE_INDEX[face]];
    if (!SLOTS[piece.slot].faceIdx.includes(homeFace)) return null;
    return { piece, face: FACES[homeFace] };
  }

  /** Los centros fijan la orientación: las pegatinas se leen respecto de ellos. */
  isPieceSolved(piece) {
    return piece.kind === 1 ? piece.pos === piece.slot : piece.rot === 0;
  }

  kind(piece) {
    return piece.kind;
  }

  /** Rotación global del puzzle (índice del grupo), deducida de dónde están los centros U y F. */
  frame() {
    return FRAME[this.pieces[0].pos * 12 + this.pieces[1].pos];
  }

  /** Deshace la rotación global: deja los centros en su sitio. */
  normalize() {
    const inv = INV[this.frame()];
    for (const p of this.pieces) {
      p.rot = MUL[inv][p.rot];
      p.pos = SLOT_ACT[inv][p.pos];
    }
    return this;
  }

  /** Resuelto salvo rotación del puzzle entero. */
  isSolved() {
    const n = this.clone().normalize();
    return n.pieces.every((p) => n.isPieceSolved(p));
  }
}
