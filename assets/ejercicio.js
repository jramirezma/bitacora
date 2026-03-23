// ─── SVG SYMBOL ───────────────────────────────────────────

const SVG_NS = 'http://www.w3.org/2000/svg';

function inyectarSymbol() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.style.display = 'none';
  svg.innerHTML = `
    <symbol id="icono-copiar" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </symbol>`;
  document.body.prepend(svg);
}

// ─── BUTTON FACTORY ───────────────────────────────────────

function crearBoton(titulo, handler) {
  const btn = document.createElement('button');
  btn.className = 'copy-btn';
  btn.title = titulo;
  btn.innerHTML = `<svg width="14" height="14"><use href="#icono-copiar"/></svg>`;
  btn.addEventListener('click', () => handler(btn));
  return btn;
}

// ─── COPY HANDLERS ────────────────────────────────────────

function _flashCopy(btn, texto) {
  navigator.clipboard.writeText(texto).then(() => {
    btn.classList.add('copiado');
    setTimeout(() => btn.classList.remove('copiado'), 1800);
  });
}

function copiarEnunciado(btn) {
  // Lee el LaTeX crudo guardado antes de que MathJax procese el DOM,
  // en lugar de textContent (que devuelve el texto Unicode renderizado).
  const el = btn.closest('.ejercicio');
  const texto = el.dataset.latex || el.querySelector('p').textContent.trim();
  _flashCopy(btn, texto);
}

function copiarDato(btn) {
  const texto = [...btn.closest('.dato-curioso').querySelectorAll('p')]
    .map(p => p.textContent.trim()).join('\n\n');
  _flashCopy(btn, texto);
}

function copiarBloque(btn) {
  const texto = [...btn.closest('.bloque').querySelectorAll('p')]
    .map(p => p.textContent.trim()).join('\n\n');
  _flashCopy(btn, texto);
}

function copiar(btn) {
  const texto = btn.previousElementSibling.textContent.trim();
  _flashCopy(btn, texto);
}

// ─── GUARDAR LATEX CRUDO ANTES DE MATHJAX ────────────────

function guardarLatexCrudo() {
  document.querySelectorAll('.ejercicio').forEach(el => {
    const p = el.querySelector('p');
    if (p) el.dataset.latex = p.innerHTML
      .replace(/<[^>]+>/g, '')   // quita etiquetas HTML residuales
      .replace(/\s+/g, ' ')      // colapsa whitespace
      .trim();
  });
}

// ─── JUSTIFICACIÓN EXPANDIBLE EN MÓVIL ───────────────────

function initJustificaciones() {
  if (window.innerWidth > 600) return;

  document.querySelectorAll('.dos-col').forEach(grid => {
    const devs  = Array.from(grid.querySelectorAll('.paso-dev'));
    const justs = Array.from(grid.querySelectorAll('.paso-just'));

    devs.forEach((dev, i) => {
      const just = justs[i];
      if (!just) return;
      dev.after(just);
    });

    devs.forEach((dev, i) => {
      const just = justs[i];
      if (!just) return;

      if (i === 0) {
        dev.classList.add('abierto');
        just.classList.add('visible');
      }

      dev.addEventListener('click', e => {
        if (e.target.closest('.copy-btn')) return;
        const abierto = dev.classList.contains('abierto');

        devs.forEach((d, j) => {
          d.classList.remove('abierto');
          if (justs[j]) justs[j].classList.remove('visible');
        });

        if (!abierto) {
          dev.classList.add('abierto');
          just.classList.add('visible');
          if (window.MathJax) MathJax.typesetPromise([just]).catch(console.error);
        }
      });
    });
  });
}

// ─── AUTO INIT ────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // CRÍTICO: guardar el LaTeX ANTES de que MathJax reescriba el DOM
  guardarLatexCrudo();

  inyectarSymbol();

  document.querySelectorAll('.ejercicio').forEach(el => {
    el.appendChild(crearBoton('Copiar enunciado', copiarEnunciado));
  });

  document.querySelectorAll('.dato-curioso').forEach(el => {
    el.appendChild(crearBoton('Copiar dato', copiarDato));
  });

  document.querySelectorAll('.bloque-copiable').forEach(el => {
    el.appendChild(crearBoton('Copiar', copiarBloque));
  });

  document.querySelectorAll('.preguntas li').forEach(li => {
    li.appendChild(crearBoton('Copiar pregunta', copiar));
  });

  initJustificaciones();
});
