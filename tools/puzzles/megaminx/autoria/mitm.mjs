// Ayuda de autoría: no la usan la generación del catálogo (build.mjs) ni las pruebas (verify.mjs).
// Sirve para encontrar o revisar algoritmos nuevos y ejecuta su trabajo al importarse o al lanzarse.
// Se ejecuta a mano desde la raíz del repositorio con node; sus argumentos se explican más abajo.
// mitm.mjs (Megaminx) — Ayuda de autoría: búsqueda bidireccional (meet in the middle) sobre las
// piezas seguidas, con tablas de enteros. Dado un estado inicial de las piezas seguidas (hueco y giro
// de cada una) y un conjunto de movimientos, devuelve la secuencia más corta que las deja todas
// resueltas (cada una en su hueco con giro 0). Memoria: dos tablas de profundidad `d1` y `d2`.

import { MUL } from '../../../../js/megaminx-geometry.js';
import { parseAlg, invertMoves, movesToString } from '../../../../js/megaminx-model.js';
import { efectoMovimiento } from './tablas.mjs';

/** Aplica un movimiento (efecto precalculado) al estado de las piezas seguidas [pos0, rot0, pos1, rot1, ...]. */
function paso(estado, e) {
  const sig = new Array(estado.length);
  for (let i = 0; i < estado.length; i += 2) {
    sig[i] = e.P[estado[i]];
    sig[i + 1] = MUL[e.T[estado[i]]][estado[i + 1]];
  }
  return sig;
}

function expandir(inicio, tokens, profundidad) {
  const efectos = tokens.map((t) => efectoMovimiento(t));
  const caras = tokens.map((t) => t.replace(/[2']/g, ''));
  const visto = new Map([[inicio.join(), { camino: [], d: 0 }]]);
  let frontera = [{ estado: inicio, camino: [], ultima: null }];
  for (let d = 1; d <= profundidad; d++) {
    const siguiente = [];
    for (const { estado, camino, ultima } of frontera) {
      for (let i = 0; i < tokens.length; i++) {
        if (caras[i] === ultima) continue;
        const s = paso(estado, efectos[i]);
        const k = s.join();
        if (visto.has(k)) continue;
        const c = [...camino, tokens[i]];
        visto.set(k, { camino: c, d });
        siguiente.push({ estado: s, camino: c, ultima: caras[i] });
      }
    }
    frontera = siguiente;
  }
  return visto;
}

/**
 * @param inicio  estado inicial [pos, rot, ...] de las piezas seguidas
 * @param meta    estado resuelto [slot, 0, ...] de las mismas piezas
 * @returns algoritmo (texto) o null si no hay camino de longitud <= d1 + d2
 */
export function buscarCamino(inicio, meta, tokens, d1 = 4, d2 = 4) {
  const delante = expandir(inicio, tokens, d1);
  const detras = expandir(meta, tokens, d2);
  let mejor = null;
  for (const [k, f] of delante) {
    const b = detras.get(k);
    if (!b) continue;
    const total = f.d + b.d;
    if (mejor === null || total < mejor.total) mejor = { total, f: f.camino, b: b.camino };
  }
  if (!mejor) return null;
  const vuelta = mejor.b.length ? movesToString(invertMoves(parseAlg(mejor.b.join(' ')))) : '';
  return [mejor.f.join(' '), vuelta].filter(Boolean).join(' ');
}
