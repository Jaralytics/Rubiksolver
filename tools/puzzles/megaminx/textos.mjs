// textos.mjs (Megaminx) — Nombre, grupo y descripción de los casos y de la etapa de esquinas
// (mg-co). Todo se calcula a partir del estado real del caso (o de la cobertura verificada), así
// el texto siempre dice lo que de verdad hay en el puzzle y no se puede desviar del algoritmo.
// verify.mjs vuelve a calcularlos y falla si el catálogo guarda un texto distinto.

import { NORMALS, SLOTS, FACE_INDEX } from '../../../js/megaminx-geometry.js';
import { CORNERS, EDGE0, cornerPermutation, cornerTwists, edgeOrientation, edgePermutation, unsolvedOf, piezaPorHome } from './firmas.mjs';

// ---------------------------------------------------------------------------
// Nombres en palabras
// ---------------------------------------------------------------------------

/** Color de cada cara, como en js/megaminx-view.js. */
const COLOR = { D: 'blanca', U: 'gris', DL: 'verde', DR: 'roja', DBR: 'azul', B: 'amarilla', DBL: 'morada', BR: 'lima', BL: 'naranja', L: 'celeste', F: 'crema', R: 'rosa' };
/** Nombre de cada cara, como en js/puzzles/megaminx.js («la cara …»). */
const CARA = { U: 'gris', D: 'blanca', F: 'frontal', R: 'derecha', L: 'izquierda', BR: 'trasera derecha', BL: 'trasera izquierda', B: 'trasera inferior', DL: 'inferior izquierda', DR: 'inferior derecha', DBL: 'inferior trasera izquierda', DBR: 'inferior trasera derecha' };

const mayuscula = (s) => s[0].toUpperCase() + s.slice(1);
/** Enumeración en español: «a, b y c»; la «y» pasa a «e» ante una palabra que empieza por «i». */
export const lista = (items) => {
  if (items.length < 2) return items.join('');
  const ultimo = items.at(-1);
  return `${items.slice(0, -1).join(', ')} ${/^h?i/i.test(ultimo) ? 'e' : 'y'} ${ultimo}`;
};

/**
 * Nombra una pieza o un hueco por sus caras de origen, siempre en palabras:
 *   - por 'colores': «la arista blanca y roja» (cómo es la pieza);
 *   - por 'caras': «la arista entre las caras inferior izquierda e inferior derecha» (dónde está);
 *   - con `sinU` la capa gris se sobrentiende: «la arista frontal», «la esquina frontal/derecha»;
 *   - `como: 'lugar'` da solo «entre las caras …» para usarlo tras «está en el hueco»;
 *   - `corto` quita «las caras» de «entre las caras …» (para los nombres, que van en una lista estrecha);
 *   - `codigo` añade el código entre paréntesis, «(D-DR)», que nunca va solo.
 */
export function nombrar(faces, { por = 'caras', como = 'pieza', codigo = false, articulo = true, sinU = false, corto = false } = {}) {
  const sustantivo = faces.length === 3 ? 'esquina' : 'arista';
  const cod = codigo ? ` (${faces.join('-')})` : '';
  let cuerpo;
  if (como === 'lugar') {
    cuerpo = `entre ${corto ? '' : 'las caras '}${lista(faces.map((f) => CARA[f]))}`;
  } else if (por === 'colores') {
    cuerpo = `${sustantivo} ${lista(faces.map((f) => COLOR[f]))}`;
  } else if (sinU) {
    const lado = faces.filter((f) => f !== 'U').map((f) => CARA[f]);
    cuerpo = `${sustantivo} ${lado.join('/')}`;
  } else {
    cuerpo = `${sustantivo} entre las caras ${lista(faces.map((f) => CARA[f]))}`;
  }
  const texto = articulo && como === 'pieza' ? `la ${cuerpo}` : cuerpo;
  return texto + cod;
}

/** Colores de una pieza unidos con guion y sin artículo: «blanca-roja-azul» (para los nombres cortos). */
const guion = (faces) => faces.map((f) => COLOR[f]).join('-');

/**
 * Hacia dónde mira una pegatina, visto el puzzle desde fuera con la cara blanca abajo:
 * «a la izquierda», «a la derecha», «arriba» o «abajo» (solo para los nombres cortos de los casos).
 * `faces` son las caras del hueco donde está la pieza y `cara` la que mira la pegatina.
 */
