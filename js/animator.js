// animator.js — Anima movimientos de uno en uno y mantiene sincronizados el
// modelo lógico y la vista. El modelo solo cambia cuando el giro termina, así
// que en todo momento describe un estado válido del puzzle.

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class Animator {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.current = null;
  }

  get busy() {
    return this.current !== null;
  }

  /**
   * Gira la capa de `move` durante `duration` ms. La promesa se resuelve cuando
   * el giro termina (o cuando alguien llama a finish()).
   */
  play(move, duration) {
    this.finish();
    if (duration <= 0) {
      this.model.applyMove(move);
      this.view.sync();
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      // Los giros dobles (media vuelta, 144°) se animan como dos giros simples
      // seguidos, cada uno con su propia aceleración y una breve pausa entre ellos.
      const steps = Math.abs(move.q);
      const step = Math.sign(move.q) * this.model.unit;
      const pause = duration * 0.15;
      const total = steps * duration + (steps - 1) * pause;
      const start = performance.now();
      this.view.beginTurn(move);
      const job = { move, resolve, frame: 0 };
      const tick = (now) => {
        const elapsed = Math.min(total, now - start);
        const k = Math.min(steps - 1, Math.floor(elapsed / (duration + pause)));
        const local = Math.min(1, (elapsed - k * (duration + pause)) / duration);
        const t = elapsed / total;
        this.view.setTurn(step * (k + ease(local)));
        if (t >= 1) this.finish();
        else job.frame = requestAnimationFrame(tick);
      };
      this.current = job;
      job.frame = requestAnimationFrame(tick);
    });
  }

  /** Completa al instante el giro en curso, si lo hay. */
  finish() {
    const job = this.current;
    if (!job) return;
    this.current = null;
    cancelAnimationFrame(job.frame);
    this.view.endTurn();
    this.model.applyMove(job.move);
    this.view.sync();
    job.resolve();
  }

  /** Coloca el cubo en un estado dado, sin animación. */
  jumpTo(state) {
    this.finish();
    this.model.copyFrom(state);
    this.view.sync();
  }
}

/**
 * Reproductor de un algoritmo sobre un caso: preparación (deshacer el cubo hasta
 * el caso), reproducción hacia delante y hacia atrás, pausa, paso a paso y reinicio.
 * Emite el evento "change" cada vez que cambia algo que la interfaz muestra.
 */
export class Player extends EventTarget {
  constructor(model, animator) {
    super();
    this.model = model;
    this.animator = animator;
    this.moves = [];
    this.index = 0; // movimientos ya hechos
    this.active = -1; // movimiento que se está animando
    this.playing = false;
    this.direction = 1; // sentido de la reproducción en curso: 1 adelante, -1 atrás
    this.preparing = false;
    this.speed = 1;
    this.token = 0;
    this.solved = model.clone().reset();
    this.caseState = this.solved.clone();
  }

  get duration() {
    return 520 / this.speed;
  }

  get finished() {
    return this.index >= this.moves.length;
  }

  emit() {
    this.dispatchEvent(new Event('change'));
  }

  /**
   * Carga un caso: `moves` es la solución y `setup` la secuencia que lleva del
   * cubo resuelto al caso (por defecto, el inverso de la solución).
   */
  async load(moves, { setup = this.model.invertMoves(moves), animate = true } = {}) {
    const token = ++this.token;
    this.moves = moves;
    this.index = 0;
    this.active = -1;
    this.playing = false;
    this.caseState = this.solved.clone().applyMoves(setup);
    this.animator.jumpTo(this.solved);
    if (animate && setup.length) {
      this.preparing = true;
      this.emit();
      // La preparación va rápida y a ritmo constante, sea cual sea su longitud.
      const each = Math.max(70, Math.min(170, 1900 / setup.length));
      for (const m of setup) {
        await this.animator.play(m, each);
        if (token !== this.token) return;
      }
    }
    this.preparing = false;
    this.animator.jumpTo(this.caseState);
    this.emit();
  }

  /** Corta lo que esté en curso y deja el cubo en un estado coherente. */
  interrupt() {
    this.token++;
    this.playing = false;
    this.animator.finish();
    this.active = -1;
    if (this.preparing) {
      this.preparing = false;
      this.animator.jumpTo(this.caseState);
    }
  }

  async step(direction, token) {
    if (direction > 0) {
      if (this.finished) return;
      this.active = this.index;
      this.emit();
      await this.animator.play(this.moves[this.index], this.duration);
      if (token !== this.token) return;
      this.index++;
    } else {
      if (this.index === 0) return;
      this.active = this.index - 1;
      this.emit();
      await this.animator.play(this.model.invertMoves([this.moves[this.index - 1]])[0], this.duration);
      if (token !== this.token) return;
      this.index--;
    }
    this.active = -1;
    this.emit();
  }

  // Un paso interrumpido se da por hecho: el animador ya aplicó el movimiento.
  settle() {
    const { active, index } = this;
    const wasBusy = this.animator.busy;
    const wasPreparing = this.preparing;
    this.interrupt();
    if (wasBusy && !wasPreparing && active >= 0) this.index = active === index ? index + 1 : index - 1;
  }

  next() {
    this.settle();
    const p = this.step(1, this.token);
    this.emit();
    return p;
  }

  prev() {
    this.settle();
    const p = this.step(-1, this.token);
    this.emit();
    return p;
  }

  /**
   * Reproduce seguido desde el punto actual. Con `direction` -1 deshace el
   * algoritmo movimiento a movimiento hasta volver al caso.
   */
  async play(direction = 1) {
    this.settle();
    // En el extremo de llegada no queda nada que reproducir: se parte del otro.
    if (direction > 0 ? this.finished : this.index === 0) {
      this.index = direction > 0 ? 0 : this.moves.length;
      this.animator.jumpTo(this.caseState.clone().applyMoves(this.moves.slice(0, this.index)));
    }
    const token = this.token;
    this.playing = true;
    this.direction = direction;
    this.emit();
    while (token === this.token && (direction > 0 ? !this.finished : this.index > 0)) {
      await this.step(direction, token);
      if (token !== this.token) return;
      await new Promise((r) => setTimeout(r, 90 / this.speed));
    }
    if (token === this.token) {
      this.playing = false;
      this.emit();
    }
  }

  pause() {
    this.settle();
    this.emit();
  }

  toggle(direction = 1) {
    if (this.playing && this.direction === direction) this.pause();
    else this.play(direction);
  }

  /** Vuelve al caso, sin animación. */
  reset() {
    this.seek(0);
  }

  /** Salta al estado tras `index` movimientos, sin animación. */
  seek(index) {
    this.interrupt();
    this.index = Math.max(0, Math.min(this.moves.length, index));
    this.animator.jumpTo(this.caseState.clone().applyMoves(this.moves.slice(0, this.index)));
    this.emit();
  }
}
