// source.mjs (Megaminx) — Fuente editable del catálogo del Megaminx. `node tools/build-catalog.mjs megaminx`
// la verifica con el motor lógico y genera data/megaminx.json.
//
// Convenciones: el puzzle se sostiene con el blanco (cara D) abajo y el gris (cara U) arriba.
// La capa superior tiene cinco aristas, en sentido antihorario visto desde arriba: UF, UR, UBR, UBL
// y UL. `clase` es la firma que el verificador debe calcular para el caso:
//   - EO: orientación de las aristas (1 = su gris no mira arriba) en esas cinco posiciones,
//     la menor de las cinco rotaciones de la capa U.
//   - EP: permutación de las aristas, la menor módulo giros de U antes y después.
// Los algoritmos de estas etapas mueven también las esquinas de la capa U; las esquinas no
// cuentan en estos objetivos y se tratan en sus propias etapas.

import { descripcionCo } from './textos.mjs';

export const FUENTES = [
  { nombre: 'SpeedSolving Wiki', url: 'https://www.speedsolving.com/wiki/', uso: 'Notación del Megaminx y método principiante por capas' },
  { nombre: 'Ruwix', url: 'https://ruwix.com/', uso: 'Método principiante del Megaminx' },
];

export const METODOS = [
  { id: 'principiante', nombre: 'Principiante', descripcion: 'Por capas, con el blanco abajo y el gris arriba: estrella y primera capa blancas, segunda capa, y luego orientar y colocar las aristas y las esquinas de la capa gris.' },
];

const EP_BASE = "R U R' U R U2' R'";
const EO_BASE = "F R U R' U' F'";

// Las tres formas posibles de las aristas de la capa gris mal orientadas (siempre un número par).
// El nombre, el grupo y la descripción de cada caso los calcula textos.mjs a partir de su estado.
const EO = [
  { alg: "F U R U' R' F'", clase: '00011' },
  { alg: EO_BASE, clase: '00101' },
  { alg: `(${EO_BASE}) (U2) (${EO_BASE})`, clase: '01111', notas: ['Gira un primer par de aristas', 'Gira la capa superior 144 grados', 'Gira el segundo par de aristas'] },
];

// Las tres permutaciones de aristas posibles (todas pares) con las aristas ya orientadas.
const EP = [
  { alg: EP_BASE, clase: '01342' },
  { alg: `(${EP_BASE}) (U2) (${EP_BASE})`, clase: '02143', notas: ['Primer ciclo de tres aristas', 'Gira la capa superior 144 grados', 'Segundo ciclo de tres aristas'] },
  { alg: `(${EP_BASE}) (U2) (${EP_BASE}) (U') (${EP_BASE})`, clase: '04321', notas: ['Primer ciclo de tres aristas', 'Gira la capa superior 144 grados', 'Segundo ciclo de tres aristas', 'Gira la capa superior 72 grados al revés', 'Tercer ciclo de tres aristas'] },
];

// Las 15 clases de permutación de esquinas con las aristas ya en su sitio, módulo la rotación del
// puzzle. Todas se resuelven con el ciclo de tres esquinas A (o su inverso) intercalado con giros de
// la capa superior que se deshacen al final, para que las aristas no se muevan.
const CP = [
  { alg: "U R U2' L' U2 R' U2' L U R U2' L' U2 R' U2' L U2", clase: '02143' },
  { alg: "U' L' U2 R U2' L U2 R' U2 L' U2 R U2' L U2 R'", clase: '03412' },
  { alg: "R U2' L' U2 R' U2' L U L' U2 R U2' L U2 R' U' R U2' L' U2 R' U2' L U2", clase: '04321' },
  { alg: "R U2' L' U2 R' U2' L U2", clase: '01342' },
  { alg: "U2' L' U2 R U2' L U2 R'", clase: '01423' },
  { alg: "U R U2' L' U2 R' U2' L U' L' U2 R U2' L U2 R'", clase: '02431' },
  { alg: "U' R U2' L' U2 R' U2' L U L' U2 R U2' L U2 R'", clase: '04132' },
  { alg: "U2 R U2' L' U2 R' U2' L R U2' L' U2 R' U2' L U2", clase: '12340' },
  { alg: "U2 R U2' L' U2 R' U2' L U2' L' U2 R U2' L U2 R'", clase: '12403' },
  { alg: "U2' R U2' L' U2 R' U2' L U' R U2' L' U2 R' U2' L U2", clase: '13042' },
  { alg: "U2' R U2' L' U2 R' U2' L U2 L' U2 R U2' L U2 R'", clase: '14023' },
  { alg: "L' U2 R U2' L U2 R' U L' U2 R U2' L U2 R'", clase: '20413' },
  { alg: "U R U2' L' U2 R' U2' L U2' R U2' L' U2 R' U2' L U2' L' U2 R U2' L U2 R'", clase: '23401' },
  { alg: "U' L' U2 R U2' L U2 R' U2 R U2' L' U2 R' U2' L U2 L' U2 R U2' L U2 R'", clase: '34012' },
  { alg: "U L' U2 R U2' L U2 R' L' U2 R U2' L U2 R'", clase: '40123' },
];

