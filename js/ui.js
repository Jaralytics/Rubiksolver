// ui.js — Paneles y controles: método, etapas, lista de casos, algoritmo y
// reproducción. Conecta el catálogo con el reproductor y la vista 3D.

import { Animator, Player } from './animator.js';
import { loadCatalog, caseMoves, caseModel, maskFor, algText } from './catalog.js';
import { PUZZLES, DEFAULT_PUZZLE, puzzleById } from './puzzles/index.js';
import { createPicker } from './puzzle-picker.js';

const $ = (id) => document.getElementById(id);
const STORE = 'cubo-paso-a-paso';

const el = (tag, props = {}, children = []) => {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    // Los atributos ARIA se escriben como atributos: no todos los navegadores los reflejan como propiedades.
    if (key.startsWith('aria')) node.setAttribute(`aria-${key.slice(4).toLowerCase()}`, value);
    else node[key] = value;
  }
  for (const c of [].concat(children)) node.append(c);
  return node;
};

/** Enlace #<puzzle>/<clave>; los antiguos #<caso> son alias del 3x3. */
function parseHash() {
  let raw = '';
  try {
    raw = decodeURIComponent(location.hash.slice(1));
  } catch {
    /* enlace mal formado: se trata como vacío */
  }
  if (!raw) return { puzzle: null, key: '' }; // sin enlace: se queda el cubo actual
  const [first, ...rest] = raw.split('/');
  if (puzzleById(first)) return { puzzle: first, key: rest.join('/') };
  return { puzzle: DEFAULT_PUZZLE, key: raw };
}

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Lee lo guardado campo a campo: un valor dañado se descarta sin perder el resto. */
function readSaved() {
  let raw = {};
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE));
    if (isObject(parsed)) raw = parsed;
  } catch {
    /* sin datos o ilegibles */
  }
  const speed = Number(raw.speed);
  const lastCase = (v) => (isObject(v) ? Object.fromEntries(Object.entries(v).filter(([, id]) => typeof id === 'string')) : {});
  // Formato anterior ({ lastCase, lastStage } del 3x3): pasa a la entrada del 3x3.
  const blocks = isObject(raw.porCubo) ? raw.porCubo : { [DEFAULT_PUZZLE]: { lastCase: raw.lastCase, lastStage: raw.lastStage } };
  const porCubo = {};
  for (const p of PUZZLES) {
    const block = isObject(blocks[p.id]) ? blocks[p.id] : {};
    porCubo[p.id] = { lastCase: lastCase(block.lastCase), lastStage: typeof block.lastStage === 'string' ? block.lastStage : undefined };
  }
  return {
    speed: Number.isFinite(speed) && speed >= 0.5 && speed <= 3 ? speed : 1,
    animateSetup: typeof raw.animateSetup === 'boolean' ? raw.animateSetup : undefined,
    soloCaras: raw.soloCaras === true,
    puzzle: typeof raw.puzzle === 'string' ? raw.puzzle : undefined,
    porCubo,
  };
}

/** Nombre para usar dentro de una frase: «Cubo 3x3» pasa a «cubo 3x3», «Megaminx» a «megaminx». */
const enFrase = (p) => p.nombre.charAt(0).toLowerCase() + p.nombre.slice(1);

