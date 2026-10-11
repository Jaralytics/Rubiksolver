// catalog.js — Carga el catálogo de algoritmos y define qué piezas se muestran
// con color en cada etapa (máscaras).

/** Carga un catálogo; cada puzzle tiene el suyo (data/<id>.json). */
export async function loadCatalog(url) {
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

/** Movimientos de la solución y de la preparación (del puzzle resuelto al caso). */
export function caseMoves(caso, variant, puzzle) {
  const moves = puzzle.interpretar(algText(caso, variant));
  const setup = caso.preparacion ? puzzle.interpretar(caso.preparacion) : puzzle.invertir(moves);
  return { moves, setup };
}

/** Estado lógico del caso, para dibujar miniaturas (el único modelo que se crea). */
export function caseModel(caso, puzzle) {
  return puzzle.crearModelo().applyMoves(caseMoves(caso, 0, puzzle).setup);
}

/** Máscara de un caso: la de su etapa (según el puzzle), menos las piezas que el caso oculta o declara libres. */
export function maskFor(puzzle, etapa, caso) {
  const base = puzzle.mascaras[etapa.mascara] || puzzle.mascaras.todo;
  const hidden = (caso?.ocultar || []).map((h) => h.join());
  // Piezas libres (`verificacion.libres`, «A-B-C»): el algoritmo las mueve y no son el objetivo del caso.
  const libres = (caso?.verificacion?.libres || []).map((l) => l.split('-').sort().join());
  if (!hidden.length && !libres.length) return base;
  return (p, face) => !hidden.includes(p.home.join()) && !libres.includes([...p.home].sort().join()) && base(p, face);
}
