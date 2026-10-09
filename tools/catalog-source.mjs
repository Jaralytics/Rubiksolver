// catalog-source.mjs — Fuente editable del catálogo. `node tools/build-catalog.mjs`
// la verifica con el motor lógico y genera data/algorithms.json.
//
// Convenciones:
//  - El cubo se sostiene con la cruz (blanco) abajo y el verde al frente.
//  - `alg` es el algoritmo principal; los paréntesis definen grupos y `notas`
//    (opcional) explica cada grupo en orden.
//  - `alt` son alternativas; el generador les añade el ajuste de U o la rotación
//    necesarios para que partan del mismo caso que el principal.
//  - `ref` es el número/nombre del caso en SpeedSolving Wiki, usado como
//    referencia cruzada (la firma del caso debe coincidir con la de la wiki).

export const FUENTES = [
  { nombre: 'SpeedSolving Wiki', url: 'https://www.speedsolving.com/wiki/', uso: 'Numeración de casos y referencia cruzada de OLL, PLL y F2L' },
  { nombre: 'J Perm', url: 'https://jperm.net/algs', uso: 'Selección del algoritmo principal y agrupación por formas' },
  { nombre: 'CubeSkills', url: 'https://www.cubeskills.com/', uso: 'Hojas de algoritmos de F2L, OLL y PLL' },
  { nombre: 'Ruwix', url: 'https://ruwix.com/', uso: 'Método principiante por capas' },
];

export const METODOS = [
  {
    id: 'cfop',
    nombre: 'CFOP',
    descripcion: 'El método de speedcubing más usado: Cruz, F2L, OLL y PLL.',
  },
  {
    id: 'principiante',
    nombre: 'Principiante',
    descripcion: 'Método por capas con pocos algoritmos fáciles de memorizar.',
  },
];

const SEXY = "R U R' U'";
const SUNE = "R U R' U R U2 R'";
const INSERTA_DER = "U R U' R' U' F' U F";

// ---------------------------------------------------------------------------
// Cruz (compartida por CFOP y principiante)
// ---------------------------------------------------------------------------

const CRUZ = [
  {
    nombre: 'Arriba, blanco hacia arriba',
    grupo: 'Arista en la capa superior',
    alg: 'F2',
    espera: { pos: [0, 1, 1], cara: 'U' },
    descripcion: 'La arista está en la capa superior con el blanco mirando arriba, justo sobre su centro. Media vuelta de la cara la baja a su sitio.',
    notas: ['Alinea la arista sobre su centro y baja con media vuelta'],
  },
  {
    nombre: 'Arriba, blanco hacia el frente',
    grupo: 'Arista en la capa superior',
    alg: "(U' R') (F) (R)",
    espera: { pos: [0, 1, 1], cara: 'F' },
    descripcion: 'La arista está arriba pero con el blanco mirando al frente: bajarla con F2 la dejaría volteada.',
    notas: ['Lleva la arista a la capa media', 'Bájala con el blanco hacia abajo', 'Devuelve la arista de la cruz que moviste'],
  },
  {
    nombre: 'Capa media a la derecha, blanco a la derecha',
    grupo: 'Arista en la capa media',
    alg: 'F',
    espera: { pos: [1, 0, 1], cara: 'R' },
    descripcion: 'La arista está en la capa media y su color lateral ya coincide con el centro del frente: un solo giro la baja.',
    notas: ['Un giro de la cara frontal la baja a su sitio'],
  },
  {
    nombre: 'Capa media a la izquierda, blanco a la izquierda',
    grupo: 'Arista en la capa media',
    alg: "F'",
    espera: { pos: [-1, 0, 1], cara: 'L' },
    descripcion: 'El espejo del caso anterior: la arista está en la capa media a la izquierda.',
    notas: ['Un giro de la cara frontal la baja a su sitio'],
  },
  {
    nombre: 'Capa media a la derecha, blanco al frente',
    grupo: 'Arista en la capa media',
    alg: "(D) (R') (D')",
    espera: { pos: [1, 0, 1], cara: 'F' },
    descripcion: 'La arista está en la capa media pero bajaría en la cara de la derecha. Se acerca el hueco con D, se baja y se devuelve.',
    notas: ['Lleva el hueco de la cruz bajo la arista', 'Baja la arista', 'Devuelve la cruz a su posición'],
  },
  {
    nombre: 'Capa media a la izquierda, blanco al frente',
    grupo: 'Arista en la capa media',
    alg: "(D') (L) (D)",
    espera: { pos: [-1, 0, 1], cara: 'F' },
    descripcion: 'Espejo del caso anterior, con la arista en la capa media a la izquierda.',
    notas: ['Lleva el hueco de la cruz bajo la arista', 'Baja la arista', 'Devuelve la cruz a su posición'],
  },
  {
    nombre: 'En su sitio pero volteada',
    grupo: 'Arista en la capa inferior',
    alg: "(F') (D R' D')",
    espera: { pos: [0, -1, 1], cara: 'F' },
    descripcion: 'La arista está en su posición de la cruz, pero con el blanco mirando al frente.',
    notas: ['Súbela a la capa media', 'Insértala bien orientada desde el lado'],
  },
  {
    nombre: 'Abajo, en el lugar equivocado',
    grupo: 'Arista en la capa inferior',
    alg: '(R2) (U) (F2)',
    espera: { pos: [1, -1, 0], cara: 'D' },
    ocultar: [[1, -1, 0]],
    descripcion: 'La arista está en la cruz con el blanco abajo, pero bajo el centro equivocado (aquí, el de la derecha, cuya arista aún no se ha colocado y por eso se ve gris).',
    notas: ['Súbela a la capa superior', 'Alinéala sobre su centro', 'Bájala a su sitio'],
  },
];

