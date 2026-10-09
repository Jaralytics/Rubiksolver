// cube-view.js — Capa visual: dibuja con Three.js el estado de un CubeModel.
// No decide nada sobre el cubo; solo refleja el modelo y gira capas cuando el
// animador se lo pide.

import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { RoundedBoxGeometry } from '../vendor/RoundedBoxGeometry.js';
import { FACES, FACE_NAMES, faceNormal } from './cube-model.js';

// Esquema estándar sostenido con la cruz blanca abajo: amarillo arriba, verde al frente.
export const COLORS = {
  U: '#f5cf2e',
  D: '#f2f3ee',
  F: '#27b060',
  B: '#2f6de0',
  R: '#ff8a1f',
  L: '#cf2a33',
};
export const DIMMED = '#343a48';
const BODY = '#0c0e13';

const AXIS_VECTORS = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];

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

export class CubeView {
  constructor(container, model) {
    this.container = container;
    this.model = model;
    this.mask = () => true;
    this.dirty = true;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.canvas = this.renderer.domElement;
    container.appendChild(this.canvas);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    this.home = new THREE.Vector3(4.6, 4.2, 6.6).multiplyScalar(model.size / 3);
    this.camera.position.copy(this.home);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xaab0c4, 2.2));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(5, 9, 7);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.9);
    fill.position.set(7, 1, -2);
    this.scene.add(fill);

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.rotateSpeed = 0.9;
    this.controls.minDistance = 5 * (model.size / 3);
    this.controls.maxDistance = 16 * (model.size / 3);
    this.controls.addEventListener('change', () => this.requestRender());

    this.pivot = new THREE.Group();
    this.scene.add(this.pivot);
    this.turning = [];

    this.materials = {};
    for (const f of FACE_NAMES) {
      this.materials[f] = new THREE.MeshStandardMaterial({ color: COLORS[f], roughness: 0.42, metalness: 0 });
    }
    this.dimMaterial = new THREE.MeshStandardMaterial({ color: DIMMED, roughness: 0.7 });
    this.build();

    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
    const loop = () => {
      this.controls.update();
      if (this.dirty) {
        this.dirty = false;
        this.renderer.render(this.scene, this.camera);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  build() {
    const body = new RoundedBoxGeometry(0.985, 0.985, 0.985, 3, 0.09);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: BODY, roughness: 0.55 });
    const sticker = stickerGeometry(0.84, 0.13);
    const h = this.model.h;
    this.cubies = new Map(); // pieza del modelo → Group
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
      this.cubies.set(piece, group);
    }
    this.sync();
  }

  /** Coloca cada cubie donde dice el modelo. */
  sync() {
    const m = new THREE.Matrix4();
    for (const [piece, group] of this.cubies) {
      const r = piece.rot;
      m.set(r[0], r[1], r[2], 0, r[3], r[4], r[5], 0, r[6], r[7], r[8], 0, 0, 0, 0, 1);
      group.quaternion.setFromRotationMatrix(m);
      group.position.set(piece.pos[0], piece.pos[1], piece.pos[2]);
    }
    this.requestRender();
  }

  /** `mask(piece, face)` decide qué pegatinas se muestran con color; el resto, en gris. */
  setMask(mask) {
    this.mask = mask;
    for (const s of this.stickers) {
      s.material = mask(s.userData.piece, s.userData.face) ? this.materials[s.userData.face] : this.dimMaterial;
    }
    this.requestRender();
  }

  // --- Giro de una capa (lo dirige el animador) ---

  beginTurn(move) {
    this.pivot.rotation.set(0, 0, 0);
    this.turning = this.model.piecesInMove(move).map((p) => this.cubies.get(p));
    for (const g of this.turning) this.pivot.attach(g);
    this.turnAxis = AXIS_VECTORS[move.axis];
  }

  setTurn(angle) {
    this.pivot.quaternion.setFromAxisAngle(this.turnAxis, angle);
    this.requestRender();
  }

  /** Suelta la capa; el llamador actualiza el modelo y luego llama a sync(). */
  endTurn() {
    for (const g of this.turning) this.scene.attach(g);
    this.turning = [];
    this.pivot.rotation.set(0, 0, 0);
  }

  // --- Cámara ---

  orbit(dTheta, dPhi) {
    const offset = this.camera.position.clone().sub(this.controls.target);
    const s = new THREE.Spherical().setFromVector3(offset);
    s.theta += dTheta;
    s.phi = Math.min(Math.PI - 0.15, Math.max(0.15, s.phi + dPhi));
    this.camera.position.copy(this.controls.target).add(offset.setFromSpherical(s));
    this.camera.lookAt(this.controls.target);
    this.requestRender();
  }

  zoom(factor) {
    const offset = this.camera.position.clone().sub(this.controls.target);
    const d = Math.min(this.controls.maxDistance, Math.max(this.controls.minDistance, offset.length() * factor));
    this.camera.position.copy(this.controls.target).add(offset.setLength(d));
    this.requestRender();
  }

  resetCamera() {
    this.camera.position.copy(this.home);
    this.camera.lookAt(this.controls.target);
    this.fit();
    this.requestRender();
  }

  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.fit();
    this.requestRender();
  }

  /** En pantallas estrechas abre el campo de visión para que el cubo quepa entero. */
  fit() {
    this.camera.fov = this.camera.aspect < 1 ? Math.min(60, 32 / this.camera.aspect) : 32;
    this.camera.updateProjectionMatrix();
  }

  requestRender() {
    this.dirty = true;
  }
}
