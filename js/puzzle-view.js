// puzzle-view.js — Base de las vistas 3D: renderer, escena, luces, cámara, bucle de dibujo
// y giro de una capa. No sabe nada de la forma del puzzle; cada subclase aporta:
//   static COLORS     tabla cara → color de las pegatinas
//   build()           crea las mallas de las piezas: rellena this.nodes (pieza → Object3D),
//                     this.stickers (mallas con userData { piece, face }) y las añade a la escena
//   disposePieces()   quita esas mallas y libera su geometría y material propios
//   sync()            coloca cada pieza donde dice el modelo y pide un dibujo
//   fitCamera()       fija this.home y los límites de zoom según el puzzle
// El modelo debe ofrecer piecesInMove(move) y axisVector(move) (ver puzzles/index.js).

import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';

export const DIMMED = '#343a48';

export class PuzzleView {
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
    this.home = new THREE.Vector3();
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
    this.controls.addEventListener('change', () => this.requestRender());

    this.pivot = new THREE.Group();
    this.scene.add(this.pivot);
    this.turning = [];

    this.materials = {};
    for (const [face, color] of Object.entries(this.constructor.COLORS)) {
      this.materials[face] = new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0 });
    }
    this.dimMaterial = new THREE.MeshStandardMaterial({ color: DIMMED, roughness: 0.7 });
    // build() se llama desde aquí: las subclases no deben declarar campos de instancia
    // (se reiniciarían después de super()); su estado se crea en build().
    this.nodes = new Map();
    this.stickers = [];
    this.fitCamera();
    this.camera.position.copy(this.home);
    this.build();

    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container);
    this.resize();
    const loop = () => {
      this.controls.update();
      if (this.dirty) {
        this.dirty = false;
        this.renderer.render(this.scene, this.camera);
      }
      this.frame = requestAnimationFrame(loop);
    };
    this.frame = requestAnimationFrame(loop);
  }

  /** Cambia de puzzle: libera las mallas y la geometría del anterior y construye las nuevas. */
  setModel(model) {
    this.disposePieces();
    this.turning = [];
    this.pivot.rotation.set(0, 0, 0);
    this.model = model;
    this.fitCamera();
    this.build();
    // Sin amortiguación, update() gasta de una vez la inercia del puzzle anterior;
    // la cámara se recoloca después para que ese giro no se note.
    const damping = this.controls.enableDamping;
    this.controls.enableDamping = false;
    this.controls.update();
    this.controls.enableDamping = damping;
    this.resetCamera();
    this.setMask(() => true);
  }

  /** Libera todo lo de WebGL y quita el lienzo, para poder sustituir la vista por otra clase. */
  dispose() {
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.controls.dispose();
    this.disposePieces();
    for (const m of Object.values(this.materials)) m.dispose();
    this.dimMaterial.dispose();
    this.scene.traverse((o) => {
      o.geometry?.dispose();
      [].concat(o.material || []).forEach((m) => m.dispose());
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
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
    this.turning = this.model.piecesInMove(move).map((p) => this.nodes.get(p));
    for (const g of this.turning) this.pivot.attach(g);
    this.turnAxis = new THREE.Vector3(...this.model.axisVector(move));
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

  /** En pantallas estrechas abre el campo de visión para que el puzzle quepa entero. */
  fit() {
    this.camera.fov = this.camera.aspect < 1 ? Math.min(60, 32 / this.camera.aspect) : 32;
    this.camera.updateProjectionMatrix();
  }

  requestRender() {
    this.dirty = true;
  }
}
