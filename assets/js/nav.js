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
  { id: 'prospector',  label: 'Prospector',  icon: '⌕', href: 'prospector/index.html' },
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

    /* Botón de Configuración — único acceso, evita llenar la nav de
       botones sueltos. Hoy solo contiene Apariencia; Admin/Configuración
       de marca se suma acá mismo más adelante, sin tocar esta base. */
    .btn-config {
      background: none; border: none; color: var(--text-secondary);
      font-size: 15px; cursor: pointer; padding: 4px; line-height: 1;
    }
    .btn-config:hover { color: var(--text-primary); }
    .nav-bottom .btn-config { display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: 10px; }
    .nav-bottom .btn-config .icono { font-size: 17px; }

    .menu-config {
      position: absolute; min-width: 190px;
      background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius);
      box-shadow: 0 6px 20px rgba(0,0,0,.18); padding: 6px; z-index: 20;
      display: none;
    }
    .menu-config.abierto { display: block; }
    .menu-config .titulo-seccion {
      font-size: 11px; text-transform: uppercase; letter-spacing: .04em;
      color: var(--text-muted); padding: 6px 8px 2px;
    }
    .menu-config .opcion-tema {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      padding: 8px; border-radius: 8px; cursor: pointer; font-size: 13px; color: var(--text-primary);
    }
    .menu-config .opcion-tema:hover { background: var(--bg-card-alt); }
    .menu-config .opcion-tema .marca-check { font-size: 12px; color: var(--accent); visibility: hidden; }
    .menu-config .opcion-tema.activa .marca-check { visibility: visible; }

    @media (max-width: 640px) {
      .nav-top .enlaces { display: none; }
      .nav-bottom { display: flex; }
      body { padding-bottom: 60px; }
    }
  `;
  document.head.appendChild(style);
}

// Reutiliza exactamente la infraestructura de tema ya probada en
// index.html (localStorage 'eleva_theme' + atributo data-theme en
// <html>) — no crea ninguna arquitectura nueva.
function opcionesTemaHtml_() {
  const actual = document.documentElement.getAttribute('data-theme') || 'dark';
  const opciones = [
    { valor: 'light', label: 'Claro' },
    { valor: 'dark', label: 'Oscuro' }
  ];
  return opciones.map(o => `
    <div class="opcion-tema ${o.valor === actual ? 'activa' : ''}" data-tema-opcion="${o.valor}">
      <span>${o.label}</span>
      <span class="marca-check">✓</span>
    </div>
  `).join('');
}

function construirMenuConfig_(idBoton) {
  const menu = document.createElement('div');
  menu.className = 'menu-config';
  menu.innerHTML = `
    <div class="titulo-seccion">Apariencia</div>
    ${opcionesTemaHtml_()}
  `;
  document.body.appendChild(menu);

  const boton = document.getElementById(idBoton);

  function posicionar() {
    const r = boton.getBoundingClientRect();
    menu.style.top = (r.bottom + window.scrollY + 6) + 'px';
    // Alineado al borde derecho del botón, sin salirse de la pantalla.
    const izquierdaDeseada = r.right + window.scrollX - menu.offsetWidth;
    menu.style.left = Math.max(8, izquierdaDeseada) + 'px';
  }

  function cerrar() {
    menu.classList.remove('abierto');
    document.removeEventListener('click', alClickAfuera);
  }
  function alClickAfuera(e) {
    if (!menu.contains(e.target) && e.target !== boton) cerrar();
  }

  boton.addEventListener('click', (e) => {
    e.stopPropagation();
    const abrir = !menu.classList.contains('abierto');
    if (abrir) {
      menu.innerHTML = `<div class="titulo-seccion">Apariencia</div>${opcionesTemaHtml_()}`;
      posicionar();
      menu.classList.add('abierto');
      document.addEventListener('click', alClickAfuera);
    } else {
      cerrar();
    }
  });

  menu.addEventListener('click', (e) => {
    const opcion = e.target.closest('[data-tema-opcion]');
    if (!opcion) return;
    const nuevo = opcion.dataset.temaOpcion;
    document.documentElement.setAttribute('data-theme', nuevo);
    localStorage.setItem('eleva_theme', nuevo);
    menu.innerHTML = `<div class="titulo-seccion">Apariencia</div>${opcionesTemaHtml_()}`;
  });

  window.addEventListener('resize', () => { if (menu.classList.contains('abierto')) posicionar(); });
  window.addEventListener('scroll', () => { if (menu.classList.contains('abierto')) posicionar(); }, true);
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
        <button class="btn-config" id="btnConfigTop" title="Configuración" aria-label="Configuración">⚙️</button>
        <button class="btn-logout" id="btnLogout" title="Cerrar sesión">Salir</button>
      </div>
    `;
    document.getElementById('btnLogout').addEventListener('click', () => logout(base + 'index.html'));
    construirMenuConfig_('btnConfigTop');
  }

  const bottom = document.getElementById('nav-bottom');
  if (bottom) {
    bottom.className = 'nav-bottom';
    bottom.innerHTML = SECCIONES.map(s => `
      <a href="${base}${s.href}" class="${s.id === seccionActiva ? 'activo' : ''}">
        <span class="icono">${s.icon}</span>
        <span>${s.label}</span>
      </a>
    `).join('') + `
      <button class="btn-config" id="btnConfigBottom" title="Configuración" aria-label="Configuración">
        <span class="icono">⚙️</span>
        <span>Config.</span>
      </button>
    `;
    construirMenuConfig_('btnConfigBottom');
  }
}
