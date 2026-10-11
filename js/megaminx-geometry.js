// megaminx-geometry.js — Geometría y tablas del Megaminx (dodecaedro), matemática pura:
// sin three.js, importable desde el navegador y desde node.
//
// Caras, huecos ("slots") y el grupo de las 60 rotaciones del icosaedro. Las rotaciones se
// construyen una sola vez con matrices flotantes; después todo el motor trabaja con tablas
// de enteros (composición, inversa, destino de cada cara y de cada hueco).
//
// Ejes: +x = derecha, +y = arriba (U), +z = hacia quien mira (F).
//
// Convención de sentido: TURN[f][k] es la rotación de k * 72° alrededor de la normal de la
// cara f con la regla de la mano derecha, es decir, antihoraria vista desde fuera de la cara.
// Igual que en CubeModel, un giro horario visto desde fuera es entonces q negativo
// (U = q -1 = TURN[U][4]) y el eje de un movimiento es la normal saliente de su cara.

const S5 = Math.sqrt(5);
const RAD = Math.PI / 180;

// El índice i + 6 es la cara opuesta a la i (U-D, F-B, R-DBL, BR-DL, BL-DR, L-DBR).
export const FACES = ['U', 'F', 'R', 'BR', 'BL', 'L', 'D', 'B', 'DBL', 'DL', 'DR', 'DBR'];
export const FACE_INDEX = Object.fromEntries(FACES.map((f, i) => [f, i]));

// Normales unitarias: U, cinco caras del anillo superior y, abajo, las opuestas.
export const NORMALS = (() => {
  const n = [[0, 1, 0]];
  for (const a of [90, 18, -54, -126, 162]) {
    n.push([(2 / S5) * Math.cos(a * RAD), 1 / S5, (2 / S5) * Math.sin(a * RAD)]);
  }
  for (let i = 0; i < 6; i++) n.push(n[i].map((c) => -c));
  return n;
})();

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** ¿Son adyacentes las caras a y b (índices)? Comparten arista cuando n_a · n_b = 1/√5. */
export function adjacent(a, b) {
  return Math.abs(dot(NORMALS[a], NORMALS[b]) - 1 / S5) < 1e-6;
}

// ---------------------------------------------------------------------------
// Huecos: 12 centros, 30 aristas, 20 esquinas
// ---------------------------------------------------------------------------

export const SLOTS = [];
const slotKey = (idx) => idx.slice().sort((a, b) => a - b).join(',');
const SLOT_BY_KEY = new Map();
const addSlot = (idx) => {
  const faceIdx = idx.slice().sort((a, b) => a - b);
  SLOT_BY_KEY.set(faceIdx.join(','), SLOTS.length);
  SLOTS.push({ faceIdx, faces: faceIdx.map((i) => FACES[i]) });
};
for (let a = 0; a < 12; a++) addSlot([a]);
for (let a = 0; a < 12; a++) {
  for (let b = a + 1; b < 12; b++) if (adjacent(a, b)) addSlot([a, b]);
}
for (let a = 0; a < 12; a++) {
  for (let b = a + 1; b < 12; b++) {
    for (let c = b + 1; c < 12; c++) if (adjacent(a, b) && adjacent(a, c) && adjacent(b, c)) addSlot([a, b, c]);
  }
}
if (SLOTS.length !== 62) throw new Error(`Megaminx: se esperaban 62 huecos y hay ${SLOTS.length}`);

/** Índice del hueco formado por esas caras (índices de cara, en cualquier orden). */
export const slotIndex = (faceIdx) => SLOT_BY_KEY.get(slotKey(faceIdx));

/** Huecos que contienen cada cara: 1 centro + 5 aristas + 5 esquinas. */
export const LAYER = FACES.map((_, f) => SLOTS.flatMap((s, i) => (s.faceIdx.includes(f) ? [i] : [])));

// ---------------------------------------------------------------------------
// Grupo de rotaciones (60 elementos)
// ---------------------------------------------------------------------------

