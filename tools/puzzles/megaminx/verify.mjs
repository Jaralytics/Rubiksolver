// verify.mjs (Megaminx) — Verificación del catálogo del Megaminx con el motor lógico.
//
// Además de las comprobaciones comunes (ver tools/verify-catalog.mjs) comprueba que:
//   - los casos de EO cubren exactamente las 3 formas posibles de aristas mal orientadas
//     (se calculan enumerando las 32 orientaciones, de las que 15 son pares y no nulas);
//   - los de EP cubren las clases de permutación par de las cinco aristas módulo giros de U,
//     enumeradas sobre las 120 permutaciones sin pasar por el motor;
//   - los de CP cubren las 15 clases de permutación par de las cinco esquinas con las aristas fijas;
//   - los de CO son una selección guiada: se calcula con cuántas aplicaciones como máximo se
//     resuelve cualquier combinación posible de giros y debe coincidir con `cobertura` de la etapa;
//   - las etapas de capas inferiores comprueban que solo queda una pieza sin resolver y que el
//     resto de la etapa (y de las anteriores) queda resuelto;
//   - los algoritmos solo usan caras del Megaminx y giros enteros "y".

import { resolverConCatalogo, PREPARACION_MAX } from './solucionador.mjs';
import { textoCaso, descripcionCo } from './textos.mjs';
import { MegaminxModel, parseAlg, invertMoves } from '../../../js/megaminx-model.js';
import { goalReached, eoClass, epClass, cpClass, cpClassOf, coClass, cornerTwists, STAGE_TYPES, altoClass, piezasEtapaCambiadas, piezaPorHome, ownPiece, stagePieces, permClass, EP_SOLVED, belowSolved } from './firmas.mjs';

// Casos esperados en las etapas con enumeración independiente de sus clases. Las etapas de capas
// inferiores son ejemplos guiados (una pieza cada vez): su suficiencia la comprueba el resolutor
// del catálogo (solucionador.mjs), no un recuento.
const EXPECTED = { 'mg-eo': 3, 'mg-ep': 3, 'mg-cp': 15, 'mg-co': 4 };
const MEZCLAS = 60; // mezclas de la comprobación de completitud (semillas 1..60)
const VALID_ALG = /^[UFRLDBy'2() ]*$/;
// Un código de cara suelto (fuera de paréntesis) no es una explicación para quien aprende.
const CODIGO_SUELTO = /(^|[^\p{L}-])(DBR|DBL|BR|BL|DR|DL|[UFRLDB])(?![\p{L}-])/u;

/** Formas de EO posibles: orientaciones de 5 aristas con paridad par, salvo la resuelta, módulo el giro de U. */
function expectedEoClasses() {
  const out = new Set();
  for (let n = 1; n < 32; n++) {
    const t = [0, 1, 2, 3, 4].map((i) => (n >> i) & 1);
    if (t.reduce((a, b) => a + b, 0) % 2) continue;
    out.add([0, 1, 2, 3, 4].map((k) => t.map((_, i) => t[(i + k) % 5]).join('')).sort()[0]);
  }
  return [...out].sort();
}

/** Clases de EP posibles: permutaciones pares de 5 elementos, salvo las que son un giro de U, módulo giros de U. */
function expectedEpClasses() {
  const out = new Set();
  const rec = (p, used) => {
    if (p.length === 5) {
      let inv = 0;
      for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) if (p[i] > p[j]) inv++;
      if (inv % 2 === 0) out.add(permClass(p));
      return;
    }
    for (let i = 0; i < 5; i++) if (!used.includes(i)) rec([...p, i], [...used, i]);
  };
  rec([], []);
  out.delete(EP_SOLVED);
  return [...out].sort();
}

/** Clases de CP posibles: permutaciones pares de 5 esquinas con las aristas fijas, salvo la resuelta, módulo rotación. */
function expectedCpClasses() {
  const out = new Set();
  const rec = (p, used) => {
    if (p.length === 5) {
      let inv = 0;
      for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) if (p[i] > p[j]) inv++;
      if (inv % 2 === 0) out.add(cpClassOf(p));
      return;
    }
    for (let i = 0; i < 5; i++) if (!used.includes(i)) rec([...p, i], [...used, i]);
  };
  rec([], []);
  out.delete('01234');
  return [...out].sort();
}

/** Clases de CO posibles: giros de 5 esquinas con suma múltiplo de 3, salvo el resuelto, módulo rotación. */
function expectedCoClasses() {
  const out = new Set();
  for (let n = 1; n < 243; n++) {
    const t = [0, 1, 2, 3, 4].map((i) => Math.floor(n / 3 ** i) % 3);
    if (t.reduce((a, b) => a + b, 0) % 3) continue;
    out.add([0, 1, 2, 3, 4].map((k) => t.map((_, i) => t[(i + k) % 5]).join('')).sort()[0]);
  }
  return [...out].sort();
}

/**
 * Máximo de aplicaciones de los algoritmos del catálogo (en cualquiera de las cinco rotaciones
 * del puzzle) necesarias para resolver cualquier combinación posible de giros de esquina; null si
 * alguna combinación no se puede resolver con ellos.
 */
