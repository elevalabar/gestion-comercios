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
      padding: 8px; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; color: var(--text-primary);
    }
    .menu-config .opcion-tema:hover { background: var(--bg-card-alt); }
    .menu-config .opcion-tema .marca-check { font-size: 12px; color: var(--accent); visibility: hidden; }
    .menu-config .opcion-tema.activa .marca-check { visibility: visible; }
    .menu-config .separador-menu { height: 1px; background: var(--border); margin: 6px 2px; }
    .menu-config .opcion-menu {
      padding: 8px; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; color: var(--text-primary);
    }
    .menu-config .opcion-menu:hover { background: var(--bg-card-alt); }

    /* ── Modal de Configuración de marca ─────────────────────────── */
    .overlay-modal {
      position: fixed; inset: 0; z-index: 40;
      background: rgba(10, 10, 14, .45);
      display: none; align-items: center; justify-content: center; padding: 16px;
    }
    .overlay-modal.abierto { display: flex; }
    .modal-marca {
      background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg);
      width: 100%; max-width: 420px; max-height: calc(100vh - 32px); overflow-y: auto;
      padding: 22px; box-shadow: 0 12px 32px rgba(0,0,0,.28);
    }
    .modal-marca h3 { font-size: 16px; margin: 0 0 4px; }
    .modal-marca .subtitulo { font-size: 12.5px; color: var(--text-secondary); margin: 0 0 18px; }
    .modal-marca .campo { margin-bottom: 14px; }
    .modal-marca label { display: block; font-size: 12.5px; color: var(--text-secondary); margin-bottom: 5px; }
    .modal-marca input[type="text"] {
      padding: 9px 10px; border-radius: var(--radius-sm); font-size: 13.5px;
    }
    .modal-marca .fila-toggle {
      display: flex; align-items: center; justify-content: space-between;
      padding: 9px 0; border-top: 1px solid var(--border);
    }
    .modal-marca .fila-toggle:first-of-type { border-top: none; margin-top: 4px; }
    .modal-marca .fila-toggle span { font-size: 13px; }
    .switch { position: relative; width: 38px; height: 22px; flex-shrink: 0; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .switch .riel {
      position: absolute; inset: 0; background: var(--border); border-radius: 999px; cursor: pointer; transition: background .15s;
    }
    .switch .riel::before {
      content: ''; position: absolute; width: 16px; height: 16px; left: 3px; top: 3px;
      background: #fff; border-radius: 50%; transition: transform .15s;
    }
    .switch input:checked + .riel { background: var(--accent); }
    .switch input:checked + .riel::before { transform: translateX(16px); }
    .modal-marca .acciones-modal { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
    .modal-marca .mensaje-guardado { font-size: 12.5px; margin-top: 10px; display: none; }
    .modal-marca .mensaje-guardado.exito { display: block; color: var(--success); }
    .modal-marca .mensaje-guardado.error { display: block; color: var(--danger); }
    .modal-marca .estado-carga { font-size: 13px; color: var(--text-secondary); padding: 10px 0; }

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

function contenidoMenuConfig_() {
  return `
    <div class="titulo-seccion">Apariencia</div>
    ${opcionesTemaHtml_()}
    <div class="separador-menu"></div>
    <div class="opcion-menu" data-accion="config-marca">Configuración de marca</div>
  `;
}

function construirMenuConfig_(idBoton) {
  const menu = document.createElement('div');
  menu.className = 'menu-config';
  menu.innerHTML = contenidoMenuConfig_();
  document.body.appendChild(menu);

  const boton = document.getElementById(idBoton);

  function posicionar() {
    const r = boton.getBoundingClientRect();
    menu.style.top = (r.bottom + window.scrollY + 6) + 'px';
    // Alineado al borde derecho del botón, sin salirse de la pantalla en
    // ningún borde. IMPORTANTE: esto se llama con el menú ya visible
    // (clase "abierto" ya puesta) — offsetWidth de un elemento con
    // display:none siempre da 0, y ese 0 era la causa real del overflow
    // horizontal (el menú se anclaba al borde derecho del botón en vez
    // de restarle su ancho real).
    const anchoMenu = menu.offsetWidth;
    const anchoViewport = document.documentElement.clientWidth;
    const izquierdaDeseada = r.right + window.scrollX - anchoMenu;
    const izquierdaMaxima = window.scrollX + anchoViewport - anchoMenu - 8;
    menu.style.left = Math.max(8, Math.min(izquierdaDeseada, izquierdaMaxima)) + 'px';
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
      menu.innerHTML = contenidoMenuConfig_();
      // El menú se hace visible PRIMERO — recién con display:block
      // offsetWidth refleja el ancho real, y posicionar() puede calcular
      // correctamente cuánto restarle al borde derecho del botón.
      menu.classList.add('abierto');
      posicionar();
      document.addEventListener('click', alClickAfuera);
    } else {
      cerrar();
    }
  });

  menu.addEventListener('click', (e) => {
    if (e.target.closest('[data-accion="config-marca"]')) {
      cerrar();
      abrirModalMarca_();
      return;
    }
    const opcion = e.target.closest('[data-tema-opcion]');
    if (!opcion) return;
    const nuevo = opcion.dataset.temaOpcion;
    document.documentElement.setAttribute('data-theme', nuevo);
    localStorage.setItem('eleva_theme', nuevo);
    menu.innerHTML = contenidoMenuConfig_();
  });

  window.addEventListener('resize', () => { if (menu.classList.contains('abierto')) posicionar(); });
  window.addEventListener('scroll', () => { if (menu.classList.contains('abierto')) posicionar(); }, true);
}

