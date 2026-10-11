# Plan de implementación futura

**Estado.** Fase 0 hecha (registro de puzzles, un catálogo por cubo, selector, enlaces `#2x2/…`). Fase 1 hecha en lo básico: 2x2 Principiante y Ortega (OLL 7, PBL 5); faltan CLL y EG. Fase 2 parcial: 4x4 con centros (4 ejemplos), aristas (4), paridad OLL y PLL; hecha la etapa «Como un 3x3» (enlace al catálogo del 3x3); faltan los casos de las últimas dos aristas y más ejemplos de centros. Sin probar a mano en navegador ni móvil.

Hoy la página enseña el 3x3 (CFOP y método principiante). Este documento describe cómo
crecer hacia otros puzzles: primero 2x2 y 4x4, después el resto de cubos NxN y, a largo
plazo, toda la familia de puzzles tipo Rubik.

El orden no es por popularidad sino por **cuánto del código actual se reutiliza**. Cada fase
deja la página publicable y prepara la siguiente.

## 1. Punto de partida

### Qué ya sirve para otros tamaños

| Pieza | Estado |
| --- | --- |
| `CubeModel(size)` | Genérico. Piezas con posición y orientación; un movimiento es «girar un rango de capas alrededor de un eje». Probado con 2x2 y 4x4 en `tools/test-engine.mjs`. |
| `parseAlg(text, size)` | Admite caras, anchos (`Rw`, `r`, `3Rw`), cortes (`M E S`) y rotaciones. |
| `CubeView`, `Animator`, `Player` | No suponen tamaño 3: construyen las mallas a partir de las piezas del modelo. |
| `thumbnails.js` | `topView` e `isoView` leen `model.size`. |
| Generador y verificador | La estructura (fuente → ajuste de alternativas → verificación → JSON) es independiente del puzzle. |

### Qué estaba atado al 3x3

| Dónde | Estado |
| --- | --- |
| `js/ui.js` (`startApp`) | Hecho: el cubo activo se elige con el selector y se rehacen modelo, vista, reproductor y catálogo (`usePuzzle`). |
| `js/catalog.js` | Hecho: las máscaras viven en cada puzzle (`js/puzzles/<id>.js`) y se clasifican las piezas por coordenadas extremas (`CubeModel.kind()`). |
| `tools/lib/firmas.mjs` | Hecho: las firmas son de cada puzzle (`tools/puzzles/<id>/firmas.mjs`); en común queda `tools/lib/comun.mjs`. |
| `CubeModel.frame()` | Hecho: en cubos pares usa la esquina inferior-trasera-izquierda como pieza de referencia. |
| `CubeModel.isPieceSolved()` | Se mantiene para 2x2 y 3x3; en el 4x4 «resuelto» y «emparejado» se deciden por pegatinas (`slots()`, `stickersSolved()`). |
| `parseMove` | Hecho: minúscula = ancho de dos capas en todos los tamaños; añadidas la capa interior (`2R`) y los rangos (`2-3Rw`); M, E y S solo en tamaños impares; se rechazan los anchos que abarcan todo el cubo. |
| `data/algorithms.json` | Hecho: un catálogo por puzzle (`data/3x3.json`, `2x2.json`, `4x4.json`). |

### Criterio para empezar (la condición «según cómo haya quedado»)

Antes de abrir la Fase 0 conviene confirmar, con uso real del 3x3:

- [ ] Arrastre, rueda y gestos táctiles probados a mano en escritorio y móvil (hasta ahora
      solo se probó en un navegador sin interfaz).
- [ ] Rendimiento fluido en un móvil de gama media.
- [ ] La lista de casos, las miniaturas y el reproductor se entienden sin explicación.
- [ ] Decidido si el formato del catálogo cambia (ver Fase 0); cambiarlo después de tener
      tres puzzles es más caro.

Si alguno falla, se corrige en el 3x3 antes de multiplicarlo por N puzzles.

## 2. Fases