function maxApplications(catalog, etapa) {
  const gens = new Set();
  for (const c of catalog.casos.filter((x) => x.etapa === etapa.id)) {
    const t = cornerTwists(new MegaminxModel().applyMoves(parseAlg(c.algoritmo)));
    for (let k = 0; k < 5; k++) gens.add(t.map((_, i) => t[(i + k) % 5]).join(''));
  }
  const add = (a, b) => a.split('').map((x, i) => (Number(x) + Number(b[i])) % 3).join('');
  const dist = new Map([['00000', 0]]);
  let frontier = ['00000'];
  while (frontier.length) {
    const next = [];
    for (const v of frontier) {
      for (const g of gens) {
        const w = add(v, g);
        if (!dist.has(w)) {
          dist.set(w, dist.get(v) + 1);
          next.push(w);
        }
      }
    }
    frontier = next;
  }
  return dist.size === 81 ? Math.max(...dist.values()) : null;
}

export function verifyCatalog(catalog) {
  const errors = [];
  const stats = {};
  const ids = new Set();
  const expected = { eo: expectedEoClasses(), ep: expectedEpClasses(), cp: expectedCpClasses(), co: expectedCoClasses() };

  for (const etapa of catalog.etapas) {
    const casos = catalog.casos.filter((c) => c.etapa === etapa.id);
    const seen = new Set();
    const nombres = new Set();
    stats[etapa.id] = { casos: casos.length, alternativas: 0 };
    if (!casos.length) errors.push(`${etapa.id}: no tiene casos`);
    if (EXPECTED[etapa.id] && casos.length !== EXPECTED[etapa.id]) errors.push(`${etapa.id}: se esperaban ${EXPECTED[etapa.id]} casos y hay ${casos.length}`);

    for (const c of casos) {
      const err = (msg) => errors.push(`${c.id} (${c.nombre}): ${msg}`);
      if (ids.has(c.id)) err('id duplicado');
      ids.add(c.id);
      if (!new RegExp(`^${etapa.id}-\\d\\d$`).test(c.id || '')) err(`el id no tiene el formato ${etapa.id}-NN`);
      for (const campo of ['etapa', 'id', 'nombre', 'algoritmo', 'alternativas', 'descripcion']) {
        if (c[campo] === undefined || c[campo] === '') err(`falta el campo "${campo}"`);
      }
      let moves;
      let prep;
      try {
        moves = parseAlg(c.algoritmo);
        prep = c.preparacion ? parseAlg(c.preparacion) : invertMoves(moves);
      } catch (e) {
        err(e.message);
        continue;
      }
      if (!VALID_ALG.test(c.algoritmo)) err('usa símbolos que no existen en el Megaminx');
      const groups = new Set(moves.map((m) => m.group)).size;
      if (c.notas && c.notas.length !== groups) err(`tiene ${c.notas.length} notas para ${groups} grupos`);

      const tipo = etapa.tipo;
      const state = new MegaminxModel().applyMoves(prep);
      if (state.frame() !== 0) err('el caso deja el puzzle girado');
      if (goalReached(tipo, state)) err('el caso generado ya cumple el objetivo de la etapa');

      const v = c.verificacion || {};
      const alto = STAGE_TYPES.includes(tipo); // etapas de capas inferiores: pieza objetivo y piezas libres declaradas
      const sig = alto ? altoClass(state, v.pieza || [], v.libres || []) : { eo: eoClass, ep: epClass, cp: cpClass, co: coClass }[tipo]?.(state);
      if (!sig) err('no es un caso válido de esta etapa');
      // Los textos se vuelven a calcular del estado del caso: si el catálogo guarda otros, está desfasado.
      try {
        const t = textoCaso(tipo, state, alto ? v.pieza : null, v.libres || []);
        for (const campo of ['nombre', 'grupo', 'descripcion']) {
          if (c[campo] !== t[campo]) err(`el campo "${campo}" no coincide con el que se calcula del estado del caso (${JSON.stringify(t[campo])})`);
        }
      } catch (e) {
        err(`no se pudo calcular el texto del caso: ${e.message}`);
      }
      if (nombres.has(c.nombre)) err('el nombre está repetido en la etapa');
      nombres.add(c.nombre);
      for (const campo of ['nombre', 'descripcion']) {
        if (CODIGO_SUELTO.test(String(c[campo]).replace(/\([^)]*\)/g, ''))) err(`el campo "${campo}" contiene un código de cara sin explicar con palabras`);
      }
      if (sig !== v.clase) err(`la clase es "${sig}" y se declaró "${v.clase}"`);
      if (seen.has(sig)) err(`es el mismo caso que otro de la etapa (${sig})`);
      seen.add(sig);
      if (alto) {
        // La pieza objetivo está sin resolver; todo lo demás bajo la capa U está resuelto salvo las libres declaradas,
        // que son exactamente las que el algoritmo mueve además del objetivo.
        const objetivo = piezaPorHome(state, v.pieza || []);
        const libres = new Set(v.libres || []);
        if (!objetivo || !ownPiece(tipo, objetivo)) err('la pieza objetivo no es una de las que añade esta etapa');
        else if (state.isPieceSolved(objetivo)) err('la pieza objetivo ya está resuelta en el caso');
        const mueve = piezasEtapaCambiadas(tipo, moves);
        if ((v.libres || []).some((h) => !ownPiece(tipo, piezaPorHome(state, h.split('-'))))) err('una pieza libre pertenece a una etapa anterior y debe conservarse');
        const esperado = [...(v.pieza ? [v.pieza.join('-')] : []), ...libres].sort().join();
        if (mueve.join() !== esperado) err(`el algoritmo mueve bajo la capa U [${mueve.join(' ')}] y se declaró [${esperado.split(',').join(' ')}]`);
        const sinResolver = stagePieces(tipo, state).filter((p) => !state.isPieceSolved(p)).map((p) => p.home.join('-')).sort().join();
        if (sinResolver !== esperado) err(`las piezas sin resolver del caso [${sinResolver}] no son las declaradas [${esperado}]`);
      }
      if (!alto && !belowSolved(state)) err('todo lo que está bajo la capa superior debe estar resuelto en el caso');

      const after = state.clone().applyMoves(moves);
      if (!goalReached(tipo, after)) err('el algoritmo no cumple el objetivo de la etapa');
      if (after.frame() !== 0) err('el algoritmo deja el puzzle girado');
      for (const alt of c.alternativas || []) {
        stats[etapa.id].alternativas++;
        try {
          if (!goalReached(tipo, state.clone().applyMoves(parseAlg(alt)).normalize())) err(`la alternativa "${alt}" no resuelve el caso`);
        } catch (e) {
          err(`alternativa "${alt}": ${e.message}`);
        }
      }
    }

    // Cobertura frente a la enumeración independiente de clases posibles.
    const all = expected[etapa.tipo];
    if (all) {
      const missing = all.filter((k) => !seen.has(k));
      const parcial = etapa.tipo === 'co'; // guiada: el resto se resuelve repitiendo los algoritmos
      if (!parcial && EXPECTED[etapa.id] !== all.length) errors.push(`${etapa.id}: la enumeración da ${all.length} clases y se esperaban ${EXPECTED[etapa.id]}`);
      if ([...seen].some((k) => !all.includes(k)) || (!parcial && missing.length)) errors.push(`${etapa.id}: las clases no cubren las ${all.length} posibles (${all.join(' ')})`);
      stats[etapa.id].clases = `${seen.size}/${all.length}`;
      if (parcial) {
        const n = maxApplications(catalog, etapa);
        const dec = etapa.cobertura || {};
        if (n === null) errors.push(`${etapa.id}: los algoritmos no bastan para resolver todas las combinaciones de giros`);
        else if (dec.maximoAplicaciones !== n || dec.clases !== seen.size || dec.de !== all.length) errors.push(`${etapa.id}: la cobertura declarada (${JSON.stringify(dec)}) no coincide con la calculada (${seen.size} de ${all.length}, máximo ${n} aplicaciones)`);
        else if (etapa.descripcion !== descripcionCo({ clases: seen.size, de: all.length, maximoAplicaciones: n })) errors.push(`${etapa.id}: la descripción de la etapa no refleja la cobertura calculada (${seen.size} de ${all.length}, máximo ${n} aplicaciones)`);
        stats[etapa.id].clases += `, máx. ${n} aplicaciones`;
      }
    }
  }
  // Completitud del método: el catálogo, con giros de U, rotaciones del puzzle y hasta PREPARACION_MAX[etapa] giros libres
  // previos en las etapas de capas inferiores, debe resolver mezclas con semilla fija de principio a fin.
  if (!errors.length) {
    const fallos = [];
    const total = {}; // giros libres previos por etapa de capas inferiores, sumados en las mezclas resueltas
    for (let semilla = 1; semilla <= MEZCLAS; semilla++) {
      const r = resolverConCatalogo(catalog, semilla);
      if (!(r.ok && r.resuelto)) fallos.push(`${semilla} (${r.etapa || 'sin resolver al final'})`);
      else for (const [id, e] of Object.entries(r.porEtapa)) total[id] = (total[id] || 0) + e.total;
    }
    const medias = Object.entries(total).map(([id, t]) => `${id.replace(/^mg-/, '')} ${(t / MEZCLAS).toFixed(1)} (tope ${PREPARACION_MAX[catalog.etapas.find((e) => e.id === id).tipo]})`);
    if (fallos.length) errors.push(`el catálogo no resuelve ${fallos.length} de ${MEZCLAS} mezclas con semilla fija (topes de giros libres previos: ${JSON.stringify(PREPARACION_MAX)}): ${fallos.join(', ')}`);
    else console.log(`Completitud megaminx: ${MEZCLAS}/${MEZCLAS} mezclas resueltas. Giros libres previos por mezcla, de media: ${medias.join(', ')}.`);
    stats.completitud = { casos: 0, alternativas: 0, clases: `${MEZCLAS - fallos.length}/${MEZCLAS} mezclas resueltas; giros libres medios: ${medias.join(', ')}` };
  }
  return { errors, stats };
}
