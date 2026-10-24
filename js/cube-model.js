// cube-model.js — Estado lógico del cubo, independiente de la capa visual.
//
// Cada pieza (cubie) guarda su posición de origen (`home`), su posición actual
// (`pos`) y su orientación (`rot`, matriz de rotación 3x3 entera). Un movimiento
// es "girar 90° alrededor de un eje todas las piezas cuya coordenada en ese eje
// está en un rango". Esa definición no depende del tamaño, así que el mismo
// modelo sirve para 2x2, 4x4, etc.
//
// Ejes: +x = derecha (R), +y = arriba (U), +z = frente (F).
// Las coordenadas están centradas: en un 3x3 valen -1, 0, 1; en un 4x4, ±0.5 y ±1.5.

export const FACES = {
  U: { axis: 1, sign: 1 },
  D: { axis: 1, sign: -1 },
  R: { axis: 0, sign: 1 },
  L: { axis: 0, sign: -1 },
  F: { axis: 2, sign: 1 },
  B: { axis: 2, sign: -1 },
};
export const FACE_NAMES = ['U', 'D', 'R', 'L', 'F', 'B'];

// Base (derecha, abajo) de cada cara vista desde fuera; define el orden de lectura
// de las pegatinas en `faceGrid`.
const FACE_BASIS = {
  U: { right: [1, 0, 0], down: [0, 0, 1] },
  D: { right: [1, 0, 0], down: [0, 0, -1] },
  F: { right: [1, 0, 0], down: [0, -1, 0] },
  B: { right: [-1, 0, 0], down: [0, -1, 0] },
  R: { right: [0, 0, -1], down: [0, -1, 0] },
  L: { right: [0, 0, 1], down: [0, -1, 0] },
};

export const IDENTITY = Object.freeze([1, 0, 0, 0, 1, 0, 0, 0, 1]);

// Rotación de +90° (regla de la mano derecha) alrededor de x, y, z.
const ROT90 = [
  [1, 0, 0, 0, 0, -1, 0, 1, 0],
  [0, 0, 1, 0, 1, 0, -1, 0, 0],
  [0, -1, 0, 1, 0, 0, 0, 0, 1],
];

export function matMul(a, b) {
  const r = new Array(9);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
    }
  }
  return r;
}

