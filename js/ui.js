// ui.js — Paneles y controles: método, etapas, lista de casos, algoritmo y
// reproducción. Conecta el catálogo con el reproductor y la vista 3D.

import { CubeModel } from './cube-model.js';
import { CubeView } from './cube-view.js';
import { Animator, Player } from './animator.js';
import { loadCatalog, caseMoves, caseModel, maskFor, algText } from './catalog.js';
import { topView, isoView, ARROW_DEFS } from './thumbnails.js';

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

// --- Explicación de un movimiento en palabras ---

const PARTE = {
  R: 'la cara derecha',
  L: 'la cara izquierda',
  U: 'la cara superior',
  D: 'la cara inferior',
  F: 'la cara frontal',
  B: 'la cara trasera',
  r: 'la cara derecha junto con la capa central',
  l: 'la cara izquierda junto con la capa central',
  u: 'la cara superior junto con la capa central',
  d: 'la cara inferior junto con la capa central',
  f: 'la cara frontal junto con la capa central',
  b: 'la cara trasera junto con la capa central',
  M: 'la capa central, en el sentido de L',
  E: 'la capa central, en el sentido de D',
  S: 'la capa central, en el sentido de F',
  x: 'el cubo entero, en el sentido de R',
  y: 'el cubo entero, en el sentido de U',
  z: 'el cubo entero, en el sentido de F',
};

function describeMove(move) {
  const how = move.amount === 2 ? 'media vuelta' : move.prime ? 'un cuarto de vuelta, antihorario' : 'un cuarto de vuelta, horario';
  return `${move.text}: ${PARTE[move.base] || move.base}, ${how}`;
}

// Secuencias con nombre propio; se señalan cuando el caso no trae notas.
const GATILLOS = [
  ["R U R' U R U2 R'", 'Sune'],
  ["R U2 R' U' R U' R'", 'Antisune'],
  ["F R U R' U' F'", "F + «sexy move» + F'"],
  ["R U R' U'", '«sexy move»'],
  ["R' F R F'", '«sledgehammer»'],
  ["U R U' R'", '«sexy move» inverso'],
  ["R U R'", 'inserción básica'],
];

function triggerAt(moves, index) {
  const texts = moves.map((m) => m.text);
  for (const [seq, name] of GATILLOS) {
    const parts = seq.split(' ');
    for (let start = Math.max(0, index - parts.length + 1); start <= index && start + parts.length <= texts.length; start++) {
      if (parts.every((p, k) => texts[start + k] === p)) return name;
    }
  }
  return null;
}

