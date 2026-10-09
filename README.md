# Cubo paso a paso

Página de una sola vista para aprender a resolver el cubo de Rubik 3x3, con un cubo 3D
interactivo que se desarma hasta cada caso y reproduce su algoritmo movimiento a movimiento.

- **CFOP**: Cruz (8 casos + 2 ejemplos completos), F2L (41), OLL (57) y PLL (21).
- **Principiante** (por capas): cruz blanca, esquinas blancas, segunda capa, cruz amarilla,
  cara amarilla, colocar esquinas y colocar aristas. Solo usa seis secuencias cortas.

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

El enlace de la página guarda el caso (`…/#oll-27`), así que se puede compartir uno concreto.

## Arquitectura

```
index.html
css/styles.css
js/
  cube-model.js   Estado lógico: piezas (posición + orientación), notación, movimientos.
  cube-view.js    Render con Three.js. Refleja el modelo; no decide nada.
  animator.js     Animator (un giro con easing) y Player (preparar, reproducir, paso, reinicio).
  catalog.js      Carga algorithms.json y define las máscaras de cada etapa.
  thumbnails.js   Miniaturas SVG (planta de la última capa / mini-cubo isométrico).
  ui.js           Paneles, controles, teclado y estado de la interfaz.
  main.js         Punto de entrada.
data/algorithms.json   Catálogo generado y verificado (no editar a mano).
tools/
  catalog-source.mjs   Fuente editable del catálogo.
  build-catalog.mjs    Genera algorithms.json; no escribe nada si algo falla.
  verify-catalog.mjs   Verificador (también se ejecuta solo, sobre el JSON).
  lib/firmas.mjs       "Firmas" de casos: identifican un caso con independencia del algoritmo.
  fetch-reference.mjs  Extrae la referencia de SpeedSolving Wiki.
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

`data/algorithms.json` contiene `metodos`, `etapas` y `casos`. Cada caso tiene:

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

1. Edita `tools/catalog-source.mjs` (por ejemplo, añade una alternativa a `OLL_ALGS[27]` o
   cambia el algoritmo principal de un caso).
2. Ejecuta `npm run build:catalog`. Si el algoritmo no resuelve ese caso, el generador lo
   dice y no toca el JSON.
3. Recarga la página.

Los algoritmos principales no deben tener rotación neta del cubo (las alternativas sí
pueden). Para una etapa nueva, añádela a `ETAPAS` con su `tipo` (qué debe quedar resuelto;
ver `goalReached` en `tools/lib/firmas.mjs`), su `mascara` (`js/catalog.js`) y su `miniatura`.

### Otros tamaños de cubo

El plan completo por fases (2x2, 4x4, resto de NxN y demás puzzles) está en
[ROADMAP.md](ROADMAP.md). En resumen:

El motor, la vista, el animador y las miniaturas ya reciben el tamaño como parámetro:
`new CubeModel(4)` funciona, y la notación admite `Rw`, `3Rw`, etc. Para añadir, por
ejemplo, el 2x2 o el 4x4:

1. Crear un catálogo por tamaño (p. ej. `data/algorithms-2x2.json`, con `"cubo": "2x2"`) y
   un selector de cubo en la interfaz que llame a `loadCatalog(url)` y cree el modelo y la
   vista con ese tamaño (hoy el `3` está fijado en `startApp`, en `js/ui.js`).
2. Definir las máscaras de sus etapas en `js/catalog.js` (las actuales suponen capas -1/0/1).
3. Escribir sus firmas en `tools/lib/firmas.mjs`. En cubos pares no hay centros, así que
   `frame()` no puede fijar la orientación; y en 4x4 o mayores hay piezas indistinguibles
   (centros, aristas gemelas), por lo que «resuelto» debe compararse por pegatinas
   (`isSolved()`), no por piezas.

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