export function matVec(m, v) {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

export function transpose(m) {
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
}

/** Matriz de rotación de `q` cuartos de vuelta (+90° cada uno) alrededor de `axis`. */
export function quarterTurns(axis, q) {
  let m = IDENTITY;
  const n = ((q % 4) + 4) % 4;
  for (let i = 0; i < n; i++) m = matMul(ROT90[axis], m);
  return m;
}

export function faceNormal(face) {
  const { axis, sign } = FACES[face];
  const n = [0, 0, 0];
  n[axis] = sign;
  return n;
}

export function faceOfNormal(n) {
  for (const f of FACE_NAMES) {
    const { axis, sign } = FACES[f];
    if (n[axis] === sign) return f;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Notación
// ---------------------------------------------------------------------------

// Sentido base de cada letra, en cuartos de vuelta positivos alrededor de su eje.
// Horario visto desde +eje equivale a -90°.
const BASE = {
  R: { axis: 0, side: 1, dir: -1 },
  L: { axis: 0, side: -1, dir: 1 },
  U: { axis: 1, side: 1, dir: -1 },
  D: { axis: 1, side: -1, dir: 1 },
  F: { axis: 2, side: 1, dir: -1 },
  B: { axis: 2, side: -1, dir: 1 },
  M: { axis: 0, slice: true, dir: 1 }, // como L
  E: { axis: 1, slice: true, dir: 1 }, // como D
  S: { axis: 2, slice: true, dir: -1 }, // como F
  x: { axis: 0, whole: true, dir: -1 }, // como R
  y: { axis: 1, whole: true, dir: -1 }, // como U
  z: { axis: 2, whole: true, dir: -1 }, // como F
};

// Prefijos admitidos: profundidad ("3Rw"), capa interior sola ("2R") y rango de capas ("2-3Rw").
const TOKEN = /^(?:(\d+)-(\d+)|(\d*))([UDLRFBMESxyzudlrfb])(w?)([23]?)('?)/;

/**
 * Convierte un token ("R", "U2", "r'", "Rw", "3Rw2", "2R", "2-3Rw", "M'", "x"…) en un movimiento
 * { axis, lo, hi, q, base, amount, prime, text } para un cubo de tamaño `size`.
 *
 * Capas: se numeran desde la cara del giro (1 = la exterior). "Rw" y "r" giran las dos
 * primeras; "3Rw", las tres primeras; "2R", solo la segunda; "2-3Rw", de la segunda a la
 * tercera. Convención de minúsculas: en todos los tamaños "r" equivale a "Rw" (dos capas).
 * M, E y S solo existen en tamaños impares.
 */
export function parseMove(token, size = 3) {
  const m = TOKEN.exec(token);
  if (!m || m[0].length !== token.length) throw new Error(`Movimiento no reconocido: "${token}"`);
  const [, rangeFrom, rangeTo, depthTxt, rawLetter, w, amountTxt, primeTxt] = m;
  const h = (size - 1) / 2;
  const lower = rawLetter >= 'a' && rawLetter <= 'z' && !'xyz'.includes(rawLetter);
  const letter = lower ? rawLetter.toUpperCase() : rawLetter;
  const def = BASE[letter];
  const wide = lower || w === 'w';
  const bad = () => new Error(`Movimiento no reconocido: "${token}"`);
  const faceTurn = !def.slice && !def.whole;
  if (wide && !faceTurn) throw bad();
  if ((depthTxt || rangeFrom) && !faceTurn) throw bad();

  let lo;
  let hi;
  let from = 1;
  let to = 1;
  if (def.whole) {
    lo = -h;
    hi = h;
  } else if (def.slice) {
    if (size % 2 === 0) throw new Error(`"${token}" no existe en un cubo ${size}x${size}`);
    lo = -h + 1;
    hi = h - 1;
    if (lo > hi) throw new Error(`"${token}" no existe en un cubo ${size}x${size}`);
  } else {
    if (rangeFrom) {
      from = Number(rangeFrom);
      to = Number(rangeTo);
    } else if (wide) {
      to = Math.max(2, Number(depthTxt) || 2);
    } else if (depthTxt) {
      from = to = Number(depthTxt);
    }
    if (from < 1 || from > to || to > size) throw new Error(`"${token}" no existe en un cubo ${size}x${size}`);
    if (wide && to - from + 1 >= size) throw new Error(`"${token}" gira el cubo entero en un ${size}x${size}: usa x, y o z`);
    if (def.side > 0) {
      hi = h - (from - 1);
      lo = h - (to - 1);
    } else {
      lo = -h + (from - 1);
      hi = -h + (to - 1);
    }
  }

  const amount = amountTxt ? Number(amountTxt) : 1;
  const prime = primeTxt === "'";
  let base;
  if (!faceTurn) base = letter;
  else if (from === 1 && to === 1) base = letter;
  else if (from === to) base = `${from}${letter}`;
  else if (from === 1) base = size <= 3 ? (to > 2 ? to : '') + letter.toLowerCase() : (to > 2 ? to : '') + letter + 'w';
  else base = `${from}-${to}${letter}w`;
  const info = faceTurn ? { face: letter, from, to } : {};
  return makeMove({ axis: def.axis, lo, hi, dir: def.dir, base, amount, prime, ...info });
}

function makeMove({ axis, lo, hi, dir, base, amount, prime, ...rest }) {
  // 3 cuartos = 1 cuarto en sentido contrario.
  if (amount === 3) {
    amount = 1;
    prime = !prime;
  }
  const q = dir * amount * (prime ? -1 : 1);
  const text = base + (amount === 2 ? '2' : prime ? "'" : '');
  return { ...rest, axis, lo, hi, dir, base, amount, prime, q, text };
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
 * Analiza un algoritmo en notación estándar. Los paréntesis agrupan movimientos
 * (cada grupo puede llevar una nota explicativa) y admiten repetición: "(R U R' U')3".
 * Devuelve la lista de movimientos; cada uno lleva `group` (índice de grupo).
 */
export function parseAlg(text, size = 3) {
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
      const move = parseMove(m[0], size);
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

const FACE_LETTERS = [['L', 'R'], ['D', 'U'], ['B', 'F']];

/**
 * Reescribe una secuencia solo con giros de caras (R, U2, y Rw en cubos grandes): sin
 * rotaciones (x, y, z) ni capas centrales (M, E, S). Cada giro se cambia por su equivalente
 * con las capas del lado contrario (r = L x, M = R L' x') y la rotación sobrante no se hace:
 * se recuerda en `frame` para renombrar los giros siguientes. Los centros no se mueven, así
 * que el resultado deja el mismo estado salvo una rotación del cubo completo. Conserva `group`.
 */
export function toFaceTurns(moves, size = 3) {
  const h = (size - 1) / 2;
  let frame = IDENTITY; // de los ejes del algoritmo a los del cubo quieto
  const turns = []; // { axis, lo, hi, q, group }

  const push = (axis, lo, hi, q, group) => {
    const last = turns[turns.length - 1];
    if (last && last.group === group && last.axis === axis && last.lo === lo && last.hi === hi) {
      last.q += q;
      if (last.q % 4 === 0) turns.pop();
    } else if (q % 4 !== 0) {
      turns.push({ axis, lo, hi, q, group });
    }
  };

  // Gira las capas [lo, hi] del eje `axis` del cubo quieto `q` cuartos.
  const turn = (axis, lo, hi, q, group) => {
    if (lo === -h && hi === h) {
      frame = matMul(quarterTurns(axis, -q), frame);
    } else if (lo > -h && hi < h) {
      // Capas interiores: bloque hasta la cara más cercana menos su parte exterior.
      if (lo + hi >= 0) {
        turn(axis, lo, h, q, group);
        turn(axis, hi + 1, h, -q, group);
      } else {
        turn(axis, -h, hi, q, group);
        turn(axis, -h, lo - 1, -q, group);
      }
    } else if (hi - lo + 1 > size - (hi - lo + 1)) {
      // Más de la mitad del cubo: se giran las capas restantes al revés y el cubo entero.
      if (hi === h) push(axis, -h, lo - 1, -q, group);
      else push(axis, hi + 1, h, -q, group);
      frame = matMul(quarterTurns(axis, -q), frame);
    } else {
      push(axis, lo, hi, q, group);
    }
  };

  for (const m of moves) {
    const v = matVec(frame, AXIS_UNIT[m.axis]);
    const axis = v.findIndex((c) => c !== 0);
    const s = v[axis];
    if (s > 0) turn(axis, m.lo, m.hi, m.q, m.group);
    else turn(axis, -m.hi, -m.lo, -m.q, m.group);
  }

  return turns.map(({ axis, lo, hi, q, group }) => {
    const side = hi === h ? 1 : 0;
    const letter = FACE_LETTERS[axis][side];
    const depth = hi - lo + 1;
    const k = (((q * BASE[letter].dir) % 4) + 4) % 4;
    const token = (depth === 1 ? letter : `${depth > 2 ? depth : ''}${letter}w`) + ['', '', '2', "'"][k];
    return { ...parseMove(token, size), group };
  });
}

// ---------------------------------------------------------------------------
// Modelo
// ---------------------------------------------------------------------------

const AXIS_UNIT = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

export class CubeModel {
  constructor(size = 3) {
    this.size = size;
    this.h = (size - 1) / 2;
    this.pieces = [];
    const h = this.h;
    for (let x = -h; x <= h; x++) {
      for (let y = -h; y <= h; y++) {
        for (let z = -h; z <= h; z++) {
          // Solo las piezas de la superficie existen.
          if (Math.abs(x) !== h && Math.abs(y) !== h && Math.abs(z) !== h) continue;
          this.pieces.push({ home: [x, y, z], pos: [x, y, z], rot: IDENTITY.slice() });
        }
      }
    }
  }

  /** Radianes por unidad de `q`: en un cubo, cuartos de vuelta. */
  get unit() {
    return Math.PI / 2;
  }

  /** Eje unitario [x, y, z] alrededor del cual se mide el giro de un movimiento. */
  axisVector(move) {
    return AXIS_UNIT[move.axis];
  }

  /** Secuencia inversa (conserva la anotación `group`). */
  invertMoves(moves) {
    return invertMoves(moves);
  }

  reset() {
    for (const p of this.pieces) {
      p.pos = p.home.slice();
      p.rot = IDENTITY.slice();
    }
    return this;
  }

  clone() {
    const c = Object.create(CubeModel.prototype);
    c.size = this.size;
    c.h = this.h;
    c.pieces = this.pieces.map((p) => ({ home: p.home, pos: p.pos.slice(), rot: p.rot.slice() }));
    return c;
  }

  copyFrom(other) {
    this.pieces.forEach((p, i) => {
      p.pos = other.pieces[i].pos.slice();
      p.rot = other.pieces[i].rot.slice();
    });
    return this;
  }

  /** Piezas afectadas por un movimiento en el estado actual. */
  piecesInMove(move) {
    return this.pieces.filter((p) => p.pos[move.axis] >= move.lo && p.pos[move.axis] <= move.hi);
  }

  applyMove(move) {
    const m = quarterTurns(move.axis, move.q);
    for (const p of this.pieces) {
      if (p.pos[move.axis] < move.lo || p.pos[move.axis] > move.hi) continue;
      p.pos = matVec(m, p.pos);
      p.rot = matMul(m, p.rot);
    }
    return this;
  }

  applyMoves(moves) {
    for (const m of moves) this.applyMove(m);
    return this;
  }

  applyAlg(text) {
    return this.applyMoves(parseAlg(text, this.size));
  }

  pieceAt(pos) {
    return this.pieces.find((p) => p.pos[0] === pos[0] && p.pos[1] === pos[1] && p.pos[2] === pos[2]) || null;
  }

  pieceByHome(home) {
    return this.pieces.find((p) => p.home[0] === home[0] && p.home[1] === home[1] && p.home[2] === home[2]) || null;
  }

  /**
   * Pegatina visible en la posición `pos` mirando hacia la cara `face`.
   * Devuelve { piece, face } donde `face` es la cara de origen de esa pegatina
   * (es decir, su color), o null si ahí no hay pegatina.
   */
  stickerAt(pos, face) {
    const piece = this.pieceAt(pos);
    if (!piece) return null;
    const homeFace = faceOfNormal(matVec(transpose(piece.rot), faceNormal(face)));
    const { axis, sign } = FACES[homeFace];
    if (piece.home[axis] !== sign * this.h) return null;
    return { piece, face: homeFace };
  }

  /** Cuadrícula size×size de pegatinas de una cara, en orden de lectura visto desde fuera. */
  faceGrid(face) {
    const { right, down } = FACE_BASIS[face];
    const n = faceNormal(face);
    const h = this.h;
    const grid = [];
    for (let r = 0; r < this.size; r++) {
      const row = [];
      for (let c = 0; c < this.size; c++) {
        const pos = [0, 1, 2].map((k) => n[k] * h + right[k] * (c - h) + down[k] * (r - h));
        row.push(this.stickerAt(pos, face));
      }
      grid.push(row);
    }
    return grid;
  }

  /** Resuelto salvo rotación del cubo completo: cada cara muestra un solo color. */
  isSolved() {
    return FACE_NAMES.every((f) => {
      const cells = this.faceGrid(f).flat();
      return cells.every((s) => s.face === cells[0].face);
    });
  }

  /**
   * Rotación global del cubo respecto de la orientación de origen. En tamaños impares
   * la fijan los centros. En los pares no hay centros fijos: se usa la esquina
   * inferior-trasera-izquierda como pieza de referencia, cuyo giro acumulado es el del
   * cubo. Es un marco válido aunque esa esquina se haya movido con L, B, D, Lw… (la
   * posición y el giro de una pieza siempre cambian juntos): normalize() deja el estado
   * descrito respecto de esa pieza, así que L queda igual que R en un 2x2.
   */
  frame() {
    const h = this.h;
    if (this.size % 2 === 0) return this.pieceByHome([-h, -h, -h]).rot.slice();
    // Se deduce de la posición de los centros R, U y F (su giro sobre sí mismos no cuenta).
    const cx = this.pieceByHome([h, 0, 0]).pos;
    const cy = this.pieceByHome([0, h, 0]).pos;
    const cz = this.pieceByHome([0, 0, h]).pos;
    return [cx[0], cy[0], cz[0], cx[1], cy[1], cz[1], cx[2], cy[2], cz[2]].map((v) => v / h);
  }

  /** Deshace la rotación global: deja los centros en su sitio. */
  normalize() {
    return this.rotateWhole(transpose(this.frame()));
  }

  /** Gira el cubo completo con la matriz `m`. */
  rotateWhole(m) {
    for (const p of this.pieces) {
      p.pos = matVec(m, p.pos);
      p.rot = matMul(m, p.rot);
    }
    return this;
  }

  /**
   * Reetiqueta el estado bajo una simetría de rotación `m`: el resultado es el
   * mismo caso "visto desde otro lado", con los centros en su sitio.
   */
  conjugate(m) {
    const mt = transpose(m);
    const moved = this.pieces.map((p) => ({
      home: matVec(m, p.home),
      pos: matVec(m, p.pos),
      rot: matMul(matMul(m, p.rot), mt),
    }));
    for (const p of this.pieces) {
      const src = moved.find((q) => q.home[0] === p.home[0] && q.home[1] === p.home[1] && q.home[2] === p.home[2]);
      p.pos = src.pos;
      p.rot = src.rot;
    }
    return this;
  }

  /**
   * Una pieza está resuelta si está en su sitio y cada una de sus pegatinas mira
   * hacia su cara. (El giro de un centro sobre sí mismo no se distingue.)
   */
  isPieceSolved(piece) {
    for (let k = 0; k < 3; k++) {
      if (piece.pos[k] !== piece.home[k]) return false;
    }
    for (let k = 0; k < 3; k++) {
      if (Math.abs(piece.home[k]) !== this.h) continue;
      // La columna k de rot es la imagen del eje k.
      if (piece.rot[k * 4] !== 1) return false;
    }
    return true;
  }

  /** Tipo de una pieza: 3 esquina, 2 arista (o ala), 1 centro. Cuenta sus coordenadas en la superficie. */
  kind(piece) {
    return piece.home.filter((v) => Math.abs(v) === this.h).length;
  }

  /**
   * Todas las posiciones de pegatina del cubo: { face, pos, kind, color }, donde `face`
   * es la cara en la que está, `kind` el tipo de hueco (3 esquina, 2 arista, 1 centro)
   * y `color` la cara de origen de la pegatina que lo ocupa. Sirve para decidir por
   * colores cuando hay piezas indistinguibles (centros, alas gemelas).
   */
  slots() {
    const h = this.h;
    const out = [];
    for (const face of FACE_NAMES) {
      const { right, down } = FACE_BASIS[face];
      const n = faceNormal(face);
      for (let r = 0; r < this.size; r++) {
        for (let c = 0; c < this.size; c++) {
          const pos = [0, 1, 2].map((k) => n[k] * h + right[k] * (c - h) + down[k] * (r - h));
          const kind = 1 + (r === 0 || r === this.size - 1) + (c === 0 || c === this.size - 1);
          out.push({ face, pos, kind, color: this.stickerAt(pos, face).face });
        }
      }
    }
    return out;
  }

  /** ¿Todos los huecos de los tipos dados (por defecto, todos) muestran el color de su cara? */
  stickersSolved(kinds = [1, 2, 3]) {
    return this.slots().every((s) => !kinds.includes(s.kind) || s.color === s.face);
  }
}
