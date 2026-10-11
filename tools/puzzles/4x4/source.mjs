// source.mjs (4x4) — Fuente editable del catálogo del 4x4 (método de reducción).
// `node tools/build-catalog.mjs 4x4` la verifica con el motor lógico y genera data/4x4.json.
//
// Notación: se escribe siempre explícita. «Rw» son las dos capas exteriores, «2R» solo la
// segunda y «2-3Rw» de la segunda a la tercera. En minúscula, «r» equivale a «Rw» (dos capas),
// como en el 3x3. M, E y S no existen en un 4x4.
//
// Cada caso declara su efecto concreto, que el verificador comprueba contra el estado:
//   centros  — huecos de centro con un color equivocado, como "color@cara[x,y,z]"
//   aristas  — aristas con las alas distintas (pares de caras ordenadas alfabéticamente)
//   alas     — posiciones de las alas con alguna pegatina fuera de sitio

export const FUENTES = [
  { nombre: 'SpeedSolving Wiki', url: 'https://www.speedsolving.com/wiki/', uso: 'Método de reducción y paridades del 4x4' },
  { nombre: 'J Perm', url: 'https://jperm.net/', uso: 'Orden de las etapas y paridades del 4x4' },
];

export const METODOS = [
  { id: 'reduccion', nombre: 'Reducción', descripcion: 'Reduce el 4x4 a un 3x3: centros, aristas emparejadas y, al final, las paridades.' },
];

const NOTAS_CONMUTADOR = ['Aparta la pieza con un giro', 'Mueve el centro con una capa interior', 'Deshaz el giro del principio', 'Deshaz la capa interior'];

// Conmutadores que cambian de sitio tres piezas de centro sin tocar nada más. Cada pieza
// debe saltar a la cara de su color. Los casos 1 y 3 comparten ciclo de caras (U → R → F) pero
// mueven piezas distintas de cada cara; lo mismo ocurre con 2 y 4 (U → F → R).
const CENTROS = [
  {
    nombre: 'Ciclo U → R → F, con la cara L',
    grupo: 'Ciclo U → R → F',
    alg: "(L 2F L') (2D) (L 2F' L') (2D')",
    centros: ['R@U[0.5,1.5,0.5]', 'F@R[1.5,-0.5,0.5]', 'U@F[-0.5,-0.5,1.5]'],
    descripcion: 'Tres centros en la cara equivocada: el naranja está arriba (delante a la derecha), el verde en la derecha (abajo, delante) y el amarillo en la frontal (abajo a la izquierda). Cada uno salta a la cara de su color: el de arriba pasa a la derecha, el de la derecha a la frontal y el de la frontal sube.',
    notas: NOTAS_CONMUTADOR,
  },
  {
    nombre: 'Ciclo U → R → F, otras piezas, con la cara F',
    grupo: 'Ciclo U → R → F',
    alg: "(2L F 2L') (2F') (2L F' 2L') (2F)",
    centros: ['R@U[-0.5,1.5,0.5]', 'F@R[1.5,0.5,0.5]', 'U@F[0.5,-0.5,1.5]'],
    descripcion: 'El mismo ciclo de caras que el caso anterior (arriba, derecha, frontal), pero con otras piezas: el naranja arriba (delante a la izquierda), el verde en la derecha (arriba, delante) y el amarillo en la frontal (abajo a la derecha). La cara F aparta la pieza mientras las capas interiores la mueven.',
    notas: NOTAS_CONMUTADOR,
  },
  {
    nombre: 'Ciclo U → F → R, con la cara L',
    grupo: 'Ciclo U → F → R',
    alg: "(L 2U' L') (2F) (L 2U L') (2F')",
    centros: ['F@U[-0.5,1.5,0.5]', 'U@R[1.5,0.5,0.5]', 'R@F[-0.5,0.5,1.5]'],
    descripcion: 'Tres centros en la cara equivocada, con el ciclo al revés que en los casos anteriores: el verde está arriba (delante a la izquierda), el amarillo en la derecha (arriba, delante) y el naranja en la frontal (arriba a la izquierda). El de arriba pasa a la frontal, el de la frontal a la derecha y el de la derecha sube.',
    notas: NOTAS_CONMUTADOR,
  },
  {
    nombre: 'Ciclo U → F → R, otras piezas, con la cara U',
    grupo: 'Ciclo U → F → R',
    alg: "(2L' U' 2L) (2U) (2L' U 2L) (2U')",
    centros: ['F@U[0.5,1.5,-0.5]', 'U@R[1.5,0.5,0.5]', 'R@F[-0.5,0.5,1.5]'],
    descripcion: 'El mismo ciclo que el caso anterior, pero la pieza de arriba es otra: el verde está arriba (detrás a la derecha). La cara U aparta la pieza mientras las capas interiores la mueven.',
    notas: NOTAS_CONMUTADOR,
  },
];

const NOTAS_ALAS = ['Aparta un ala con un giro de la cara', 'Cambia las alas con la capa interior', 'Devuelve el giro de la cara', 'Devuelve la capa interior'];

