const SearchEngine = {
  data: [],
  selected: { materia: null, tema: null, dificultad: null },
  searchQuery: '',
  openSections: new Set(),

  async init() {
    try {
      const res = await fetch('index.json');
      this.data = await res.json();
      this.buildPanel();
      this.applyFromURL();
      window.addEventListener('popstate', () => this.applyFromURL());
    } catch (e) {
      console.error('Error init:', e);
    }
  },

  // ─── Helpers ───────────────────────────────────────────

  expand(val) {
    if (Array.isArray(val)) return val.map(String);
    if (val == null || val === 'null') return [];
    return [String(val)];
  },

  norm(s) {
    return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  },

  filterData(sel, query) {
    return this.data.filter(ej => {
      if (sel.materia) {
        const vals = this.expand(ej.materia).map(v => this.norm(v));
        if (!vals.includes(this.norm(sel.materia))) return false;
      }
      if (sel.tema) {
        const vals = this.expand(ej.tema).map(v => this.norm(v));
        if (!vals.some(v => v.includes(this.norm(sel.tema)))) return false;
      }
      if (sel.dificultad) {
        const vals = this.expand(ej.dificultad).map(v => this.norm(v));
        if (!vals.includes(this.norm(sel.dificultad))) return false;
      }
      if (query) {
        const q = this.norm(query);
        const searchable = [
          ...this.expand(ej.ejercicio_nro),
          ...this.expand(ej.origen),
          ej.enunciado || '',
          ...this.expand(ej.seo_keywords),
        ].map(v => this.norm(v)).join(' ');
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  },

  availableFor(field) {
    const tempSel = { ...this.selected, [field]: null };
    const subset = this.filterData(tempSel, this.searchQuery);
    const seen = new Set();
    subset.forEach(ej => {
      this.expand(ej[field]).forEach(v => {
        if (v && v !== 'null') seen.add(v);
      });
    });
    return Array.from(seen).sort();
  },

  // ─── Panel ─────────────────────────────────────────────

  buildPanel() {
    const panel = document.getElementById('buscador-panel');
    panel.innerHTML = `
      <div class="buscador-contenido">
        <div class="filtro-search-wrap">
          <input type="search" id="search-input" placeholder="Buscar por nro, origen, enunciado…" autocomplete="off">
        </div>
        <div id="filtros-wrap"></div>
        <button class="btn-limpiar" id="btn-limpiar" style="display:none">Limpiar filtros</button>
      </div>
      <button class="buscador-toggle" id="buscador-toggle"></button>
    `;

    document.getElementById('search-input').addEventListener('input', e => {
      this.searchQuery = e.target.value.trim();
      this.refreshPanel();
      this.applyAndRender();
      this.updateURL();
    });

    document.getElementById('btn-limpiar').addEventListener('click', () => {
      this.selected = { materia: null, tema: null, dificultad: null };
      this.searchQuery = '';
      document.getElementById('search-input').value = '';
      this.refreshPanel();
      this.applyAndRender();
      this.updateURL();
    });

    document.getElementById('buscador-toggle').addEventListener('click', () => {
      panel.classList.toggle('collapsed');
    });

    this.refreshPanel();
  },

  refreshPanel() {
    const wrap = document.getElementById('filtros-wrap');
    wrap.innerHTML = '';

    const secciones = [
      { key: 'materia',    label: 'Materia' },
      { key: 'tema',       label: 'Tema' },
      { key: 'dificultad', label: 'Dificultad' },
    ];

    secciones.forEach(({ key, label }) => {
      const opciones = this.availableFor(key);
      if (opciones.length === 0) return;

      const seccion = document.createElement('div');
      seccion.className = 'filtro-seccion' + (this.selected[key] ? ' tiene-seleccion' : '');

      const header = document.createElement('button');
      header.className = 'filtro-header';
      header.innerHTML = `
        <span class="filtro-label">${label}</span>
        ${this.selected[key]
          ? `<span class="filtro-valor-sel">${this.selected[key]}</span>`
          : '<span class="filtro-placeholder">Todos</span>'
        }
        <span class="filtro-arrow">▾</span>
      `;

      const lista = document.createElement('div');
      lista.className = 'filtro-lista';

      if (this.selected[key]) {
        const todos = document.createElement('button');
        todos.className = 'filtro-opcion filtro-todos';
        todos.textContent = 'Ver todos';
        todos.addEventListener('click', e => {
          e.stopPropagation();
          this.selected[key] = null;
          if (key === 'materia') this.selected.tema = null;
          this.openSections.delete(key);
          this.refreshPanel();
          this.applyAndRender();
          this.updateURL();
        });
        lista.appendChild(todos);
      }

      opciones.forEach(op => {
        const btn = document.createElement('button');
        btn.className = 'filtro-opcion' + (this.selected[key] === op ? ' activo' : '');
        btn.textContent = op;
        btn.addEventListener('click', e => {
          e.stopPropagation();
          this.selected[key] = op;
          if (key === 'materia') this.selected.tema = null;
          this.openSections.delete(key);       // cerrar al seleccionar
          this.refreshPanel();
          this.applyAndRender();
          this.updateURL();
        });
        lista.appendChild(btn);
      });

      const abierto = this.openSections.has(key);
      lista.style.display = abierto ? 'flex' : 'none';
      if (abierto) seccion.classList.add('abierto');

      header.addEventListener('click', () => {
        if (this.openSections.has(key)) {
          this.openSections.delete(key);
          lista.style.display = 'none';
          seccion.classList.remove('abierto');
        } else {
          this.openSections.add(key);
          lista.style.display = 'flex';
          seccion.classList.add('abierto');
        }
      });

      // Navegación con teclado
      header.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          header.click();
        } else if ((e.key === 'ArrowDown') && this.openSections.has(key)) {
          e.preventDefault();
          const first = lista.querySelector('.filtro-opcion');
          if (first) first.focus();
        }
      });

      lista.addEventListener('keydown', e => {
        const opciones = Array.from(lista.querySelectorAll('.filtro-opcion'));
        const idx = opciones.indexOf(document.activeElement);
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const next = opciones[idx + 1];
          if (next) next.focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (idx === 0) { header.focus(); }
          else if (opciones[idx - 1]) opciones[idx - 1].focus();
        } else if (e.key === 'Escape') {
          this.openSections.delete(key);
          lista.style.display = 'none';
          seccion.classList.remove('abierto');
          header.focus();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (document.activeElement) document.activeElement.click();
        }
      });

      seccion.appendChild(header);
      seccion.appendChild(lista);
      wrap.appendChild(seccion);
    });

    const tieneAlgo = Object.values(this.selected).some(v => v) || this.searchQuery;
    document.getElementById('btn-limpiar').style.display = tieneAlgo ? 'block' : 'none';
  },

  // ─── Resultados ────────────────────────────────────────

  closeExercise() {
    if (document.body.classList.contains('ejercicio-abierto')) {
      document.body.classList.remove('ejercicio-abierto');
      const main = document.querySelector('main');
      main.innerHTML = `
        <section class="disclaimer">
          <h2>Aviso importante</h2>
          <p>El contenido puede contener errores. Verificar antes de usar como material oficial.</p>
        </section>
        <section class="ejercicios-destacados" id="ejercicios-destacados"></section>
      `;
    }
  },

  applyAndRender() {
    this.closeExercise();
    const resultado = this.filterData(this.selected, this.searchQuery);
    const tieneAlgo = Object.values(this.selected).some(v => v) || this.searchQuery;
    const ejercicios = tieneAlgo ? resultado : this.randomSample(resultado, 6);
    this.renderResults(ejercicios, !tieneAlgo);
  },

  randomSample(arr, n) {
    return [...arr].sort(() => 0.5 - Math.random()).slice(0, n);
  },

  highlight(text, query) {
    if (!query) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\  renderResults(ejercicios, esAleatorio = false) {');
    const regex = new RegExp(`(${escaped})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  },

  renderResults(ejercicios, esAleatorio = false) {
    const container = document.getElementById('ejercicios-destacados');

    if (ejercicios.length === 0) {
      container.innerHTML = '<p class="no-resultados">No se encontraron ejercicios.</p>';
      return;
    }

    container.innerHTML = esAleatorio
      ? '<p class="resultados-hint">Mostrando ejercicios al azar. Usá los filtros para explorar.</p>'
      : `<p class="resultados-hint">${ejercicios.length} ejercicio${ejercicios.length !== 1 ? 's' : ''} encontrado${ejercicios.length !== 1 ? 's' : ''}.</p>`;

    ejercicios.forEach(ej => {
      const materia  = this.expand(ej.materia)[0] || '';
      const origen   = this.expand(ej.origen)[0] || '';
      const nro      = this.expand(ej.ejercicio_nro)[0] || '';
      const dif      = this.expand(ej.dificultad)[0] || '';
      const meta     = [materia, origen, nro ? `Ej. ${nro}` : ''].filter(Boolean).join(' · ');
      const q = this.searchQuery;

      const btn = document.createElement('button');
      btn.className = 'tarjeta-ejercicio-link';
      btn.innerHTML = `
        <article class="tarjeta-ejercicio">
          <div class="tarjeta-meta">
            <span class="tarjeta-tema">${this.highlight(meta, q)}</span>
            ${dif ? `<span class="tarjeta-dif tarjeta-dif--${this.norm(dif.split(',')[0])}">${dif}</span>` : ''}
          </div>
          <div class="tarjeta-enunciado">${this.highlight(ej.enunciado, q)}</div>
        </article>
      `;
      btn.onclick = () => this.loadExercise(ej);
      container.appendChild(btn);
    });

    if (window.MathJax) MathJax.typesetPromise([container]).catch(console.error);
  },

  loadExercise(ej) {
    const main = document.querySelector('main');
    const params = new URLSearchParams(window.location.search);
    params.set('ejercicio', ej.id);
    window.history.pushState({}, '', `${window.location.pathname}?${params}`);

    document.body.classList.add('ejercicio-abierto');
    main.innerHTML = `
      <iframe class="ejercicio-iframe" src="${ej.archivo}" title="${ej.id}"></iframe>
    `;
    const iframe = main.querySelector('.ejercicio-iframe');
    iframe.onload = () => {
      try { iframe.style.height = iframe.contentDocument.documentElement.scrollHeight + 'px'; }
      catch { iframe.style.height = '2000px'; }
    };
  },

  // ─── URL state ────────────────────────────────────────

  updateURL() {
    const params = new URLSearchParams();
    if (this.selected.materia)    params.set('materia',    this.selected.materia);
    if (this.selected.tema)       params.set('tema',       this.selected.tema);
    if (this.selected.dificultad) params.set('dificultad', this.selected.dificultad);
    if (this.searchQuery)         params.set('q',          this.searchQuery);
    const qs = params.toString();
    window.history.replaceState({}, '', qs ? `?${qs}` : window.location.pathname);
  },

  applyFromURL() {
    const params = new URLSearchParams(window.location.search);
    const ejercicioId = params.get('ejercicio');
    if (ejercicioId) {
      const ej = this.data.find(e => e.id === ejercicioId);
      if (ej) { this.loadExercise(ej); return; }
    }
    this.selected.materia    = params.get('materia')    || null;
    this.selected.tema       = params.get('tema')       || null;
    this.selected.dificultad = params.get('dificultad') || null;
    this.searchQuery         = params.get('q')          || '';
    const inp = document.getElementById('search-input');
    if (inp) inp.value = this.searchQuery;
    this.refreshPanel();
    this.applyAndRender();
  },
};

SearchEngine.init();