// Ejemplos de cruz completa: el generador busca la solución óptima de cada mezcla.
export const CRUZ_EJEMPLOS = [
  { nombre: 'Ejemplo 1: cruz completa', mezcla: "D2 R' U2 F2 L B2 L' D2 R' B' U L' F' D R2 B" },
  { nombre: 'Ejemplo 2: cruz completa', mezcla: "F2 U' L2 D F2 U B2 U2 R' B L' U2 F' D' L F' R2 D" },
];

// ---------------------------------------------------------------------------
// F2L — 41 casos. `ref` = número en SpeedSolving Wiki (el 37 es el caso resuelto).
// ---------------------------------------------------------------------------

const F2L_GRUPOS = [
  [1, 4, 'Inserciones básicas'],
  [5, 8, 'Recolocar la arista'],
  [9, 14, 'Recolocar la arista y girar la esquina'],
  [15, 18, 'Separar la pareja pasando por encima'],
  [19, 22, 'Pareja formada de lado'],
  [23, 24, 'Casos raros'],
  [25, 30, 'Esquina en su sitio, arista arriba'],
  [31, 36, 'Arista en su sitio, esquina arriba'],
  [38, 42, 'Esquina y arista en el hueco'],
];

const F2L_ALGS = {
  1: ["(U) (R U' R')", ["R' F R F'"], ['Aparta la arista', 'Inserta la pareja']],
  2: ["(U') (F' U F)", ["y' U' R' U R"], ['Aparta la arista', 'Inserta la pareja por el frente']],
  3: ["F' U' F", ["y' R' U' R"], ['La pareja ya está formada: insértala por el frente']],
  4: ["R U R'", [], ['La pareja ya está formada: insértala por la derecha']],
  5: ["(U' R U R') (U2) (R U' R')", ["U' R U R' U' R U2 R'"], ['Esconde la esquina y recoloca la arista', 'Alinea la pareja', 'Inserta']],
  6: ["(U' r U' R') (U R U r')", ["d R' U' R U2 R' U R"]],
  7: ["(U' R U2 R') (U2) (R U' R')", ["(U' R U2 R')2"], ['Forma la pareja', 'Alinea', 'Inserta']],
  8: ["(r' U2) (R2 U R2 U r)", ["d R' U2 R U2 R' U R"]],
  9: ["(U' R U' R') (U) (F' U' F)", ["d R' U' R U' R' U' R"], ['Forma la pareja', 'Alinea', 'Inserta por el frente']],
  10: ["(U' R U R') (U) (R U R')", ["U F' U F U' R U R'"], ['Forma la pareja', 'Alinea', 'Inserta por la derecha']],
  11: ["(U' R U2 R') (U) (F' U' F)", ["y' R U2 R2 U' R2 U' R'"], ['Forma la pareja', 'Alinea', 'Inserta por el frente']],
  12: ["(R U' R' U) (R U' R') (U2) (R U' R')", ["R' U2 R2 U R2 U R"]],
  13: ["(U F' U F) (U') (F' U' F)", ["d R' U R U' R' U' R"], ['Forma la pareja', 'Alinea', 'Inserta por el frente']],
  14: ["(U' R U' R') (U) (R U R')", [], ['Forma la pareja', 'Alinea', 'Inserta por la derecha']],
  15: ["(R' D' R) (U') (R' D R) (U) (R U' R')", ["R U R' U2 R U' R' U R U' R'"]],
  16: ["(R U' R') (U2) (F' U' F)", ["R U' R' U d R' U' R"], ['Saca la esquina y separa las piezas', 'Alinea la pareja', 'Inserta por el frente']],
  17: ["(R U2 R') (U') (R U R')", [], ['Separa las piezas', 'Alinea la pareja', 'Inserta']],
  18: ["(F' U2 F) (U) (F' U' F)", ["y' R' U2 R U R' U' R"], ['Separa las piezas', 'Alinea la pareja', 'Inserta por el frente']],
  19: ["(U) (R U2 R') (U) (R U' R')", ["(R U' R' U)2 R U R'"]],
  20: ["(U') (F' U2 F) (U') (F' U F)", ["y' U' R' U2 R U' R' U R"]],
  21: ["(R U' R') (U2) (R U R')", ["U2 R U R' U R U' R'"]],
  22: ["(r U' r') (U2) (r U r')", ["F' U F U2 F' U' F", "y' R' U R U2 R' U' R"]],
  23: ["(U2 R2 U2) (R' U' R U') (R2)", ["U R U' R' U' R U' R' U R U' R'"]],
  24: ["(F U R U' R' F') (R U' R')", ["y' U2 R2 U2 R U R' U R2"]],
  25: ["(U') (R' F R F') (R U R')", ["R' F' R U R U' R' F"]],
  26: ["(U) (R U' R') (F R' F' R)", ["U R U' R' U' F' U F"]],
  27: ["(R U' R' U) (R U' R')", ["R U' R2 F R F'"]],
  28: ["(R U R' U') (F R' F' R)", ["y' R' U R U' R' U R"]],
  29: ["(R' F R F') (U R U' R')", ["y' R' U' R U R' U' R", "(R' F R F')2"]],
  30: ["(R U R' U') (R U R')", [], ['Saca la esquina con el gatillo', 'Inserta la pareja']],
  31: ["(U') (R' F R F') (R U' R')", ["R U' R' d R' U R"]],
  32: ["(R U R' U')2 (R U R')", ["(U R U' R')3"], ['Repite el gatillo dos veces', 'Inserta']],
  33: ["(U' R U' R') (U2) (R U' R')", [], ['Forma la pareja', 'Alinea', 'Inserta']],
  34: ["(U R U R') (U2) (R U R')", ["U F' U F U2 F' U F"], ['Forma la pareja', 'Alinea', 'Inserta']],
  35: ["(U' R U R') (U) (F' U' F)", ["U' R U R' d R' U' R"], ['Forma la pareja', 'Alinea', 'Inserta por el frente']],
  36: ["(U F' U' F) (U') (R U R')", ["U2 R' F R F' U2 R U R'"], ['Forma la pareja', 'Alinea', 'Inserta por la derecha']],
  38: ["(R2 U2) (F R2 F') (U2 R' U R')", ["R U' R' d R' U2 R U2 R' U R"]],
  39: ["(R U' R') (U' R U R') (U2) (R U' R')", ["R U R' U' R U2 R' U' R U R'"], ['Saca la pareja', 'Recoloca', 'Alinea', 'Inserta']],
  40: ["(R U' R' U) (R U2 R') (U) (R U' R')", ["R U R' U2 R U' R' U R U R'"]],
  41: ["(r U' r') (U2) (r U r') (R U R')", ["R U' R' d R' U' R U' R' U' R"]],
  42: ["(R U' R') (r U' r') (U2) (r U r')", ["R U' R' U d R' U' R U' R' U R"]],
};