### Fase 0 — Preparar la base multi-puzzle

Sin puzzles nuevos; solo quitar las suposiciones del 3x3.

1. **Registro de puzzles.** Un módulo `js/puzzles/` donde cada puzzle declara: id, nombre,
   cómo crear su modelo, su catálogo, sus máscaras, su esquema de colores y su cámara
   inicial. El 3x3 pasa a ser la primera entrada.
2. **Selector de puzzle** en la barra superior, por encima del selector de método. El
   enlace pasa a `#3x3/oll-27`, manteniendo los enlaces actuales como alias.
3. **Un catálogo por puzzle**: `data/3x3.json`, `data/2x2.json`… cargados bajo demanda.
4. **Máscaras y firmas por puzzle**: mover las del 3x3 a su módulo y dejar en común solo
   lo general (parseo, ajuste de alternativas, informe de errores).
5. **Clasificación de piezas genérica** en el modelo (esquina, arista, centro, y sus
   subtipos en cubos grandes) en lugar de contar coordenadas.

Hecho cuando: `npm test` sigue en 282 algoritmos y 0 errores, y la página se ve igual.

### Fase 1 — 2x2

El más barato: es un 3x3 sin aristas ni centros, y reutiliza algoritmos ya verificados.

| Método | Contenido | Nota |
| --- | --- | --- |
| Principiante | Primera capa, orientar última capa (7 casos), permutar (2 casos) | Reutiliza Sune y los algoritmos de esquinas del 3x3. |
| Ortega | Cara, OLL (7), PBL (5) | El método estándar para empezar a hacer tiempos. |
| CLL | ~40 casos | Fase posterior; confirmar el recuento con la referencia. |
| EG-1 / EG-2 | ~40 casos cada uno | Solo si hay demanda. |

Trabajo técnico:

- Sin centros no hay marco de referencia: fijar una esquina (por convención, la
  inferior-trasera-izquierda) y normalizar respecto de ella.
- Firmas nuevas: orientación de la capa superior, y permutación de ambas capas para PBL.
- Miniaturas: `topView` ya funciona; para PBL hace falta mostrar las dos capas.
- Referencia cruzada: páginas de 2x2 de SpeedSolving Wiki, con el mismo extractor.

### Fase 2 — 4x4

El salto grande: aparecen piezas indistinguibles, la paridad y una notación más rica.

| Etapa (reducción / Yau) | Contenido |
| --- | --- |
| Centros | Intuitivo, con ejemplos guiados (como la cruz del 3x3). |
| Emparejar aristas | Técnica básica y «3-2-3»; casos de las últimas dos aristas. |
| Etapa 3x3 | Enlaza con el catálogo del 3x3 en lugar de duplicarlo. |
| Paridad OLL | 1 algoritmo largo. |
| Paridad PLL | 1–2 algoritmos. |

Trabajo técnico:

- **Notación.** Añadir capa interior (`2R`), rangos (`2-3Rw`) y decidir la convención de
  minúsculas para 4x4+. El texto que se muestra debe seguir siendo el de la fuente.
- **«Resuelto» por pegatinas** para centros y aristas gemelas; las firmas pasan a comparar
  colores, no identidades de pieza.
- **Marco de referencia** sin centros fijos: se define por el esquema de colores.
- **Máscaras por subtipo** (centros, aristas emparejadas o no).
- **Rendimiento**: 56 piezas y 96 pegatinas; comprobar en móvil y, si hace falta, pasar a
  mallas instanciadas.
- **Verificación de paridad**: el caso de paridad no se puede alcanzar con giros de cara
  exterior, lo que da una prueba automática clara de que el algoritmo hace lo que dice.

### Fase 3 — 5x5, 6x6, 7x7 y mayores

Con la Fase 2 hecha es sobre todo contenido:

- 5x5 y 7x7 (impares): reducción con centros fijos; solo paridad de aristas.
- 6x6 (par): como el 4x4, con más tipos de centro y ambas paridades.
- Mayores (8x8+): mismo motor; se ofrecen como «cubo libre» más que con catálogo propio.

