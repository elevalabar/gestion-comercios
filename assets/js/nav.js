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
  { id: 'seguimiento', label: 'Seguimiento', icon: '◷', href: 'seguimiento/index.html' }
];

const ICONO_SOL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const ICONO_LUNA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
const ICONO_CHEVRON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M6 9l6 6 6-6"/></svg>';

function inyectarEstilosNav() {
  if (document.getElementById('nav-styles')) return;
  const style = document.createElement('style');
  style.id = 'nav-styles';
  style.textContent = `
    .nav-top {
      display: flex; align-items: center; justify-content: space-between;
      gap: 24px;
      padding: 13px 24px; border-bottom: 1px solid var(--border);
      background: var(--bg-card);
      position: sticky; top: 0; z-index: 20;
    }
    .nav-top .marca { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
    .nav-top .logo-mini {
      width: 30px; height: 30px; border-radius: 8px;
      object-fit: cover;
    }
    .nav-top .marca span {
      font-size: 15px; font-weight: 800; letter-spacing: 0.06em;
      color: var(--text-primary);
    }
    .nav-top .enlaces { display: flex; gap: 28px; }
    .nav-top .enlaces a {
      font-size: 14px; font-weight: 500; color: var(--text-secondary); text-decoration: none;
      padding-bottom: 4px; border-bottom: 2px solid transparent;
    }
    .nav-top .enlaces a.activo { color: var(--text-primary); font-weight: 600; border-color: var(--accent); }
    .nav-top .enlaces a:hover { color: var(--text-primary); }
    .nav-top .derecha { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

    .nav-top .usuario-wrap { position: relative; }
    .nav-top .usuario {
      display: flex; align-items: center; gap: 8px;
      background: none; border: 1px solid transparent; border-radius: 30px;
      padding: 4px 8px 4px 4px; cursor: pointer;
    }
    .nav-top .usuario:hover { background: var(--bg-hover); }
    .nav-top .usuario .avatar {
      width: 26px; height: 26px; border-radius: 50%;
      background: var(--accent); color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; flex-shrink: 0;
    }
    .nav-top .usuario span.nombre { font-size: 13px; font-weight: 600; color: var(--text-primary); }
    .nav-top .usuario svg { color: var(--text-muted); }

    .nav-top .menu-usuario {
      display: none; position: absolute; right: 0; top: calc(100% + 8px);
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--radius); box-shadow: var(--shadow-pop);
      min-width: 160px; padding: 6px; z-index: 30;
    }
    .nav-top .menu-usuario.abierto { display: block; }
    .nav-top .btn-logout {
      width: 100%; justify-content: flex-start;
      background: none; border: none; color: var(--text-secondary);
      font-size: 13px; font-weight: 500; cursor: pointer; padding: 8px 10px; border-radius: var(--radius-sm);
    }
    .nav-top .btn-logout:hover { color: var(--danger); background: var(--danger-soft); }

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

    @media (max-width: 760px) {
      .nav-top .enlaces { display: none; }
      .nav-top .usuario span.nombre { display: none; }
      .nav-bottom { display: flex; }
      body { padding-bottom: 60px; }
    }
  `;
  document.head.appendChild(style);
}

function inicialesUsuario(nombre) {
  if (!nombre) return '?';
  return nombre.trim().slice(0, 2).toUpperCase();
}

// base = ruta relativa hasta la raíz del sitio (ej: '../')
function renderNav(seccionActiva, base) {
  inyectarEstilosNav();
  const sesion = getSesion();
  const temaGuardado = localStorage.getItem('eleva_theme') || 'dark';

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
      <div class="derecha">
        <button class="icon-btn" id="btnTemaNav" title="Cambiar tema" aria-label="Cambiar tema">${temaGuardado === 'dark' ? ICONO_SOL : ICONO_LUNA}</button>
        <div class="usuario-wrap">
          <button class="usuario" id="btnUsuario">
            <span class="avatar">${inicialesUsuario(sesion ? sesion.usuario : '')}</span>
            <span class="nombre">${sesion ? sesion.usuario : ''}</span>
            ${ICONO_CHEVRON}
          </button>
          <div class="menu-usuario" id="menuUsuario">
            <button class="btn-logout" id="btnLogout">Cerrar sesión</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('btnLogout').addEventListener('click', () => logout(base + 'index.html'));

    const btnUsuario = document.getElementById('btnUsuario');
    const menuUsuario = document.getElementById('menuUsuario');
    btnUsuario.addEventListener('click', (e) => {
      e.stopPropagation();
      menuUsuario.classList.toggle('abierto');
    });
    document.addEventListener('click', () => menuUsuario.classList.remove('abierto'));

    document.getElementById('btnTemaNav').addEventListener('click', (e) => {
      e.stopPropagation();
      const actual = document.documentElement.getAttribute('data-theme');
      const nuevo = actual === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nuevo);
      localStorage.setItem('eleva_theme', nuevo);
      document.getElementById('btnTemaNav').innerHTML = nuevo === 'dark' ? ICONO_SOL : ICONO_LUNA;
    });
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
