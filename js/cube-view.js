// cube-view.js — Capa visual: dibuja con Three.js el estado de un CubeModel.
// No decide nada sobre el cubo; solo refleja el modelo y gira capas cuando el
// animador se lo pide.

import * as THREE from 'three';
import { RoundedBoxGeometry } from '../vendor/RoundedBoxGeometry.js';
import { FACES, FACE_NAMES, faceNormal } from './cube-model.js';
import { PuzzleView, DIMMED } from './puzzle-view.js';

// Esquema estándar sostenido con la cruz blanca abajo: amarillo arriba, verde al frente.
export const COLORS = {
  U: '#f5cf2e',
  D: '#f2f3ee',
  F: '#27b060',
  B: '#2f6de0',
  R: '#ff8a1f',
  L: '#cf2a33',
};
export { DIMMED };
const BODY = '#0c0e13';

function stickerGeometry(size, radius) {
  const h = size / 2;
  const s = new THREE.Shape();
  s.moveTo(-h + radius, -h);
  s.lineTo(h - radius, -h);
  s.quadraticCurveTo(h, -h, h, -h + radius);
  s.lineTo(h, h - radius);
  s.quadraticCurveTo(h, h, h - radius, h);
  s.lineTo(-h + radius, h);
  s.quadraticCurveTo(-h, h, -h, h - radius);
  s.lineTo(-h, -h + radius);
  s.quadraticCurveTo(-h, -h, -h + radius, -h);
  return new THREE.ShapeGeometry(s, 6);
}

export class CubeView extends PuzzleView {
  static COLORS = COLORS;

  /** Cámara inicial y límites de zoom según el tamaño del cubo. */
  fitCamera() {
    const k = this.model.size / 3;
    this.home.set(4.6, 4.2, 6.6).multiplyScalar(k);
    this.controls.minDistance = 5 * k;
    this.controls.maxDistance = 16 * k;
  }

  disposePieces() {
    for (const group of this.nodes.values()) group.removeFromParent();
    this.bodyGeometry.dispose();
    this.stickerGeometry.dispose();
    this.bodyMaterial.dispose();
    this.nodes.clear();
    this.stickers = [];
  }

  build() {
    const body = (this.bodyGeometry = new RoundedBoxGeometry(0.985, 0.985, 0.985, 3, 0.09));
    const bodyMaterial = (this.bodyMaterial = new THREE.MeshStandardMaterial({ color: BODY, roughness: 0.55 }));
    const sticker = (this.stickerGeometry = stickerGeometry(0.84, 0.13));
    const h = this.model.h;
    this.nodes = new Map(); // pieza del modelo → Group
    this.stickers = [];
    for (const piece of this.model.pieces) {
      const group = new THREE.Group();
      group.add(new THREE.Mesh(body, bodyMaterial));
      for (const f of FACE_NAMES) {
        const { axis, sign } = FACES[f];
        if (piece.home[axis] !== sign * h) continue;
        const mesh = new THREE.Mesh(sticker, this.materials[f]);
        const n = new THREE.Vector3(...faceNormal(f));
        mesh.position.copy(n).multiplyScalar(0.4935);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
        mesh.userData = { piece, face: f };
        group.add(mesh);
        this.stickers.push(mesh);
      }
      this.scene.add(group);
      this.nodes.set(piece, group);
    }
    this.sync();
  }

  /** Coloca cada cubie donde dice el modelo. */
  sync() {
    const m = new THREE.Matrix4();
    for (const [piece, group] of this.nodes) {
      const r = piece.rot;
      m.set(r[0], r[1], r[2], 0, r[3], r[4], r[5], 0, r[6], r[7], r[8], 0, 0, 0, 0, 1);
      group.quaternion.setFromRotationMatrix(m);
      group.position.set(piece.pos[0], piece.pos[1], piece.pos[2]);
    }
    this.requestRender();
  }
}