const F2L = Object.entries(F2L_ALGS).map(([ref, [alg, alt, notas]], i) => ({
  nombre: `F2L ${i + 1}`,
  grupo: F2L_GRUPOS.find(([a, b]) => ref >= a && ref <= b)[2],
  alg,
  alt,
  notas,
  ref: Number(ref),
}));

// ---------------------------------------------------------------------------
// OLL — 57 casos, agrupados por forma.
// ---------------------------------------------------------------------------

const OLL_GRUPOS = [
  ['Cruz hecha (solo esquinas)', 'La cruz amarilla ya está hecha; solo faltan esquinas. Son los 7 casos del OLL en dos pasos.', [27, 26, 21, 22, 23, 24, 25]],
  ['Formas en T', 'Las pegatinas amarillas forman una T.', [33, 45]],
  ['Cuadrados', 'Un bloque cuadrado de 2×2 amarillo en una esquina.', [5, 6]],
  ['Formas en C', 'Las pegatinas amarillas forman una C.', [34, 46]],
  ['Formas en W', 'Las pegatinas amarillas forman una W en diagonal.', [36, 38]],
  ['Esquinas orientadas', 'Las cuatro esquinas ya están orientadas; faltan aristas.', [28, 57]],
  ['Formas en P', 'Las pegatinas amarillas forman una P.', [31, 32, 43, 44]],
  ['Formas en I', 'Una línea amarilla que cruza el centro, sin esquinas orientadas.', [51, 52, 55, 56]],
  ['Peces', 'Forma de pez: un cuadrado con una cola en diagonal.', [9, 10, 35, 37]],
  ['Salto de caballo', 'Una línea central con una pegatina desplazada, como el salto del caballo.', [13, 14, 15, 16]],
  ['Formas incómodas', 'Formas irregulares con dos esquinas orientadas.', [29, 30, 41, 42]],
  ['L pequeña', 'Solo el centro y dos aristas adyacentes forman una L.', [47, 48, 49, 50, 53, 54]],
  ['Rayo pequeño', 'Un zigzag corto con una esquina orientada.', [7, 8, 11, 12]],
  ['Rayo grande', 'Un zigzag que cruza toda la cara.', [39, 40]],
  ['Punto', 'Ninguna arista orientada: solo el centro es amarillo.', [1, 2, 3, 4, 17, 18, 19, 20]],
];

