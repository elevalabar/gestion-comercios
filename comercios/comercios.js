// ─────────────────────────────────────────────
// LISTADO DE COMERCIOS — cabecera de métricas, filtros (visuales),
// grid de tarjetas, buscador en vivo y eliminación.
//
// Backend, Firestore, búsqueda y borrado: SIN CAMBIOS respecto a la
// versión anterior. Este archivo solo cambia cómo se pinta la
// información que ya llegaba desde getComercios().
// ─────────────────────────────────────────────

let TODOS_LOS_COMERCIOS = [];

// ── Iconos (SVG inline, sin dependencias externas) ─────────────
const ICONS = {
  telefono: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
  web: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  maps: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37a4 4 0 1 1-7.914 1.174A4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>',
  puntos: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>'
};

// ── Helpers de presentación ─────────────────────────────────────

function badgeClase(prioridad) {
  if (prioridad === 'Alta') return 'badge-alta';
  if (prioridad === 'Media') return 'badge-media';
  return 'badge-baja';
}

// Estado del Servicio solo tiene hoy 3 valores reales en el backend
// (Activo / Pausado / Finalizado, ver agregarColumnaEstadoServicio en
// Code.gs). Se mapean a un punto de color: Activo = ok, Pausado =
// alerta (todavía puede reactivarse), Finalizado = alto (vínculo
// terminado), y cualquier otro valor (vacío) = neutro.
function estadoServicioInfo(estado) {
  if (estado === 'Activo')     return { clase: 'tc-punto-ok',     texto: 'Activo' };
  if (estado === 'Pausado')    return { clase: 'tc-punto-alerta', texto: 'Pausado' };
  if (estado === 'Finalizado') return { clase: 'tc-punto-alto',   texto: 'Finalizado' };
  return { clase: 'tc-punto-neutro', texto: 'Sin definir' };
}

// Extrae una localidad legible de la Dirección completa. Es un
// heurístico de formato (no hay un campo "Localidad" separado en el
// backend): en el formato típico de Google Maps para Argentina
// ("Calle Nro, CP Localidad, Provincia, País") la localidad es el
// segundo tramo separado por coma, a veces con el código postal
// pegado adelante. Puede no acertar en direcciones con formato no
// estándar — si en algún momento se agrega un campo "Localidad"
// propio en el backend, esta función deja de hacer falta.
function extraerLocalidad(direccion) {
  if (!direccion) return '';
  const partes = String(direccion).split(',').map(p => p.trim()).filter(Boolean);
  if (partes.length === 0) return '';
  let candidato = partes.length >= 2 ? partes[1] : partes[0];
  candidato = candidato.replace(/^[A-Z]\d{4}[A-Z]{0,3}\s+/, '').trim();
  return candidato;
}

// Nivel de completitud: cuenta cuántos de los 13 campos de
// diagnóstico rápido (los mismos que ya llegan en getComercios) están
// cargados. Reemplaza temporalmente al Eleva Score: mismo lugar y
// mismo layout en la tarjeta, listo para swapear por el score real
// el día que exista ese backend.
const CAMPOS_COMPLETITUD = [
  'Tiene sitio web', 'Tiene catálogo', 'Tiene WhatsApp', 'Tiene Google Maps',
  'Fotos propias', 'Fotos bien iluminadas', 'Fotos recientes', 'Mismo logo/colores',
  'Nombre/rubro claro en bio', 'CTA claro', 'Botón WhatsApp visible',
  'Horarios publicados', 'Última publicación en redes'
];

function calcularCompletitud(c) {
  const completados = CAMPOS_COMPLETITUD.filter(campo => {
    const valor = c[campo];
    return valor === true || valor === 'Sí' || valor === 'Si' || valor === 'SI';
  }).length;
  return { completados, total: CAMPOS_COMPLETITUD.length };
}

function soloNumeros(texto) {
  return String(texto || '').replace(/\D/g, '');
}

// ── Tarjeta individual ───────────────────────────────────────────

