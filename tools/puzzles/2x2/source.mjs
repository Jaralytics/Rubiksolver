// source.mjs (2x2) — Fuente editable del catálogo del 2x2. `node tools/build-catalog.mjs 2x2`
// la verifica con el motor lógico y genera data/2x2.json.
//
// Convenciones: el cubo se sostiene con el blanco abajo y el verde al frente; sin centros, la
// esquina inferior-trasera-izquierda fija la orientación. `espera` indica dónde está la
// pegatina blanca de la esquina que falta (pos en coordenadas del 2x2: ±0.5).

export const FUENTES = [
  { nombre: 'SpeedSolving Wiki', url: 'https://www.speedsolving.com/wiki/', uso: 'Nombres de los métodos Ortega y principiante del 2x2' },
  { nombre: 'Ruwix', url: 'https://ruwix.com/', uso: 'Método principiante por capas' },
];

export const METODOS = [
  { id: 'principiante', nombre: 'Principiante', descripcion: 'Por capas: primera capa, orientar la última y permutarla.' },
  { id: 'ortega', nombre: 'Ortega', descripcion: 'Una cara, orientar la última capa (OLL) y permutar ambas capas (PBL).' },
];

const ESQUINAS = [
  { nombre: 'Blanco hacia la derecha', grupo: 'Esquina arriba, sobre su hueco', alg: "R U R'", espera: { pos: [0.5, 0.5, 0.5], cara: 'R' }, descripcion: 'La esquina está justo encima de su hueco con el blanco mirando a la derecha.', notas: ['Baja el hueco, mete la esquina y sube'] },
  { nombre: 'Blanco hacia el frente', grupo: 'Esquina arriba, sobre su hueco', alg: "F' U' F", espera: { pos: [0.5, 0.5, 0.5], cara: 'F' }, descripcion: 'La esquina está encima de su hueco con el blanco mirando al frente.', notas: ['El mismo movimiento, pero entrando por el frente'] },
  { nombre: 'Blanco hacia arriba', grupo: 'Esquina arriba, sobre su hueco', alg: "(R U2 R') (U') (R U R')", espera: { pos: [0.5, 0.5, 0.5], cara: 'U' }, descripcion: 'La esquina está encima de su hueco con el blanco mirando arriba.', notas: ['Gira la esquina para que el blanco mire de lado', 'Recolócala sobre el hueco', 'Insértala'] },
  { nombre: 'En el hueco, blanco al frente', grupo: 'Esquina en el hueco, mal orientada', alg: "(F' U' F U) (F' U' F)", espera: { pos: [0.5, -0.5, 0.5], cara: 'F' }, descripcion: 'La esquina ya está en su hueco pero girada, con el blanco al frente.', notas: ['Saca la esquina', 'Vuelve a insertarla bien orientada'] },
  { nombre: 'En el hueco, blanco a la derecha', grupo: 'Esquina en el hueco, mal orientada', alg: "(R U R' U') (R U R')", espera: { pos: [0.5, -0.5, 0.5], cara: 'R' }, descripcion: 'La esquina ya está en su hueco pero girada, con el blanco a la derecha.', notas: ['Saca la esquina', 'Vuelve a insertarla bien orientada'] },
];

// Las siete formas de la última capa orientada; `clase` es la torsión de las esquinas en sentido horario.
const OLL = [
  { nombre: 'Sune', grupo: 'Una esquina orientada', alg: "R U R' U R U2 R'", clase: '0222', descripcion: 'Una sola esquina con el amarillo arriba (pez).' },
  { nombre: 'Antisune', grupo: 'Una esquina orientada', alg: "R U2 R' U' R U' R'", clase: '0111', descripcion: 'Una sola esquina con el amarillo arriba; las otras tres giran al contrario que en el Sune.' },
  { nombre: 'H', grupo: 'Ninguna esquina orientada', alg: "F R U R' U' R U R' U' R U R' U' F'", clase: '1212', descripcion: 'Ninguna esquina con el amarillo arriba; dos pares de faros amarillos en lados opuestos.' },
  { nombre: 'Pi', grupo: 'Ninguna esquina orientada', alg: "R U2 R2 U' R2 U' R2 U2 R", clase: '1122', descripcion: 'Ninguna esquina con el amarillo arriba; un par de faros amarillos en un lado y las otras dos miran hacia fuera.' },
  { nombre: 'Faros (U)', grupo: 'Dos esquinas orientadas', alg: "R2 D' R U2 R' D R U2 R", clase: '0021', descripcion: 'Dos esquinas amarillas arriba en el mismo lado; las otras dos forman faros amarillos.' },
  { nombre: 'T', grupo: 'Dos esquinas orientadas', alg: "R U R' U' R' F R F'", clase: '0012', descripcion: 'Dos esquinas amarillas arriba en el mismo lado; las otras dos miran hacia lados opuestos.' },
  { nombre: 'L', grupo: 'Dos esquinas orientadas', alg: "F R' F' R U R U' R'", clase: '0102', descripcion: 'Dos esquinas amarillas arriba en diagonal.' },
];