// Conmutadores [X, 2U] que mueven en ciclo tres alas de tres aristas distintas: antes de
// la solución esas tres aristas tienen las alas cruzadas, y después quedan emparejadas.
const ARISTAS = [
  {
    nombre: 'Ciclo de tres alas: UB, FR y BR',
    grupo: 'Conmutador con R U R\'',
    alg: "(R U R') (2U) (R U' R') (2U')",
    aristas: ['BU', 'FR', 'BR'],
    alas: [[-0.5, 1.5, -1.5], [1.5, 0.5, 1.5], [1.5, 0.5, -1.5]],
    descripcion: 'Tres aristas con un ala en el sitio de otra: el ala izquierda de la arista de arriba-atrás y las alas de arriba de las aristas frontal-derecha y trasera-derecha. Sus alas compañeras ya están bien. El conmutador las coloca de nuevo y deja emparejadas las tres aristas.',
    notas: NOTAS_ALAS,
  },
  {
    nombre: 'Ciclo de tres alas: UB, FR y FL',
    grupo: 'Conmutador con R U R\'',
    alg: "(R U R') (2U') (R U' R') (2U)",
    aristas: ['BU', 'FR', 'FL'],
    alas: [[-0.5, 1.5, -1.5], [1.5, 0.5, 1.5], [-1.5, 0.5, 1.5]],
    descripcion: 'Igual que el caso anterior con la capa interior girando al revés; ahora las alas fuera de sitio son la izquierda de la arista de arriba-atrás y las de arriba de las aristas frontal-derecha y frontal-izquierda.',
    notas: NOTAS_ALAS,
  },
  {
    nombre: 'Ciclo de tres alas: UF, FR y BR',
    grupo: 'Conmutador con R U\' R\'',
    alg: "(R U' R') (2U) (R U R') (2U')",
    aristas: ['FU', 'FR', 'BR'],
    alas: [[0.5, 1.5, 1.5], [1.5, 0.5, 1.5], [1.5, 0.5, -1.5]],
    descripcion: 'Tres aristas con las alas cruzadas: el ala derecha de la arista de arriba-delante y las alas de arriba de las aristas frontal-derecha y trasera-derecha. Se usa R U\' R\' en lugar de R U R\'.',
    notas: NOTAS_ALAS,
  },
  {
    nombre: 'Ciclo de tres alas: UF, FR y FL',
    grupo: 'Conmutador con R U\' R\'',
    alg: "(R U' R') (2U') (R U R') (2U)",
    aristas: ['FU', 'FR', 'FL'],
    alas: [[0.5, 1.5, 1.5], [1.5, 0.5, 1.5], [-1.5, 0.5, 1.5]],
    descripcion: 'Igual que el caso anterior con la capa interior girando al revés; las alas fuera de sitio son la derecha de la arista de arriba-delante y las de arriba de las aristas frontal-derecha y frontal-izquierda.',
    notas: NOTAS_ALAS,
  },
];

const PARIDAD_OLL = [
  {
    nombre: 'Arista volteada',
    grupo: 'Paridad',
    alg: "2R2 B2 U2 2L U2 2R' U2 2R U2 F2 2R F2 2L' B2 2R2",
    paridad: 'oll',
    alas: [[-0.5, 1.5, 1.5], [0.5, 1.5, 1.5]],
    descripcion: 'Con los centros y las aristas ya resueltos, la arista de arriba-delante (UF) está volteada: sus dos alas están en su sitio pero con los colores al revés. En un 3x3 es imposible; solo ocurre en el 4x4. El algoritmo la gira sin tocar nada más.',
  },
];

const PARIDAD_PLL = [
  {
    nombre: 'Dos aristas intercambiadas',
    grupo: 'Paridad',
    alg: '2R2 U2 2R2 Uw2 2R2 2U2',
    paridad: 'pll',
    alas: [[-0.5, 1.5, 1.5], [0.5, 1.5, 1.5], [0.5, 1.5, -1.5], [-0.5, 1.5, -1.5]],
    descripcion: 'Con el resto resuelto, las aristas de arriba-delante (UF) y arriba-atrás (UB) están intercambiadas. En un 3x3 sería imposible; solo ocurre en el 4x4. Este algoritmo las deja en su sitio.',
  },
];

export const ETAPAS = [
  { id: 'red-centros', metodo: 'reduccion', nombre: 'Centros', tipo: 'centros', mascara: 'centros', miniatura: 'iso', descripcion: 'Agrupa los cuatro centros de cada cara del mismo color. Es intuitivo: se construye una cara y se llevan piezas a ella con las capas interiores. Estos ejemplos guiados mueven tres piezas de centro con un conmutador.', casos: CENTROS },
  { id: 'red-aristas', metodo: 'reduccion', nombre: 'Aristas', tipo: 'aristas', mascara: 'aristas', miniatura: 'iso', descripcion: 'Empareja las alas de cada arista para que cada una se comporte como una arista de 3x3. Estos casos tienen tres aristas con las alas cruzadas y un conmutador las empareja.', casos: ARISTAS },
  { id: 'red-3x3', metodo: 'reduccion', nombre: 'Como un 3x3', tipo: 'enlace', mascara: 'todo', miniatura: 'iso', enlace: '3x3', descripcion: 'Con los centros agrupados y las aristas emparejadas, el cubo se resuelve como un 3x3: cruz, F2L, OLL y PLL con los mismos algoritmos.', casos: [] },
  { id: 'red-paridad-oll', metodo: 'reduccion', nombre: 'Paridad OLL', tipo: 'paridad-oll', mascara: 'todo', miniatura: 'iso', descripcion: 'Una arista queda volteada tras emparejar. Un único algoritmo largo lo arregla.', casos: PARIDAD_OLL },
  { id: 'red-paridad-pll', metodo: 'reduccion', nombre: 'Paridad PLL', tipo: 'paridad-pll', mascara: 'todo', miniatura: 'iso', descripcion: 'Dos aristas aparecen intercambiadas tras resolver como 3x3. Un algoritmo corto las deja en su sitio.', casos: PARIDAD_PLL },
];