export async function startApp() {
  const catalog = await loadCatalog();
  const model = new CubeModel(3);
  const view = new CubeView($('viewport'), model);
  const animator = new Animator(model, view);
  const player = new Player(model, animator);
  document.body.insertAdjacentHTML('beforeend', ARROW_DEFS);

  const saved = (() => {
    try {
      return JSON.parse(localStorage.getItem(STORE)) || {};
    } catch {
      return {};
    }
  })();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const state = {
    etapa: null,
    caso: null,
    variant: 0,
    moves: [],
    animateSetup: saved.animateSetup ?? !reducedMotion,
    lastCase: saved.lastCase || {}, // etapa → último caso visto
  };
  player.speed = saved.speed || 1;

  const save = () => {
    try {
      localStorage.setItem(STORE, JSON.stringify({ speed: player.speed, animateSetup: state.animateSetup, lastCase: state.lastCase, lastStage: state.etapa?.id }));
    } catch {
      /* almacenamiento no disponible: la página funciona igual */
    }
  };

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

  const thumbs = new Map();
  function thumbnail(etapa, caso) {
    if (!thumbs.has(caso.id)) {
      const m = caseModel(caso);
      const mask = maskFor(etapa, caso);
      thumbs.set(caso.id, etapa.miniatura === 'planta' ? topView(m, mask, { arrows: etapa.flechas }) : isoView(m, mask));
    }
    return thumbs.get(caso.id);
  }

  function renderCases() {
    const etapa = state.etapa;
    $('stage-name').textContent = `${etapa.nombre} · ${etapa.casos.length} casos`;
    $('stage-desc').textContent = etapa.descripcion;
    const compact = etapa.casos.length > 12;
    const list = $('case-list');
    list.className = compact ? 'grid' : 'rows';
    list.replaceChildren(
      ...etapa.grupos.flatMap((grupo) => {
        const casos = etapa.casos.filter((c) => c.grupo === grupo);
        const items = casos.map((caso) => {
          const [short, nick] = caso.nombre.split(' · ');
          const label = compact ? short.replace(/^(OLL|F2L|Perm) /, '') : caso.nombre;
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
        el('button', { type: 'button', className: 'move', textContent: m.text, title: `Ir a ${describeMove(m)}`, onclick: () => player.seek(i) }),
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
    else if (!move) note = 'Caso resuelto. Reproduce hacia atrás para volver al caso y practicarlo.';
    else {
      const own = state.variant === 0 ? state.caso.notas?.[move.group] : null;
      const hint = own || (triggerAt(moves, focus) ? `Parte de: ${triggerAt(moves, focus)}` : null);
      note = hint ? `${hint} — ${describeMove(move)}` : describeMove(move);
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
    const { moves, setup } = caseMoves(state.caso, variant);
    state.moves = moves;
    view.setMask(maskFor(state.etapa, state.caso));
    renderCase();
    player.load(moves, { setup, animate: state.animateSetup });
  }

  function selectCase(id) {
    const caso = catalog.caso(id);
    if (!caso) return;
    state.caso = caso;
    state.lastCase[caso.etapa] = id;
    save();
    history.replaceState(null, '', `#${id}`);
    document.title = `${caso.nombre} — Cubo paso a paso`;
    markSelectedCase();
    loadVariant(0);
  }

  function selectStage(id, casoId) {
    state.etapa = catalog.etapa(id);
    renderMethods();
    renderStages();
    state.caso = null;
    renderCases();
    const remembered = state.etapa.casos.find((c) => c.id === (casoId || state.lastCase[id]));
    selectCase((remembered || state.etapa.casos[0]).id);
  }

  // -------------------------------------------------------------------------
  // Controles
  // -------------------------------------------------------------------------

  player.addEventListener('change', renderPlayer);
  $('btn-play').onclick = () => player.toggle();
  $('btn-rewind').onclick = () => player.toggle(-1);
  $('btn-next').onclick = () => player.next();
  $('btn-prev').onclick = () => player.prev();
  $('btn-reset').onclick = () => player.reset();

  const speed = $('speed');
  const showSpeed = () => ($('speed-out').textContent = `${player.speed}×`.replace('.', ','));
  speed.value = player.speed;
  showSpeed();
  speed.oninput = () => {
    player.speed = Number(speed.value);
    showSpeed();
    save();
  };
  $('animate-setup').checked = state.animateSetup;
  $('animate-setup').onchange = (e) => {
    state.animateSetup = e.target.checked;
    save();
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
    if (e.ctrlKey || e.metaKey || e.altKey || $('help').open) return;
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
  // Arranque: el caso del enlace (#oll-27), el último visto o el primero.
  // -------------------------------------------------------------------------

  const fromHash = () => catalog.caso(decodeURIComponent(location.hash.slice(1)));
  const initial = fromHash();
  if (initial) selectStage(initial.etapa, initial.id);
  else selectStage(saved.lastStage && catalog.etapa(saved.lastStage) ? saved.lastStage : catalog.etapas[0].id);
  window.addEventListener('hashchange', () => {
    const caso = fromHash();
    if (caso && caso.id !== state.caso?.id) selectStage(caso.etapa, caso.id);
  });

  return { catalog, model, view, player, state };
}