const OLL_ALGS = {
  1: ['Pista', "(R U2 R') (R' F R F') (U2) (R' F R F')", ["R U' R2 D' r U' r' D R2 U R'"]],
  2: ['Zamboni', "(F R U R' U' F') (f R U R' U' f')", ["F R U R' U' S R U R' U' f'"]],
  3: ['Anti-molinillo', "(f R U R' U' f') (U') (F R U R' U' F')", ["r' R2 U R' U r U2 r' U M'"]],
  4: ['Molinillo', "(f R U R' U' f') (U) (F R U R' U' F')", ["R' F2 R2 U2 R' F' R U2 R2 F2 R"]],
  5: ['Cuadrado izquierdo', "r' U2 R U R' U r", ["l' U2 L U L' U l"]],
  6: ['Cuadrado derecho', "r U2 R' U' R U' r'", []],
  7: ['Sune ancho', "r U R' U R U2 r'", []],
  8: ['Sune ancho izquierdo', "r' U' R U' R' U2 r", ["l' U' L U' L' U2 l", "R U2 R' U2 R' F R F'"]],
  9: ['Cometa', "(R U R' U') (R' F R2 U R' U' F')", []],
  10: ['Anti-cometa', "(R U R' U) (R' F R F') (R U2 R')", ["F U F' R' F R U' R' F' R"]],
  11: ['Escalera abajo', "r U R' U R' F R F' R U2 r'", ["r' R2 U R' U R U2 R' U M'"]],
  12: ['Escalera arriba', "M' R' U' R U' R' U2 R U' R r'", ["l L2 U' L U' L' U2 L U' M'"]],
  13: ['Pistola', "(F U R U') (R2 F' R) (U R U' R')", ["F U R U2 R' U' R U R' F'", "r U' r' U' r U r' F' U F"]],
  14: ['Anti-pistola', "(R' F R) (U R' F' R) (F U' F')", []],
  15: ['Limpiacristales', "(r' U' r) (R' U' R U) (r' U r)", ["l' U' l L' U' L U l' U l"]],
  16: ['Anti-limpiacristales', "(r U r') (R U R' U') (r U' r')", []],
  17: ['Diagonal', "(R U R' U) (R' F R F') (U2) (R' F R F')", ["F R' F' R U S' R U' R' S"]],
  18: ['Corona', "(r U R' U R U2 r') (r' U' R U' R' U2 r)", ["R U2 R2 F R F' U2 M' U R U' r'"]],
  19: ['Conejo', "(r' R U) (R U R' U') (r R2 F R F')", ["S' R U R' S U' R' F R F'"]],
  20: ['Equis', "(r U R' U') (M2 U R U' R') (U' M')", ["M U R U R' U' M2 U R U' r'", "S' R U R' S U' M' U R U' r'"]],
  21: ['H (doble Sune)', "(R U R' U) (R U' R' U) (R U2 R')", ["R U2 R' U' R U R' U' R U' R'", "F (R U R' U')3 F'"]],
  22: ['Pi', "R U2 (R2 U' R2 U') (R2 U2 R)", ["f R U R' U' S' R U R' U' F'"]],
  23: ['Faros (U)', "(R2 D') (R U2 R') (D) (R U2 R)", ["R2 D R' U2 R D' R' U2 R'"]],
  24: ['T (camaleón)', "(r U R' U') (r' F R F')", ["l' U' L U l F' L' F"]],
  25: ['L (pajarita)', "(F') (r U R' U') (r' F R)", ["F R' F' r U R U' r'"]],
  26: ['Antisune', "R U2 R' U' R U' R'", ["R' U' R U' R' U2 R", "L' U' L U' L' U2 L"]],
  27: ['Sune', "R U R' U R U2 R'", ["R' U2 R U R' U R"]],
  28: ['Flecha', "(r U R' U') (r' R U R U' R')", ["M' U M U2 M' U M"]],
  29: ['Camaleón manchado', "(R U R' U') (R U' R') (F' U' F) (R U R')", ["r2 D' r U r' D r2 U' r' U' r"]],
  30: ['Anti-camaleón manchado', "(F R' F) (R2 U' R' U') (R U R' F2)", ["F U R U2 R' U' R U2 R' U' F'"]],
  31: ['Sofá', "(R' U' F) (U R U' R') (F' R)", []],
  32: ['Anti-sofá', "(L U F') (U' L' U L) (F L')", ["S R U R' U' R' F R f'", "R U B' U' R' U R B R'"]],
  33: ['Llave (T)', "(R U R' U') (R' F R F')", [], ['Gatillo «sexy move»', 'Gatillo «sledgehammer»']],
  34: ['Ciudad (C)', "(R U R2 U') (R' F R U) (R U' F')", ["f R f' U' r' U' R U M'"]],
  35: ['Ensalada de pez', "(R U2 R') (R' F R F') (R U2 R')", []],
  36: ['Wario (W)', "(L' U' L U') (L' U L U) (L F' L' F)", ["R U R2 F' U' F U R2 U2 R'", "R' F' U' F2 U R U' R' F' R"]],
  37: ['Pez montado', "(F R' F' R) (U R U' R')", ["F R U' R' U' R U R' F'"]],
  38: ['Mario (W)', "(R U R' U) (R U' R' U') (R' F R F')", []],
  39: ['Rayo grande izquierdo', "(L F' L') (U' L U) (F U' L')", ["R U R' F' U' F U R U2 R'"]],
  40: ['Rayo grande derecho', "(R' F R) (U R' U') (F' U R)", []],
  41: ['Pez incómodo', "(R U R' U R U2 R') (F R U R' U' F')", [], ['Sune', 'Orienta las aristas']],
  42: ['Pez incómodo izquierdo', "(R' U' R U' R' U2 R) (F R U R' U' F')", ["R' U' R U' R' U2 R U R' F' U' F U R"], ['Sune izquierdo', 'Orienta las aristas']],
  43: ['Anti-P', "(R' U' F') (U F R)", ["F' U' L' U L F"]],
  44: ['P', "(F) (U R U' R') (F')", ["f R U R' U' f'"], ['Abre con F', 'Gatillo', 'Cierra con F\'']],
  45: ['Traje (T)', "(F) (R U R' U') (F')", [], ['Abre con F', 'Gatillo «sexy move»', 'Cierra con F\'']],
  46: ['Faros (C)', "(R' U') (R' F R F') (U R)", [], ['Abre', 'Gatillo «sledgehammer»', 'Cierra']],
  47: ['Anti-rompecuellos', "(R' U') (R' F R F')2 (U R)", ["F' L' U' L U L' U' L U F"]],
  48: ['Rompecuellos', "(F) (R U R' U')2 (F')", [], ['Abre con F', 'Gatillo «sexy move» dos veces', 'Cierra con F\'']],
  49: ['L pequeña trasera', "r U' r2 U r2 U r2 U' r", ["R B' R2 F R2 B R2 F' R"]],
  50: ['L pequeña delantera', "r' U r2 U' r2 U' r2 U r'", ["R' F R2 B' R2 F' R2 B R'"]],
  51: ['Tapón', "(F) (U R U' R')2 (F')", ["f R U R' U' R U R' U' f'"], ['Abre con F', 'Gatillo dos veces', 'Cierra con F\'']],
  52: ['Olla arrocera', "(R U R' U) (R U' B U' B' R')", ["R' F' U' F U' R U R' U R"]],
  53: ['Sartén', "(r' U' R U') (R' U R U') (R' U2 r)", ["l' U' L U' L' U L U' L' U2 l"]],
  54: ['Anti-sartén', "(r U R' U) (R U' R' U) (R U2 r')", []],
  55: ['Autopista', "(R' F R U) (R U' R2 F') (R2 U' R' U) (R U R')", ["R U2 R2 U' R U' R' U2 F R F'", "r U2 R' U' r' R2 U R' U' r U' r'"]],
  56: ['Farolas', "(r U r') (U R U' R')2 (r U' r')", ["r' U' r U' R' U R U' R' U R r' U r"]],
  57: ['Momia (H)', "(R U R' U') (M' U R U' r')", []],
};

