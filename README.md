# Cubo paso a paso

Página de una sola vista para aprender a resolver el cubo de Rubik (2x2, 3x3 y 4x4), con un cubo 3D
interactivo que se desarma hasta cada caso y reproduce su algoritmo movimiento a movimiento.

Un botón junto a «Ayuda» cambia de cubo (2x2, 3x3, 4x4); cada uno tiene su catálogo.

- **3x3 · CFOP**: Cruz (8 casos + 2 ejemplos completos), F2L (41), OLL (57) y PLL (21).
- **3x3 · Principiante** (por capas): cruz blanca, esquinas blancas, segunda capa, cruz amarilla,
  cara amarilla, colocar esquinas y colocar aristas. Solo usa seis secuencias cortas.
- **2x2** · Principiante (primera capa, orientar 7 casos, permutar 2) y Ortega (cara, OLL 7, PBL 5): 31 algoritmos.
- **4x4** · Reducción: centros (4 ejemplos), aristas (4), etapa «Como un 3x3», paridad OLL (1) y paridad PLL (1): 10 algoritmos. La etapa «Como un 3x3» enlaza con el catálogo del 3x3.

Sitio estático: HTML + CSS + módulos ES + Three.js (incluido en `vendor/`). Sin backend ni
paso de compilación.

## Ejecutar en local

Hace falta un servidor estático, porque el navegador no carga módulos ni JSON desde `file://`.

```bash
npm start            # http://localhost:5173  (Node 18 o superior, sin instalar nada)
```

Cualquier otro servidor sirve igual (`npx serve`, `python -m http.server`…). Para publicar,
sube la carpeta tal cual a cualquier hosting estático (GitHub Pages, Netlify, etc.); las
carpetas `tools/` y `package.json` no hacen falta en producción.

```bash
npm test             # pruebas del motor + verificación de todo el catálogo
```

## Uso

| Acción | Ratón / táctil | Teclado |
| --- | --- | --- |
| Reproducir o pausar | botón ▶ | `Espacio` |
| Reproducir hacia atrás, hasta el caso | botón ◀◀ | `Mayús` + `Espacio` |
| Movimiento anterior / siguiente | botones | `←` `→` |
| Reiniciar al caso | botón | `R` |
| Saltar a un movimiento | clic en el movimiento | `Tab` + `Enter` |
| Girar la vista | arrastrar | `Mayús` + flechas (o flechas con el cubo enfocado) |
| Zoom | rueda / pellizco | `+` `−` |
| Restablecer la vista | botón | `0` |
| Ayuda de notación | botón «Ayuda» | `?` |

El enlace de la página guarda el cubo y el caso (`…/#3x3/oll-27`; los enlaces antiguos `#oll-27` siguen valiendo para el 3x3), así que se puede compartir uno concreto.

## Arquitectura

```
index.html
css/styles.css
js/
  cube-model.js   Estado lógico: piezas (posición + orientación), notación, movimientos.
  cube-view.js    Render con Three.js. Refleja el modelo; setModel() cambia de cubo liberando el anterior.
  animator.js     Animator (un giro con easing) y Player (preparar, reproducir, paso, reinicio).
  catalog.js      Carga el catálogo de un puzzle y aplica las máscaras de cada etapa.
  puzzles/        Registro de puzzles (2x2, 3x3, 4x4): id, tamaño, catálogo, máscaras y ayuda.
  puzzle-picker.js Selector de cubo (icono SVG parametrizado por tamaño y menú accesible).
  thumbnails.js   Miniaturas SVG (planta de una capa, dos capas / mini-cubo isométrico).
  ui.js           Paneles, controles, teclado y estado de la interfaz.
  main.js         Punto de entrada.
data/3x3.json, 2x2.json, 4x4.json   Catálogos generados y verificados (no editar a mano).
tools/
  build-catalog.mjs    Genera data/<puzzle>.json; no escribe nada si algo falla.
  verify-catalog.mjs   Verificador de todos los catálogos (o de uno).
  lib/comun.mjs        Utilidades comunes de verificación.
  puzzles/<id>/        Por puzzle: source.mjs (fuente editable), build.mjs, verify.mjs, firmas.mjs.
  fetch-reference.mjs  Extrae la referencia de SpeedSolving Wiki (3x3).
  referencia/speedsolving-wiki.json
  test-engine.mjs      Pruebas del motor con identidades conocidas del cubo.
  serve.mjs            Servidor estático mínimo.
vendor/                Three.js r170, OrbitControls y RoundedBoxGeometry.
```

**Modelo.** Cada pieza guarda `home`, `pos` y `rot` (matriz 3x3 entera). Un movimiento es
«girar 90° alrededor de un eje las piezas cuya coordenada en ese eje está en un rango», así
que `R`, `r`, `M`, `x` y sus variantes son el mismo código con distinto rango. El modelo no
conoce Three.js y se usa tal cual en Node para verificar el catálogo.

**Vista y animación.** El animador engancha las piezas de la capa a un pivote, lo gira con
easing y, al terminar, aplica el movimiento al modelo y recoloca las mallas. El modelo solo
cambia cuando el giro termina, por lo que siempre describe un estado válido. Se dibuja bajo
demanda (solo cuando algo cambia).