// ─────────────────────────────────────────────
// MODAL — Configuración de marca (Instagram / Sitio web / visibilidad).
// Instancia única y compartida: tanto el botón de nav-top como el de
// nav-bottom abren el mismo modal, en vez de crear uno por botón.
// ─────────────────────────────────────────────

function abrirModalMarca_() {
  let overlay = document.getElementById('overlayModalMarca');
  if (!overlay) overlay = crearModalMarca_();

  overlay.classList.add('abierto');
  cargarConfiguracionMarca_(overlay);
}

function crearModalMarca_() {
  const overlay = document.createElement('div');
  overlay.className = 'overlay-modal';
  overlay.id = 'overlayModalMarca';
  overlay.innerHTML = `
    <div class="modal-marca" role="dialog" aria-label="Configuración de marca">
      <h3>Configuración de marca</h3>
      <p class="subtitulo">Estos datos se usan en el Informe PDF de Diagnóstico.</p>
      <div id="cuerpoModalMarca">
        <div class="estado-carga">Cargando configuración actual…</div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('abierto');
  });

  return overlay;
}

async function cargarConfiguracionMarca_(overlay) {
  const cuerpo = overlay.querySelector('#cuerpoModalMarca');
  cuerpo.innerHTML = '<div class="estado-carga">Cargando configuración actual…</div>';

  let config = {};
  let errorCarga = false;
  try {
    const res = await apiGet('getConfiguracionMarca');
    if (res && res.ok) {
      config = res.configuracion || {};
    } else {
      errorCarga = true;
    }
  } catch (e) {
    errorCarga = true;
  }

  if (errorCarga) {
    cuerpo.innerHTML = `
      <p class="mensaje-guardado error" style="display:block">No se pudo cargar la configuración actual. Probá de nuevo.</p>
      <div class="acciones-modal">
        <button class="btn" id="btnCerrarModalMarca">Cerrar</button>
        <button class="btn btn-primary" id="btnReintentarModalMarca">Reintentar</button>
      </div>
    `;
    cuerpo.querySelector('#btnCerrarModalMarca').addEventListener('click', () => overlay.classList.remove('abierto'));
    cuerpo.querySelector('#btnReintentarModalMarca').addEventListener('click', () => cargarConfiguracionMarca_(overlay));
    return;
  }

  cuerpo.innerHTML = `
    <div class="campo">
      <label for="inputInstagramMarca">Instagram</label>
      <input type="text" id="inputInstagramMarca" placeholder="@tuusuario" value="${escapeAttrNav_(config.Instagram || '')}">
    </div>
    <div class="campo">
      <label for="inputSitioWebMarca">Sitio web</label>
      <input type="text" id="inputSitioWebMarca" placeholder="https://..." value="${escapeAttrNav_(config.SitioWeb || '')}">
    </div>
    <div class="fila-toggle">
      <span>Mostrar Instagram</span>
      <label class="switch">
        <input type="checkbox" id="toggleMostrarInstagram" ${esVerdadero_(config.MostrarInstagram) ? 'checked' : ''}>
        <span class="riel"></span>
      </label>
    </div>
    <div class="fila-toggle">
      <span>Mostrar sitio web</span>
      <label class="switch">
        <input type="checkbox" id="toggleMostrarSitioWeb" ${esVerdadero_(config.MostrarSitioWeb) ? 'checked' : ''}>
        <span class="riel"></span>
      </label>
    </div>
    <p class="mensaje-guardado" id="mensajeGuardadoMarca"></p>
    <div class="acciones-modal">
      <button class="btn" id="btnCerrarModalMarca">Cancelar</button>
      <button class="btn btn-primary" id="btnGuardarModalMarca">Guardar</button>
    </div>
  `;

  cuerpo.querySelector('#btnCerrarModalMarca').addEventListener('click', () => overlay.classList.remove('abierto'));
  cuerpo.querySelector('#btnGuardarModalMarca').addEventListener('click', () => guardarConfiguracionMarca_(overlay));
}

async function guardarConfiguracionMarca_(overlay) {
  const btn = overlay.querySelector('#btnGuardarModalMarca');
  const btnCancelar = overlay.querySelector('#btnCerrarModalMarca');
  const mensaje = overlay.querySelector('#mensajeGuardadoMarca');

  const payload = {
    Instagram: overlay.querySelector('#inputInstagramMarca').value.trim(),
    SitioWeb: overlay.querySelector('#inputSitioWebMarca').value.trim(),
    MostrarInstagram: overlay.querySelector('#toggleMostrarInstagram').checked,
    MostrarSitioWeb: overlay.querySelector('#toggleMostrarSitioWeb').checked
  };

  btn.disabled = true;
  btnCancelar.disabled = true;
  btn.textContent = 'Guardando...';
  mensaje.className = 'mensaje-guardado';
  mensaje.textContent = '';

  try {
    const res = await apiPost('actualizarConfiguracionMarca', payload);
    if (res && res.ok) {
      mensaje.className = 'mensaje-guardado exito';
      mensaje.textContent = 'Guardado. El próximo PDF que se genere ya va a usar estos datos.';
    } else {
      mensaje.className = 'mensaje-guardado error';
      mensaje.textContent = (res && res.error) || 'No se pudo guardar. Probá de nuevo.';
    }
  } catch (e) {
    mensaje.className = 'mensaje-guardado error';
    mensaje.textContent = 'No se pudo guardar. Probá de nuevo.';
  }

  btn.disabled = false;
  btnCancelar.disabled = false;
  btn.textContent = 'Guardar';
}

function esVerdadero_(valor) {
  return valor === true || valor === 'true' || valor === 'TRUE' || valor === 1 || valor === '1';
}

function escapeAttrNav_(texto) {
  return String(texto == null ? '' : texto).replace(/"/g, '&quot;');
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
