// ─────────────────────────────────────────────
// SOLICITUDES — módulo del panel para el cuestionario de solicitudes de landing.
// Habla con el script de Solicitudes (planilla privada aparte), NO con el
// script del diagnóstico. Solo muestra datos si la sesión del panel es válida:
// el script de Solicitudes se lo consulta al script del panel.
//
// Acciones: panelListar · panelDetalle · panelCrear · panelRevocar · panelExtender · panelReabrir
// ─────────────────────────────────────────────

const SOLICITUDES_API_URL = 'https://script.google.com/macros/s/AKfycbxKzJlhH59wylg9LX7xW_WbaR_eoOMd0ZT5KQa8pGOj80CPqpS8twSopnyPe0sU-oSdkw/exec';

let TODAS = [];
let COMERCIOS = {};      // ID → Nombre (solo para mostrar)
let BORRADOR = true;
let ID_ABIERTO = null;

const el = id => document.getElementById(id);

async function apiSolicitudes(action, data = {}) {
  const res = await fetch(SOLICITUDES_API_URL, {
    method: 'POST',
    body: JSON.stringify({ action, token: getToken(), ...data })
  });
  return res.json();
}

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function formatearFechaHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatearFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function mensajeError(res) {
  const e = res && res.error;
  if (e === 'no_autorizado') return 'El servidor no aceptó tu sesión. Cerrá sesión y volvé a entrar. Si sigue igual, falta configurar la conexión con el panel en la planilla de Solicitudes (Configuracion → URL_VALIDACION_PANEL).';
  if (e === 'id_invalido' || e === 'solicitud_invalida') return 'Los datos enviados no son válidos.';
  if (e === 'demasiados_intentos') return 'Demasiados pedidos seguidos. Esperá un minuto y probá de nuevo.';
  if (e === 'ocupado') return 'El sistema está ocupado. Probá de nuevo en unos segundos.';
  if (e === 'error_interno') return 'Error interno del servidor.';
  return e || 'No se pudo completar la acción.';
}

function mostrarError(idMsg, texto) {
  const m = el(idMsg);
  m.textContent = texto;
  m.classList.add('visible');
}
function ocultarError(idMsg) { el(idMsg).classList.remove('visible'); }

function claseEstado(estado) {
  return 'badge-estado-' + String(estado).toLowerCase().replace(/\s+/g, '-');
}
function etiquetaEstado(estado) { return estado === 'Creada' ? 'Sin abrir' : estado; }

function nombreComercio(id) {
  if (!id) return '';
  return COMERCIOS[id] || id;
}

// ── Estadísticas, filtros, tabla ────────────────────────────────

function actualizarStats() {
  const c = est => TODAS.filter(s => s.estado === est).length;
  el('statTotal').textContent = TODAS.length;
  el('statCreadas').textContent = c('Creada');
  el('statEnCurso').textContent = c('En curso');
  el('statEnviadas').textContent = c('Enviada');
}

function renderFila(s) {
  const titulo = [s.nombre, nombreComercio(s.idComercio)].filter(Boolean).join(' · ');
  return `
    <tr data-id="${escapeHtml(s.id)}">
      <td class="celda-muted">${escapeHtml(s.id)}</td>
      <td class="celda-empresa" title="${escapeHtml(titulo)}">${escapeHtml(s.nombre) || '—'}</td>
      <td><span class="badge badge-tipo-${s.tipo === 'Real' ? 'real' : 'prueba'}">${escapeHtml(s.tipo)}</span></td>
      <td><span class="badge ${claseEstado(s.estado)}">${escapeHtml(etiquetaEstado(s.estado))}</span></td>
      <td class="celda-muted">${formatearFechaHora(s.ultimaActividad || s.creada)}</td>
      <td class="celda-muted">${formatearFecha(s.vence)}</td>
    </tr>`;
}

function pintarTabla(lista) {
  const cuerpo = el('cuerpoTabla');
  if (!lista.length) {
    cuerpo.innerHTML = '<tr><td colspan="6" class="muted">No se encontraron solicitudes.</td></tr>';
    return;
  }
  cuerpo.innerHTML = lista.map(renderFila).join('');
  cuerpo.querySelectorAll('tr[data-id]').forEach(tr => tr.addEventListener('click', () => abrirDrawer(tr.dataset.id)));
}

function aplicarFiltros() {
  const texto = el('buscador').value.toLowerCase().trim();
  const estado = el('filtroEstado').value;
  const tipo = el('filtroTipo').value;
  const lista = TODAS.filter(s => {
    if (estado && s.estado !== estado) return false;
    if (tipo && s.tipo !== tipo) return false;
    if (texto) {
      const bolsa = `${s.id} ${s.nombre} ${nombreComercio(s.idComercio)}`.toLowerCase();
      if (!bolsa.includes(texto)) return false;
    }
    return true;
  });
  pintarTabla(lista);
}

el('buscador').addEventListener('input', aplicarFiltros);
el('filtroEstado').addEventListener('change', aplicarFiltros);
el('filtroTipo').addEventListener('change', aplicarFiltros);