function rotation(axis, angle) {
  const [x, y, z] = axis;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  return [
    c + t * x * x, t * x * y - s * z, t * x * z + s * y,
    t * x * y + s * z, c + t * y * y, t * y * z - s * x,
    t * x * z - s * y, t * y * z + s * x, c + t * z * z,
  ];
}

function matMul(a, b) {
  const r = new Array(9);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
  }
  return r;
}

const matVec = (m, v) => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];

const matKey = (m) => m.map((v) => Math.round(v * 1e4)).join(',');

const ROTS = [[1, 0, 0, 0, 1, 0, 0, 0, 1]];
const ROT_INDEX = new Map([[matKey(ROTS[0]), 0]]);
{
  const gens = [rotation(NORMALS[0], 72 * RAD), rotation(NORMALS[1], 72 * RAD)];
  for (let i = 0; i < ROTS.length; i++) {
    for (const g of gens) {
      const m = matMul(g, ROTS[i]);
      const k = matKey(m);
      if (!ROT_INDEX.has(k)) {
        ROT_INDEX.set(k, ROTS.length);
        ROTS.push(m);
      }
    }
  }
}
if (ROTS.length !== 60) throw new Error(`Megaminx: el grupo debe tener 60 rotaciones y tiene ${ROTS.length}`);
const rotIndex = (m) => ROT_INDEX.get(matKey(m));

/** Composición: MUL[a][b] aplica primero b y luego a. */
export const MUL = ROTS.map((a) => ROTS.map((b) => rotIndex(matMul(a, b))));
export const INV = MUL.map((row) => row.indexOf(0));

const nearestFace = (v) => {
  let best = 0;
  for (let f = 1; f < 12; f++) if (dot(v, NORMALS[f]) > dot(v, NORMALS[best])) best = f;
  return best;
};

/** FACE_ACT[g][f]: a qué cara va la cara f con la rotación g. */
export const FACE_ACT = ROTS.map((m) => NORMALS.map((n) => nearestFace(matVec(m, n))));

/** SLOT_ACT[g][s]: a qué hueco va el hueco s con la rotación g (por su conjunto de caras). */
export const SLOT_ACT = FACE_ACT.map((act) => SLOTS.map((s) => slotIndex(s.faceIdx.map((f) => act[f]))));

for (const table of [FACE_ACT, SLOT_ACT]) {
  for (const row of table) {
    if (new Set(row).size !== row.length) throw new Error('Megaminx: una acción del grupo no es una permutación');
  }
}

/** TURN[f][k]: rotación de k * 72° (antihoraria vista desde fuera) alrededor de la cara f. */
export const TURN = NORMALS.map((n) => [0, 1, 2, 3, 4].map((k) => rotIndex(rotation(n, k * 72 * RAD))));

/** FRAME[posU * 12 + posF]: rotación que lleva U a la cara posU y F a la cara posF. */
export const FRAME = new Array(144).fill(-1);
for (let g = 0; g < 60; g++) FRAME[FACE_ACT[g][0] * 12 + FACE_ACT[g][1]] = g;

/** Cuaternión [x, y, z, w] de cada rotación, para la vista. */
export const QUAT = ROTS.map((m) => {
  const tr = m[0] + m[4] + m[8];
  let q;
  if (tr > 0) {
    const s = Math.sqrt(tr + 1) * 2;
    q = [(m[7] - m[5]) / s, (m[2] - m[6]) / s, (m[3] - m[1]) / s, s / 4];
  } else if (m[0] > m[4] && m[0] > m[8]) {
    const s = Math.sqrt(1 + m[0] - m[4] - m[8]) * 2;
    q = [s / 4, (m[1] + m[3]) / s, (m[2] + m[6]) / s, (m[7] - m[5]) / s];
  } else if (m[4] > m[8]) {
    const s = Math.sqrt(1 + m[4] - m[0] - m[8]) * 2;
    q = [(m[1] + m[3]) / s, s / 4, (m[5] + m[7]) / s, (m[2] - m[6]) / s];
  } else {
    const s = Math.sqrt(1 + m[8] - m[0] - m[4]) * 2;
    q = [(m[2] + m[6]) / s, (m[5] + m[7]) / s, s / 4, (m[3] - m[1]) / s];
  }
  return q[3] < 0 ? q.map((v) => -v) : q;
});

