// 2x2 — Sin centros ni aristas. El marco de referencia es la esquina inferior-trasera-izquierda.

import { crearCubo } from './cubo.js';

export default crearCubo(2, {
  id: '2x2',
  nombre: 'Cubo 2x2',
  etiqueta: '2x2',
  catalogo: 'data/2x2.json',
  mascaras: {
    todo: () => true,
    capa1: (p) => p.home[1] < 0,
    cara: (p, face) => face === 'D',
    oll: (p, face) => p.home[1] < 0 || face === 'U',
  },
  ayuda: {
    notacion: [
      ['R L', 'Cara derecha e izquierda'],
      ['U D', 'Cara superior e inferior'],
      ['F B', 'Cara frontal y trasera'],
      ["R'", 'El apóstrofo invierte el giro: sentido antihorario'],
      ['R2', 'Media vuelta'],
      ['x y z', 'Gira el cubo entero (como R, como U y como F)'],
    ],
    nota: 'El 2x2 no tiene capa central: no existen M, E, S ni los giros anchos. Sin centros, el cubo se orienta por su esquina inferior-trasera-izquierda (blanco, azul y rojo). Se sostiene con el blanco abajo y el verde al frente.',
  },
});
