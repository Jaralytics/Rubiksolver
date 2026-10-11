// Megaminx — Dodecaedro de doce caras. Su modelo, vista y miniaturas no comparten nada con los cubos.

import { MegaminxModel, parseAlg, invertMoves } from '../megaminx-model.js';
import { MegaminxView } from '../megaminx-view.js';
import { faceView } from '../megaminx-thumbnails.js';
import { FACES, FACE_INDEX, SLOTS, adjacent } from '../megaminx-geometry.js';
import { megaminxIcon } from '../icons.js';

// Caras que rodean a D (anillo inferior); las del anillo superior rodean a U.
const INFERIOR = ['B', 'DBL', 'DL', 'DR', 'DBR'];
const SUPERIOR = ['F', 'R', 'BR', 'BL', 'L'];

// Máscaras: (pieza, cara de la pegatina) → ¿se muestra con color? Cada nivel incluye al anterior.
// `home` son las caras de origen de la pieza; `face`, la cara de origen de la pegatina.
const tiene = (p, cara) => p.home.includes(cara);
const sinU = (p) => !tiene(p, 'U');
const centro = (p) => p.home.length === 1;
const arista = (p) => p.home.length === 2;
const esquina = (p) => p.home.length === 3;
const enInferior = (f) => INFERIOR.includes(f);
const enSuperior = (f) => SUPERIOR.includes(f);

const estrella = (p) => tiene(p, 'D') && !esquina(p);
const capa1 = (p) => tiene(p, 'D');
// Segunda capa: lo que solo toca D y su anillo (centros del anillo y aristas entre dos de sus caras).
const capa2 = (p) => p.home.every((f) => f === 'D' || enInferior(f));
// Capa 2 más las esquinas con dos caras inferiores y una superior (y los centros, que nunca se mueven).
const s2lBajo = (p) =>
  capa2(p) || (centro(p) && sinU(p)) || (esquina(p) && p.home.filter(enInferior).length === 2 && p.home.filter(enSuperior).length === 1);
const s2lAlto = sinU;
const eo = (p, face) => sinU(p) || centro(p) || (arista(p) && face === 'U');
const ep = (p, face) => eo(p, face) || arista(p);

const PARTE = {
  U: 'la cara superior',
  D: 'la cara inferior',
  F: 'la cara frontal',
  R: 'la cara derecha',
  L: 'la cara izquierda',
  BR: 'la cara trasera derecha',
  BL: 'la cara trasera izquierda',
  B: 'la cara trasera inferior',
  DL: 'la cara inferior izquierda',
  DR: 'la cara inferior derecha',
  DBL: 'la cara inferior trasera izquierda',
  DBR: 'la cara inferior trasera derecha',
  y: 'el Megaminx entero, en el sentido de U',
};

function describeMove(move) {
  const cantidad = move.amount === 2 ? 'dos quintos de vuelta' : 'un quinto de vuelta';
  return `${move.text}: ${PARTE[move.base]}, ${cantidad}, ${move.prime ? 'antihorario' : 'horario'}`;
}

/**
 * Cara de la miniatura de un caso: la de la etapa si en su flor (la cara y sus cinco vecinas) se ven
 * las pegatinas de la pieza objetivo, tanto donde está como en su hueco; si no, la cara que más ve.
 */
function caraDelCaso(model, etapa, caso) {
  const cara = etapa.cara ?? 'D';
  const objetivo = caso?.verificacion?.pieza;
  if (!objetivo) return cara;
  const pieza = model.pieces.find((p) => p.home.length === objetivo.length && objetivo.every((f) => p.home.includes(f)));
  if (!pieza) return cara;
  const caras = [...new Set([...SLOTS[pieza.pos].faceIdx, ...SLOTS[pieza.slot].faceIdx])];
  const vistas = (g) => caras.filter((h) => h === g || adjacent(g, h)).length;
  let mejor = FACE_INDEX[cara];
  for (let g = 0; g < FACES.length; g++) if (vistas(g) > vistas(mejor)) mejor = g;
  return FACES[mejor];
}

/** Miniatura de un caso según la etapa: la planta de U con sus lados, o una cara con sus cinco vecinas. */
function miniatura(model, mask, etapa, caso) {
  if (etapa.miniatura === 'flor') return faceView(model, mask, { cara: caraDelCaso(model, etapa, caso), anillo: 'todo' });
  return faceView(model, mask, { cara: 'U', anillo: 'toca' });
}

export default {
  id: 'megaminx',
  nombre: 'Megaminx',
  etiqueta: 'Megaminx',
  // Sus nombres de caso son largos: la lista en filas aguanta hasta 15 casos antes de pasar a la cuadrícula estrecha.
  maxCasosEnFilas: 15,
  catalogo: 'data/megaminx.json',
  crearModelo: () => new MegaminxModel(),
  Vista: MegaminxView,
  interpretar: parseAlg,
  invertir: invertMoves,
  miniatura,
  icono: megaminxIcon,
  describir: describeMove,
  mascaras: {
    estrella,
    capa1,
    capa2,
    's2l-bajo': s2lBajo,
    's2l-alto': s2lAlto,
    eo,
    ep,
    cp: () => true,
    co: () => true,
    todo: () => true,
  },
  ayuda: {
    intro: 'Cada letra es un giro de un quinto de vuelta en sentido horario, mirando esa cara de frente.',
    notacion: [
      ['U', 'Cara superior (gris)'],
      ['D', 'Cara inferior (blanca)'],
      ['F', 'Cara frontal, la que mira hacia ti bajo U'],
      ['R L', 'Caras derecha e izquierda de la fila superior, junto a U'],
      ['BR BL', 'Caras traseras derecha e izquierda de la fila superior, junto a U'],
      ['B', 'Cara trasera de la fila inferior, junto a D'],
      ['DL DR', 'Caras inferiores izquierda y derecha de la fila inferior, junto a D (delante)'],
      ['DBL DBR', 'Caras inferiores traseras izquierda y derecha, junto a D (detrás)'],
      ["R'", 'El apóstrofo invierte el giro: sentido antihorario'],
      ['R2', 'Dos giros seguidos de un quinto de vuelta (144°) en sentido horario'],
      ["R2'", 'Lo mismo en sentido antihorario'],
      ['y', 'Gira el Megaminx entero como U (también y\', y2 e y2\')'],
      ['Un giro', 'Es un quinto de vuelta (72°). Los movimientos se separan con espacios: «B R» son dos movimientos y «BR» es una sola cara.'],
    ],
    nota: 'El Megaminx se sostiene con la cara blanca abajo y la gris arriba. Las piezas en gris oscuro todavía no importan en esa etapa.',
  },
};