const OLL = OLL_GRUPOS.flatMap(([grupo, forma, nums]) =>
  nums.map((n) => {
    const [apodo, alg, alt, notas] = OLL_ALGS[n];
    return { nombre: `OLL ${n} · ${apodo}`, grupo, forma, alg, alt, notas, ref: n };
  }),
);

// ---------------------------------------------------------------------------
// PLL — 21 casos.
// ---------------------------------------------------------------------------

const PLL_GRUPOS = [
  ['Solo aristas', ['Ua', 'Ub', 'H', 'Z']],
  ['Solo esquinas', ['Aa', 'Ab', 'E']],
  ['Intercambio de esquinas adyacentes', ['T', 'F', 'Ja', 'Jb', 'Ra', 'Rb']],
  ['Intercambio de esquinas diagonales', ['V', 'Y', 'Na', 'Nb']],
  ['Permutaciones G', ['Ga', 'Gb', 'Gc', 'Gd']],
];

const PLL_ALGS = {
  Ua: ["(M2 U M) (U2) (M' U M2)", ["R U' R U R U R U' R' U' R2"], 'Las cuatro esquinas resueltas y una barra completa; las otras tres aristas rotan en {sentido}.'],
  Ub: ["(M2 U' M) (U2) (M' U' M2)", ["R2 U R U R' U' R' U' R' U R'"], 'Como Ua, pero las tres aristas rotan en {sentido}.'],
  H: ['(M2 U M2) (U2) (M2 U M2)', [], 'Esquinas resueltas; cada arista se intercambia con la opuesta. Todos los lados muestran un patrón ajedrezado.'],
  Z: ["(M' U M2 U M2 U M') (U2 M2)", ["M2 U M2 U M' U2 M2 U2 M'"], 'Esquinas resueltas; las aristas se intercambian por parejas adyacentes.'],
  Aa: ["x (R' U R') (D2) (R U' R') (D2) (R2) x'", ["x L2 D2 L' U' L D2 L' U L' x'"], 'Aristas resueltas; tres esquinas rotan en {sentido}. Hay un par de faros en un lado.'],
  Ab: ["x (R2) (D2) (R U R') (D2) (R U' R) x'", ["x' L2 D2 L U L' D2 L U' L x"], 'Aristas resueltas; tres esquinas rotan en {sentido}, al contrario que en Aa.'],
  E: ["x' (R U' R' D) (R U R' D') (R U R' D) (R U' R' D') x", [], 'Aristas resueltas; las esquinas se intercambian por parejas a cada lado. No hay faros en ningún lado.'],
  T: ["(R U R' U') (R' F R2 U' R') (U' R U R' F')", [], 'Se intercambian dos esquinas adyacentes y dos aristas opuestas. Faros en un lado y una barra de dos piezas en ambos costados.'],
  F: ["(R' U' F') (R U R' U') (R' F R2 U' R') (U' R U R' U R)", [], 'Una barra completa de tres piezas en un lado; se intercambian dos esquinas y dos aristas del resto.'],
  Ja: ["x (R2 F R F') (R U2) (r' U r U2) x'", ["R' U L' U2 R U' R' U2 R L"], 'Una barra completa en un lado y un bloque de dos piezas contiguo; se intercambian dos esquinas adyacentes y dos aristas adyacentes.'],
  Jb: ["(R U R' F') (R U R' U') (R' F R2 U' R')", ["R U2 R' U' R U2 L' U R' U' L"], 'Espejo de Ja: la barra completa y el bloque de dos piezas quedan al otro lado.'],
  Ra: ["(R U' R' U') (R U R D) (R' U' R D') (R' U2 R')", ["R U R' F' R U2 R' U2 R' F R U R U2 R'"], 'Faros en un lado y un solo bloque de dos piezas; el resto está desordenado.'],
  Rb: ["(R2 F R) (U R U' R') (F' R U2 R' U2 R)", ["R' U2 R U2 R' F R U R' U' R' F' R2"], 'Espejo de Ra.'],
  V: ["(R U' R U) (R' D R D') (R U' D) (R2 U R2 D' R2)", ["R' U R' U' y R' F' R2 U' R' U R' F R F"], 'Intercambio diagonal de esquinas con un bloque de dos piezas en dos lados contiguos.'],
  Y: ["(F R U' R') (U' R U R' F') (R U R' U') (R' F R F')", [], 'Intercambio diagonal de esquinas y de dos aristas adyacentes; no hay ninguna barra.'],
  Na: ["(R U R' U) (R U R' F') (R U R' U') (R' F R2 U' R') (U2 R U' R')", ["z U R' D R2 U' R D' U R' D R2 U' R D' z'"], 'Intercambio diagonal de esquinas y de dos aristas opuestas; cada lado muestra un bloque de dos piezas.'],
  Nb: ["(R' U R U') (R' F' U' F) (R U R' F) (R' F' R U' R)", ["(r D r' U2)5"], 'Espejo de Na.'],
  Ga: ["(R2 U) (R' U R' U') (R U' R2) (D U') (R' U R D')", ["R2 u R' U R' U' R u' R2 y' R' U R"], 'Faros en un lado; tres esquinas y tres aristas rotan. Un bloque de dos piezas contiguo a los faros.'],
  Gb: ["(R' U' R) (U D') (R2 U R' U) (R U' R U') (R2 D)", ["R' U' R y R2 u R' U R U' R u' R2"], 'Inverso de Ga.'],
  Gc: ["(R2 U') (R U' R U) (R' U R2) (D' U) (R U' R' D)", ["R2 u' R U' R U R' u R2 y R U' R'"], 'Como las demás G: faros en un lado y tres esquinas y tres aristas rotando. Cambia la posición del bloque de dos piezas.'],
  Gd: ["(R U R') (U' D) (R2 U' R U') (R' U R' U) (R2 D')", ["R U R' y' R2 u' R U' R' U R' u R2"], 'Inverso de Gc.'],
};

