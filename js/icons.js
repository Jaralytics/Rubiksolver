// icons.js — Iconos SVG de los puzzles para el selector.

const n = (v) => Math.round(v * 100) / 100;

/**
 * Icono SVG de un cubo de `size`×`size`: vista isométrica con tres caras visibles, cada una
 * dividida en su cuadrícula de pegatinas. Usa currentColor; las caras se distinguen por la opacidad.
 */
export function cubeIcon(size) {
  const half = size / 2;
  const project = ([x, y, z]) => [(x - z) * 0.866, (x + z) * 0.5 - y];
  const quad = (corners, opacity) => {
    const pts = corners.map(project);
    const cx = pts.reduce((a, p) => a + p[0], 0) / 4;
    const cy = pts.reduce((a, p) => a + p[1], 0) / 4;
    const d = pts.map(([px, py]) => `${n(cx + (px - cx) * 0.8)},${n(cy + (py - cy) * 0.8)}`).join(' ');
    return `<polygon points="${d}" fill="currentColor" fill-opacity="${opacity}"/>`;
  };
  let out = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const x0 = c - half;
      const z0 = r - half;
      out += quad([[x0, half, z0], [x0 + 1, half, z0], [x0 + 1, half, z0 + 1], [x0, half, z0 + 1]], 1);
      const y1 = half - r;
      out += quad([[x0, y1, half], [x0 + 1, y1, half], [x0 + 1, y1 - 1, half], [x0, y1 - 1, half]], 0.5);
      const z1 = half - c;
      out += quad([[half, y1, z1], [half, y1, z1 - 1], [half, y1 - 1, z1 - 1], [half, y1 - 1, z1]], 0.75);
    }
  }
  const w = size * 0.866 + 0.1;
  const h = size + 0.1;
  return `<svg class="cube-icon" viewBox="${n(-w)} ${n(-h)} ${n(w * 2)} ${n(h * 2)}" aria-hidden="true" focusable="false">${out}</svg>`;
}

/**
 * Icono SVG del Megaminx: una cara pentagonal vista de frente con las cinco vecinas abiertas
 * a su alrededor. Usa currentColor; el centro es opaco y el anillo, más suave.
 */
export function megaminxIcon() {
  const polar = (r, grados) => [r * Math.cos((grados * Math.PI) / 180), r * Math.sin((grados * Math.PI) / 180)];
  const pentagono = (puntos, opacity) => {
    const cx = puntos.reduce((a, p) => a + p[0], 0) / puntos.length;
    const cy = puntos.reduce((a, p) => a + p[1], 0) / puntos.length;
    const d = puntos.map(([px, py]) => `${n(cx + (px - cx) * 0.8)},${n(cy + (py - cy) * 0.8)}`).join(' ');
    return `<polygon points="${d}" fill="currentColor" fill-opacity="${opacity}"/>`;
  };
  const dentro = 0.764;
  const fuera = 1.236;
  let out = pentagono([0, 1, 2, 3, 4].map((k) => polar(dentro, -90 + 72 * k)), 1);
  for (let k = 0; k < 5; k++) {
    const a = -90 + 72 * k;
    out += pentagono([polar(dentro, a), polar(dentro, a + 72), polar(fuera, a + 72), polar(fuera, a + 36), polar(fuera, a)], 0.55);
  }
  return `<svg class="cube-icon" viewBox="-1.3 -1.3 2.6 2.6" aria-hidden="true" focusable="false">${out}</svg>`;
}