// Torsión de dos esquinas en sentidos opuestos: X gira la esquina U-F-R, la capa U trae otra esquina,
// Y la gira al revés y la capa U se deshace. Las cuatro distancias entre las dos esquinas son las
// cuatro clases; el resto de combinaciones se resuelven repitiendo estos algoritmos.
const X = "(R' DR' R DR)2";
const Y = "(DR' R' DR R)2";
const CO = [
  { alg: `${X} U ${Y} U'`, clase: '00012' },
  { alg: `${X} U2 ${Y} U2'`, clase: '00102' },
  { alg: `${X} U2' ${Y} U2`, clase: '00201' },
  { alg: `${X} U' ${Y} U`, clase: '00021' },
];

// Capas inferiores (cara blanca D abajo): una sola pieza fuera de su sitio, todo lo anterior resuelto.
const ESTRELLA = [
  { alg: "DR'", pieza: ['D', 'DR'] },
  { alg: "D DL D'", pieza: ['D', 'DBL'] },
  { alg: "DBR2' B' DBR2", pieza: ['D', 'B'] },
  { alg: "D2' DR' D2" },
  { alg: "D2 DBL D2'" },
  { alg: "B2 DBR B2'" },
  { alg: "DR2'", pieza: ['D', 'DR'] },
  { alg: "L' D' F2' DR2' D" },
  { alg: "D DBR R' D' DR", pieza: ['D', 'DR'] },
];
const CAPA1 = [
  { alg: "DR' R' DR", pieza: ['D', 'DR', 'DBR'] },
  { alg: "R' DR' R DR", pieza: ['D', 'DR', 'DBR'] },
  { alg: "DR2' R' DR2 R DR2", pieza: ['D', 'DR', 'DBR'] },
  { alg: "D' B2' D B D' B D B2'" },
  { alg: "D DL2 D' DL' D DL' D' DL2" },
  { alg: "DR D DBR2' D' DBR2 DR' DBR2'", pieza: ['D', 'B', 'DBR'] },
];
const CAPA2 = [
  { alg: "DBR DR R' DR' DBR'", pieza: ['DR', 'DBR'] },
  { alg: "DBR DR R DR' DBR'", pieza: ['DR', 'DBR'] },
  { alg: "DR' R DR F2 DR2' F' DR2", pieza: ['DR', 'DBR'] },
  { alg: "DR2' DBR2' D2 B2' D2' DBR2 DR2", pieza: ['B', 'DBL'] },
  { alg: "DR2 DL2 D2' DBL2 D2 DL2' DR2'", pieza: ['B', 'DBL'] },
  { alg: "B DBR2 B2 DBR2' B'", pieza: ['B', 'DBR'] },
  { alg: "B DBR2 B2' DBR2' B'", pieza: ['B', 'DBL'] },
  { alg: "DBL B2' BL DBL BL' B2 DBL'", pieza: ['B', 'DBR'] },
  { alg: "DBL B DBL B' BL' DBL'", pieza: ['B', 'DBL'] },
];

const BAJO = [
  { alg: "R'", pieza: ['R', 'DR', 'DBR'] },
  { alg: "R U' R2", pieza: ['R', 'DR', 'DBR'] },
  { alg: "B' BR2' B", pieza: ['BL', 'B', 'DBL'] },
  { alg: "R2' F2 R2", pieza: ['F', 'DL', 'DR'] },
  { alg: "BR2 BL2' BR2'", pieza: ['BL', 'B', 'DBL'] },
  { alg: "R' U2 L2 R", pieza: ['L', 'DBL', 'DL'] },
  { alg: "F' U2' BL2' F", pieza: ['BL', 'B', 'DBL'] },
  { alg: "DBL L2 DBL'", pieza: ['BL', 'B', 'DBL'] },
  { alg: "L2' DL' L' DL L2'", pieza: ['F', 'DL', 'DR'] },
  { alg: "R2 DR R DR' R2", pieza: ['F', 'DL', 'DR'] },
  { alg: "BR U2' L2' BR'", pieza: ['L', 'DBL', 'DL'] },
  { alg: "R2'", pieza: ['R', 'DR', 'DBR'] },
  { alg: "R' U' R2", pieza: ['R', 'DR', 'DBR'] },
];

// Resto de piezas bajo la capa U (cara gris arriba): cada caso baja una pieza desde la capa U a su hueco
// sin mover nada más de lo ya colocado (`libres` vacío: el algoritmo solo toca la capa U y el hueco).
const ALTO = [
  { alg: "U R U' R' U' F' U F", pieza: ['F', 'R'] },
  { alg: "U' F' U F U R U' R'", pieza: ['F', 'R'] },
  { alg: "(R' F' R F) U (F' R' F R) U'", pieza: ['F', 'DR'] },
  { alg: "(R' F2' U F2) U (F2' U' F2 R) U'", pieza: ['F', 'DR'] },
  { alg: "(R U F' R') U (R F U' R') U'", pieza: ['R', 'DR'] },
  { alg: "(F R2 U' R2') U (R2 U R2' F') U'", pieza: ['R', 'DR'] },
  { alg: "R U R' U2' R U R'", pieza: ['F', 'R', 'DR'] },
  { alg: "R U' R' U' R U2 R'", pieza: ['F', 'R', 'DR'] },
  { alg: "R2 U R2' U R2 U2' R2'", pieza: ['F', 'R', 'DR'] },
];

