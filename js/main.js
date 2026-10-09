// main.js — Punto de entrada.

import { startApp } from './ui.js';

startApp()
  .then((app) => {
    // Accesible desde la consola para depurar: window.cubo.model, .player, .view…
    window.cubo = app;
  })
  .catch((error) => {
    console.error(error);
    const p = document.createElement('p');
    p.className = 'fatal';
    p.textContent =
      location.protocol === 'file:'
        ? 'Abre la página desde un servidor local (por ejemplo, «npm start»): el navegador no carga módulos ni datos desde file://.'
        : `No se pudo iniciar la página: ${error.message}`;
    document.body.append(p);
  });
