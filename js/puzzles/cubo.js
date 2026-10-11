// cubo.js — Fábrica de las entradas de cubos NxN: modelo, vista, notación, miniaturas e icono
// son los mismos para todos; cada tamaño solo aporta su id, catálogo, máscaras y ayuda.

import { CubeModel, parseAlg, invertMoves } from '../cube-model.js';
import { CubeView } from '../cube-view.js';
import { topView, isoView, layersView, ARROW_DEFS } from '../thumbnails.js';
import { cubeIcon } from '../icons.js';

// --- Explicación de un movimiento en palabras ---

const PARTE = {
  R: 'la cara derecha',
  L: 'la cara izquierda',
  U: 'la cara superior',
  D: 'la cara inferior',
  F: 'la cara frontal',
  B: 'la cara trasera',
  r: 'la cara derecha junto con la capa central',
  l: 'la cara izquierda junto con la capa central',
  u: 'la cara superior junto con la capa central',
  d: 'la cara inferior junto con la capa central',
  f: 'la cara frontal junto con la capa central',
  b: 'la cara trasera junto con la capa central',
  M: 'la capa central, en el sentido de L',
  E: 'la capa central, en el sentido de D',
  S: 'la capa central, en el sentido de F',
  x: 'el cubo entero, en el sentido de R',
  y: 'el cubo entero, en el sentido de U',
  z: 'el cubo entero, en el sentido de F',
};

const CARA = { R: 'derecha', L: 'izquierda', U: 'superior', D: 'inferior', F: 'frontal', B: 'trasera' };

/** Capas que gira un movimiento que no está en la tabla (capas interiores y rangos de cubos grandes). */
function describeLayers(move) {
  if (!move.face) return move.base;
  const cara = `desde la cara ${CARA[move.face]}`;
  return move.from === move.to ? `la capa ${move.from} ${cara}` : `las capas ${move.from} a ${move.to} ${cara}`;
}

function describeMove(move) {
  const how = move.amount === 2 ? 'media vuelta' : move.prime ? 'un cuarto de vuelta, antihorario' : 'un cuarto de vuelta, horario';
  return `${move.text}: ${PARTE[move.base] || describeLayers(move)}, ${how}`;
}

/** Miniatura de un caso según la etapa: en planta, por capas o mini-cubo isométrico. */
function miniatura(model, mask, etapa) {
  const draw = { planta: () => topView(model, mask, { arrows: etapa.flechas }), capas: () => layersView(model, mask) }[etapa.miniatura];
  return draw ? draw() : isoView(model, mask);
}

// Secuencias con nombre propio; se señalan cuando el caso no trae notas.
const GATILLOS = [
  ["R U R' U R U2 R'", 'Sune'],
  ["R U2 R' U' R U' R'", 'Antisune'],
  ["F R U R' U' F'", "F + «sexy move» + F'"],
  ["R U R' U'", '«sexy move»'],
  ["R' F R F'", '«sledgehammer»'],
  ["U R U' R'", '«sexy move» inverso'],
  ["R U R'", 'inserción básica'],
];

/** Nombre del gatillo que contiene el movimiento `index` de `moves`, o null. */
function gatilloEn(moves, index) {
  const texts = moves.map((m) => m.text);
  for (const [seq, name] of GATILLOS) {
    const parts = seq.split(' ');
    for (let start = Math.max(0, index - parts.length + 1); start <= index && start + parts.length <= texts.length; start++) {
      if (parts.every((p, k) => texts[start + k] === p)) return name;
    }
  }
  return null;
}

/** Entrada del registro para un cubo de `size`×`size`; `datos` aporta id, nombre, catalogo, mascaras y ayuda. */
export function crearCubo(size, datos) {
  return {
    etiqueta: datos.id,
    ...datos,
    crearModelo: () => new CubeModel(size),
    Vista: CubeView,
    interpretar: (texto) => parseAlg(texto, size),
    invertir: invertMoves,
    gatillo: gatilloEn,
    abreviar: (nombre) => nombre.replace(/^(OLL|F2L|Perm) /, ''),
    defs: ARROW_DEFS,
    miniatura,
    icono: () => cubeIcon(size),
    describir: describeMove,
  };
}