function lado(faces, cara) {
  const n = faces.map((f) => NORMALS[FACE_INDEX[f]]);
  const mid = [0, 1, 2].map((k) => n.reduce((a, v) => a + v[k], 0));
  const der = [mid[2], 0, -mid[0]]; // (-mirada) x arriba, con la mirada = -mid y arriba = (0, 1, 0)
  const r = n.map((v) => v[0] * der[0] + v[2] * der[2]);
  const y = n.map((v) => v[1]);
  const k = faces.indexOf(cara);
  const eps = 1e-6;
  const mayorY = y.indexOf(Math.max(...y));
  const menorR = r.indexOf(Math.min(...r));
  const mayorR = r.indexOf(Math.max(...r));
  if (faces.length === 2 && Math.abs(r[0] - r[1]) < eps) return k === mayorY ? 'arriba' : 'abajo';
  if (k === menorR) return 'a la izquierda';
  if (k === mayorR) return 'a la derecha';
  return y[k] >= (y[0] + y[1] + y[2]) / 3 ? 'arriba' : 'abajo';
}

const aristaU = (i) => nombrar(SLOTS[EDGE0 + i].faces, { sinU: true });
const caraU = (i) => CARA[SLOTS[EDGE0 + i].faces[1]];
const esquinaU = (j) => nombrar(SLOTS[CORNERS[j]].faces, { sinU: true });
const esquinaUCorta = (j) => esquinaU(j).replace(/^la esquina /, '');
/** Los nombres cortos numeran las cinco aristas y las cinco esquinas de la capa gris; la descripción dice cómo. */
const numAristas = `Las aristas de la capa gris se numeran del 1 (${caraU(0)}) al 5 en el orden ${lista([0, 1, 2, 3, 4].map(caraU))}.`;
const numEsquinas = `Las esquinas de la capa gris se numeran del 1 (${esquinaUCorta(0)}) al 5 en el orden ${lista([0, 1, 2, 3, 4].map(esquinaUCorta))}.`;

// ---------------------------------------------------------------------------
// Ciclos de una permutación
// ---------------------------------------------------------------------------

/** Ciclos de una permutación como listas de índices, empezando por el menor (sin los puntos fijos). */
function cycles(perm) {
  const seen = new Set();
  const out = [];
  perm.forEach((_, start) => {
    if (seen.has(start)) return;
    const cyc = [];
    for (let j = start; !seen.has(j); j = perm[j]) {
      seen.add(j);
      cyc.push(j);
    }
    if (cyc.length > 1) out.push(cyc);
  });
  return out;
}

const fijasDe = (perm) => perm.map((_, j) => j).filter((j) => perm[j] === j);
const estan = (items) => (items.length === 1 ? 'está' : 'están');

/** «la arista X» / «las aristas X y Y» (o «esquina(s)»). */
const grupoDe = (sustantivo, etiquetas) => `${etiquetas.length === 1 ? 'la' : 'las'} ${sustantivo}${etiquetas.length === 1 ? '' : 's'} ${lista(etiquetas)}`;

// ---------------------------------------------------------------------------
// Última capa: orientación de aristas
// ---------------------------------------------------------------------------

export function describirEo(m) {
  const malas = edgeOrientation(m).map((o, i) => ({ o, i })).filter((x) => x.o).map((x) => x.i);
  const buenas = [0, 1, 2, 3, 4].filter((i) => !malas.includes(i));
  const n = malas.length;
  const contiguas = n === 2 && (malas[1] - malas[0] === 1 || malas[1] - malas[0] === 4);
  const final = 'El algoritmo las deja todas con el gris arriba, aunque algunas aristas pueden cambiar de sitio: eso lo arregla la etapa siguiente.';
  if (n === 2) {
    return {
      grupo: 'Dos aristas con el gris de lado',
      nombre: `Dos aristas: ${lista(malas.map(caraU))}`,
      descripcion: `Las aristas ${lista(malas.map(caraU))} de la capa gris tienen el gris mirando hacia un lado${contiguas ? ' y son vecinas' : ' y entre ellas hay una arista bien orientada'}; las otras tres lo tienen arriba. ${final}`,
    };
  }
  return {
    grupo: 'Cuatro aristas con el gris de lado',
    nombre: `Cuatro aristas, solo ${caraU(buenas[0])} bien`,
    descripcion: `Cuatro aristas de la capa gris tienen el gris mirando hacia un lado y solo ${aristaU(buenas[0])} lo tiene arriba. ${final}`,
  };
}

