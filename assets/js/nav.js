// ─────────────────────────────────────────────
// NAVEGACIÓN — un solo lugar para agregar/quitar secciones.
// Cada página nueva solo necesita:
//   <div id="nav-top"></div> ... <div id="nav-bottom"></div>
//   <script src="../assets/js/nav.js"></script>
//   renderNav('id-de-la-seccion', '../');
// ─────────────────────────────────────────────

const SECCIONES = [
  { id: 'panel',       label: 'Panel',       icon: '▦', href: 'panel/index.html' },
  { id: 'comercios',   label: 'Comercios',   icon: '⌂', href: 'comercios/index.html' },
  { id: 'seguimiento', label: 'Seguimiento', icon: '◷', href: 'seguimiento/index.html' },
  { id: 'encuestas',   label: 'Encuestas',   icon: '📋', href: 'encuestas/index.html' }
];

function inyectarEstilosNav() {
  if (document.getElementById('nav-styles')) return;
  const style = document.createElement('style');
  style.id = 'nav-styles';
  style.textContent = `
    .nav-top {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 20px; border-bottom: 1px solid var(--border);
      background: var(--bg-card);
    }
    .nav-top .marca { display: flex; align-items: center; gap: 10px; }
    .nav-top .logo-mini {
      width: 26px; height: 26px; border-radius: 50%;
      object-fit: cover;
    }
    .nav-top .marca span { font-size: 14px; font-weight: 500; }
    .nav-top .enlaces { display: flex; gap: 22px; }
    .nav-top .enlaces a {
      font-size: 13px; color: var(--text-secondary); text-decoration: none;
      padding-bottom: 4px; border-bottom: 2px solid transparent;
    }
    .nav-top .enlaces a.activo { color: var(--text-primary); border-color: var(--accent); }
    .nav-top .enlaces a:hover { text-decoration: none; color: var(--text-primary); }
    .nav-top .usuario { display: flex; align-items: center; gap: 12px; }
    .nav-top .usuario span { font-size: 13px; color: var(--text-secondary); }
    .nav-top .btn-logout {
      background: none; border: none; color: var(--text-secondary);
      font-size: 12px; cursor: pointer; padding: 4px;
    }
    .nav-top .btn-logout:hover { color: var(--danger); }

    .nav-bottom {
      display: none;
      position: fixed; bottom: 0; left: 0; right: 0;
      justify-content: space-around; align-items: center;
      padding: 8px 0; border-top: 1px solid var(--border);
      background: var(--bg-card); z-index: 10;
    }
    .nav-bottom a {
      display: flex; flex-direction: column; align-items: center; gap: 2px;
      font-size: 10px; color: var(--text-secondary); text-decoration: none;
    }
    .nav-bottom a .icono { font-size: 17px; }
    .nav-bottom a.activo { color: var(--accent); }

    @media (max-width: 640px) {
      .nav-top .enlaces { display: none; }
      .nav-bottom { display: flex; }
      body { padding-bottom: 60px; }
    }
  `;
  document.head.appendChild(style);
}

// base = ruta relativa hasta la raíz del sitio (ej: '../')
function renderNav(seccionActiva, base) {
  inyectarEstilosNav();
  const sesion = getSesion();

  const top = document.getElementById('nav-top');
  if (top) {
    top.className = 'nav-top';
    top.innerHTML = `
      <div class="marca">
        <img src="${base}assets/img/logo.png" alt="Eleva Lab" class="logo-mini">
        <span>ELEVA LAB</span>
      </div>
      <div class="enlaces">
        ${SECCIONES.map(s => `<a href="${base}${s.href}" class="${s.id === seccionActiva ? 'activo' : ''}">${s.label}</a>`).join('')}
      </div>
      <div class="usuario">
        <span>${sesion ? sesion.usuario : ''}</span>
        <button class="btn-logout" id="btnLogout" title="Cerrar sesión">Salir</button>
      </div>
    `;
    document.getElementById('btnLogout').addEventListener('click', () => logout(base + 'index.html'));
  }

  const bottom = document.getElementById('nav-bottom');
  if (bottom) {
    bottom.className = 'nav-bottom';
    bottom.innerHTML = SECCIONES.map(s => `
      <a href="${base}${s.href}" class="${s.id === seccionActiva ? 'activo' : ''}">
        <span class="icono">${s.icon}</span>
        <span>${s.label}</span>
      </a>
    `).join('');
  }
}
