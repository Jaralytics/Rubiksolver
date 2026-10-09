// thumbnails.js — Miniaturas SVG de un caso, calculadas a partir del modelo
// lógico: vista en planta de la última capa (OLL/PLL) o mini-cubo isométrico.

import { quarterTurns, matVec, parseMove } from './cube-model.js';
import { COLORS, DIMMED } from './cube-view.js';

const colorOf = (sticker, mask) => (sticker && mask(sticker.piece, sticker.face) ? COLORS[sticker.face] : DIMMED);
const n = (v) => Math.round(v * 100) / 100;

/** Vista en planta: cara superior y la fila de pegatinas de cada lado. */
export function topView(model, mask, { arrows = false } = {}) {
  const size = model.size;
  const cell = 24;
  const gap = 2;
  const strip = 7;
  const origin = strip + gap + 2;
  const span = size * cell + (size - 1) * gap;
  const total = origin * 2 + span;
  const at = (i) => origin + i * (cell + gap);
  const rect = (x, y, w, h, fill, r = 3) => `<rect x="${n(x)}" y="${n(y)}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`;
  let out = '';

  model.faceGrid('U').forEach((row, r) => row.forEach((s, c) => (out += rect(at(c), at(r), cell, cell, colorOf(s, mask)))));
  const back = model.faceGrid('B')[0].slice().reverse();
  const front = model.faceGrid('F')[0];
  const right = model.faceGrid('R')[0].slice().reverse();
  const left = model.faceGrid('L')[0];
  for (let i = 0; i < size; i++) {
    out += rect(at(i) + 2, 2, cell - 4, strip, colorOf(back[i], mask), 2);
    out += rect(at(i) + 2, origin + span + gap, cell - 4, strip, colorOf(front[i], mask), 2);
    out += rect(origin + span + gap, at(i) + 2, strip, cell - 4, colorOf(right[i], mask), 2);
    out += rect(2, at(i) + 2, strip, cell - 4, colorOf(left[i], mask), 2);
  }
  if (arrows) out += permutationArrows(model, (x) => at(x + model.h) + cell / 2);
  return `<svg viewBox="0 0 ${total} ${total}" aria-hidden="true" focusable="false">${out}</svg>`;
}

/** Flechas que indican a dónde debe ir cada pieza de la última capa. */
function permutationArrows(model, center) {
  const h = model.h;
  const U = parseMove('U', model.size);
  // Se elige el giro de U que deja más piezas en su sitio: las flechas muestran
  // la permutación relativa, no el desfase de la capa.
  let best = { solved: -1, j: 0 };
  const t = model.clone();
  for (let j = 0; j < 4; j++) {
    const solved = t.pieces.filter((p) => p.home[1] === h && t.isPieceSolved(p)).length;
    if (solved > best.solved) best = { solved, j };
    t.applyMove(U);
  }
  const toAligned = quarterTurns(1, -best.j);
  const fromAligned = quarterTurns(1, best.j);
  const links = new Map();
  for (const p of model.pieces) {
    if (p.pos[1] !== h || (p.pos[0] === 0 && p.pos[2] === 0)) continue;
    const alignedPos = matVec(toAligned, p.pos);
    if (alignedPos.join() === p.home.join()) continue;
    const dest = matVec(fromAligned, p.home);
    const a = `${p.pos[0]},${p.pos[2]}`;
    const b = `${dest[0]},${dest[2]}`;
    const reverse = links.get(`${b}>${a}`);
    if (reverse) reverse.both = true;
    else links.set(`${a}>${b}`, { from: [p.pos[0], p.pos[2]], to: [dest[0], dest[2]], both: false });
  }
  let out = '';
  for (const { from, to, both } of links.values()) {
    const [x1, y1, x2, y2] = [center(from[0]), center(from[1]), center(to[0]), center(to[1])];
    const len = Math.hypot(x2 - x1, y2 - y1);
    const ux = (x2 - x1) / len;
    const uy = (y2 - y1) / len;
    const pad = 6;
    out += `<line x1="${n(x1 + ux * pad)}" y1="${n(y1 + uy * pad)}" x2="${n(x2 - ux * pad)}" y2="${n(y2 - uy * pad)}" class="arrow"${both ? ' marker-start="url(#arrowhead)"' : ''} marker-end="url(#arrowhead)"/>`;
  }
  return out;
}

/** Mini-cubo isométrico: caras superior, frontal y derecha. */
export function isoView(model, mask) {
  const size = model.size;
  const half = size / 2;
  const project = ([x, y, z]) => [(x - z) * 0.866, (x + z) * 0.5 - y];
  const quad = (corners, fill) => {
    const pts = corners.map(project);
    const cx = pts.reduce((a, p) => a + p[0], 0) / 4;
    const cy = pts.reduce((a, p) => a + p[1], 0) / 4;
    const d = pts.map(([px, py]) => `${n(cx + (px - cx) * 0.88)},${n(cy + (py - cy) * 0.88)}`).join(' ');
    return `<polygon points="${d}" fill="${fill}" stroke="${fill}" stroke-width="0.08" stroke-linejoin="round"/>`;
  };
  let out = '';
  const U = model.faceGrid('U');
  const F = model.faceGrid('F');
  const R = model.faceGrid('R');
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const x0 = c - half;
      const z0 = r - half;
      out += quad([[x0, half, z0], [x0 + 1, half, z0], [x0 + 1, half, z0 + 1], [x0, half, z0 + 1]], colorOf(U[r][c], mask));
      const y1 = half - r;
      out += quad([[x0, y1, half], [x0 + 1, y1, half], [x0 + 1, y1 - 1, half], [x0, y1 - 1, half]], colorOf(F[r][c], mask));
      const z1 = half - c;
      out += quad([[half, y1, z1], [half, y1, z1 - 1], [half, y1 - 1, z1 - 1], [half, y1 - 1, z1]], colorOf(R[r][c], mask));
    }
  }
  const w = size * 0.866 + 0.15;
  const hgt = size + 0.15;
  return `<svg viewBox="${n(-w)} ${n(-hgt)} ${n(w * 2)} ${n(hgt * 2)}" aria-hidden="true" focusable="false">${out}</svg>`;
}

/** Definición compartida de la punta de flecha (se inserta una vez en la página). */
export const ARROW_DEFS =
  '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><marker id="arrowhead" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4.6" markerHeight="4.6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="arrow-head"/></marker></defs></svg>';
