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

// ─── INIT ─────────────────────────────────────────────────
