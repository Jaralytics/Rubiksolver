// megaminx-thumbnails.js — Miniaturas SVG del Megaminx, calculadas a partir del modelo lógico:
// una cara vista de frente, con los lados que la tocan o sus cinco vecinas abiertas en plano.

import { FACES, FACE_INDEX, NORMALS, SLOTS, LAYER, adjacent, stickerPolygon } from './megaminx-geometry.js';
import { COLORS, DIMMED } from './megaminx-view.js';

const n = (v) => Math.round(v * 100) / 100;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => {
  const l = Math.hypot(...a);
  return a.map((c) => c / l);
};

const UNIDAD = 40; // unidades del SVG por unidad de la geometría (radio inscrito 1)
const MARGEN = 0.12;

/** Gira el punto `p` alrededor del eje (por `origen`, dirección unitaria `eje`) un ángulo `ang` (Rodrigues). */
function girar(p, origen, eje, ang) {
  const v = [p[0] - origen[0], p[1] - origen[1], p[2] - origen[2]];
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const k = cross(eje, v);
  const d = dot(eje, v) * (1 - c);
  return [0, 1, 2].map((i) => origen[i] + v[i] * c + k[i] * s + eje[i] * d);
}

/** Abre la cara `g` sobre el plano de la cara `f` girándola alrededor de la arista que comparten. */
function abrir(points, f, g) {
  const nf = NORMALS[f];
  const ng = NORMALS[g];
  const c = dot(nf, ng);
  const origen = nf.map((v, i) => (v + ng[i]) / (1 + c)); // punto de la arista (n_f·x = n_g·x = 1)
  return points.map((p) => girar(p, origen, norm(cross(ng, nf)), Math.acos(c)));
}

/**
 * Miniatura de la cara `cara` vista de frente (proyección ortogonal según su normal). Con
 * `anillo: 'toca'` se añaden las 15 pegatinas de las vecinas que la tocan; con 'todo', las cinco
 * vecinas enteras; ambas abiertas hacia fuera hasta quedar en el plano de la cara.
 */
export function faceView(model, mask, { cara = 'U', anillo = 'toca' } = {}) {
  const f = FACE_INDEX[cara];
  const nf = NORMALS[f];
  // Pantalla: v es «arriba», u la derecha, con u × v = normal (visto desde fuera).
  const v = norm(f === 0 ? [0, 0, -1] : f === 6 ? [0, 0, 1] : [-nf[1] * nf[0], 1 - nf[1] * nf[1], -nf[1] * nf[2]]);
  const u = cross(v, nf);

  const dibujos = [];
  const pegatinas = (cuerpo, cara3d, abierta) => {
    for (const slot of cuerpo) {
      const s = model.stickerAt(slot, cara3d);
      let pts = stickerPolygon(slot, cara3d);
      if (abierta !== null) pts = abrir(pts, f, abierta);
      const fill = s && mask(s.piece, s.face) ? COLORS[s.face] : DIMMED;
      dibujos.push({ fill, pts: pts.map((p) => [dot(p, u), -dot(p, v)]) });
    }
  };

  pegatinas(LAYER[f], cara, null);
  for (let g = 0; g < 12; g++) {
    if (g === f || !adjacent(f, g)) continue;
    const slots = LAYER[g].filter((slot) => anillo === 'todo' || SLOTS[slot].faceIdx.includes(f));
    pegatinas(slots, FACES[g], g);
  }

  const xs = dibujos.flatMap((d) => d.pts.map((p) => p[0]));
  const ys = dibujos.flatMap((d) => d.pts.map((p) => p[1]));
  const [x0, x1] = [Math.min(...xs) - MARGEN, Math.max(...xs) + MARGEN];
  const [y0, y1] = [Math.min(...ys) - MARGEN, Math.max(...ys) + MARGEN];
  const body = dibujos
    .map(({ fill, pts }) => `<polygon points="${pts.map(([x, y]) => `${n((x - x0) * UNIDAD)},${n((y - y0) * UNIDAD)}`).join(' ')}" fill="${fill}" stroke="${fill}" stroke-width="1.2" stroke-linejoin="round"/>`)
    .join('');
  return `<svg viewBox="0 0 ${n((x1 - x0) * UNIDAD)} ${n((y1 - y0) * UNIDAD)}" aria-hidden="true" focusable="false">${body}</svg>`;
}