Lo nuevo es de interfaz: con tantas pegatinas las miniaturas y el cubo necesitan pegatinas
más finas y una cámara más lejana.

### Fase 4 — Mods con forma de cubo y cuboides

Mismo mecanismo que un NxN; cambia la geometría o se restringen los giros. Se resuelven
con los algoritmos ya catalogados, así que el valor está en el visor.

- **Mods de forma** (mismo modelo, mallas distintas): Mirror, Fisher, Windmill, Axis,
  Ghost, Mastermorphix, Barrel, Octagon. La dificultad está en reconocer las piezas por
  forma en vez de por color: las máscaras y miniaturas deben resaltar eso.
- **Cuboides** (dimensiones distintas por eje): el modelo necesita tamaño por eje y marcar
  qué giros de 90° están permitidos (en un 3x3x2 las caras laterales solo giran 180°).
- **Bandaged y similares**: piezas pegadas que bloquean giros; el modelo debe poder
  rechazar un movimiento.

### Fase 5 — Puzzles no cúbicos

Aquí el modelo actual ya no alcanza: los giros no son de 90° ni los ejes son x, y, z.
Requiere generalizar el motor a «ejes arbitrarios + ángulo por eje + conjunto de piezas por
capa», manteniendo el mismo contrato con la vista y el reproductor.

| Puzzle | Ejes y giro | Dificultad principal |
| --- | --- | --- |
| Pyraminx | 4 ejes, 120° | Notación propia (`U L R B` y puntas en minúscula). El más sencillo. |
| Skewb | 4 ejes por esquina, 120° | Los cortes atraviesan el centro; varias notaciones en uso. |
| Megaminx | 12 caras, 72° | 50 piezas móviles; notación de mezcla distinta de la de resolución. |
| Square-1 | 2 capas + corte | Cambia de forma: qué giros son válidos depende del estado. Notación `(x, y) /`. |
| Clock | No es de giros | Modelo y vista propios (agujas y pines); se comparte solo el reproductor. |

### Fase 6 — Mejoras transversales (en paralelo, cuando aporten)

- Modo libre: girar capas arrastrando y un teclado de movimientos.
- Mezclador y temporizador; práctica de casos al azar por etapa.
- Seguimiento de casos aprendidos (en el navegador).
- Más métodos para el 3x3: Roux, ZZ, 2-look OLL/PLL como etapas propias, COLL, WV, ZBLL.
- Otros idiomas.

## 3. Inventario de puzzles

No existe una lista cerrada: se publican puzzles y mods nuevos cada año. Esta tabla cubre
los once puzzles de giros de la WCA y las familias conocidas, y debe mantenerse viva.

### Cubos NxNxN

| Puzzle | Fase | Método a enseñar |
| --- | --- | --- |
| 2x2 (Pocket) | 1 | Principiante, Ortega, CLL |
| 3x3 | hecho | CFOP, principiante |
| 4x4 (Revenge) | 2 | Reducción, Yau |
| 5x5 (Professor) | 3 | Reducción |
| 6x6, 7x7 | 3 | Reducción |
| 8x8 y mayores | 3 | Cubo libre |
| 1x1 | — | Solo como broma del selector |

### Cuboides

| Puzzle | Fase |
| --- | --- |
| 1x2x2, 1x2x3, 1x3x3 (Floppy), 1x4x4 | 4 |
| 2x2x3, 2x2x4, 2x3x3 (Domino) | 4 |
| 3x3x2, 3x3x4, 3x3x5, 3x3x7 | 4 |
| 2x3x4, 3x4x5 y otros de tres dimensiones distintas | 4 |
| 4x4x5, 4x4x6, 5x5x4… | 4 |

### Mods de forma del 3x3 (y equivalentes en otros tamaños)