// ---------------------------------------------------------------------------
// Última capa: permutación de aristas
// ---------------------------------------------------------------------------

export function describirEp(m) {
  const perm = edgePermutation(m);
  const cyc = cycles(perm);
  const fijas = fijasDe(perm);
  const sitio = `${grupoDe('arista', fijas.map(caraU))} ${estan(fijas)} en su sitio`;
  const final = 'El algoritmo las devuelve a su lugar con las aristas ya orientadas.';
  if (cyc.length === 1) {
    return {
      grupo: 'Un ciclo de tres aristas',
      nombre: `Tres aristas en ciclo ${cyc[0].map((i) => i + 1).join('-')}`,
      descripcion: `Las aristas ${lista(cyc[0].map(caraU))} de la capa gris están cambiadas entre sí en un ciclo; ${sitio}. ${numAristas} ${final}`,
    };
  }
  return {
    grupo: 'Dos pares intercambiados',
    nombre: `Dos pares de aristas: ${lista(cyc.map((c) => c.map((i) => i + 1).join('-')))}`,
    descripcion: `En la capa gris están intercambiadas las aristas ${lista(cyc.map((c) => `${c.map(caraU).join(' con ')}`))}; ${sitio}. ${numAristas} ${final}`,
  };
}

// ---------------------------------------------------------------------------
// Última capa: esquinas
// ---------------------------------------------------------------------------

export function describirCp(m) {
  const perm = cornerPermutation(m);
  const cyc = cycles(perm);
  const fijas = fijasDe(perm);
  const resto = 'Las aristas ya están en su sitio y se quedan así; puede quedar alguna esquina girada, que arregla la etapa siguiente.';
  const sitio = `${grupoDe('esquina', fijas.map(esquinaUCorta))} ${estan(fijas)} en su sitio`;
  if (cyc.length === 1 && cyc[0].length === 3) {
    return {
      grupo: 'Ciclo de tres esquinas',
      nombre: `Tres esquinas en ciclo ${cyc[0].map((j) => j + 1).join('-')}`,
      descripcion: `Las esquinas ${lista(cyc[0].map(esquinaUCorta))} están cambiadas entre sí en un ciclo; ${sitio}. ${numEsquinas} ${resto}`,
    };
  }
  if (cyc.length === 2 && cyc.every((c) => c.length === 2)) {
    const pares = cyc.map((c) => c.map(esquinaUCorta).join(' con '));
    return {
      grupo: 'Dos pares de esquinas intercambiados',
      nombre: `Dos pares de esquinas: ${lista(cyc.map((c) => c.map((j) => j + 1).join('-')))}`,
      descripcion: `Están intercambiadas las esquinas ${lista(pares)}; ${sitio}. ${numEsquinas} ${resto}`,
    };
  }
  // Un ciclo de cinco: si es un desplazamiento uniforme, se dice cuántos huecos.
  const k = (perm[0] + 5) % 5;
  const uniforme = perm.every((v, i) => v === (i + k) % 5);
  const huecos = `${k} ${k === 1 ? 'hueco' : 'huecos'}`;
  const orden = cyc[0].map((j) => j + 1).join('-');
  return {
    grupo: 'Cinco esquinas desplazadas',
    nombre: uniforme ? `Cinco esquinas corridas ${huecos}` : `Cinco esquinas en ciclo ${orden}`,
    descripcion: uniforme
      ? `Las cinco esquinas están corridas ${huecos} respecto de su sitio, todas en el mismo sentido alrededor de la capa gris. ${resto}`
      : `Las cinco esquinas forman un ciclo. Numeradas del 1 (${esquinaUCorta(0)}) al 5 en sentido contrario a las agujas del reloj visto desde arriba, cada una ocupa el sitio de la anterior en este orden: ${orden}. ${resto}`,
  };
}

// ---------------------------------------------------------------------------
// Última capa: giro de esquinas
// ---------------------------------------------------------------------------

