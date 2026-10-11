// megaminx-view.js — Capa visual del Megaminx: dibuja con Three.js el estado de un MegaminxModel.
// Cada pieza es un grupo con su cuerpo (poliedro convexo) y sus pegatinas, construido en su
// hueco de origen; el modelo solo aporta la rotación que la lleva a donde está ahora.

import * as THREE from 'three';
import { FACE_INDEX, NORMALS, SLOTS, LAYER, CORTE, QUAT, piecePolyhedron, stickerPolygon } from './megaminx-geometry.js';
import { PuzzleView, DIMMED } from './puzzle-view.js';

// Esquema de colores: es una propuesta, hay que contrastarla con un puzzle físico. Abajo, blanco
// y el anillo inferior verde, rojo, azul, amarillo y morado; arriba, gris, y cada cara del anillo
// superior es la pareja pálida de su opuesta (lima, naranja, celeste, crema y rosa).
export const COLORS = {
  D: '#f4f4f0',
  U: '#c9ced8',
  DL: '#27b060',
  DR: '#cf2a33',
  DBR: '#2f6de0',
  B: '#f5cf2e',
  DBL: '#8a4fd6',
  BR: '#9be04a', // opuesta a DL
  BL: '#ff8a1f', // opuesta a DR
  L: '#6fc8f2', // opuesta a DBR
  F: '#f1e2a6', // opuesta a B
  R: '#f08ac0', // opuesta a DBL
};
export { DIMMED };
const BODY = '#0c0e13';

// El dodecaedro de la geometría tiene radio inscrito 1; se amplía para que ocupe lo mismo que el cubo.
const ESCALA = 2;
// Separación de la pegatina sobre la cara (antes de escalar), para evitar el parpadeo entre superficies.
const RELIEVE = 0.004;

/** Geometría sin índices con normales planas: cada polígono se triangula en abanico. */
function polygonsGeometry(polygons) {
  const pos = [];
  for (const poly of polygons) {
    for (let i = 1; i < poly.length - 1; i++) pos.push(...poly[0], ...poly[i], ...poly[i + 1]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geometry.computeVertexNormals();
  return geometry;
}

const scale = (points, k = ESCALA) => points.map((p) => p.map((c) => c * k));

/** Polígonos del núcleo: el dodecaedro n·x <= d de cada cara, con cada polígono antihorario visto desde fuera. */
function corePolygons(d) {
  const corners = SLOTS.map((s, i) => (s.faceIdx.length === 3 ? i : -1)).filter((i) => i >= 0);
  const vertex = (slot) => {
    const [a, b, c] = SLOTS[slot].faceIdx.map((f) => new THREE.Vector3(...NORMALS[f]));
    const bc = new THREE.Vector3().crossVectors(b, c);
    const ca = new THREE.Vector3().crossVectors(c, a);
    const ab = new THREE.Vector3().crossVectors(a, b);
    return bc.add(ca).add(ab).multiplyScalar(d / a.dot(new THREE.Vector3().crossVectors(b, c)));
  };
  return NORMALS.map((nv, f) => {
    const n = new THREE.Vector3(...nv);
    const u = new THREE.Vector3().crossVectors(n, Math.abs(n.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).normalize();
    const v = new THREE.Vector3().crossVectors(n, u);
    return LAYER[f]
      .filter((slot) => corners.includes(slot))
      .map((slot) => vertex(slot))
      .sort((p, q) => Math.atan2(p.dot(v), p.dot(u)) - Math.atan2(q.dot(v), q.dot(u)))
      .map((p) => [p.x, p.y, p.z]);
  });
}

export class MegaminxView extends PuzzleView {
  static COLORS = COLORS;

  fitCamera() {
    this.home.set(4.4, 5.6, 6.3);
    this.controls.minDistance = 5;
    this.controls.maxDistance = 16;
  }

  /**
   * Cámara de una etapa: mira desde la cara `etapa.cara` (inclinada y girada un poco para ver también
   * sus vecinas). Sin cara, o con U, vuelve a la vista por defecto. El botón de recentrar vuelve aquí.
   */
  vistaEtapa(etapa) {
    const cara = etapa?.cara && etapa.cara !== 'U' ? etapa.cara : null;
    if (cara === this.caraVista) return;
    this.caraVista = cara;
    this.fitCamera();
    if (cara) {
      const n = new THREE.Vector3(...NORMALS[FACE_INDEX[cara]]);
      const radio = this.home.length();
      const s = new THREE.Spherical().setFromVector3(n);
      // Las caras de los polos no tienen acimut propio: se toma el de la vista por defecto.
      if (s.phi < 0.01 || s.phi > Math.PI - 0.01) s.theta = Math.atan2(this.home.x, this.home.z);
      s.phi = Math.min(Math.PI - 0.4, Math.max(0.4, s.phi));
      s.theta += 0.4;
      s.radius = radio;
      this.home.setFromSpherical(s);
    }
    this.resetCamera();
  }

  disposePieces() {
    for (const group of this.nodes.values()) group.removeFromParent();
    this.core?.removeFromParent();
    for (const g of this.geometries) g.dispose();
    this.bodyMaterial.dispose();
    this.geometries = [];
    this.core = null;
    this.nodes.clear();
    this.stickers = [];
  }

  build() {
    // Las luces de la base vienen de arriba: una luz baja evita que la cara blanca se vea gris al mirarla desde debajo.
    if (!this.luzBaja) {
      this.luzBaja = new THREE.DirectionalLight(0xffffff, 1.4);
      this.luzBaja.position.set(-3, -9, 5);
      this.scene.add(this.luzBaja);
    }
    const bodyMaterial = (this.bodyMaterial = new THREE.MeshStandardMaterial({ color: BODY, roughness: 0.55 }));
    this.geometries = [];
    const geometry = (polygons) => {
      const g = polygonsGeometry(polygons);
      this.geometries.push(g);
      return g;
    };

    // Núcleo fijo: rellena el interior para que no se vean huecos mientras gira una capa.
    this.core = new THREE.Mesh(geometry(corePolygons(CORTE * 0.985).map((p) => scale(p))), bodyMaterial);
    this.scene.add(this.core);

    this.nodes = new Map(); // pieza del modelo → Group
    this.stickers = [];
    for (const piece of this.model.pieces) {
      const group = new THREE.Group();
      group.add(new THREE.Mesh(geometry(piecePolyhedron(piece.slot).map((p) => scale(p.points))), bodyMaterial));
      for (const face of SLOTS[piece.slot].faces) {
        const n = NORMALS[FACE_INDEX[face]];
        const points = stickerPolygon(piece.slot, face).map((p) => p.map((c, k) => c + n[k] * RELIEVE));
        const mesh = new THREE.Mesh(geometry([scale(points)]), this.materials[face]);
        mesh.userData = { piece, face };
        group.add(mesh);
        this.stickers.push(mesh);
      }
      this.scene.add(group);
      this.nodes.set(piece, group);
    }
    this.sync();
  }

  /** Coloca cada pieza donde dice el modelo: todas están en el origen, solo cambia su rotación. */
  sync() {
    for (const [piece, group] of this.nodes) {
      group.quaternion.set(...QUAT[piece.rot]);
      group.position.set(0, 0, 0);
    }
    this.requestRender();
  }
}
