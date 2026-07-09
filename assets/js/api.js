// ─────────────────────────────────────────────
// CONEXIÓN CON APPS SCRIPT — único lugar con la URL
// ─────────────────────────────────────────────

const API_URL = 'https://script.google.com/macros/s/AKfycbxRzhAkcMqeIpFNCf-xSSk0cEKb1SPyZowx8kpBtd7DBWFD0FEr9IHDZF31Cqu4F7V8Bw/exec';

function getToken() {
  try {
    const sesion = JSON.parse(sessionStorage.getItem('eleva_sesion'));
    return sesion ? sesion.token : '';
  } catch (e) {
    return '';
  }
}

// Lecturas (doGet en el GAS) — ej: apiGet('getComercios')
async function apiGet(action, params = {}) {
  const query = new URLSearchParams({ action, token: getToken(), ...params });
  const res = await fetch(`${API_URL}?${query.toString()}`);
  return res.json();
}

// Escrituras y login (doPost en el GAS) — ej: apiPost('login', { usuario, password })
async function apiPost(action, data = {}) {
  const res = await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({ action, token: getToken(), ...data })
  });
  return res.json();
}