const PLL = PLL_GRUPOS.flatMap(([grupo, ids]) =>
  ids.map((id) => {
    const [alg, alt, descripcion] = PLL_ALGS[id];
    const letra = id.length === 2 ? `${id[0]}${id[1]}` : id;
    return { nombre: `Perm ${letra}`, grupo, alg, alt, descripcion, ref: id };
  }),
);

// ---------------------------------------------------------------------------
// Método principiante
// ---------------------------------------------------------------------------

const PR_ESQUINAS = [
  {
    nombre: 'Blanco hacia la derecha',
    grupo: 'Esquina arriba, sobre su hueco',
    alg: "R U R'",
    alt: [`(${SEXY})`],
    espera: { pos: [1, 1, 1], cara: 'R' },
    descripcion: 'La esquina está justo encima de su hueco con el blanco mirando a la derecha.',
    notas: ['Baja el hueco, mete la esquina y sube'],
  },
  {
    nombre: 'Blanco hacia el frente',
    grupo: 'Esquina arriba, sobre su hueco',
    alg: "F' U' F",
    alt: [`(${SEXY})5`],
    espera: { pos: [1, 1, 1], cara: 'F' },
    descripcion: 'La esquina está encima de su hueco con el blanco mirando al frente.',
    notas: ['El mismo movimiento, pero entrando por el frente'],
  },
  {
    nombre: 'Blanco hacia arriba',
    grupo: 'Esquina arriba, sobre su hueco',
    alg: "(R U2 R') (U') (R U R')",
    alt: [`(${SEXY})3`],
    espera: { pos: [1, 1, 1], cara: 'U' },
    descripcion: 'La esquina está encima de su hueco con el blanco mirando arriba.',
    notas: ['Gira la esquina para que el blanco mire de lado', 'Recolócala sobre el hueco', 'Insértala'],
  },
  {
    nombre: 'En el hueco, blanco al frente',
    grupo: 'Esquina en el hueco, mal orientada',
    alg: "(F' U' F U) (F' U' F)",
    alt: [`(${SEXY})4`],
    espera: { pos: [1, -1, 1], cara: 'F' },
    descripcion: 'La esquina ya está en su hueco pero girada, con el blanco al frente.',
    notas: ['Saca la esquina', 'Vuelve a insertarla bien orientada'],
  },
  {
    nombre: 'En el hueco, blanco a la derecha',
    grupo: 'Esquina en el hueco, mal orientada',
    alg: `(${SEXY}) (R U R')`,
    alt: [`(${SEXY})2`],
    espera: { pos: [1, -1, 1], cara: 'R' },
    descripcion: 'La esquina ya está en su hueco pero girada, con el blanco a la derecha.',
    notas: ['Saca la esquina', 'Vuelve a insertarla bien orientada'],
  },
];

