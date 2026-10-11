// Ayuda de autoría: no la usan la generación del catálogo (build.mjs) ni las pruebas (verify.mjs).
// Sirve para encontrar o revisar algoritmos nuevos y ejecuta su trabajo al importarse o al lanzarse.
// Se ejecuta a mano desde la raíz del repositorio con node; sus argumentos se explican más abajo.
// tablas.mjs (Megaminx) — Ayuda de autoría: efecto de una secuencia sobre el puzzle resuelto como
// tablas de enteros (hueco de destino y giro de la pieza que sale de cada hueco). Permite buscar
// conmutadores sin memoria ni objetos. No forma parte de la verificación.

import { parseAlg } from '../../../../js/megaminx-model.js';
import { FACE_INDEX, LAYER, SLOT_ACT, TURN, MUL, INV, SLOTS } from '../../../../js/megaminx-geometry.js';

export const N_SLOTS = SLOTS.length;
const QMOD = { '': 4, "'": 1, '2': 3, "2'": 2 };

/** Efecto identidad. */
export const identidad = () => ({ P: Int16Array.from({ length: N_SLOTS }, (_, i) => i), T: new Int16Array(N_SLOTS) });

const MOVES = new Map();
/** Efecto de un movimiento ("R", "DR2'"…). */
export function efectoMovimiento(token) {
  if (MOVES.has(token)) return MOVES.get(token);
  const m = parseAlg(token)[0];
  const f = FACE_INDEX[m.face];
  const t = TURN[f][((m.q % 5) + 5) % 5];
  const capa = new Set(LAYER[f]);
  const e = identidad();
  for (let p = 0; p < N_SLOTS; p++) {
    if (capa.has(p)) {
      e.P[p] = SLOT_ACT[t][p];
      e.T[p] = t;
    }
  }
  MOVES.set(token, e);
  return e;
}

/** Composición: primero a, luego b. */
export function componer(a, b) {
  const e = { P: new Int16Array(N_SLOTS), T: new Int16Array(N_SLOTS) };
  for (let p = 0; p < N_SLOTS; p++) {
    const q = a.P[p];
    e.P[p] = b.P[q];
    e.T[p] = MUL[b.T[q]][a.T[p]];
  }
  return e;
}

export function inverso(a) {
  const e = { P: new Int16Array(N_SLOTS), T: new Int16Array(N_SLOTS) };
  for (let p = 0; p < N_SLOTS; p++) {
    e.P[a.P[p]] = p;
    e.T[a.P[p]] = INV[a.T[p]];
  }
  return e;
}

export const efectoAlg = (texto) => parseAlg(texto).reduce((acc, m) => componer(acc, efectoMovimiento(m.text)), identidad());

/** Huecos cuya pieza cambia (de hueco o de giro; los centros solo de hueco). */
export function cambiados(e) {
  const out = [];
  for (let p = 0; p < N_SLOTS; p++) if (e.P[p] !== p || (SLOTS[p].faces.length > 1 && e.T[p] !== 0)) out.push(p);
  return out;
}

export const bajoU = (slot) => !SLOTS[slot].faces.includes('U');
export { SLOTS };