// ---------------------------------------------------------------------------
// Sólido: poliedros de las piezas
// ---------------------------------------------------------------------------

// Radio de la esfera inscrita: los planos de las caras son n_f · x = 1.
export const INRADIUS = 1;
// Profundidad del corte de cada capa. Debe superar 1/φ = 0,618 para que las capas no
// adyacentes no se crucen.
export const CORTE = 0.72;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / l, a[1] / l, a[2] / l];
};

// Cuadrado grande sobre el plano n · x = d, antihorario visto desde +n.
function bigQuad(n, d) {
  const helper = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = unit(cross(n, helper));
  const v = cross(n, u);
  const c = [n[0] * d, n[1] * d, n[2] * d];
  const s = 20;
  return [[-s, -s], [s, -s], [s, s], [-s, s]].map(([a, b]) => [0, 1, 2].map((k) => c[k] + a * u[k] + b * v[k]));
}

// Recorta un polígono con el semiespacio n · x <= d (Sutherland-Hodgman).
function clip(poly, n, d) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const da = dot(n, a) - d;
    const db = dot(n, b) - d;
    if (da <= 1e-9) out.push(a);
    if ((da < -1e-9 && db > 1e-9) || (da > 1e-9 && db < -1e-9)) {
      const t = da / (da - db);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
    }
  }
  return out;
}

// Quita vértices repetidos consecutivos.
function dedupe(poly) {
  const out = [];
  for (const p of poly) {
    const q = out[out.length - 1];
    if (!q || Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) > 1e-7) out.push(p);
  }
  while (out.length > 1 && Math.hypot(...sub(out[0], out[out.length - 1])) <= 1e-7) out.pop();
  return out;
}

function area(poly) {
  let s = [0, 0, 0];
  for (let i = 0; i < poly.length; i++) {
    const c = cross(poly[i], poly[(i + 1) % poly.length]);
    s = [s[0] + c[0], s[1] + c[1], s[2] + c[2]];
  }
  return Math.hypot(...s) / 2;
}

/**
 * Cuerpo convexo de una pieza (hueco `slot`) como lista de polígonos
 * { face, points }: `face` es el nombre de la cara cuando el polígono está sobre su plano
 * exterior (n_f · x = 1) y null cuando es un corte interno. Se obtiene recortando, para cada
 * plano límite, un cuadrado grande con todos los demás semiespacios:
 *   n_f · x <= 1 para toda cara f;
 *   n_f · x >= CORTE si f pertenece al hueco, n_f · x <= CORTE si no.
 */
export function piecePolyhedron(slot) {
  const inSlot = SLOTS[slot].faceIdx;
  const planes = [];
  for (let f = 0; f < 12; f++) planes.push({ n: NORMALS[f], d: 1, face: FACES[f] });
  for (let f = 0; f < 12; f++) {
    if (inSlot.includes(f)) planes.push({ n: NORMALS[f].map((c) => -c), d: -CORTE, face: null });
    else planes.push({ n: NORMALS[f], d: CORTE, face: null });
  }
  const out = [];
  planes.forEach((pl, i) => {
    let poly = bigQuad(pl.n, pl.d);
    for (let j = 0; j < planes.length && poly.length >= 3; j++) {
      if (j !== i) poly = clip(poly, planes[j].n, planes[j].d);
    }
    poly = dedupe(poly);
    if (poly.length >= 3 && area(poly) > 1e-8) out.push({ face: pl.face, points: poly });
  });
  return out;
}

/** Polígono de la pegatina de `slot` sobre la cara `face` (nombre): el exterior reducido al 86 %. */
export function stickerPolygon(slot, face) {
  const poly = piecePolyhedron(slot).find((p) => p.face === face);
  if (!poly) return null;
  const n = poly.points.length;
  const c = [0, 1, 2].map((k) => poly.points.reduce((s, p) => s + p[k], 0) / n);
  return poly.points.map((p) => [0, 1, 2].map((k) => c[k] + (p[k] - c[k]) * 0.86));
}