const PR_CAPA2 = [
  {
    nombre: 'Arista hacia la derecha',
    grupo: 'Arista en la capa superior',
    alg: "(U R U' R') (U' F' U F)",
    pieza: [1, 0, 1],
    espera: { pos: [0, 1, 1], pegatina: 'F', cara: 'F' },
    descripcion: 'La arista está arriba al frente y su color frontal coincide con el centro. Tiene que bajar al hueco de la derecha.',
    notas: ['Aleja la arista y saca la esquina', 'Reinserta la esquina junto con la arista'],
  },
  {
    nombre: 'Arista hacia la izquierda',
    grupo: 'Arista en la capa superior',
    alg: "(U' L' U L) (U F U' F')",
    pieza: [-1, 0, 1],
    espera: { pos: [0, 1, 1], pegatina: 'F', cara: 'F' },
    descripcion: 'Espejo del caso anterior: la arista tiene que bajar al hueco de la izquierda.',
    notas: ['Aleja la arista y saca la esquina', 'Reinserta la esquina junto con la arista'],
  },
  {
    nombre: 'Arista en su hueco, volteada',
    grupo: 'Arista en la capa media',
    bloques: INSERTA_DER,
    clase: 'volteada',
    pieza: [1, 0, 1],
    espera: { pos: [1, 0, 1], pegatina: 'F', cara: 'R' },
    descripcion: 'La arista está en su hueco pero al revés. Se saca con el mismo algoritmo y se vuelve a insertar.',
    notaBloque: ['Saca la arista con el algoritmo de inserción', 'Colócala sobre su centro', 'Insértala bien orientada'],
  },
];

export const ETAPAS = [
  {
    id: 'cfop-cruz',
    metodo: 'cfop',
    nombre: 'Cruz',
    tipo: 'cruz',
    mascara: 'cruz',
    miniatura: 'iso',
    descripcion:
      'Forma una cruz blanca en la cara inferior, con cada arista alineada con el centro de su lado. Es intuitiva: no se memorizan algoritmos, sino cómo llevar cada arista según dónde esté. El objetivo es planearla entera y hacerla en 8 movimientos o menos.',
    casos: CRUZ,
    ejemplos: true,
  },
  {
    id: 'cfop-f2l',
    metodo: 'cfop',
    nombre: 'F2L',
    tipo: 'f2l',
    mascara: 'f2l',
    miniatura: 'iso',
    descripcion:
      'First Two Layers: se resuelven las dos primeras capas a la vez, insertando cuatro parejas esquina-arista. Estos son los 41 casos de una pareja respecto de su hueco (aquí, el del frente a la derecha). La idea siempre es la misma: formar la pareja en la capa superior e insertarla.',
    casos: F2L,
  },
  {
    id: 'cfop-oll',
    metodo: 'cfop',
    nombre: 'OLL',
    tipo: 'oll',
    mascara: 'oll',
    miniatura: 'planta',
    descripcion:
      'Orientation of the Last Layer: un solo algoritmo deja toda la cara superior amarilla. Hay 57 casos, agrupados por la forma que dibujan las pegatinas amarillas. Empieza por el grupo «Cruz hecha»: con él y tres casos de aristas ya puedes hacer el OLL en dos pasos.',
    casos: OLL,
  },
  {
    id: 'cfop-pll',
    metodo: 'cfop',
    nombre: 'PLL',
    tipo: 'pll',
    mascara: 'todo',
    miniatura: 'planta',
    flechas: true,
    descripcion:
      'Permutation of the Last Layer: un solo algoritmo coloca las piezas de la última capa sin desorientarlas. Hay 21 casos; se reconocen por los bloques y «faros» (dos esquinas del mismo color) que se ven en los lados.',
    casos: PLL,
  },
  {
    id: 'pr-cruz',
    metodo: 'principiante',
    nombre: 'Cruz blanca',
    tipo: 'cruz',
    mascara: 'cruz',
    miniatura: 'iso',
    descripcion:
      'Forma una cruz blanca en la cara inferior. Lleva las aristas blancas una por una: busca la arista, colócala frente a ti y aplica el caso que corresponda. Cada arista debe coincidir también con el centro de su lado.',
    casos: CRUZ,
  },
  {
    id: 'pr-esquinas',
    metodo: 'principiante',
    nombre: 'Esquinas blancas',
    tipo: 'capa1',
    mascara: 'capa1',
    miniatura: 'iso',
    descripcion:
      'Completa la primera capa metiendo las cuatro esquinas blancas. Coloca cada esquina en la capa superior, justo encima de su hueco, y aplica el caso según hacia dónde mire el blanco. Truco: repetir R U R\' U\' también la acaba insertando.',
    casos: PR_ESQUINAS,
  },
  {
    id: 'pr-capa2',
    metodo: 'principiante',
    nombre: 'Segunda capa',
    tipo: 'capa2',
    mascara: 'f2l',
    miniatura: 'iso',
    descripcion:
      'Inserta las cuatro aristas de la capa media. Busca en la capa superior una arista sin amarillo, alinéala con el centro de su color y bájala hacia la derecha o hacia la izquierda.',
    casos: PR_CAPA2,
  },
  {
    id: 'pr-cruz-amarilla',
    metodo: 'principiante',
    nombre: 'Cruz amarilla',
    tipo: 'eoll',
    mascara: 'eoll',
    miniatura: 'planta',
    descripcion:
      'Orienta las aristas de la última capa para formar una cruz amarilla. Solo hay un algoritmo: F R U R\' U\' F\'. Según lo que veas (punto, L o línea) lo aplicas una, dos o tres veces.',
    generar: 'eoll',
  },
  {
    id: 'pr-orientar-esquinas',
    metodo: 'principiante',
    nombre: 'Cara amarilla',
    tipo: 'ocll',
    mascara: 'oll',
    miniatura: 'planta',
    descripcion:
      'Orienta las esquinas para completar la cara amarilla usando solo el Sune (R U R\' U R U2 R\'). Si no sale a la primera, recoloca la capa superior como se indica y repite.',
    generar: 'ocll',
  },
  {
    id: 'pr-permutar-esquinas',
    metodo: 'principiante',
    nombre: 'Colocar esquinas',
    tipo: 'cpll',
    mascara: 'cpll',
    miniatura: 'planta',
    descripcion:
      'Coloca las esquinas de la última capa. Busca «faros»: dos esquinas del mismo color en un lado. Con los faros atrás, un solo algoritmo las coloca; si no hay faros, hazlo una vez para crearlos.',
    generar: 'cpll',
  },
  {
    id: 'pr-permutar-aristas',
    metodo: 'principiante',
    nombre: 'Colocar aristas',
    tipo: 'epll',
    mascara: 'todo',
    miniatura: 'planta',
    flechas: true,
    descripcion:
      'Último paso: rota las aristas que faltan. Con el lado resuelto atrás, el algoritmo rota las otras tres aristas. Si no hay ningún lado resuelto, aplícalo una vez desde cualquier ángulo y aparecerá.',
    generar: 'epll',
  },
];