**Máscaras.** En cada etapa las piezas que aún no importan se muestran en gris (por ejemplo,
en OLL solo se ve el amarillo de la última capa). Así el caso se reconoce sin ruido.

## Catálogo y verificación

Cada `data/<puzzle>.json` contiene `metodos`, `etapas` y `casos`. Cada caso tiene:

| Campo | Contenido |
| --- | --- |
| `etapa`, `id`, `nombre`, `grupo` | Identificación y agrupación en la lista |
| `algoritmo` | Algoritmo principal; los paréntesis definen grupos |
| `alternativas` | Otros algoritmos para el mismo caso (ya ajustados con su giro previo) |
| `descripcion` | Patrón visual del caso |
| `notas` | Opcional: explicación de cada grupo del algoritmo |
| `preparacion` | Opcional: mezcla explícita (si falta, se usa el inverso del algoritmo) |
| `referencia` | Caso equivalente en SpeedSolving Wiki (p. ej. `OLL 27`) |
| `verificacion`, `ocultar` | Datos que usa el verificador / piezas que el caso muestra en gris |

Ningún algoritmo entra al catálogo sin pasar la verificación automática:

1. El caso se genera aplicando al cubo resuelto el inverso del algoritmo, y **no** debe
   cumplir ya el objetivo de la etapa.
2. El estado generado tiene que ser el caso que dice ser: lo previo está resuelto (cruz,
   resto del F2L…) y su *firma* coincide con la del mismo caso en la referencia. La firma
   no depende del algoritmo, del giro previo de U ni del ángulo, así que el control no es
   circular: compara cada algoritmo con los que la wiki lista para ese número de caso.
3. No hay casos repetidos y están los 41 + 57 + 21 de la referencia.
4. El algoritmo cumple el objetivo de la etapa sin dejar el cubo girado.
5. Cada alternativa resuelve exactamente el mismo estado.

Las descripciones de F2L, los recuentos de OLL y los sentidos de giro de PLL se deducen del
estado del cubo, no se escriben a mano.

### Agregar o cambiar un algoritmo

1. Edita `tools/puzzles/<id>/source.mjs` (por ejemplo, añade una alternativa a `OLL_ALGS[27]` o
   cambia el algoritmo principal de un caso).
2. Ejecuta `npm run build:catalog` (o `node tools/build-catalog.mjs 2x2`). Si el algoritmo no resuelve ese caso, el generador lo
   dice y no toca el JSON.
3. Recarga la página.

Los algoritmos principales no deben tener rotación neta del cubo (las alternativas sí
pueden). Para una etapa nueva, añádela a `ETAPAS` con su `tipo` (qué debe quedar resuelto;
ver `goalReached` en `tools/puzzles/<id>/firmas.mjs`), su `mascara` (`js/puzzles/<id>.js`) y su `miniatura`.

### Notación por tamaño

En el 3x3 la minúscula (`r`) es el ancho de dos capas, igual que `Rw`. En el 4x4 se mantiene esa
convención (`r` = `Rw`) y se añaden la capa interior (`2R`) y los rangos (`2-3Rw`); `M`, `E` y
`S` solo existen en tamaños impares. El texto de los algoritmos se muestra tal como está en la
fuente, y el diálogo de ayuda describe la notación válida del cubo activo.

### Otros tamaños de cubo

Para añadir un puzzle: un módulo en `js/puzzles/` (id, tamaño, catálogo, máscaras, ayuda) y su
carpeta en `tools/puzzles/<id>/` con fuente, firmas y verificación. Sin centros (2x2, 4x4) el
marco de referencia es la esquina inferior-trasera-izquierda (`CubeModel.frame()`), y en el
4x4 «resuelto» y «emparejado» se deciden por colores de pegatina (`CubeModel.slots()`). Las
paridades del 4x4 se verifican comprobando que su vista 3x3 es ilegal, es decir, que no se
alcanzan solo con giros exteriores. El plan completo está en [ROADMAP.md](ROADMAP.md).

## Decisiones de diseño

- **Modo principiante incluido.** Reutiliza toda la infraestructura (etapas, máscaras,
  verificación), así que no hizo falta dejarlo para una segunda fase. Sus casos de varias
  repeticiones los compone el generador a partir de un solo algoritmo por etapa.
- **Orientación.** El esquema de colores es el estándar; el cubo se sostiene con la cruz
  blanca abajo, amarillo arriba y verde al frente, que es como se ejecuta CFOP.
- **Flechas del teclado.** Izquierda/derecha avanzan el algoritmo; para orbitar la vista se
  usa `Mayús` + flechas, o las flechas solas con el cubo enfocado.

## Fuentes

- [SpeedSolving Wiki](https://www.speedsolving.com/wiki/): numeración de casos y referencia
  cruzada de F2L, OLL y PLL (`npm run fetch:reference` la vuelve a descargar).
- [J Perm](https://jperm.net/algs) y [CubeSkills](https://www.cubeskills.com/): elección del
  algoritmo principal y agrupación por formas.
- [Ruwix](https://ruwix.com/): método principiante por capas.
- Three.js (licencia MIT, ver `vendor/THREE-LICENSE`).