export function describirCo(m) {
  const t = cornerTwists(m);
  const malas = t.map((v, j) => ({ v, j })).filter((x) => x.v);
  const dir = (j) => SLOTS[CORNERS[j]].faces.filter((g) => g !== 'U').find((g) => m.stickerAt(CORNERS[j], g).face === 'U');
  const partes = malas.map(({ j }) => `en ${esquinaU(j)} (${SLOTS[CORNERS[j]].faces.join('-')}) el gris mira hacia la cara ${CARA[dir(j)]}`);
  const lados = [...new Set(malas.map(({ v }) => v))];
  return {
    grupo: `${malas.length} esquinas giradas`,
    nombre: `Esquinas giradas: ${lista(malas.map(({ j }) => j + 1))}`,
    descripcion: `Todas las esquinas están en su sitio, pero ${lista(partes)}; las demás ya tienen el gris arriba. El algoritmo gira ${malas.length === 2 && lados.length === 2 ? 'las dos esquinas en sentidos opuestos' : 'esas esquinas'} y deja todo resuelto. ${numEsquinas}`,
  };
}

/** Descripción de la etapa de giro de esquinas: el máximo de aplicaciones sale de la cobertura verificada. */
export function descripcionCo(cobertura) {
  const n = cobertura.maximoAplicaciones;
  return `Con todas las piezas en su sitio, gira las esquinas de la capa gris hasta que el gris mire arriba. Cada algoritmo gira dos esquinas en sentidos opuestos. Solo se listan ${cobertura.clases} situaciones de las ${cobertura.de} posibles: cualquier otra se resuelve aplicándolas como máximo ${n} ${n === 1 ? 'vez' : 'veces'} y girando la capa gris entre medias.`;
}

// ---------------------------------------------------------------------------
// Capas inferiores: una pieza cada vez
// ---------------------------------------------------------------------------

const RESTO = {
  estrella: 'sin mover las otras aristas blancas ya colocadas',
  capa1: 'sin mover las aristas blancas ni las esquinas blancas ya colocadas',
  capa2: 'sin mover las piezas de la cara blanca ni las otras aristas ya colocadas',
  's2l-bajo': 'sin mover la cara blanca, las aristas de la segunda capa ni las otras esquinas ya colocadas',
};

const SUPERIORES = ['U', 'F', 'R', 'BR', 'BL', 'L'];

const colores = (faces) => nombrar(faces, { por: 'colores', articulo: false });
/** Pieza con su código la primera vez que se nombra en una descripción. */
const conCodigo = (faces) => nombrar(faces, { por: 'colores', codigo: true });
/** Lugar con su código: «entre las caras derecha y frontal (F-R)». */
const lugarCod = (faces) => nombrar(faces, { como: 'lugar', codigo: true });