// Bloques con los que el generador compone los casos del método principiante.
export const BLOQUES = {
  eoll: { alg: "F R U R' U' F'", nombre: "F R U R' U' F'" },
  ocll: { alg: SUNE, nombre: 'Sune' },
  cpll: { alg: "R' F R' B2 R F' R' B2 R2", nombre: 'el algoritmo de esquinas' },
  epll: { alg: "R U' R U R U R U' R' U' R2", nombre: 'el algoritmo de aristas' },
};

export const PR_GENERADOS = {
  eoll: [
    { clase: 'linea', nombre: 'Línea', descripcion: 'Dos aristas opuestas ya son amarillas y forman una línea. Con la línea {linea}, aplica el algoritmo una vez.', alt: [] },
    { clase: 'L', nombre: 'L', descripcion: 'Dos aristas adyacentes ya son amarillas y forman una L. Con la L {L}, la primera aplicación la convierte en línea y la segunda completa la cruz.', alt: ["F U R U' R' F'"] },
    { clase: 'punto', nombre: 'Punto', descripcion: 'Ninguna arista es amarilla. La primera aplicación crea una L; se recoloca la capa superior y se sigue como en ese caso.', alt: ["F R U R' U' F' f R U R' U' f'"] },
  ],
  ocll: [
    { ref: 27, nombre: 'Sune (pez)', descripcion: 'Una sola esquina amarilla arriba (forma de pez): un Sune completa la cara.' },
    { ref: 26, nombre: 'Antisune (pez inverso)', descripcion: 'Una sola esquina amarilla arriba, pero las otras tres miran hacia el lado contrario que en el Sune.' },
    { ref: 21, nombre: 'H (cruz sola)', descripcion: 'Ninguna esquina amarilla arriba; forman dos pares de faros amarillos en lados opuestos.' },
    { ref: 22, nombre: 'Pi', descripcion: 'Ninguna esquina amarilla arriba; un par de faros amarillos en un lado y las otras dos miran hacia fuera.' },
    { ref: 23, nombre: 'Faros (U)', descripcion: 'Dos esquinas amarillas arriba en el mismo lado; las otras dos forman faros amarillos.' },
    { ref: 24, nombre: 'T (camaleón)', descripcion: 'Dos esquinas amarillas arriba en el mismo lado; las otras dos miran hacia lados opuestos.' },
    { ref: 25, nombre: 'L (pajarita)', descripcion: 'Dos esquinas amarillas arriba en diagonal.' },
  ],
  cpll: [
    { clase: 'adyacente', nombre: 'Faros en un lado', descripcion: 'Un lado tiene dos esquinas del mismo color (faros). Con los faros {faros}, el algoritmo coloca las esquinas.', alt: ["x R' U R' D2 R U' R' D2 R2 x'"] },
    { clase: 'diagonal', nombre: 'Sin faros', descripcion: 'Ningún lado tiene faros: hay que intercambiar esquinas en diagonal. Una aplicación crea los faros y la segunda resuelve.', alt: ["F R U' R' U' R U R' F' R U R' U' R' F R F'"] },
  ],
  epll: [
    { ref: 'Ua', nombre: 'Tres aristas ({sentido})', descripcion: 'Un lado completo ({barra}); las otras tres aristas rotan en {sentido}. Un solo algoritmo.' },
    { ref: 'Ub', nombre: 'Tres aristas ({sentido})', descripcion: 'Un lado completo ({barra}); las aristas rotan en {sentido}: el mismo algoritmo, dos veces.' },
    { ref: 'H', nombre: 'Aristas opuestas (H)', descripcion: 'Ningún lado completo; cada arista se intercambia con la de enfrente.' },
    { ref: 'Z', nombre: 'Aristas adyacentes (Z)', descripcion: 'Ningún lado completo; las aristas se intercambian por parejas contiguas.' },
  ],
};
