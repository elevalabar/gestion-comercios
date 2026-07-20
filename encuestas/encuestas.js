// ─────────────────────────────────────────────
// ENCUESTAS — panel administrativo sobre las respuestas del
// Diagnóstico público (DiagEnvios / DiagRespuestas en Firestore).
// No toca el guardado ni el motor de puntaje: es 100% lectura +
// un único campo de gestión (Estado).
//
// Backend esperado (encuestas.gs, acciones nuevas en el router):
//   GET  listarEncuestas            → array de resúmenes
//   GET  obtenerDetalleEncuesta(id) → ficha completa por bloques
//   POST actualizarEstadoEncuesta(id, estado)
//   GET  generarContextoIA(id)      → { texto }
// ─────────────────────────────────────────────

let TODAS_LAS_ENCUESTAS = [];
const ESTADOS_VALIDOS = ['Nuevo', 'Revisado', 'Contactado', 'Cliente', 'Descartado'];

// ── Helpers ─────────────────────────────────────────────────────

function formatearFecha(fechaIso) {
  if (!fechaIso) return '—';
  const d = new Date(fechaIso);
  if (isNaN(d.getTime())) return String(fechaIso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function claseUrgencia(nivel) {
  if (nivel === 'Alta') return 'badge-urgencia-alta';
  if (nivel === 'Media') return 'badge-urgencia-media';
  return 'badge-urgencia-baja';
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// ── KPIs ────────────────────────────────────────────────────────
// Se calculan sobre el total cargado (no sobre el filtro actual),
// mismo criterio que la cabecera de métricas de Comercios.

function actualizarStats() {
  const total = TODAS_LAS_ENCUESTAS.length;
  const nuevas = TODAS_LAS_ENCUESTAS.filter(e => e.estado === 'Nuevo').length;
  const contactadas = TODAS_LAS_ENCUESTAS.filter(e => e.estado === 'Contactado').length;
  const clientes = TODAS_LAS_ENCUESTAS.filter(e => e.estado === 'Cliente').length;
  const conversion = total ? Math.round((clientes / total) * 100) : 0;

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statNuevas').textContent = nuevas;
  document.getElementById('statContactadas').textContent = contactadas;
  document.getElementById('statClientes').textContent = clientes;
  document.getElementById('statConversion').textContent = conversion + '%';
}

// ── Filtros dinámicos (Provincia / Rubro se pueblan con lo que llega) ──

function poblarFiltrosDinamicos() {
  const provincias = [...new Set(TODAS_LAS_ENCUESTAS.map(e => e.provincia).filter(Boolean))].sort();
  const rubros = [...new Set(TODAS_LAS_ENCUESTAS.map(e => e.rubro).filter(Boolean))].sort();

  const selProvincia = document.getElementById('filtroProvincia');
  provincias.forEach(p => selProvincia.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`));

  const selRubro = document.getElementById('filtroRubro');
  rubros.forEach(r => selRubro.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`));
}

// ── Fila de tabla ───────────────────────────────────────────────

function renderFila(e) {
  const nivel = e.nivelUrgencia || 'Baja';
  const diagnosticoHtml = `<span class="badge ${claseUrgencia(nivel)}">${escapeHtml(nivel)}${e.puntajeGeneral != null ? ' · ' + e.puntajeGeneral : ''}</span>`;

  const opcionesEstado = ESTADOS_VALIDOS.map(est =>
    `<option value="${est}" ${e.estado === est ? 'selected' : ''}>${est}</option>`
  ).join('');

  return `
    <tr data-id="${escapeHtml(e.id)}">
      <td class="celda-muted">${formatearFecha(e.fecha)}</td>
      <td class="celda-empresa">${escapeHtml(e.nombre) || '—'}</td>
      <td>${escapeHtml(e.empresa) || '—'}</td>
      <td class="celda-muted">${escapeHtml(e.whatsapp || e.email) || '—'}</td>
      <td class="celda-muted">${escapeHtml(e.provincia) || '—'}</td>
      <td class="celda-muted">${escapeHtml(e.rubro) || '—'}</td>
      <td>${diagnosticoHtml}</td>
      <td>
        <select class="select-estado" data-id="${escapeHtml(e.id)}">
          ${opcionesEstado}
        </select>
      </td>
      <td><button type="button" class="btn btn-icono btn-ver-detalle" data-id="${escapeHtml(e.id)}" title="Ver detalle">→</button></td>
    </tr>
  `;
}

function pintarTabla(lista) {
  const cuerpo = document.getElementById('cuerpoTabla');

  if (lista.length === 0) {
    cuerpo.innerHTML = '<tr><td colspan="9" class="muted">No se encontraron encuestas.</td></tr>';
    return;
  }

  cuerpo.innerHTML = lista.map(renderFila).join('');

  document.querySelectorAll('.select-estado').forEach(sel => {
    sel.addEventListener('change', onCambiarEstado);
  });
  document.querySelectorAll('.btn-ver-detalle').forEach(btn => {
    btn.addEventListener('click', () => abrirDrawer(btn.dataset.id));
  });
  document.querySelectorAll('.tabla-encuestas tbody tr').forEach(tr => {
    tr.style.cursor = 'pointer';
    tr.addEventListener('click', (e) => {
      if (e.target.closest('select') || e.target.closest('button')) return;
      abrirDrawer(tr.dataset.id);
    });
  });
}

// ── Cambio de estado inline ──────────────────────────────────────

async function onCambiarEstado(e) {
  const id = e.target.dataset.id;
  const nuevoEstado = e.target.value;
  const anterior = TODAS_LAS_ENCUESTAS.find(x => x.id === id);
  const estadoPrevio = anterior ? anterior.estado : 'Nuevo';

  e.target.disabled = true;
  try {
    const res = await apiPost('actualizarEstadoEncuesta', { id, estado: nuevoEstado });
    if (res.ok) {
      if (anterior) anterior.estado = nuevoEstado;
      actualizarStats();
    } else {
      alert(res.error || 'No se pudo actualizar el estado.');
      e.target.value = estadoPrevio;
    }
  } catch (err) {
    alert('No se pudo conectar con el servidor. Probá de nuevo.');
    e.target.value = estadoPrevio;
  } finally {
    e.target.disabled = false;
  }
}

// ── Filtro combinado (búsqueda + selects) ────────────────────────

function aplicarFiltros() {
  const texto = document.getElementById('buscador').value.toLowerCase().trim();
  const estado = document.getElementById('filtroEstado').value;
  const provincia = document.getElementById('filtroProvincia').value;
  const rubro = document.getElementById('filtroRubro').value;

  const filtradas = TODAS_LAS_ENCUESTAS.filter(e => {
    if (estado && e.estado !== estado) return false;
    if (provincia && e.provincia !== provincia) return false;
    if (rubro && e.rubro !== rubro) return false;
    if (texto) {
      const bolsa = `${e.nombre || ''} ${e.empresa || ''} ${e.rubro || ''}`.toLowerCase();
      if (!bolsa.includes(texto)) return false;
    }
    return true;
  });

  pintarTabla(filtradas);
  return filtradas;
}

['buscador'].forEach(id => document.getElementById(id).addEventListener('input', aplicarFiltros));
['filtroEstado', 'filtroProvincia', 'filtroRubro'].forEach(id => document.getElementById(id).addEventListener('change', aplicarFiltros));

// ── Drawer de detalle ─────────────────────────────────────────────

let ID_ABIERTO_ACTUAL = null;

async function abrirDrawer(id) {
  ID_ABIERTO_ACTUAL = id;
  const fondo = document.getElementById('drawerFondo');
  const resumen = TODAS_LAS_ENCUESTAS.find(x => x.id === id);

  document.getElementById('drawerNombre').textContent = (resumen && (resumen.nombre || resumen.empresa)) || 'Encuesta';
  document.getElementById('drawerFecha').textContent = resumen ? formatearFecha(resumen.fecha) : '';
  document.getElementById('drawerContenido').innerHTML = '<p class="muted">Cargando...</p>';
  fondo.classList.add('abierto');

  try {
    const detalle = await apiGet('obtenerDetalleEncuesta', { id });
    if (!detalle.ok) {
      document.getElementById('drawerContenido').innerHTML = `<p class="muted">${escapeHtml(detalle.error || 'No se pudo cargar el detalle.')}</p>`;
      return;
    }
    renderDetalle(detalle);
  } catch (err) {
    document.getElementById('drawerContenido').innerHTML = '<p class="muted">No se pudo conectar con el servidor.</p>';
  }
}

function renderDetalle(detalle) {
  const bloques = detalle.bloques || [];
  const html = bloques.map(bloque => `
    <div class="drawer-bloque">
      <h3>${escapeHtml(bloque.nombre)}</h3>
      ${bloque.preguntas.map(p => `
        <div class="drawer-pregunta">
          <p class="texto">${escapeHtml(p.texto)}</p>
          <p class="respuesta">${escapeHtml(p.respuesta) || '—'}</p>
        </div>
      `).join('')}
    </div>
  `).join('');

  document.getElementById('drawerContenido').innerHTML = html || '<p class="muted">Sin respuestas.</p>';
}

function cerrarDrawer() {
  document.getElementById('drawerFondo').classList.remove('abierto');
  ID_ABIERTO_ACTUAL = null;
}

document.getElementById('btnCerrarDrawer').addEventListener('click', cerrarDrawer);
document.getElementById('drawerFondo').addEventListener('click', (e) => {
  if (e.target.id === 'drawerFondo') cerrarDrawer();
});

// ── Copiar contexto para IA (siempre generado al momento) ─────────

async function onCopiarContextoIA() {
  if (!ID_ABIERTO_ACTUAL) return;
  const btn = document.getElementById('btnCopiarContextoIA');
  const textoOriginal = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Generando...';

  try {
    const res = await apiGet('generarContextoIA', { id: ID_ABIERTO_ACTUAL });
    if (res.ok && res.texto) {
      await navigator.clipboard.writeText(res.texto);
      btn.textContent = '✔ Copiado';
    } else {
      alert(res.error || 'No se pudo generar el contexto.');
    }
  } catch (err) {
    alert('No se pudo conectar con el servidor.');
  } finally {
    setTimeout(() => { btn.textContent = textoOriginal; btn.disabled = false; }, 1500);
  }
}

document.getElementById('btnCopiarContextoIA').addEventListener('click', onCopiarContextoIA);

// ── Exportar CSV (client-side, sobre el filtro actual — no duplica
// lógica en el backend, reutiliza los mismos datos ya cargados) ────

function descargarCSV(lista) {
  const columnas = ['Fecha', 'Nombre', 'Empresa', 'Email', 'WhatsApp', 'Provincia', 'Rubro', 'Estado', 'Nivel de urgencia', 'Puntaje'];
  const filas = lista.map(e => [
    formatearFecha(e.fecha), e.nombre, e.empresa, e.email, e.whatsapp,
    e.provincia, e.rubro, e.estado, e.nivelUrgencia, e.puntajeGeneral
  ]);

  const csv = [columnas, ...filas]
    .map(fila => fila.map(v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `encuestas_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

document.getElementById('btnExportarCSV').addEventListener('click', () => {
  descargarCSV(aplicarFiltros());
});

// ── Carga inicial ───────────────────────────────────────────────

async function cargarEncuestas() {
  try {
    const res = await apiGet('listarEncuestas');
    if (!res.ok && res.error) {
      document.getElementById('cuerpoTabla').innerHTML =
        `<tr><td colspan="9" class="muted">No se pudo cargar la información (${escapeHtml(res.error)}).</td></tr>`;
      return;
    }
    TODAS_LAS_ENCUESTAS = Array.isArray(res) ? res : (res.datos || []);
    actualizarStats();
    poblarFiltrosDinamicos();
    pintarTabla(TODAS_LAS_ENCUESTAS);
  } catch (err) {
    document.getElementById('cuerpoTabla').innerHTML =
      '<tr><td colspan="9" class="muted">No se pudo conectar con el servidor.</td></tr>';
  }
}

cargarEncuestas();