function renderTarjetaComercio(c) {
  const estServicio = estadoServicioInfo(c['Estado del Servicio']);
  const localidadExtraida = extraerLocalidad(c['Dirección']);
  const localidad = localidadExtraida || (c['Dirección'] ? String(c['Dirección']).slice(0, 40) : '');
  const { completados, total } = calcularCompletitud(c);
  const porcentaje = Math.round((completados / total) * 100);

  const canales = [
    { activo: !!c['Teléfono'],    icono: ICONS.telefono,  titulo: 'Teléfono' },
    { activo: !!c['WhatsApp'],    icono: ICONS.whatsapp,  titulo: 'WhatsApp' },
    { activo: !!c['Sitio web'],   icono: ICONS.web,       titulo: 'Sitio web' },
    { activo: !!c['Google Maps'], icono: ICONS.maps,      titulo: 'Google Maps' },
    { activo: !!c['Instagram'],   icono: ICONS.instagram, titulo: 'Instagram' }
  ];

  const canalesHtml = canales.map(ch => `
    <div class="tc-canal ${ch.activo ? 'tc-canal-activo' : 'tc-canal-inactivo'}" title="${ch.activo ? ch.titulo : 'Sin ' + ch.titulo.toLowerCase()}">
      ${ch.icono}
    </div>
  `).join('');

  const whatsappBtn = c['WhatsApp']
    ? `<a href="https://wa.me/${soloNumeros(c['WhatsApp'])}" target="_blank" rel="noopener" class="btn btn-icono" title="Contactar por WhatsApp">${ICONS.whatsapp}</a>`
    : '';

  return `
    <div class="tarjeta-comercio">
      <div class="tc-cabecera">
        <div>
          <p class="tc-nombre">${c.Nombre || 'Sin nombre'}</p>
          <p class="tc-rubro">${c.Rubro || ''}</p>
        </div>
        <div class="tc-badge-servicio">
          <span class="tc-punto ${estServicio.clase}"></span>
          <span class="tc-label-servicio">${estServicio.texto}</span>
        </div>
      </div>

      ${localidad ? `
      <div class="tc-localidad">
        ${ICONS.maps}
        <span>${localidad}</span>
      </div>` : ''}

      <div class="tc-canales">${canalesHtml}</div>

      <div class="tc-completitud">
        <div class="tc-completitud-fila">
          <span>Nivel de completitud</span>
          <span>${completados}/${total}</span>
        </div>
        <div class="tc-barra">
          <div class="tc-barra-relleno" style="width: ${porcentaje}%;"></div>
        </div>
      </div>

      <div class="tc-pie">
        <span class="badge ${badgeClase(c.Prioridad)}">${c.Prioridad || 'Sin definir'}</span>
        <div class="tc-acciones-der">
          ${whatsappBtn}
          <div class="tc-menu-wrap">
            <button type="button" class="btn btn-icono btn-menu" data-menu="${c.ID}" title="Más acciones">${ICONS.puntos}</button>
            <div class="tc-menu-lista" id="menu-${c.ID}">
              <button type="button" class="tc-menu-item" disabled title="Próximamente">Duplicar</button>
              <button type="button" class="tc-menu-item peligro btn-eliminar" data-id="${c.ID}" data-nombre="${(c.Nombre || 'este comercio').replace(/"/g, '&quot;')}">Eliminar</button>
            </div>
          </div>
          <a href="ficha.html?id=${encodeURIComponent(c.ID)}" class="btn btn-principal">Ver ficha</a>
        </div>
      </div>
    </div>
  `;
}

// ── Cabecera de métricas ─────────────────────────────────────────
// Se calcula siempre sobre el total cargado (TODOS_LOS_COMERCIOS),
// no sobre el resultado filtrado del buscador — son "métricas de la
// cartera completa", no del filtro actual.

function actualizarStats() {
  document.getElementById('statTotal').textContent = TODOS_LOS_COMERCIOS.length;
  document.getElementById('statActivos').textContent =
    TODOS_LOS_COMERCIOS.filter(c => c['Estado del Servicio'] === 'Activo').length;
  document.getElementById('statPrioridad').textContent =
    TODOS_LOS_COMERCIOS.filter(c => c.Prioridad === 'Alta').length;
  document.getElementById('statNuevos').textContent =
    TODOS_LOS_COMERCIOS.filter(c => c.Estado === 'Nuevo').length;
}