const PLL = [
  { nombre: 'Esquinas adyacentes', grupo: 'Intercambio de esquinas', alg: "R U R' U' R' F R2 U' R' U' R U R' F'", clase: 'adj+solved', descripcion: 'Dos esquinas contiguas de la capa superior están intercambiadas; hay faros en un lado.' },
  { nombre: 'Esquinas diagonales', grupo: 'Intercambio de esquinas', alg: "F R U' R' U' R U R' F' R U R' U' R' F R F'", clase: 'diag+solved', descripcion: 'Dos esquinas opuestas de la capa superior están intercambiadas; no hay faros en ningún lado.' },
];

// Las cinco combinaciones de permutación de las dos capas (cada una puede estar resuelta,
// con un intercambio adyacente o con uno diagonal).
const PBL = [
  { nombre: 'Una capa resuelta, otra adyacente', grupo: 'Una capa resuelta', alg: "R U' R F2 R' U R F2 R2", clase: 'adj+solved', descripcion: 'Una capa está resuelta y la otra tiene dos esquinas contiguas intercambiadas.' },
  { nombre: 'Una capa resuelta, otra diagonal', grupo: 'Una capa resuelta', alg: "R U' R U R' F2 R' U' R' U F2", clase: 'diag+solved', descripcion: 'Una capa está resuelta y la otra tiene dos esquinas opuestas intercambiadas.' },
  { nombre: 'Adyacente en ambas capas', grupo: 'Las dos capas desordenadas', alg: "R U2 F R2 F2 U2 F U2 R'", clase: 'adj+adj', descripcion: 'Las dos capas tienen un intercambio de esquinas contiguas.' },
  { nombre: 'Adyacente y diagonal', grupo: 'Las dos capas desordenadas', alg: "R U R U' F2 U F' R' F'", clase: 'adj+diag', descripcion: 'Una capa tiene un intercambio contiguo y la otra uno diagonal.' },
  { nombre: 'Diagonal en ambas capas', grupo: 'Las dos capas desordenadas', alg: "R U' R' F' R2 F U F R'", clase: 'diag+diag', descripcion: 'Las dos capas tienen un intercambio de esquinas opuestas.' },
];

export const ETAPAS = [
  { id: 'pr-capa1', metodo: 'principiante', nombre: 'Primera capa', tipo: 'capa1', mascara: 'capa1', miniatura: 'iso', descripcion: 'Completa la capa blanca. Coloca las esquinas blancas una a una: pon la esquina en la capa superior justo encima de su hueco y aplica el caso según hacia dónde mire el blanco.', casos: ESQUINAS },
  { id: 'pr-oll', metodo: 'principiante', nombre: 'Orientar la última capa', tipo: 'oll', mascara: 'oll', miniatura: 'planta', descripcion: 'Deja las cuatro esquinas con el amarillo arriba. Hay 7 formas; se reconocen por cuántas esquinas ya miran arriba y cómo están las demás.', casos: OLL },
  { id: 'pr-pll', metodo: 'principiante', nombre: 'Permutar la última capa', tipo: 'pll', mascara: 'todo', miniatura: 'planta', descripcion: 'Con la capa superior orientada, coloca las esquinas. Solo hay dos casos: con faros (adyacentes) o sin ellos (diagonales).', casos: PLL },
  { id: 'or-cara', metodo: 'ortega', nombre: 'Cara', tipo: 'cara', mascara: 'cara', miniatura: 'iso', descripcion: 'Forma una cara blanca; los colores de los lados no importan todavía. Es intuitivo: lleva cada esquina blanca a su sitio con los mismos casos de la primera capa.', casos: ESQUINAS },
  { id: 'or-oll', metodo: 'ortega', nombre: 'OLL', tipo: 'oll', mascara: 'oll', miniatura: 'planta', descripcion: 'Orienta la capa superior: 7 casos que dejan la cara amarilla completa.', casos: OLL },
  { id: 'or-pbl', metodo: 'ortega', nombre: 'PBL', tipo: 'pbl', mascara: 'todo', miniatura: 'capas', descripcion: 'Permutation of Both Layers: un solo algoritmo coloca a la vez las esquinas de las dos capas. Cada capa puede estar resuelta, con un intercambio adyacente o con uno diagonal: 5 casos.', casos: PBL },
];
