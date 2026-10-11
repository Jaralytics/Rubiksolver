// 3x3 — Primera entrada del registro de puzzles.

import { crearCubo } from './cubo.js';

// Máscaras: (pieza, cara de la pegatina) → ¿se muestra con color?
// `home[1]` es la capa de origen: -1 abajo (blanco), 0 media, 1 arriba (amarillo).
const kind = (p) => p.home.filter((v) => v !== 0).length; // 1 centro, 2 arista, 3 esquina

export default crearCubo(3, {
  id: '3x3',
  nombre: 'Cubo 3x3',
  etiqueta: '3x3',
  catalogo: 'data/3x3.json',
  mascaras: {
    todo: () => true,
    cruz: (p) => kind(p) === 1 || (kind(p) === 2 && p.home[1] === -1),
    capa1: (p) => kind(p) === 1 || p.home[1] === -1,
    f2l: (p) => kind(p) === 1 || p.home[1] < 1,
    eoll: (p, face) => kind(p) === 1 || p.home[1] < 1 || (kind(p) === 2 && face === 'U'),
    oll: (p, face) => p.home[1] < 1 || face === 'U',
    cpll: (p, face) => p.home[1] < 1 || face === 'U' || kind(p) === 3,
  },
  ayuda: {
    notacion: [
      ['R L', 'Cara derecha e izquierda'],
      ['U D', 'Cara superior e inferior'],
      ['F B', 'Cara frontal y trasera'],
      ["R'", 'El apóstrofo invierte el giro: sentido antihorario'],
      ['R2', 'Media vuelta'],
      ['r u f', 'En minúscula: la cara junto con la capa central'],
      ['M E S', 'Solo la capa central (M sigue a L, E sigue a D, S sigue a F)'],
      ['x y z', 'Gira el cubo entero (como R, como U y como F)'],
    ],
    nota: 'El cubo se sostiene con la cruz blanca abajo y el verde al frente. Las piezas en gris todavía no importan en esa etapa.',
  },
});
