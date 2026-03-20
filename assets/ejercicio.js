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
  const texto = btn.closest('.ejercicio').querySelector('p').textContent.trim();
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

// ─── AUTO INIT ────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  inyectarSymbol();

  // Enunciado
  document.querySelectorAll('.ejercicio').forEach(el => {
    el.appendChild(crearBoton('Copiar enunciado', copiarEnunciado));
  });

  // Dato curioso
  document.querySelectorAll('.dato-curioso').forEach(el => {
    el.appendChild(crearBoton('Copiar dato', copiarDato));
  });

  // Bloques de informática
  document.querySelectorAll('.bloque-copiable').forEach(el => {
    el.appendChild(crearBoton('Copiar', copiarBloque));
  });

  // Preguntas individuales
  document.querySelectorAll('.preguntas li').forEach(li => {
    li.appendChild(crearBoton('Copiar pregunta', copiar));
  });
});
