// ─── STORAGE ──────────────────────────────────────────────

const USP_CART = 'usp_cart';
const USP_PROGRESS = 'usp_progress';
const USP_SIMULATIONS = 'usp_simulations';

function storageGet(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    mostrarAvisoStorage();
    return false;
  }
}

function storageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    mostrarAvisoStorage();
  }
}

function mostrarAvisoStorage() {
  alert('No se pudo guardar en el navegador. Puede que el almacenamiento esté lleno.');
}

// ─── SEARCH ENGINE ────────────────────────────────────────

const SearchEngine = {
  data: [],
  facets: {}, // Pre-indexed values for each field
  activeFilters: {},
  suggestionIndex: -1,
  suggestionsData: [],

  async init() {
    try {
      const response = await fetch('index.json');
      this.data = await response.json();
      this.buildFacets();
      this.setupEventListeners();
      this.applyFiltersFromURL();
      
      window.addEventListener('popstate', () => this.applyFiltersFromURL());
      window.addEventListener('load', () => this.restoreSidebarState());
    } catch (e) {
      console.error('Error initializing SearchEngine:', e);
    }
  },

  buildFacets() {
    if (this.data.length === 0) return;
    const fields = Object.keys(this.data[0]).filter(k => k !== 'enunciado' && k !== 'archivo' && k !== 'id');
    
    fields.forEach(field => {
      const seen = new Set();
      this.data.forEach(item => {
        const values = this.expandValues(item[field]);
        values.forEach(v => {
          if (v) seen.add(String(v));
        });
      });
      this.facets[field] = Array.from(seen).sort();
    });
  },

  expandValues(val) {
    if (Array.isArray(val)) return val;
    if (val === null || val === undefined || val === "null") return [];
    return [val];
  },

  normalize(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  },

  setupEventListeners() {
    const input = document.getElementById('filtro-busqueda');
    const suggestions = document.getElementById('sugerencias');
    const toggle = document.getElementById('buscador-toggle');

    input.addEventListener('input', (e) => this.handleInput(e.target.value));
    input.addEventListener('keydown', (e) => this.handleKeyDown(e));
    input.addEventListener('blur', () => setTimeout(() => suggestions.classList.remove('mostrar'), 200));

    toggle.addEventListener('click', () => {
      const panel = document.getElementById('buscador-panel');
      panel.classList.toggle('collapsed');
      this.updateSidebarURL(panel.classList.contains('collapsed'));
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.buscador-input-wrapper')) {
        suggestions.classList.remove('mostrar');
      }
    });
  },

  handleInput(raw) {
    const suggestions = document.getElementById('sugerencias');
    const query = this.normalize(raw);

    if (query.length < 1) {
      suggestions.classList.remove('mostrar');
      return;
    }

    if (raw.startsWith('#')) {
      this.showFieldSuggestions(raw.slice(1));
    } else {
      this.showGeneralSuggestions(query);
    }
  },

  showFieldSuggestions(rawField) {
    const queryField = this.normalize(rawField);
    const fields = Object.keys(this.facets);
    const matches = fields.filter(f => this.normalize(f).includes(queryField));

    if (matches.length === 0) {
      document.getElementById('sugerencias').classList.remove('mostrar');
      return;
    }

    this.suggestionsData = [];
    matches.forEach(field => {
      this.facets[field].forEach(val => {
        this.suggestionsData.push({ campo: field, valor: val });
      });
    });

    this.renderSuggestions();
  },

  showGeneralSuggestions(query) {
    const queryParts = query.split(/\s+/);
    let results = [];

    // Search in facets
    for (const [field, values] of Object.entries(this.facets)) {
      values.forEach(val => {
        const normVal = this.normalize(val);
        if (queryParts.every(part => normVal.includes(part))) {
          results.push({ campo: field, valor: val });
        }
      });
    }

    this.suggestionsData = results.slice(0, 15);
    
    // Search in enunciados (count only)
    const enunciadosMatches = this.data.filter(ej => {
      const normEnun = this.normalize(ej.enunciado || '');
      return queryParts.every(part => normEnun.includes(part));
    });

    this.renderSuggestions(enunciadosMatches);
  },

  renderSuggestions(enunciadosMatches = []) {
    const container = document.getElementById('sugerencias');
    container.innerHTML = '';
    this.suggestionIndex = -1;

    if (this.suggestionsData.length === 0 && enunciadosMatches.length === 0) {
      container.classList.remove('mostrar');
      return;
    }

    this.suggestionsData.forEach((s, idx) => {
      const div = document.createElement('div');
      div.className = 'sugerencia-item';
      div.dataset.index = idx;
      div.innerHTML = `<span class="campo">${s.campo}:</span> ${s.valor}`;
      div.addEventListener('click', () => {
        this.addFilter(s.campo, s.valor);
        document.getElementById('filtro-busqueda').value = '';
        container.classList.remove('mostrar');
      });
      container.appendChild(div);
    });

    if (enunciadosMatches.length > 0) {
      const sep = document.createElement('div');
      sep.className = 'sugerencia-separador';
      sep.textContent = `${enunciadosMatches.length} en enunciados (Ver todos)`;
      sep.addEventListener('click', () => {
        this.renderResults(enunciadosMatches);
        document.getElementById('filtro-busqueda').value = '';
        container.classList.remove('mostrar');
      });
      container.appendChild(sep);
    }

    container.classList.add('mostrar');
  },

  handleKeyDown(e) {
    const container = document.getElementById('sugerencias');
    const items = container.querySelectorAll('.sugerencia-item');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.suggestionIndex = Math.min(this.suggestionIndex + 1, items.length - 1);
      this.highlightSuggestion(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.suggestionIndex = Math.max(this.suggestionIndex - 1, -1);
      this.highlightSuggestion(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (this.suggestionIndex >= 0 && this.suggestionsData[this.suggestionIndex]) {
        const s = this.suggestionsData[this.suggestionIndex];
        this.addFilter(s.campo, s.valor);
        document.getElementById('filtro-busqueda').value = '';
        container.classList.remove('mostrar');
      }
    } else if (e.key === 'Escape') {
      container.classList.remove('mostrar');
    }
  },

  highlightSuggestion(items) {
    items.forEach((item, i) => {
      item.classList.toggle('selected', i === this.suggestionIndex);
    });
    if (this.suggestionIndex >= 0 && items[this.suggestionIndex]) {
      items[this.suggestionIndex].scrollIntoView({ block: 'nearest' });
    }
  },

  addFilter(campo, valor) {
    if (!this.activeFilters[campo]) {
      this.activeFilters[campo] = new Set();
    }
    this.activeFilters[campo].add(valor);
    this.renderTags();
    this.applyFilters();
  },

  removeFilter(campo, valor) {
    if (this.activeFilters[campo]) {
      this.activeFilters[campo].delete(valor);
      if (this.activeFilters[campo].size === 0) {
        delete this.activeFilters[campo];
      }
    }
    this.renderTags();
    this.applyFilters();
  },

  clearAllFilters() {
    this.activeFilters = {};
    this.renderTags();
    this.applyFilters();
  },

  renderTags() {
    const container = document.getElementById('filtros-tags');
    container.innerHTML = '';

    const hasFilters = Object.keys(this.activeFilters).length > 0;
    if (hasFilters) {
      const clearBtn = document.createElement('button');
      clearBtn.className = 'btn-clear-filters';
      clearBtn.textContent = 'Limpiar todo';
      clearBtn.onclick = () => this.clearAllFilters();
      container.appendChild(clearBtn);
    }

    Object.entries(this.activeFilters).forEach(([campo, valores]) => {
      valores.forEach(valor => {
        const tag = document.createElement('span');
        tag.className = 'filtro-tag';
        tag.innerHTML = `<span class="campo">${campo}:</span> ${valor} <span class="quitar">×</span>`;
        tag.querySelector('.quitar').onclick = () => this.removeFilter(campo, valor);
        container.appendChild(tag);
      });
    });
  },

  applyFilters() {
    this.updateURL();
    
    if (Object.keys(this.activeFilters).length === 0) {
      this.renderRandomExercises();
      return;
    }

    const filtered = this.data.filter(ej => {
      for (const [campo, valoresFiltro] of Object.entries(this.activeFilters)) {
        const valorEj = this.expandValues(ej[campo]);
        const normValoresEj = valorEj.map(v => this.normalize(String(v)));
        const match = Array.from(valoresFiltro).some(vf => normValoresEj.includes(this.normalize(vf)));
        if (!match) return false;
      }
      return true;
    });

    this.renderResults(filtered);
  },

  renderResults(ejercicios) {
    const container = document.getElementById('ejercicios-destacados');
    if (ejercicios.length === 0) {
      container.innerHTML = '<p class="no-resultados">No se encontraron ejercicios.</p>';
      return;
    }

    container.innerHTML = '';
    ejercicios.forEach(ej => {
      const materia = this.expandValues(ej.materia)[0] || '';
      const origen = this.expandValues(ej.origen)[0] || '';
      const nro = this.expandValues(ej.ejercicio_nro)[0] || '';
      const meta = [materia, origen, nro ? `Ej. ${nro}` : ''].filter(Boolean).join(' · ');

      const btn = document.createElement('button');
      btn.className = 'tarjeta-ejercicio-link';
      btn.innerHTML = `
        <article class="tarjeta-ejercicio">
          <div class="tarjeta-tema">${meta}</div>
          <div class="tarjeta-enunciado">${ej.enunciado}</div>
        </article>
      `;
      btn.onclick = () => this.loadExercise(ej);
      container.appendChild(btn);
    });

    this.renderMath(container);
  },

  loadExercise(ej) {
    const main = document.querySelector('main');
    const params = new URLSearchParams(window.location.search);
    params.set('ejercicio', ej.id);
    window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);

    document.body.classList.add('ejercicio-abierto');
    main.innerHTML = `
      <div class="ejercicio-nav"><button class="btn-volver">← Volver</button></div>
      <iframe class="ejercicio-iframe" src="${ej.archivo}" title="${ej.id}"></iframe>
    `;

    main.querySelector('.btn-volver').onclick = () => {
      document.body.classList.remove('ejercicio-abierto');
      window.history.back();
    };

    const iframe = main.querySelector('.ejercicio-iframe');
    iframe.onload = () => {
      try {
        iframe.style.height = iframe.contentDocument.documentElement.scrollHeight + 'px';
      } catch {
        iframe.style.height = '2000px';
      }
    };
  },

  renderMath(container) {
    if (window.MathJax) {
      MathJax.typesetPromise([container]).catch(err => console.error(err));
    }
  },

  renderRandomExercises() {
    const shuffled = [...this.data].sort(() => 0.5 - Math.random());
    this.renderResults(shuffled.slice(0, 3));
  },

  updateURL() {
    const params = new URLSearchParams();
    Object.entries(this.activeFilters).forEach(([k, v]) => {
      params.set(k, Array.from(v).join(','));
    });
    const query = params.toString();
    window.history.replaceState({}, '', query ? `?${query}` : window.location.pathname);
  },

  applyFiltersFromURL() {
    const params = new URLSearchParams(window.location.search);
    const ejercicioId = params.get('ejercicio');

    if (ejercicioId) {
      const ej = this.data.find(e => e.id === ejercicioId);
      if (ej) {
        this.loadExercise(ej);
        return;
      }
    }

    this.activeFilters = {};
    params.forEach((val, key) => {
      if (key === 'ejercicio' || key === 'sidebar') return;
      this.activeFilters[key] = new Set(val.split(','));
    });

    this.renderTags();
    this.applyFilters();
  },

  updateSidebarURL(collapsed) {
    const params = new URLSearchParams(window.location.search);
    collapsed ? params.set('sidebar', 'collapsed') : params.delete('sidebar');
    window.history.replaceState({}, '', `?${params.toString()}`);
  },

  restoreSidebarState() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('sidebar') === 'collapsed') {
      document.getElementById('buscador-panel').classList.add('collapsed');
    }
  }
};

// Iniciar
SearchEngine.init();