export function describirCapas(tipo, m, pieza, libres = []) {
  if (tipo === 's2l-alto') return describirAlto(m, pieza, libres);
  const p = pieza ? piezaPorHome(m, pieza) : unsolvedOf(tipo, m)[0];
  const caras = SLOTS[p.pos].faces;
  const hueco = SLOTS[p.slot].faces;
  const enSitio = p.pos === p.slot;
  const stk = (g) => m.stickerAt(p.pos, g).face;
  // Pegatina de referencia: el blanco si la pieza lo tiene; si no, el color de su primera cara de origen.
  const clave = p.home.includes('D') ? 'D' : p.home[0];
  const haciaClave = caras.find((g) => stk(g) === clave);
  const queClave = clave === 'D' ? 'el blanco' : `la pegatina ${COLOR[clave]}`;

  const donde = enSitio ? 'está en su hueco pero girada' : `está en el hueco ${lugarCod(caras)}`;
  const sueltas = libres.length
    ? `; además mueve ${lista(libres.map((h) => conCodigo(h.split('-'))))}, que ${libres.length > 1 ? 'aún no están colocadas' : 'aún no está colocada'}`
    : '';
  const descripcion = `${mayuscula(conCodigo(p.home))} ${donde}, con ${queClave} hacia la cara ${CARA[haciaClave]}. El algoritmo la lleva a su hueco ${lugarCod(hueco)} ${RESTO[tipo]}${sueltas}.`;

  // Nombres cortos: colores de la pieza con guion y, si hace falta, hacia dónde mira la pegatina clave.
  const pieza_ = mayuscula(`${p.home.length === 3 ? 'esquina' : 'arista'} ${guion(p.home)}`);
  const haciaLado = lado(caras, haciaClave);
  const clara = clave === 'D' ? haciaLado : `${COLOR[clave]} ${haciaLado}`;
  const hayArriba = caras.some((g) => SUPERIORES.includes(g) && g !== 'D');
  const sobre = !caras.includes('D') && caras.filter((g) => hueco.includes(g)).length === 2; // la esquina está justo encima de su hueco
  let grupo;
  let nombre;
  if (tipo === 'estrella') {
    grupo = enSitio ? 'Volteada en su hueco' : hayArriba ? 'Entre una cara de arriba y una de abajo' : 'Deslizar por el anillo de abajo';
    nombre = enSitio
      ? `${pieza_} volteada en su hueco`
      : hayArriba
        ? `${pieza_}, blanco hacia ${haciaLado === 'abajo' ? 'abajo' : 'arriba'}`
        : `${pieza_}, blanco ${haciaLado}`;
  } else if (tipo === 'capa1') {
    grupo = enSitio ? 'Girada en su sitio' : sobre ? 'Insertar desde arriba' : 'En el hueco de otra esquina';
    nombre = enSitio
      ? `${pieza_} girada`
      : sobre
        ? `${pieza_}, blanco ${haciaLado}`
        : `${pieza_} en hueco ajeno`;
  } else if (tipo === 'capa2') {
    const arriba = caras.some((g) => SUPERIORES.includes(g));
    grupo = enSitio ? 'Girada en su sitio' : arriba ? 'Insertar desde arriba' : 'En el hueco de otra arista';
    nombre = enSitio
      ? `${pieza_} girada`
      : arriba
        ? `${pieza_} ${caras.every((g) => SUPERIORES.includes(g)) ? 'arriba' : 'de borde'}, ${clara}`
        : `${pieza_} en hueco ${guion(caras)}`;
  } else {
    grupo = caras.includes('U') ? 'Esquina en la capa gris' : 'Esquina en un hueco de arriba';
    nombre = `${mayuscula(COLOR[p.home[0]])} en ${guion(caras)}, ${haciaLado}`;
  }
  return { grupo, nombre, descripcion };
}

// ---------------------------------------------------------------------------
// Resto de piezas bajo la capa gris: pieza en la capa U que baja a su hueco
// ---------------------------------------------------------------------------

export function describirAlto(m, pieza, libres) {
  const p = piezaPorHome(m, pieza);
  const caras = SLOTS[p.pos].faces;
  const arriba = m.stickerAt(p.pos, 'U').face;
  const esquina = p.kind === 3;
  const superiores = p.home.filter((f) => SUPERIORES.includes(f)).length;
  const grupo = esquina
    ? 'Esquina entre dos caras de arriba y una de abajo'
    : superiores === 2
      ? 'Arista entre dos caras de arriba'
      : 'Arista entre una cara de arriba y una de abajo';
  const resto = libres.length
    ? `Al terminar solo han cambiado de sitio esa pieza, ${lista(libres.map((h) => conCodigo(h.split('-'))))} y las de la capa gris; lo demás queda como estaba.`
    : 'Al terminar solo han cambiado de sitio esa pieza y las de la capa gris; lo demás queda como estaba.';
  return {
    grupo,
    nombre: `${mayuscula(`${esquina ? 'esquina' : 'arista'} ${guion(p.home)}`)}, ${arriba === 'D' ? 'blanco' : COLOR[arriba]} arriba`,
    descripcion: `${mayuscula(conCodigo(p.home))} está en la capa gris, en el hueco ${lugarCod(caras)}, con ${arriba === 'D' ? 'el blanco' : `la pegatina ${COLOR[arriba]}`} mirando hacia arriba. El algoritmo la baja a su hueco ${lugarCod(SLOTS[p.slot].faces)}. ${resto}`,
  };
}

// ---------------------------------------------------------------------------
// Entrada común de build y verify
// ---------------------------------------------------------------------------

/** { nombre, grupo, descripcion } de un caso según su tipo de etapa y su estado. */
export function textoCaso(tipo, state, pieza, libres) {
  if (tipo === 'eo') return describirEo(state);
  if (tipo === 'ep') return describirEp(state);
  if (tipo === 'cp') return describirCp(state);
  if (tipo === 'co') return describirCo(state);
  return describirCapas(tipo, state, pieza, libres);
}
