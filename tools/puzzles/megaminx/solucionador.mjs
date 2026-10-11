// solucionador.mjs (Megaminx) — Resolutor guiado por el catálogo: comprueba que los algoritmos del
// catálogo bastan para resolver el puzzle completo, etapa a etapa, desde mezclas con semilla fija.
//
// Por etapa solo se permite:
//   - los algoritmos de esa etapa, aplicados en cualquiera de las cinco rotaciones del puzzle alrededor
//     de U (se reescriben las caras del algoritmo; no se gira realmente el puzzle);
//   - giros de la capa U como preparación;
//   - en las etapas de capas inferiores (intuitivas), hasta PREPARACION_MAX giros libres previos al
//     algoritmo, solo de caras que no tocan ninguna pieza ya resuelta;
//   - en s2l-alto, además, pasos de «sacar» una pieza mal colocada a la capa U con el algoritmo de su
//     hueco (no resuelven nada por sí mismos, pero dejan la pieza al alcance de un caso).

import { MegaminxModel, parseAlg, parseMove, invertMove, movesToString } from '../../../js/megaminx-model.js';
import { SLOTS } from '../../../js/megaminx-geometry.js';
import { STAGE_TYPES, stagePieces, ownPiece, goalReached, caseState } from './firmas.mjs';

/**
 * Giros libres de preparación permitidos antes de un algoritmo en cada etapa de capas inferiores.
 * Son los valores más bajos con los que se resuelven las 60 mezclas de la comprobación de completitud
 * (con uno menos fallan mezclas en todas las etapas); no se deben subir para que la comprobación pase.
 */
export const PREPARACION_MAX = { estrella: 3, capa1: 3, capa2: 3, 's2l-bajo': 2, 's2l-alto': 1 };
const PASOS_MAX = 40; // tope de pasos por etapa (protege de bucles)

const FACE_RE = /(DBR|DBL|BR|BL|DR|DL|[UFRLDB])/g;

