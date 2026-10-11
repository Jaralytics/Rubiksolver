// index.js — Registro de puzzles. Cada entrada aporta todo lo propio del puzzle, de modo que
// el resto de la aplicación no sabe qué forma tiene:
//   id, nombre, etiqueta   identificador (enlaces), nombre completo y etiqueta corta para títulos
//   catalogo               URL del JSON del catálogo
//   crearModelo()          modelo lógico nuevo y resuelto
//   Vista                  clase de vista 3D (subclase de PuzzleView); new Vista(contenedor, modelo)
//   interpretar(texto)     algoritmo en texto → movimientos
//   miniatura(modelo, mascara, etapa, caso) → SVG;  icono() → SVG;  describir(movimiento) → texto
//   invertir(movs)         secuencia inversa, sin crear un modelo
//   gatillo, abreviar, defs (opcionales) secuencias con nombre, etiqueta corta de caso y SVG compartido
//   mascaras, ayuda        piezas visibles por etapa y texto de la notación
// Contrato de todo modelo: `pieces` (cada una con `home` que admite join(), `pos`, `rot`),
// reset(), clone(), copyFrom(o), applyMove(m), applyMoves(ms), applyAlg(texto), piecesInMove(move),
// isPieceSolved(p), isSolved(), kind(p), frame(), normalize(), stickerAt(pos, cara), más
// `unit` (radianes por unidad de `q`), axisVector(move) → [x, y, z] (eje del giro) e
// invertMoves(moves) (secuencia inversa, conservando `.group`).
// Para añadir un puzzle, crea su módulo y agrégalo aquí.

import p2x2 from './2x2.js';
import p3x3 from './3x3.js';
import p4x4 from './4x4.js';
import megaminx from './megaminx.js';

export const PUZZLES = [p2x2, p3x3, p4x4, megaminx];
export const DEFAULT_PUZZLE = '3x3';
export const puzzleById = (id) => PUZZLES.find((p) => p.id === id);