// ── Filtros (solo visuales por ahora, sin lógica de filtrado) ────
// Rubro y Localidad se pueblan dinámicamente para que la barra se
// vea terminada; Estado / Prioridad / Orden ya tienen su aspecto
// definitivo. Ninguno de los 5 selects tiene un listener de filtrado
// todavía — queda pendiente para una próxima etapa.

function poblarFiltrosDinamicos() {
  const rubros = [...new Set(TODOS_LOS_COMERCIOS.map(c => c.Rubro).filter(Boolean))].sort();
  const localidades = [...new Set(
    TODOS_LOS_COMERCIOS.map(c => extraerLocalidad(c['Dirección'])).filter(Boolean)
  )].sort();

  const selRubro = document.getElementById('filtroRubro');
  rubros.forEach(r => selRubro.insertAdjacentHTML('beforeend', `<option value="${r}">${r}</option>`));

  const selLocalidad = document.getElementById('filtroLocalidad');
  localidades.forEach(l => selLocalidad.insertAdjacentHTML('beforeend', `<option value="${l}">${l}</option>`));
}

// ── Menú de tres puntos ───────────────────────────────────────────

function cerrarTodosLosMenus() {
  document.querySelectorAll('.tc-menu-lista.abierto').forEach(m => m.classList.remove('abierto'));
}

function onClickMenu(e) {
  e.stopPropagation();
  const menu = document.getElementById('menu-' + e.currentTarget.dataset.menu);
  const yaAbierto = menu.classList.contains('abierto');
  cerrarTodosLosMenus();
  if (!yaAbierto) menu.classList.add('abierto');
}

document.addEventListener('click', cerrarTodosLosMenus);

// ── Eliminar (misma lógica que antes) ─────────────────────────────

async function onClickEliminar(e) {
  e.stopPropagation();

  const id = e.currentTarget.dataset.id;
  const nombre = e.currentTarget.dataset.nombre;

  const confirmado = confirm(`¿Eliminar "${nombre}"? Esto también borra sus fotos. No se puede deshacer.`);
  if (!confirmado) return;

  e.currentTarget.disabled = true;
  try {
    const res = await apiPost('eliminarComercio', { id });
    if (res.ok) {
      TODOS_LOS_COMERCIOS = TODOS_LOS_COMERCIOS.filter(c => c.ID !== id);
      actualizarStats();
      pintarLista(TODOS_LOS_COMERCIOS);
    } else {
      alert(res.error || 'No se pudo eliminar el comercio.');
      e.currentTarget.disabled = false;
    }
  } catch (err) {
    alert('No se pudo conectar con el servidor. Probá de nuevo.');
    e.currentTarget.disabled = false;
  }
}

// ── Controlador de render ─────────────────────────────────────────
// pintarLista() SOLO decide qué HTML poner y ata los listeners de la
// tarjeta. Toda la lógica de cómo se ve una tarjeta vive en
// renderTarjetaComercio().

function pintarLista(lista) {
  const contenedor = document.getElementById('listaComercios');

  if (lista.length === 0) {
    contenedor.innerHTML = '<p class="muted">No se encontraron comercios.</p>';
    return;
  }

  contenedor.innerHTML = lista.map(renderTarjetaComercio).join('');

  document.querySelectorAll('.btn-eliminar').forEach(btn => {
    btn.addEventListener('click', onClickEliminar);
  });
  document.querySelectorAll('.btn-menu').forEach(btn => {
    btn.addEventListener('click', onClickMenu);
  });
}

// ── Carga inicial ──────────────────────────────────────────────────

async function cargarComercios() {
  const res = await apiGet('getComercios');

  if (!res.ok && res.error) {
    document.getElementById('listaComercios').innerHTML =
      `<p class="muted">No se pudo cargar la información (${res.error}).</p>`;
    return;
  }

  TODOS_LOS_COMERCIOS = Array.isArray(res) ? res : [];
  actualizarStats();
  poblarFiltrosDinamicos();
  pintarLista(TODOS_LOS_COMERCIOS);
}

document.getElementById('buscador').addEventListener('input', (e) => {
  const texto = e.target.value.toLowerCase().trim();
  const filtrados = TODOS_LOS_COMERCIOS.filter(c =>
    (c.Nombre || '').toLowerCase().includes(texto) ||
    (c.Rubro || '').toLowerCase().includes(texto)
  );
  pintarLista(filtrados);
});

cargarComercios();
