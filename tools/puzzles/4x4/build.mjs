// build.mjs (4x4) — Construye el catálogo del 4x4 a partir de source.mjs. Devuelve el
// catálogo y los problemas; tools/build-catalog.mjs lo verifica antes de escribirlo.

import { parseAlg } from '../../../js/cube-model.js';
import { FUENTES, METODOS, ETAPAS } from './source.mjs';

export function build() {
  const problems = [];
  const casos = [];
  const etapas = [];

  for (const etapa of ETAPAS) {
    const first = casos.length;
    etapa.casos.forEach((src, i) => {
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
      // Lo que el caso promete; el verificador lo comprueba contra el estado.
      const { centros, aristas, alas, paridad } = src;
      c.verificacion = Object.fromEntries(Object.entries({ centros, aristas, alas, paridad }).filter(([, v]) => v !== undefined));
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
      ...(etapa.enlace ? { enlace: etapa.enlace } : {}),
      descripcion: etapa.descripcion,
      grupos: [...new Set(casos.slice(first).map((c) => c.grupo))],
    });
  }

  const catalog = {
    version: 1,
    cubo: '4x4',
    generado: new Date().toISOString().slice(0, 10),
    convencion: 'Blanco abajo, amarillo arriba, verde al frente; la esquina inferior-trasera-izquierda fija la orientación. Cada caso se genera aplicando al cubo resuelto el inverso de "algoritmo". Minúscula = ancho de dos capas (r = Rw).',
    fuentes: FUENTES,
    metodos: METODOS.map((m) => ({ ...m, etapas: etapas.filter((e) => e.metodo === m.id).map((e) => e.id) })),
    etapas,
    casos,
  };
  return { catalog, problems };
}
