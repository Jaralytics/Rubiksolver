// build.mjs (Megaminx) — Construye el catálogo del Megaminx a partir de source.mjs. Devuelve el
// catálogo y los problemas; tools/build-catalog.mjs lo verifica antes de escribirlo.

import { parseAlg } from '../../../js/megaminx-model.js';
import { caseState, eoClass, epClass, cpClass, coClass, STAGE_TYPES, piezasEtapaCambiadas, altoClass, ownPiece } from './firmas.mjs';
import { textoCaso } from './textos.mjs';
import { FUENTES, METODOS, ETAPAS } from './source.mjs';

export function build() {
  const problems = [];
  const casos = [];
  const etapas = [];

  for (const etapa of ETAPAS) {
    const first = casos.length;
    etapa.casos.forEach((src, i) => {
      const moves = parseAlg(src.alg);
      const state = caseState(moves);
      // Capas inferiores: la pieza objetivo la declara la fuente (o es la única de la etapa que el algoritmo mueve);
      // las libres son el resto de piezas de la etapa que el algoritmo mueve además del objetivo
      const capas = STAGE_TYPES.includes(etapa.tipo);
      const cambiadas = capas ? piezasEtapaCambiadas(etapa.tipo, moves) : [];
      const pieza = capas ? src.pieza || cambiadas.filter((h) => ownPiece(etapa.tipo, state.pieces.find((p) => p.home.join('-') === h))).map((h) => h.split('-'))[0] : null;
      const libres = capas ? cambiadas.filter((h) => h !== pieza.join('-')) : [];
      // el texto de todos los casos se redacta a partir del estado real del caso (verify.mjs lo comprueba)
      const t = textoCaso(etapa.tipo, state, pieza, libres);
      const c = {
        etapa: etapa.id,
        id: `${etapa.id}-${String(i + 1).padStart(2, '0')}`,
        nombre: t.nombre,
        grupo: t.grupo,
        algoritmo: src.alg,
        alternativas: [],
        descripcion: t.descripcion,
      };
      if (src.notas) c.notas = src.notas;
      c.verificacion = capas ? { clase: altoClass(state, pieza, libres), pieza, libres } : { clase: { eo: eoClass, ep: epClass, cp: cpClass, co: coClass }[etapa.tipo](state) };
      if (src.clase && c.verificacion.clase !== src.clase) problems.push(`${c.id} (${c.nombre}): la clase es "${c.verificacion.clase}" y se declaró "${src.clase}"`);
      casos.push(c);
    });
    etapas.push({
      id: etapa.id,
      metodo: etapa.metodo,
      nombre: etapa.nombre,
      tipo: etapa.tipo,
      mascara: etapa.mascara,
      miniatura: etapa.miniatura,
      cara: etapa.cara,
      flechas: false,
      ...(etapa.cobertura ? { cobertura: etapa.cobertura } : {}),
      descripcion: etapa.descripcion,
      grupos: [...new Set(casos.slice(first).map((c) => c.grupo))],
    });
  }

  const catalog = {
    version: 1,
    cubo: 'megaminx',
    generado: new Date().toISOString().slice(0, 10),
    convencion: 'Blanco (cara D) abajo y gris (cara U) arriba; los centros fijan la orientación. Cada caso se genera aplicando al puzzle resuelto el inverso de "algoritmo".',
    fuentes: FUENTES,
    metodos: METODOS.map((m) => ({ ...m, etapas: etapas.filter((e) => e.metodo === m.id).map((e) => e.id) })),
    etapas,
    casos,
  };
  return { catalog, problems };
}
