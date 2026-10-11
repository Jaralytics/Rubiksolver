// 4x4 — Método de reducción. Sin centros fijos: el marco de referencia es la esquina
// inferior-trasera-izquierda, y «resuelto» se decide por colores de pegatina.

import { crearCubo } from './cubo.js';

const H = 1.5;
const kind = (p) => p.home.filter((v) => Math.abs(v) === H).length; // 1 centro, 2 ala, 3 esquina

export default crearCubo(4, {
  id: '4x4',
  nombre: 'Cubo 4x4',
  etiqueta: '4x4',
  catalogo: 'data/4x4.json',
  mascaras: {
    todo: () => true,
    centros: (p) => kind(p) === 1,
    aristas: (p) => kind(p) <= 2,
  },
  ayuda: {
    notacion: [
      ['R L', 'Cara derecha e izquierda (solo la capa exterior)'],
      ['U D', 'Cara superior e inferior'],
      ['F B', 'Cara frontal y trasera'],
      ["R'", 'El apóstrofo invierte el giro: sentido antihorario'],
      ['R2', 'Media vuelta'],
      ['Rw  r', 'Las dos capas exteriores de esa cara. En minúscula (r u f…) significa lo mismo que con w'],
      ['3Rw', 'Las tres capas exteriores'],
      ['2R', 'Solo la segunda capa desde esa cara (capa interior)'],
      ['2-3Rw', 'De la segunda a la tercera capa desde esa cara'],
      ['x y z', 'Gira el cubo entero (como R, como U y como F)'],
    ],
    nota: 'El 4x4 no tiene capa central: no existen M, E ni S. Las capas interiores se escriben con número (2R, 2-3Rw). Sin centros fijos, el cubo se orienta por su esquina inferior-trasera-izquierda (blanco, azul y rojo): blanco abajo y verde al frente. Las piezas en gris todavía no importan en esa etapa.',
  },
});
