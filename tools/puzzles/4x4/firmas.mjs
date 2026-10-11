// firmas.mjs (4x4) — Estado del 4x4 leído por colores de pegatina.
//
// En un 4x4 los centros y las alas (aristas de dos piezas) son indistinguibles entre sí, así
// que «resuelto» y «emparejado» se deciden por colores, no por identidad de pieza. El marco
// de referencia lo da el esquema de colores a través de la esquina inferior-trasera-izquierda
// (CubeModel.frame()).
//
// Vista 3x3: con las aristas emparejadas, el cubo se lee como un 3x3 (centros aparte). Un
// giro de cara exterior actúa sobre esa vista como un giro de 3x3, así que solo puede
// producir estados legales (orientación de esquinas, volteo de aristas y paridad de la
// permutación). Si la vista es ilegal, el estado no se alcanza con giros exteriores: es una
// paridad.

import { FACE_NAMES } from '../../../js/cube-model.js';

const FACES_OF = { x: ['L', 'R'], y: ['D', 'U'], z: ['B', 'F'] };
const sign = (v) => (v > 0 ? 1 : -1);

/** Caras (U/D, R/L, F/B) de un hueco de esquina o arista, según sus coordenadas extremas. */
function facesAt(pos, h) {
  const out = [];
  ['x', 'y', 'z'].forEach((axis, k) => {
    if (Math.abs(pos[k]) === h) out.push(FACES_OF[axis][pos[k] > 0 ? 1 : 0]);
  });
  return out;
}

/** Colores visibles en cada hueco de esquina o ala: Map "x,y,z" → { cara: color }. */
function sticking(m, kind) {
  const spots = new Map();
  for (const s of m.slots()) {
    if (s.kind !== kind) continue;
    const k = s.pos.join();
    if (!spots.has(k)) spots.set(k, { pos: s.pos, colors: {} });
    spots.get(k).colors[s.face] = s.color;
  }
  return spots;
}

/** Las 12 aristas: { caras: ['U','F'], alas: [colores por cara, …] }. */
export function edges(m) {
  const byEdge = new Map();
  for (const { pos, colors } of sticking(m, 2).values()) {
    const caras = Object.keys(colors).sort();
    const k = caras.join('');
    if (!byEdge.has(k)) byEdge.set(k, { caras, alas: [] });
    byEdge.get(k).alas.push(colors);
  }
  return [...byEdge.values()];
}

export const centersSolved = (m) => m.stickersSolved([1]);
export const cornersSolved = (m) => m.stickersSolved([3]);
export const solved = (m) => m.stickersSolved();

/** Aristas cuyas dos alas no coinciden (mismos colores en las mismas caras). */
export const unpairedEdges = (m) =>
  edges(m).filter((e) => e.alas.some((a) => e.caras.some((f) => a[f] !== e.alas[0][f])));

export const edgesPaired = (m) => unpairedEdges(m).length === 0;

/** Signo de una permutación dada como lista destino[i]. */
function permSign(list) {
  const seen = new Array(list.length).fill(false);
  let sgn = 1;
  for (let i = 0; i < list.length; i++) {
    if (seen[i]) continue;
    let len = 0;
    for (let j = i; !seen[j]; j = list[j]) {
      seen[j] = true;
      len++;
    }
    if (len % 2 === 0) sgn = -sgn;
  }
  return sgn;
}

/**
 * Invariantes del 3x3 que se deducen de las pegatinas: torsión de las esquinas (suma
 * módulo 3), volteo de las aristas (suma módulo 2) y paridades de las permutaciones.
 * Devuelve null si las aristas no están emparejadas (no hay vista 3x3).
 */
export function reducedView(m) {
  if (!edgesPaired(m)) return null;
  const h = m.h;

  // Esquinas: la pieza se identifica por el conjunto de colores.
  const corners = [...sticking(m, 3).values()].map(({ pos, colors }) => ({ pos, colors }));
  const cornerKeys = corners.map((c) => Object.keys(c.colors).sort().join(''));
  const cornerIds = corners.map((c) => Object.values(c.colors).sort().join(''));
  let twist = 0;
  corners.forEach((c) => {
    const ref = Object.entries(c.colors).find(([, col]) => col === 'U' || col === 'D')[0]; // cara donde está el U/D
    if (ref === 'U' || ref === 'D') return;
    // Sentido horario desde el U/D: hacia la cara de x si el producto de signos es positivo; si no, hacia la de z.
    const parity = sign(c.pos[0]) * sign(c.pos[1]) * sign(c.pos[2]);
    const xFace = FACES_OF.x[c.pos[0] > 0 ? 1 : 0];
    twist += (ref === xFace) === (parity > 0) ? 1 : 2;
  });
  const cornerPerm = cornerIds.map((id) => cornerKeys.indexOf(id));

  // Aristas: una por par de caras; el volteo se mide contra su cara «principal».
  const list = edges(m);
  const edgeKeys = list.map((e) => e.caras.join(''));
  const edgeIds = list.map((e) => Object.values(e.alas[0]).sort().join(''));
  let flips = 0;
  list.forEach((e) => {
    const colors = e.alas[0];
    const ref = e.caras.map((f) => colors[f]).find((c) => c === 'U' || c === 'D') ?? e.caras.map((f) => colors[f]).find((c) => c === 'F' || c === 'B');
    const primary = e.caras.find((f) => f === 'U' || f === 'D') ?? e.caras.find((f) => f === 'F' || f === 'B');
    if (colors[primary] !== ref) flips++;
  });
  const edgePerm = edgeIds.map((id) => edgeKeys.indexOf(id.split('').sort().join('')));

  return {
    twist: twist % 3,
    flips: flips % 2,
    cornerSign: permSign(cornerPerm),
    edgeSign: permSign(edgePerm),
    h,
  };
}

/**
 * Clase de paridad de un estado: 'oll' (una arista volteada), 'pll' (dos aristas
 * intercambiadas), null si es un estado legal del 3x3 y 'ilegal' si es otra cosa.
 */
export function parityKind(m) {
  const v = reducedView(m);
  if (!v) return 'sin-emparejar';
  if (v.twist !== 0) return 'ilegal';
  const oll = v.flips === 1;
  const pll = v.cornerSign !== v.edgeSign;
  if (oll && pll) return 'ilegal';
  if (oll) return 'oll';
  if (pll) return 'pll';
  return null;
}

/** Piezas de centro desplazadas: nombre "color en cara". Útil para describir casos de centros. */
export function misplacedCenters(m) {
  return m.slots().filter((s) => s.kind === 1 && s.color !== s.face);
}

export { FACE_NAMES };

/** ¿El estado `m` cumple el objetivo de una etapa de tipo `tipo`? */
export function goalReached(tipo, m) {
  switch (tipo) {
    case 'centros':
      return centersSolved(m);
    case 'aristas':
      return centersSolved(m) && edgesPaired(m);
    case 'paridad-oll':
    case 'paridad-pll':
      return solved(m);
    default:
      throw new Error(`Tipo de etapa desconocido: ${tipo}`);
  }
}