export async function startApp() {
  const saved = readSaved();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Cubo activo: todo lo que depende del puzzle se rehace en usePuzzle().
  let puzzle = null;
  let catalog = null;
  let model = null;
  let view = null;
  let animator = null;
  let player = null;
  let thumbs = new Map();
  const defsInsertadas = new Set(); // definiciones SVG compartidas ya presentes en la página
  const catalogs = new Map(); // id → promesa del catálogo (también mientras se carga)
  let seq = 0; // número del último cambio de cubo pedido; los anteriores se abandonan
  let pending = null; // cubo que se está cargando

  const state = {
    etapa: null,
    caso: null,
    variant: 0,
    moves: [],
    animateSetup: saved.animateSetup ?? !reducedMotion,
    soloCaras: saved.soloCaras,
    lastCase: {}, // etapa → último caso visto (del cubo activo)
  };
  let speedValue = saved.speed;

  const save = () => {
    try {
      saved.porCubo[puzzle.id] = { lastCase: state.lastCase, lastStage: state.etapa?.id };
      localStorage.setItem(STORE, JSON.stringify({ speed: speedValue, animateSetup: state.animateSetup, soloCaras: state.soloCaras, puzzle: puzzle.id, porCubo: saved.porCubo }));
    } catch {
      /* almacenamiento no disponible: la página funciona igual */
    }
  };

  const picker = createPicker({
    trigger: $('puzzle-open'),
    menu: $('puzzle-menu'),
    puzzles: PUZZLES,
    onSelect: (id) => {
      if (id === (pending || puzzle.id)) return;
      if (id !== puzzle.id) return switchPuzzle(id);
      // Vuelve al cubo que ya se ve: basta con anular la carga en curso.
      seq++;
      pending = null;
      picker.setCurrent(id);
    },
  });

  /** Notación válida para el cubo activo, en el diálogo de ayuda. */
  const introAyuda = $('help-intro').textContent; // texto de los cubos; un puzzle puede traer el suyo (ayuda.intro)
  function renderHelp() {
    $('help-intro').textContent = puzzle.ayuda.intro ?? introAyuda;
    $('help-legend').replaceChildren(...puzzle.ayuda.notacion.flatMap(([term, text]) => [el('dt', { textContent: term }), el('dd', { textContent: text })]));
    $('help-note').textContent = puzzle.ayuda.nota;
  }

  /** Cambia el cubo activo: modelo, vista, animador, reproductor y catálogo. Libera el cubo anterior. */
  async function usePuzzle(id) {
    const mine = ++seq;
    const next = puzzleById(id);
    if (!catalogs.has(id)) {
      const promise = loadCatalog(next.catalogo);
      catalogs.set(id, promise);
      promise.catch(() => catalogs.delete(id)); // un fallo no se queda en la caché
    }
    const loaded = await catalogs.get(id);
    if (mine !== seq) return false; // se pidió otro cubo después: gana el último
    if (player) {
      player.interrupt();
      speedValue = player.speed;
    }
    const nextModel = next.crearModelo();
    if (view instanceof next.Vista) view.setModel(nextModel);
    else {
      // La vista nueva se crea antes de soltar la anterior: si falla, sigue la que había.
      const nextView = new next.Vista($('viewport'), nextModel);
      view?.dispose();
      view = nextView;
    }
    if (next.defs && !defsInsertadas.has(next.defs)) {
      defsInsertadas.add(next.defs);
      document.body.insertAdjacentHTML('beforeend', next.defs);
    }
    puzzle = next;
    catalog = loaded;
    model = nextModel;
    animator = new Animator(model, view);
    player = new Player(model, animator);
    player.speed = speedValue;
    player.addEventListener('change', renderPlayer);
    thumbs = new Map();
    state.lastCase = saved.porCubo[id].lastCase;
    state.etapa = state.caso = null;
    picker.setCurrent(id);
    $('face-turns-option').hidden = !puzzle.soloCaras;
    renderHelp();
    document.title = `Cubo paso a paso · ${puzzle.etiqueta ?? puzzle.id}`;
    return true;
  }

  /** Abre un cubo y muestra el caso o la etapa de `key`, el último visto o el primero. */
  async function openPuzzle(id, key = '') {
    if (!(await usePuzzle(id))) return;
    const caso = catalog.caso(key);
    const lastStage = saved.porCubo[id].lastStage;
    if (caso) selectStage(caso.etapa, caso.id);
    else if (catalog.etapa(key)) selectStage(key);
    else selectStage(lastStage && catalog.etapa(lastStage) ? lastStage : catalog.etapas[0].id);
  }

  /** Cambio de cubo pedido por el usuario: si no se puede cargar, avisa y deja el que había. */
  async function switchPuzzle(id, key = '') {
    pending = id;
    try {
      await openPuzzle(id, key);
      document.querySelector('.fatal.cambio')?.remove();
    } catch (error) {
      console.error(error);
      if (pending !== id) return; // ya se pidió otro cubo: este fallo no interesa
      document.querySelector('.fatal.cambio')?.remove();
      const aviso = el('p', { className: 'fatal cambio', textContent: `No se pudo abrir el ${enFrase(puzzleById(id))}: revisa la conexión e inténtalo de nuevo.` });
      aviso.setAttribute('role', 'alert');
      document.body.append(aviso);
      picker.setCurrent(puzzle.id);
    } finally {
      if (pending === id) pending = null;
    }
  }

  // -------------------------------------------------------------------------
  // Método y etapas
  // -------------------------------------------------------------------------

  function renderMethods() {
    $('methods').replaceChildren(
      ...catalog.metodos.map((m) =>
        el('button', {
          type: 'button',
          textContent: m.nombre,
          title: m.descripcion,
          ariaPressed: String(m.id === state.etapa.metodo),
          onclick: () => selectStage(catalog.etapa(m.etapas[0]).id),
        }),
      ),
    );
  }

  function renderStages() {
    const metodo = catalog.metodos.find((m) => m.id === state.etapa.metodo);
    $('stages').classList.toggle('many', metodo.etapas.length > 5);
    $('stages').classList.toggle('crowded', metodo.etapas.length > 7);
    $('stages').replaceChildren(
      ...metodo.etapas.map((id, i) => {
        const etapa = catalog.etapa(id);
        const button = el('button', { type: 'button', title: etapa.nombre, ariaLabel: `Etapa ${i + 1}: ${etapa.nombre}`, onclick: () => selectStage(id) }, [
          el('span', { className: 'num', textContent: String(i + 1) }),
          el('span', { textContent: etapa.nombre }),
        ]);
        if (id === state.etapa.id) button.setAttribute('aria-current', 'step');
        return el('li', {}, button);
      }),
    );
  }

  // -------------------------------------------------------------------------
  // Lista de casos
  // -------------------------------------------------------------------------

  function thumbnail(etapa, caso) {
    if (!thumbs.has(caso.id)) {
      thumbs.set(caso.id, puzzle.miniatura(caseModel(caso, puzzle), maskFor(puzzle, etapa, caso), etapa, caso));
    }
    return thumbs.get(caso.id);
  }

  function renderCases() {
    const etapa = state.etapa;
    $('stage-name').textContent = etapa.enlace ? etapa.nombre : `${etapa.nombre} · ${etapa.casos.length} casos`;
    $('stage-desc').textContent = etapa.descripcion;
    const compact = etapa.casos.length > (puzzle.maxCasosEnFilas ?? 12);
    const list = $('case-list');
    list.className = compact ? 'grid' : 'rows';
    if (etapa.enlace) return list.replaceChildren(linkButton());
    list.replaceChildren(
      ...etapa.grupos.flatMap((grupo) => {
        const casos = etapa.casos.filter((c) => c.grupo === grupo);
        const items = casos.map((caso) => {
          const [short, nick] = caso.nombre.split(' · ');
          const label = compact ? (puzzle.abreviar?.(short) ?? short) : caso.nombre;
          const button = el('button', {
            type: 'button',
            className: 'case',
            title: caso.nombre,
            onclick: (e) => {
              selectCase(caso.id);
              closeCases();
              // Tras un clic de ratón el foco no debe quedarse aquí: el espacio es reproducir.
              if (e.detail > 0) button.blur();
            },
          });
          button.dataset.id = caso.id;
          button.setAttribute('aria-label', `${caso.nombre}. ${algText(caso)}`);
          button.innerHTML = thumbnail(etapa, caso);
          button.append(
            el('span', { className: 'case-text' }, [
              el('span', { className: 'case-name', textContent: label }),
              ...(compact && nick ? [el('span', { className: 'case-nick', textContent: nick })] : []),
              ...(compact ? [] : [el('span', { className: 'case-alg', textContent: algText(caso) })]),
            ]),
          );
          return el('li', {}, button);
        });
        return [el('h3', { textContent: grupo }), el('ul', {}, items)];
      }),
    );
    $('cases-scroll').scrollTop = 0;
    markSelectedCase();
  }

  function markSelectedCase() {
    for (const b of $('case-list').querySelectorAll('.case')) {
      const on = b.dataset.id === state.caso?.id;
      b.setAttribute('aria-pressed', String(on));
      if (on) b.scrollIntoView({ block: 'nearest' });
    }
  }

  // -------------------------------------------------------------------------
  // Caso y algoritmo
  // -------------------------------------------------------------------------

  function renderCase() {
    const caso = state.caso;
    $('case-name').textContent = caso.nombre;
    $('case-desc').textContent = caso.descripcion;
    $('case-desc').title = caso.descripcion;

    const names = ['Principal', ...caso.alternativas.map((_, i) => (caso.alternativas.length > 1 ? `Alternativa ${i + 1}` : 'Alternativa'))];
    $('variants').hidden = names.length === 1;
    $('variants').replaceChildren(
      ...names.map((name, i) =>
        el('button', {
          type: 'button',
          textContent: name,
          title: algText(caso, i),
          ariaPressed: String(i === state.variant),
          onclick: () => loadVariant(i),
        }),
      ),
    );

    const groups = [];
    state.moves.forEach((m, i) => {
      (groups[m.group] ||= []).push(
        el('button', { type: 'button', className: 'move', textContent: m.text, title: `Ir a ${puzzle.describir(m)}`, onclick: () => player.seek(i) }),
      );
    });
    $('moves').replaceChildren(...groups.filter(Boolean).map((g) => el('span', { className: 'group' }, g)));
  }

  function renderPlayer() {
    const { index, active, playing, preparing, moves } = player;
    const chips = $('moves').querySelectorAll('.move');
    const focus = active >= 0 ? active : index;
    chips.forEach((chip, i) => {
      chip.classList.toggle('done', i < index && i !== active);
      chip.classList.toggle('active', i === active);
      chip.classList.toggle('next', active < 0 && i === index && !preparing);
      if (i === focus && !preparing) chip.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });

    const move = moves[focus];
    let note;
    if (preparing) note = 'Preparando el caso: el cubo se desarma desde el estado resuelto.';
    else if (!move) note = state.caso ? 'Caso resuelto. Reproduce hacia atrás para volver al caso y practicarlo.' : '';
    else {
      const own = state.variant === 0 ? state.caso.notas?.[move.group] : null;
      const trigger = own ? null : puzzle.gatillo?.(moves, focus);
      const hint = own || (trigger ? `Parte de: ${trigger}` : null);
      note = hint ? `${hint} — ${puzzle.describir(move)}` : puzzle.describir(move);
    }
    $('note').textContent = note;
    $('now').textContent = preparing ? '' : move ? move.text : '✓';
    $('now').classList.toggle('moving', active >= 0);
    $('progress').textContent = preparing ? 'Preparando…' : `${index} de ${moves.length}`;

    const play = $('btn-play');
    const forward = playing && player.direction > 0;
    const backward = playing && player.direction < 0;
    play.classList.toggle('is-playing', forward);
    play.setAttribute('aria-label', forward ? 'Pausar' : 'Reproducir');
    $('btn-rewind').classList.toggle('is-playing', backward);
    $('btn-rewind').setAttribute('aria-label', backward ? 'Pausar' : 'Reproducir hacia atrás');
    $('btn-prev').disabled = !preparing && index === 0 && active < 0;
    $('btn-reset').disabled = !preparing && index === 0 && active < 0;
    $('btn-next').disabled = !preparing && index >= moves.length;
  }

  function loadVariant(variant) {
    state.variant = variant;
    const { moves, setup } = caseMoves(state.caso, variant, puzzle, state.soloCaras);
    state.moves = moves;
    view.setMask(maskFor(puzzle, state.etapa, state.caso));
    renderCase();
    player.load(moves, { setup, animate: state.animateSetup });
  }

  function selectCase(id) {
    const caso = catalog.caso(id);
    if (!caso) return;
    state.caso = caso;
    state.lastCase[caso.etapa] = id;
    save();
    history.replaceState(null, '', `#${puzzle.id}/${id}`);
    document.title = `${caso.nombre} — Cubo paso a paso · ${puzzle.etiqueta ?? puzzle.id}`;
    markSelectedCase();
    loadVariant(0);
  }

  /** Botón que lleva a otro cubo (etapa de enlace, como «Como un 3x3» en la reducción del 4x4). */
  function linkButton() {
    const destino = puzzleById(state.etapa.enlace);
    return el('button', { type: 'button', className: 'ghost link-button', textContent: `Abrir el ${enFrase(destino)}`, onclick: () => switchPuzzle(destino.id) });
  }

  /** Etapa sin casos: explica el paso y ofrece el botón; el cubo se queda resuelto. */
  function showLink() {
    const etapa = state.etapa;
    history.replaceState(null, '', `#${puzzle.id}/${etapa.id}`);
    document.title = `${etapa.nombre} — Cubo paso a paso · ${puzzle.etiqueta ?? puzzle.id}`;
    state.moves = [];
    $('case-name').textContent = etapa.nombre;
    $('case-desc').textContent = etapa.descripcion;
    $('case-desc').title = etapa.descripcion;
    $('variants').hidden = true;
    $('moves').replaceChildren(linkButton());
    view.setMask(maskFor(puzzle, etapa, null));
    player.load([], { setup: [], animate: false });
    save();
  }

  function selectStage(id, casoId) {
    state.etapa = catalog.etapa(id);
    view.vistaEtapa?.(state.etapa);
    renderMethods();
    renderStages();
    state.caso = null;
    $('app').classList.toggle('enlace', Boolean(state.etapa.enlace));
    renderCases();
    if (state.etapa.enlace) return showLink();
    const remembered = state.etapa.casos.find((c) => c.id === (casoId || state.lastCase[id]));
    selectCase((remembered || state.etapa.casos[0]).id);
  }

  // -------------------------------------------------------------------------
  // Controles
  // -------------------------------------------------------------------------

  $('btn-play').onclick = () => player.toggle();
  $('btn-rewind').onclick = () => player.toggle(-1);
  $('btn-next').onclick = () => player.next();
  $('btn-prev').onclick = () => player.prev();
  $('btn-reset').onclick = () => player.reset();

  const speed = $('speed');
  const showSpeed = () => ($('speed-out').textContent = `${speedValue}×`.replace('.', ','));
  speed.value = speedValue;
  showSpeed();
  speed.oninput = () => {
    player.speed = speedValue = Number(speed.value);
    showSpeed();
    save();
  };
  $('animate-setup').checked = state.animateSetup;
  $('animate-setup').onchange = (e) => {
    state.animateSetup = e.target.checked;
    save();
  };

  $('face-turns').checked = state.soloCaras;
  $('face-turns').onchange = (e) => {
    state.soloCaras = e.target.checked;
    save();
    if (state.caso) loadVariant(state.variant);
  };

  $('zoom-in').onclick = () => view.zoom(0.88);
  $('zoom-out').onclick = () => view.zoom(1 / 0.88);
  $('view-reset').onclick = () => view.resetCamera();
  $('help-open').onclick = () => $('help').showModal();

  // Cajón de casos (solo en pantallas estrechas).
  const openCases = () => {
    $('app').classList.add('cases-open');
    $('backdrop').hidden = false;
    $('cases-open').setAttribute('aria-expanded', 'true');
    $('cases-close').focus();
  };
  function closeCases() {
    if (!$('app').classList.contains('cases-open')) return;
    $('app').classList.remove('cases-open');
    $('backdrop').hidden = true;
    $('cases-open').setAttribute('aria-expanded', 'false');
  }
  $('cases-open').onclick = openCases;
  $('cases-close').onclick = closeCases;
  $('backdrop').onclick = closeCases;

  // Teclado. Las flechas izquierda/derecha avanzan el algoritmo; con Mayús, o con
  // el cubo enfocado, las cuatro flechas giran la vista.
  const STEP = Math.PI / 12;
  const ORBIT = { ArrowLeft: [-STEP, 0], ArrowRight: [STEP, 0], ArrowUp: [0, -STEP], ArrowDown: [0, STEP] };
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || $('help').open || picker.isOpen()) return;
    const target = e.target;
    const typing = target.matches('input, select, textarea');
    if (e.key === 'Escape') return closeCases();
    if (ORBIT[e.key]) {
      const onCube = target === $('viewport');
      if (e.shiftKey || onCube) {
        view.orbit(...ORBIT[e.key]);
        e.preventDefault();
      } else if (!typing && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        if (e.key === 'ArrowLeft') player.prev();
        else player.next();
        e.preventDefault();
      }
      return;
    }
    if (typing) return;
    if (e.key === ' ') {
      // En un botón, el espacio conserva su función normal de activarlo.
      if (target.matches('button, a, summary')) return;
      player.toggle(e.shiftKey ? -1 : 1);
      e.preventDefault();
    } else if (e.key === 'r' || e.key === 'R') player.reset();
    else if (e.key === '+' || e.key === '=') view.zoom(0.88);
    else if (e.key === '-') view.zoom(1 / 0.88);
    else if (e.key === '0') view.resetCamera();
    else if (e.key === '?') $('help').showModal();
  });

  // -------------------------------------------------------------------------
  // Arranque: el enlace (#2x2/or-oll-03, o #oll-27 del 3x3), el último cubo visto o el 3x3.
  // -------------------------------------------------------------------------

  const initial = parseHash();
  await openPuzzle(initial.puzzle || puzzleById(saved.puzzle)?.id || DEFAULT_PUZZLE, initial.key);
  window.addEventListener('hashchange', () => {
    const { puzzle: id, key } = parseHash();
    if (id && id !== (pending || puzzle.id)) switchPuzzle(id, key);
    else if (key && key !== state.caso?.id) {
      const caso = catalog.caso(key);
      if (caso) selectStage(caso.etapa, caso.id);
      else if (catalog.etapa(key) && key !== state.etapa?.id) selectStage(key);
    }
  });

  return {
    get catalog() { return catalog; },
    get model() { return model; },
    get view() { return view; },
    get player() { return player; },
    state,
    openPuzzle,
  };
}