// ── Carga ───────────────────────────────────────────────────────

async function cargarComercios() {
  try {
    const lista = await apiGet('getComercios');
    const mapa = {};
    if (Array.isArray(lista)) lista.forEach(c => { if (c && c.ID) mapa[c.ID] = c.Nombre || c.ID; });
    return mapa;
  } catch (e) {
    return {};
  }
}

async function cargar() {
  ocultarError('msgSolicitudes');
  try {
    const [res, comercios] = await Promise.all([apiSolicitudes('panelListar'), cargarComercios()]);
    COMERCIOS = comercios;
    if (!res.ok) {
      el('cuerpoTabla').innerHTML = '<tr><td colspan="6" class="muted">No se pudo cargar la información.</td></tr>';
      mostrarError('msgSolicitudes', mensajeError(res));
      return;
    }
    BORRADOR = res.borrador !== false;
    el('avisoBorrador').classList.toggle('visible', BORRADOR);
    TODAS = res.solicitudes || [];
    actualizarStats();
    aplicarFiltros();
  } catch (e) {
    el('cuerpoTabla').innerHTML = '<tr><td colspan="6" class="muted">No se pudo conectar con el servidor.</td></tr>';
  }
}

// ── Detalle ─────────────────────────────────────────────────────

async function abrirDrawer(id) {
  ID_ABIERTO = id;
  const resumen = TODAS.find(s => s.id === id);
  el('drawerNombre').textContent = (resumen && resumen.nombre) || 'Solicitud';
  el('drawerId').textContent = id;
  el('drawerContenido').innerHTML = '<p class="muted">Cargando...</p>';
  el('drawerAcciones').innerHTML = '';
  ocultarError('msgDrawer');
  el('drawerFondo').classList.add('abierto');
  try {
    const d = await apiSolicitudes('panelDetalle', { id });
    if (!d.ok) { el('drawerContenido').innerHTML = ''; mostrarError('msgDrawer', mensajeError(d)); return; }
    renderDetalle(d);
  } catch (e) {
    el('drawerContenido').innerHTML = '';
    mostrarError('msgDrawer', 'No se pudo conectar con el servidor.');
  }
}

function textoRespuesta(p) {
  const partes = (p.opciones || []).slice();
  if (p.texto_libre) partes.push(p.texto_libre);
  if (p.noSe && !partes.length) partes.push('No lo sé');
  return partes.join(' · ');
}

function renderDetalle(d) {
  const s = d.solicitud;
  el('drawerNombre').textContent = s.nombre || '(nombre eliminado)';
  const comercio = nombreComercio(s.idComercio);
  const meta = `
    <div class="drawer-meta">
      <span class="badge badge-tipo-${s.tipo === 'Real' ? 'real' : 'prueba'}">${escapeHtml(s.tipo)}</span>
      <span class="badge ${claseEstado(s.estado)}">${escapeHtml(etiquetaEstado(s.estado))}</span><br>
      ${comercio ? 'Comercio: ' + escapeHtml(comercio) + '<br>' : ''}
      Creada: ${formatearFechaHora(s.creada)}<br>
      Primer acceso: ${formatearFechaHora(s.primerAcceso)}<br>
      Última actividad: ${formatearFechaHora(s.ultimaActividad)}<br>
      Enviada: ${formatearFechaHora(s.enviada)}<br>
      Vence: ${formatearFechaHora(s.vence)}
    </div>`;

  const bloques = (d.bloques || []).map(b => `
    <div class="drawer-bloque">
      <h3>${escapeHtml(b.nombre)}</h3>
      ${b.preguntas.map(p => `
        <div class="drawer-pregunta ${p.activa ? '' : 'inactiva'}">
          <p class="texto">${escapeHtml(p.texto)}${p.activa ? '' : ' (ya no aplica)'}</p>
          <p class="respuesta">${escapeHtml(textoRespuesta(p)) || '—'}</p>
        </div>`).join('')}
    </div>`).join('') || '<p class="muted">Todavía no hay respuestas guardadas.</p>';

  const aut = (d.autorizaciones || []).length ? `
    <div class="drawer-bloque">
      <h3>Autorizaciones</h3>
      ${d.autorizaciones.map(a => `
        <div class="fila-aut">
          <div><strong>${escapeHtml(a.permiso)}</strong><small>${escapeHtml(a.respuesta)}${a.nota ? ' — ' + escapeHtml(a.nota) : ''}</small></div>
          <div style="text-align:right"><span>${escapeHtml(a.estado)}</span><small>${formatearFecha(a.fecha)}</small></div>
        </div>`).join('')}
    </div>` : '';

  const his = (d.historial || []).length ? `
    <div class="drawer-bloque">
      <h3>Historial</h3>
      ${d.historial.slice().reverse().map(h => `<div class="fila-his">${formatearFechaHora(h.fecha)} · ${escapeHtml(h.evento)}${h.detalle ? ' (' + escapeHtml(h.detalle) + ')' : ''} · ${escapeHtml(h.origen)}</div>`).join('')}
    </div>` : '';

  el('drawerContenido').innerHTML = meta + bloques + aut + his;

  const acc = [];
  if (s.estado !== 'Revocada') {
    acc.push('<button type="button" class="btn" data-acc="extender">Extender vencimiento</button>');
    acc.push('<button type="button" class="btn" data-acc="revocar">Revocar enlace</button>');
  }
  if (s.estado === 'Enviada') acc.push('<button type="button" class="btn" data-acc="reabrir">Reabrir para editar</button>');
  el('drawerAcciones').innerHTML = acc.join('');
  el('drawerAcciones').querySelectorAll('button').forEach(b => b.addEventListener('click', () => accionDrawer(b.dataset.acc)));
}

