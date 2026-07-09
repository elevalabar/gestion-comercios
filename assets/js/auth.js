// ─────────────────────────────────────────────
// SESIÓN — proteger páginas y cerrar sesión
// ─────────────────────────────────────────────

function getSesion() {
  try {
    return JSON.parse(sessionStorage.getItem('eleva_sesion'));
  } catch (e) {
    return null;
  }
}

// Llamar al principio de cada página privada.
// loginPath = ruta relativa hasta el index.html de login (ej: '../index.html')
function requireAuth(loginPath) {
  const sesion = getSesion();
  if (!sesion || !sesion.token) {
    window.location.href = loginPath;
  }
  return sesion;
}

function logout(loginPath) {
  sessionStorage.removeItem('eleva_sesion');
  window.location.href = loginPath;
}