// Cuántas de las situaciones posibles cubren los algoritmos y con cuántas aplicaciones como máximo se
// resuelve cualquier otra; verify.mjs calcula estos valores por su cuenta y falla si no coinciden.
const COBERTURA_CO = { clases: 4, de: 16, maximoAplicaciones: 3 };

export const ETAPAS = [
  { id: 'mg-estrella', metodo: 'principiante', nombre: 'Estrella blanca', tipo: 'estrella', mascara: 'estrella', miniatura: 'flor', cara: 'D', descripcion: 'Lleva las cinco aristas blancas a su sitio alrededor del centro blanco, de una en una; las que ya están bien puestas no se mueven.', casos: ESTRELLA },
  { id: 'mg-capa1', metodo: 'principiante', nombre: 'Primera capa', tipo: 'capa1', mascara: 'capa1', miniatura: 'flor', cara: 'D', descripcion: 'Completa la cara blanca colocando sus cinco esquinas, una a una, sin deshacer la estrella. Cada esquina sigue el caso que más se parezca a su situación: sobre su hueco, girada en su sitio o en el hueco de otra esquina; si está en otro lugar, llévala antes a una de esas posiciones con giros libres.', casos: CAPA1 },
  { id: 'mg-capa2', metodo: 'principiante', nombre: 'Segunda capa', tipo: 'capa2', mascara: 'capa2', miniatura: 'flor', cara: 'DR', descripcion: 'Coloca las cinco aristas que unen dos caras inferiores, una a una, sin deshacer la cara blanca. Se meten desde el borde superior, por un lado o por el otro.', casos: CAPA2 },
  { id: 'mg-s2l-bajo', metodo: 'principiante', nombre: 'Esquinas bajas', tipo: 's2l-bajo', mascara: 's2l-bajo', miniatura: 'flor', cara: 'DR', descripcion: 'Baja las cinco esquinas que quedan entre dos caras inferiores y una superior, una a una, sin deshacer lo que ya tienes. Se insertan girando la cara de arriba hasta que la esquina esté al lado de su hueco.', casos: BAJO },
  { id: 'mg-s2l-alto', metodo: 'principiante', nombre: 'Capa intermedia', tipo: 's2l-alto', mascara: 's2l-alto', miniatura: 'flor', cara: 'F', descripcion: 'Completa todo lo que queda bajo la capa gris: aristas entre dos caras de arriba, aristas entre una de arriba y una de abajo, y esquinas entre dos de arriba y una de abajo. Sube la pieza a la capa gris, gírala hasta ponerla sobre su sitio y bájala con el algoritmo; si una pieza está mal colocada abajo, el algoritmo de su hueco la saca a la capa gris.', casos: ALTO },
  { id: 'mg-eo', metodo: 'principiante', nombre: 'Orientar aristas', tipo: 'eo', mascara: 'eo', miniatura: 'planta', cara: 'U', descripcion: 'Deja las cinco aristas de la capa gris con el gris hacia arriba, sin importar en qué sitio estén. Las esquinas se ignoran aquí y se resuelven en las etapas siguientes. Mira cuántas aristas tienen el gris de lado: siempre son 2 o 4.', casos: EO },
  { id: 'mg-ep', metodo: 'principiante', nombre: 'Permutar aristas', tipo: 'ep', mascara: 'ep', miniatura: 'planta', cara: 'U', descripcion: 'Con las aristas de la capa gris ya orientadas, colócalas en su sitio. Las esquinas se ignoran aquí y se resuelven en las etapas siguientes. Solo hay tres casos: un ciclo de tres aristas o dos intercambios de pares; al terminar, gira la capa gris para alinear cada arista con su cara.', casos: EP },
  { id: 'mg-cp', metodo: 'principiante', nombre: 'Permutar esquinas', tipo: 'cp', mascara: 'cp', miniatura: 'planta', cara: 'U', descripcion: 'Con las aristas ya en su sitio, coloca las cinco esquinas de la capa gris en sus huecos sin importar cómo estén giradas. Hay 15 situaciones y todas se resuelven con un ciclo de tres esquinas, repetido y con giros de la capa superior entre medias.', casos: CP },
  { id: 'mg-co', metodo: 'principiante', nombre: 'Orientar esquinas', tipo: 'co', mascara: 'co', miniatura: 'planta', cara: 'U', descripcion: descripcionCo(COBERTURA_CO), cobertura: COBERTURA_CO, casos: CO },
];
