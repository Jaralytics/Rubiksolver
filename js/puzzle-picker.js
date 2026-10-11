// puzzle-picker.js — Selector de cubo de la barra superior: un botón que muestra el cubo
// actual y abre un menú con un dibujo de cada cubo disponible.

/**
 * Conecta el selector. `trigger` abre `menu`; cada puzzle de `puzzles` es un botón con su
 * icono. Flechas para moverse entre opciones, Escape cierra y devuelve el foco al botón.
 */
export function createPicker({ trigger, menu, puzzles, onSelect }) {
  let current = null;
  const options = puzzles.map((p) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'puzzle-option';
    button.title = p.nombre;
    button.setAttribute('aria-label', p.nombre);
    button.dataset.id = p.id;
    button.innerHTML = p.icono();
    button.onclick = () => {
      close();
      trigger.focus();
      onSelect(p.id);
    };
    return button;
  });
  menu.replaceChildren(...options);

  const isOpen = () => !menu.hidden;
  function close() {
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
  }
  function open() {
    menu.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    (options.find((o) => o.dataset.id === current) || options[0]).focus();
  }

  trigger.onclick = () => (isOpen() ? close() : open());
  menu.addEventListener('keydown', (e) => {
    const i = options.indexOf(document.activeElement);
    if (e.key === 'Escape') {
      close();
      trigger.focus();
      e.stopPropagation(); // que no cierre también el cajón de casos
    } else if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
      const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? options.length - 1 : (i + step + options.length) % options.length;
      options[next].focus();
    } else if (e.key === 'Tab') {
      close();
      return;
    } else return;
    e.preventDefault();
  });
  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && !isOpen()) {
      open();
      e.preventDefault();
    } else if (e.key === 'Escape' && isOpen()) {
      close();
      e.stopPropagation();
    }
  });
  document.addEventListener('pointerdown', (e) => {
    if (isOpen() && !menu.contains(e.target) && !trigger.contains(e.target)) close();
  });

  return {
    isOpen,
    /** Marca el cubo actual y actualiza el botón. */
    setCurrent(id) {
      current = id;
      const p = puzzles.find((x) => x.id === id);
      for (const o of options) o.setAttribute('aria-pressed', String(o.dataset.id === id));
      trigger.innerHTML = p.icono();
      trigger.title = `Cambiar de puzzle (actual: ${p.nombre})`;
      trigger.setAttribute('aria-label', trigger.title);
    },
  };
}
