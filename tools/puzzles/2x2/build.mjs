// build.mjs (2x2) — Construye el catálogo del 2x2 a partir de source.mjs. Devuelve el
// catálogo y los problemas; tools/build-catalog.mjs lo verifica antes de escribirlo.

import { parseAlg } from '../../../js/cube-model.js';
import { caseState, ollClass, pblSignature } from './firmas.mjs';
import { FUENTES, METODOS, ETAPAS } from './source.mjs';

export function build() {
  const problems = [];
  const casos = [];
  const etapas = [];

  for (const etapa of ETAPAS) {
    const first = casos.length;
    etapa.casos.forEach((src, i) => {
      const state = caseState(parseAlg(src.alg, 2));
      const c = {
        etapa: etapa.id,
        id: `${etapa.id}-${String(i + 1).padStart(2, '0')}`,
        nombre: src.nombre,
        grupo: src.grupo,
        algoritmo: src.alg,
        alternativas: [],
        descripcion: src.descripcion,
      };
      if (src.notas) c.notas = src.notas;
      if (etapa.tipo === 'capa1' || etapa.tipo === 'cara') c.verificacion = { pieza: [0.5, -0.5, 0.5], pegatina: 'D', ...src.espera };
      if (etapa.tipo === 'oll') c.verificacion = { clase: ollClass(state) };
      if (etapa.tipo === 'pbl' || etapa.tipo === 'pll') c.verificacion = { clase: pblSignature(state) };
      if (src.clase && c.verificacion?.clase !== src.clase) problems.push(`${c.id} (${c.nombre}): la clase es "${c.verificacion?.clase}" y se declaró "${src.clase}"`);
      casos.push(c);
    });
    etapas.push({
      id: etapa.id,
      metodo: etapa.metodo,
      nombre: etapa.nombre,
      tipo: etapa.tipo,
      mascara: etapa.mascara,
      miniatura: etapa.miniatura,
      flechas: false,
      descripcion: etapa.descripcion,
      grupos: [...new Set(casos.slice(first).map((c) => c.grupo))],
    });
  }

  const catalog = {
    version: 1,
    cubo: '2x2',
    generado: new Date().toISOString().slice(0, 10),
    convencion: 'Blanco abajo, amarillo arriba, verde al frente; la esquina inferior-trasera-izquierda fija la orientación. Cada caso se genera aplicando al cubo resuelto el inverso de "algoritmo".',
    fuentes: FUENTES,
    metodos: METODOS.map((m) => ({ ...m, etapas: etapas.filter((e) => e.metodo === m.id).map((e) => e.id) })),
    etapas,
    casos,
  };
  return { catalog, problems };
}