| Puzzle | Fase |
| --- | --- |
| Mirror (Bump) | 4 |
| Fisher, Windmill, Axis | 4 |
| Ghost | 4 |
| Mastermorphix (y Megamorphix 4x4, Pyramorphix 2x2) | 4 |
| Barrel, Octagon, Penrose, Twist | 4 |
| Cubos con dibujo (orientación de centros, «supercubo»), Sudoku, calendario | 4 |
| Void (sin centros) | 4 |

### Bandaged, engranajes y giros restringidos

| Puzzle | Fase |
| --- | --- |
| Bandaged 3x3 y variantes (Bicube, Meffert's Bandage) | 4 |
| Siamese / cubos fusionados | 4 |
| Gear Cube, Gear Cube Extreme, Gear Ball, Gear Shift | 6+ (mecanismo propio) |
| Latch Cube, Constrained Cube | 6+ |

### Tetraedros

| Puzzle | Fase |
| --- | --- |
| Pyraminx | 5 |
| Pyraminx Duo, Master Pyraminx (4 capas), Professor Pyraminx (5 capas) | 5 |
| Jing's Pyraminx / Halpern-Meier | 5 |
| Pyramorphix | 4 (es un 2x2) |

### Dodecaedros

| Puzzle | Fase |
| --- | --- |
| Kilominx (2 capas) | 5 |
| Megaminx | 5 |
| Master Kilominx, Gigaminx, Teraminx, Petaminx y mayores | 5 |
| Pyraminx Crystal, Starminx | 6+ |

### Giro por esquinas y por aristas

| Puzzle | Fase |
| --- | --- |
| Skewb | 5 |
| Skewb Diamond, Skewb Ultimate, Master Skewb | 5 |
| Ivy Cube, Redi Cube, Dino Cube | 5 |
| Rex Cube, Dino/Rainbow Cube | 6+ |
| Helicopter Cube, Curvy Copter (giro por aristas) | 6+ |

### Octaedros y otras formas

| Puzzle | Fase |
| --- | --- |
| Face-Turning Octahedron (FTO) | 5 |
| Skewb Diamond / Trajber's Octahedron | 5–6 |
| Rubik's UFO, Cheese, Rainbow Ball | 6+ |

### Cambian de forma

| Puzzle | Fase |
| --- | --- |
| Square-1 | 5 |
| Square-0, Square-2, Super Square-1 | 6+ |

### Fuera de la familia de giros de capas

| Puzzle | Fase |
| --- | --- |
| Rubik's Clock | 5 |
| Rubik's Magic, Master Magic (plegado) | 6+ |
| Rubik's Snake / Twist (cadena de prismas) | 6+ |
| Rubik's 360, Orbit, Tower y otros de marca | no previsto |

## 4. Riesgos y decisiones abiertas

- **Generalizar el motor demasiado pronto.** Hasta la Fase 4 basta el modelo de ejes x/y/z.
  El motor de ejes arbitrarios se diseña al llegar a la Fase 5, con Pyraminx como primer
  caso, no antes.
- **Contenido frente a código.** A partir del 4x4 el coste está en investigar, redactar y
  verificar casos, no en programar. Cada puzzle necesita su referencia y sus firmas, o los
  algoritmos entran sin control.
- **Convenciones de notación.** Minúsculas en cubos grandes, Square-1 y Megaminx no tienen
  una única notación; hay que elegir una, declararla en la ayuda y aceptar las otras al leer.
- **Tamaño de la interfaz.** El selector de puzzle no puede ser una fila de 40 botones:
  agrupar por familia, con buscador.
- **Móvil.** Megaminx, 7x7 y similares pueden no ser legibles ni fluidos en pantalla
  pequeña; decidir por puzzle si se ofrece una vista reducida.

## 5. Siguiente paso concreto

Completar la lista de comprobación de la sección 1 y, si pasa, abrir la Fase 0. La Fase 1
(2x2) sirve de prueba de que la base multi-puzzle es correcta antes de invertir en el 4x4.