/** Generador pseudoaleatorio determinista (mulberry32). */
function aleatorio(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CARAS = ['U', 'F', 'R', 'BR', 'BL', 'L', 'D', 'B', 'DBL', 'DL', 'DR', 'DBR'];
const GIROS = ['', "'", '2', "2'"];

/** Mezcla de `n` giros de cara con semilla fija. */
export function mezcla(semilla, n = 80) {
  const r = aleatorio(semilla);
  const out = [];
  let last = '';
  while (out.length < n) {
    const f = CARAS[Math.floor(r() * CARAS.length)];
    if (f === last) continue;
    last = f;
    out.push(f + GIROS[Math.floor(r() * GIROS.length)]);
  }
  return out.join(' ');
}

/** Cómo cambian de nombre las caras al girar el puzzle entero 72 grados alrededor de U. */
function mapaGiroY() {
  const m = new MegaminxModel().applyAlg('y');
  const map = {};
  for (const p of m.pieces) if (p.kind === 1) map[p.home[0]] = SLOTS[p.pos].faces[0];
  return map;
}
const MAPA_Y = mapaGiroY();

/** Reescribe un algoritmo girado el puzzle `k` veces (k = 0..4). */
export function rotarAlg(texto, k) {
  let t = texto;
  for (let i = 0; i < k; i++) t = t.replace(FACE_RE, (f) => MAPA_Y[f]);
  return t;
}

const aplicar = (m, texto) => m.applyMoves(parseAlg(texto));
const resueltas = (tipo, m) => new Set(stagePieces(tipo, m).filter((p) => m.isPieceSolved(p)).map((p) => p.slot));
const enCapaU = (p) => SLOTS[p.pos].faces.includes('U');

// ---------------------------------------------------------------------------
// Etapas de la última capa (eo, ep, cp, co)
// ---------------------------------------------------------------------------

const APLICACIONES_MAX = { eo: 2, ep: 3, cp: 1, co: 3 };

function resolverUltima(tipo, casos, m) {
  // Cada opción: giros previos de U (a) y algoritmo girado k veces.
  const opciones = [];
  const aMax = tipo === 'cp' ? 5 : 1;
  for (let a = 0; a < aMax; a++) {
    for (let k = 0; k < 5; k++) {
      for (const c of casos) opciones.push(`${'U '.repeat(a)}${rotarAlg(c.algoritmo, k)}`);
    }
  }
  if (tipo === 'cp') for (let a = 1; a < 5; a++) opciones.push('U '.repeat(a)); // solo alinear las aristas con un giro de U
  const buscar = (estado, restantes) => {
    if (goalReached(tipo, estado)) return [];
    if (!restantes) return null;
    for (const o of opciones) {
      const sig = aplicar(estado.clone(), o);
      const resto = buscar(sig, restantes - 1);
      if (resto) return [o, ...resto];
    }
    return null;
  };
  // Los giros previos de U que hagan falta ya van dentro de cada opción.
  const camino = buscar(m, APLICACIONES_MAX[tipo]);
  if (!camino) return { ok: false };
  for (const o of camino) aplicar(m, o);
  return { ok: true, pasos: camino.length };
}

// ---------------------------------------------------------------------------
// Etapas de capas inferiores
// ---------------------------------------------------------------------------

/** Casos del catálogo reescritos en las cinco rotaciones, con la configuración inicial de su pieza objetivo. */
export function casosRotados(tipo, casos) {
  const out = [];
  for (const c of casos) {
    for (let k = 0; k < 5; k++) {
      const alg = rotarAlg(c.algoritmo, k);
      const s = caseState(parseAlg(alg));
      const home = new Set(c.verificacion.pieza.map((f) => rotarAlg(f, k)));
      const objetivo = s.pieces.findIndex((p) => p.kind >= 2 && p.home.length === home.size && p.home.every((f) => home.has(f)));
      if (objetivo < 0) continue;
      out.push({ alg, objetivo, pos: s.pieces[objetivo].pos, rot: s.pieces[objetivo].rot });
    }
  }
  return out;
}

/** Caras cuyo giro no toca ninguna pieza de la etapa ya resuelta. */
function carasLibres(tipo, m) {
  const hechas = resueltas(tipo, m);
  return CARAS.filter((f) => m.piecesInMove(parseMove(f)).every((p) => p.kind < 2 || !hechas.has(p.slot)));
}

function resolverCapas(tipo, casos, m, maxPrep) {
  const rc = casosRotados(tipo, casos);
  const alto = tipo === 's2l-alto';
  let mayorPrep = 0;
  let totalPrep = 0;
  for (let paso = 0; paso < PASOS_MAX; paso++) {
    if (goalReached(tipo, m)) return { ok: true, pasos: paso, prep: mayorPrep, total: totalPrep };
    const antes = resueltas(tipo, m);
    const libres = carasLibres(tipo, m);
    const tokens = libres.flatMap((f) => GIROS.map((g) => f + g));

    // Crecimiento: un caso cuyo objetivo está en la posición del caso resuelve una pieza sin romper lo hecho.
    const crecer = (est, prep) => {
      for (const r of rc) {
        const p = est.pieces[r.objetivo];
        if (p.pos !== r.pos || p.rot !== r.rot || est.isPieceSolved(p)) continue;
        const sig = aplicar(est.clone(), r.alg);
        const despues = resueltas(tipo, sig);
        if (despues.size > antes.size && [...antes].every((s) => despues.has(s))) return { sig, prep };
      }
      return null;
    };
    // Sacar (solo s2l-alto): un algoritmo de hueco que lleva a la capa U una pieza mal colocada.
    const piezasEnU = (est) => stagePieces(tipo, est).filter((p) => !est.isPieceSolved(p) && enCapaU(p)).length;
    const sacar = (est, prep) => {
      const base = piezasEnU(est);
      for (const r of rc) {
        const p = est.pieces[r.objetivo];
        if (est.isPieceSolved(p) || enCapaU(p)) continue; // el algoritmo de ese hueco solo tiene sentido si ahí hay una pieza mal puesta
        const sig = aplicar(est.clone(), r.alg);
        const despues = resueltas(tipo, sig);
        if ([...antes].every((s) => despues.has(s)) && piezasEnU(sig) > base) return { sig, prep };
      }
      return null;
    };

    // Giros libres precalculados con su inverso, para recorrer el árbol en sitio sin copiar el estado.
    const giros = tokens.map((t) => ({ f: t.replace(/[2']/g, ''), mv: parseMove(t), inv: invertMove(parseMove(t)) }));
    const dfs = (est, prep, last, buscar, lim) => {
      const hallado = buscar(est, prep);
      if (hallado) return hallado;
      if (prep >= lim) return null;
      for (const g of giros) {
        if (g.f === last) continue;
        est.applyMove(g.mv);
        const r = dfs(est, prep + 1, g.f, buscar, lim);
        est.applyMove(g.inv);
        if (r) return r;
      }
      return null;
    };
    // Profundización iterativa para preferir pocos giros previos.
    let res = null;
    for (let lim = 0; lim <= maxPrep && !res; lim++) {
      const acotado = (buscar) => (est, prep) => (prep === lim ? buscar(est, prep) : null);
      res = dfs(m.clone(), 0, null, acotado(crecer), lim);
    }
    if (!res && alto) {
      for (let lim = 0; lim <= maxPrep && !res; lim++) res = dfs(m.clone(), 0, null, (est, prep) => (prep === lim ? sacar(est, prep) : null), lim);
    }
    if (!res) return { ok: false, pasos: paso, prep: mayorPrep, modelo: m, sinCaso: stagePieces(tipo, m).filter((p) => !m.isPieceSolved(p)).map((p) => `${p.home.join('-')}@${SLOTS[p.pos].faces.join('-')}`) };
    mayorPrep = Math.max(mayorPrep, res.prep);
    totalPrep += res.prep;
    m.copyFrom(res.sig);
  }
  return { ok: false, pasos: PASOS_MAX, prep: mayorPrep };
}

/**
 * Resuelve `semilla` con el catálogo. Devuelve { ok, etapa, detalle, prep, porEtapa } donde `prep` es el
 * mayor número de giros libres previos usado en una etapa de capas inferiores y `porEtapa[id]` guarda,
 * para cada una, ese mayor número (`max`) y el total de giros libres previos de la mezcla (`total`).
 */
export function resolverConCatalogo(catalog, semilla) {
  const m = new MegaminxModel();
  m.applyAlg(mezcla(semilla));
  let prep = 0;
  const porEtapa = {};
  const metodo = catalog.metodos[0];
  for (const id of metodo.etapas) {
    const etapa = catalog.etapas.find((e) => e.id === id);
    const casos = catalog.casos.filter((c) => c.etapa === id);
    const r = STAGE_TYPES.includes(etapa.tipo) ? resolverCapas(etapa.tipo, casos, m, PREPARACION_MAX[etapa.tipo]) : resolverUltima(etapa.tipo, casos, m);
    if (!r.ok) return { ok: false, etapa: id, detalle: r, prep, porEtapa };
    prep = Math.max(prep, r.prep || 0);
    if (STAGE_TYPES.includes(etapa.tipo)) porEtapa[id] = { max: r.prep, total: r.total };
  }
  return { ok: true, etapa: null, prep, porEtapa, resuelto: m.isSolved(), modelo: m };
}

export { movesToString };