async function accionDrawer(acc) {
  if (!ID_ABIERTO) return;
  const id = ID_ABIERTO;
  let accion, extra = { id };
  if (acc === 'extender') {
    const dias = window.prompt('¿Cuántos días desde hoy? (1 a 365)', '30');
    if (dias === null) return;
    accion = 'panelExtender'; extra.dias = Number(dias);
  } else if (acc === 'revocar') {
    if (!window.confirm('¿Revocar ' + id + '? El enlace deja de funcionar y el cliente ya no puede entrar.')) return;
    accion = 'panelRevocar';
  } else if (acc === 'reabrir') {
    if (!window.confirm('¿Reabrir ' + id + '? El cliente podrá volver a editar y enviar con su mismo enlace.')) return;
    accion = 'panelReabrir';
  } else return;

  ocultarError('msgDrawer');
  el('drawerAcciones').querySelectorAll('button').forEach(b => { b.disabled = true; });
  try {
    const res = await apiSolicitudes(accion, extra);
    if (!res.ok) { mostrarError('msgDrawer', mensajeError(res)); el('drawerAcciones').querySelectorAll('button').forEach(b => { b.disabled = false; }); return; }
    await cargar();
    abrirDrawer(id);
  } catch (e) {
    mostrarError('msgDrawer', 'No se pudo conectar con el servidor.');
    el('drawerAcciones').querySelectorAll('button').forEach(b => { b.disabled = false; });
  }
}

function cerrarDrawer() { el('drawerFondo').classList.remove('abierto'); ID_ABIERTO = null; }
el('btnCerrarDrawer').addEventListener('click', cerrarDrawer);
el('drawerFondo').addEventListener('click', e => { if (e.target.id === 'drawerFondo') cerrarDrawer(); });

// ── Nueva invitación ────────────────────────────────────────────

function abrirModalNueva() {
  el('nuevoNombre').value = '';
  el('nuevoTipo').value = 'Prueba';
  el('optReal').disabled = BORRADOR;
  el('optReal').textContent = BORRADOR ? 'Real (bloqueado hasta completar la revisión)' : 'Real (cliente verdadero)';
  const sel = el('nuevoComercio');
  sel.innerHTML = '<option value="">Sin asociar</option>' + Object.keys(COMERCIOS)
    .sort((a, b) => String(COMERCIOS[a]).localeCompare(String(COMERCIOS[b])))
    .map(id => `<option value="${escapeHtml(id)}">${escapeHtml(COMERCIOS[id])}</option>`).join('');
  ocultarError('msgNueva');
  el('modalNueva').classList.add('abierto');
  el('nuevoNombre').focus();
}

async function crearInvitacion() {
  const nombre = el('nuevoNombre').value.trim();
  if (!nombre) { mostrarError('msgNueva', 'Escribí el nombre provisional del negocio.'); return; }
  ocultarError('msgNueva');
  const btn = el('btnNuevaCrear');
  btn.disabled = true;
  try {
    const res = await apiSolicitudes('panelCrear', { nombre, tipo: el('nuevoTipo').value, idComercio: el('nuevoComercio').value });
    if (!res.ok) { mostrarError('msgNueva', mensajeError(res)); return; }
    el('modalNueva').classList.remove('abierto');
    el('enlaceTitulo').textContent = 'Invitación ' + res.id + ' creada';
    el('enlaceUrl').value = res.url;
    el('btnCopiarEnlace').textContent = 'Copiar enlace';
    el('modalEnlace').classList.add('abierto');
    el('enlaceUrl').select();
    cargar();
  } catch (e) {
    mostrarError('msgNueva', 'No se pudo conectar con el servidor.');
  } finally {
    btn.disabled = false;
  }
}

el('btnNueva').addEventListener('click', abrirModalNueva);
el('btnNuevaCancelar').addEventListener('click', () => el('modalNueva').classList.remove('abierto'));
el('btnNuevaCrear').addEventListener('click', crearInvitacion);
el('btnCerrarEnlace').addEventListener('click', () => { el('modalEnlace').classList.remove('abierto'); el('enlaceUrl').value = ''; });
el('btnCopiarEnlace').addEventListener('click', async () => {
  const campo = el('enlaceUrl');
  try { await navigator.clipboard.writeText(campo.value); el('btnCopiarEnlace').textContent = '✔ Copiado'; }
  catch (e) { campo.select(); el('btnCopiarEnlace').textContent = 'Seleccionado: copiá con Ctrl+C'; }
});

cargar();
