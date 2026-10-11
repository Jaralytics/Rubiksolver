// comun.mjs — Utilidades de verificación comunes a todos los puzzles. Las firmas y los
// objetivos de etapa son de cada puzzle (tools/puzzles/<id>/firmas.mjs).

import { IDENTITY, parseAlg } from '../../js/cube-model.js';

/** ¿El cubo está sin girar respecto de su marco de referencia? */
export const identity = (m) => m.frame().every((v, i) => v === IDENTITY[i]);

/** Clave de una firma, que puede ser un texto o un objeto { key, … }. */
export const key = (sig) => (sig && typeof sig === 'object' ? sig.key : sig);

/** Firma más votada entre una lista de algoritmos de referencia. */
export function majoritySignature(algs, signatureOf) {
  const votes = new Map();
  let invalid = 0;
  for (const a of algs) {
    let sig = null;
    try {
      sig = signatureOf(parseAlg(a));
    } catch {
      sig = null;
    }
    if (sig && typeof sig === 'object') sig = sig.key;
    if (!sig) {
      invalid++;
      continue;
    }
    votes.set(sig, (votes.get(sig) || 0) + 1);
  }
  const sorted = [...votes.entries()].sort((a, b) => b[1] - a[1]);
  return { signature: sorted[0]?.[0] ?? null, votes: sorted[0]?.[1] ?? 0, total: algs.length, invalid, split: sorted.length };
}
