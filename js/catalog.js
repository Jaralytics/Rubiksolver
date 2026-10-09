// catalog.js — Carga el catálogo de algoritmos y define qué piezas se muestran
// con color en cada etapa (máscaras).

import { CubeModel, parseAlg, invertMoves } from './cube-model.js';

export async function loadCatalog(url = 'data/algorithms.json') {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo cargar ${url} (HTTP ${res.status})`);
  const data = await res.json();
  const etapas = new Map(data.etapas.map((e) => [e.id, { ...e, casos: [] }]));
  for (const c of data.casos) etapas.get(c.etapa)?.casos.push(c);
  return {
    ...data,
    etapa: (id) => etapas.get(id),
    caso: (id) => data.casos.find((c) => c.id === id),
  };
}

/** Texto del algoritmo elegido: 0 = principal, 1… = alternativas. */
export const algText = (caso, variant = 0) => (variant === 0 ? caso.algoritmo : caso.alternativas[variant - 1]);

/** Movimientos de la solución y de la preparación (del cubo resuelto al caso). */
export function caseMoves(caso, variant = 0, size = 3) {
  const moves = parseAlg(algText(caso, variant), size);
  const setup = caso.preparacion ? parseAlg(caso.preparacion, size) : invertMoves(moves);
  return { moves, setup };
}

/** Estado lógico del caso, para dibujar miniaturas. */
export function caseModel(caso, size = 3) {
  return new CubeModel(size).applyMoves(caseMoves(caso, 0, size).setup);
}

// Máscaras: (pieza, cara de la pegatina) → ¿se muestra con color?
// `home[1]` es la capa de origen: -1 abajo (blanco), 0 media, 1 arriba (amarillo).
const kind = (p) => p.home.filter((v) => v !== 0).length; // 1 centro, 2 arista, 3 esquina
const MASKS = {
  todo: () => true,
  cruz: (p) => kind(p) === 1 || (kind(p) === 2 && p.home[1] === -1),
  capa1: (p) => kind(p) === 1 || p.home[1] === -1,
  f2l: (p) => kind(p) === 1 || p.home[1] < 1,
  eoll: (p, face) => kind(p) === 1 || p.home[1] < 1 || (kind(p) === 2 && face === 'U'),
  oll: (p, face) => p.home[1] < 1 || face === 'U',
  cpll: (p, face) => p.home[1] < 1 || face === 'U' || kind(p) === 3,
};

/** Máscara de un caso: la de su etapa, menos las piezas que el caso oculta. */
export function maskFor(etapa, caso) {
  const base = MASKS[etapa.mascara] || MASKS.todo;
  const hidden = (caso?.ocultar || []).map((h) => h.join());
  if (!hidden.length) return base;
  return (p, face) => !hidden.includes(p.home.join()) && base(p, face);
}
