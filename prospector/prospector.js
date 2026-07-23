// ─────────────────────────────────────────────
// PROSPECTOR — importación masiva de comercios desde CSV de Google
// Maps (Instant Data Scraper) + listado de lo ya importado.
//
// El CSV se lee y mapea 100% en el navegador (nunca se sube el
// archivo al servidor). Solo se manda al backend la lista final de
// comercios ya normalizada.
//
// Backend esperado (pendiente en Code.gs, a definir cuando se comparta
// el guardarComercio/router actual):
//   POST importarComerciosProspector({ comercios: [...] })
//        → { ok, creados, actualizados, omitidos, errores: [...] }
//        Dedupe: 1° Google Maps URL, 2° Nombre + Dirección.
//        Nunca pisa campos cargados a mano; solo completa vacíos o
//        actualiza los campos propios de prospección (rating,
//        cantidadResenas, imagen, EstadoProspeccion, fechaImportacion).
//
// La pestaña "Comercios Importados" NO usa un endpoint nuevo: reusa
// getComercios (ya existente) y filtra client-side por Origen ===
// 'Google Maps', mismo criterio que ya usa Encuestas para no duplicar
// lecturas en el backend.
// ─────────────────────────────────────────────

// ── Parser de CSV (soporta campos entre comillas con comas/saltos de
// línea adentro, tal como los genera Instant Data Scraper) ─────────

function parsearCSV(texto) {
  const limpio = texto.charCodeAt(0) === 0xFEFF ? texto.slice(1) : texto; // BOM
  const filas = [];
  let fila = [], campo = '', enComillas = false;

  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i], next = limpio[i + 1];
    if (enComillas) {
      if (c === '"' && next === '"') { campo += '"'; i++; }
      else if (c === '"') { enComillas = false; }
      else campo += c;
    } else {
      if (c === '"') enComillas = true;
      else if (c === ',') { fila.push(campo); campo = ''; }
      else if (c === '\r') { /* ignorar, \n cierra la fila */ }
      else if (c === '\n') { fila.push(campo); filas.push(fila); fila = []; campo = ''; }
      else campo += c;
    }
  }
  if (campo !== '' || fila.length) { fila.push(campo); filas.push(fila); }
  return filas;
}

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

const ETIQUETAS_CAMPO = {
  nombre: 'Nombre', categoria: 'Categoría / Rubro', rating: 'Rating',
  cantidadResenas: 'Cant. de reseñas', direccion: 'Dirección',
  imagen: 'Imagen', googleMapsUrl: 'Google Maps URL'
};

// ── Estado del módulo ──────────────────────────────────────────────

let FILAS_CSV = [];       // filas crudas del CSV (sin encabezado)
let MAPEO_ACTUAL = null;  // resultado de detectarColumnas()
let COMERCIOS_A_IMPORTAR = []; // ya mapeados, lo que se manda al importar
let TODOS_LOS_IMPORTADOS = [];

// ── Pestañas ────────────────────────────────────────────────────────

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('activa'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('activa'));
    btn.classList.add('activa');
    document.getElementById('panel-' + btn.dataset.tab).classList.add('activa');
    if (btn.dataset.tab === 'importados' && TODOS_LOS_IMPORTADOS.length === 0) {
      cargarImportados();
    }
  });
});

// ── Carga del archivo (drag & drop + selector) ───────────────────────

const dropzone = document.getElementById('dropzone');
const inputArchivo = document.getElementById('inputArchivo');

dropzone.addEventListener('click', () => inputArchivo.click());

['dragenter', 'dragover'].forEach(ev => {
  dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add('sobre-arrastre'); });
});
['dragleave', 'drop'].forEach(ev => {
  dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove('sobre-arrastre'); });
});
dropzone.addEventListener('drop', (e) => {
  const archivo = e.dataTransfer.files[0];
  if (archivo) procesarArchivo(archivo);
});
inputArchivo.addEventListener('change', (e) => {
  const archivo = e.target.files[0];
  if (archivo) procesarArchivo(archivo);
});

document.getElementById('btnQuitarArchivo').addEventListener('click', () => {
  FILAS_CSV = [];
  MAPEO_ACTUAL = null;
  COMERCIOS_A_IMPORTAR = [];
  inputArchivo.value = '';
  document.getElementById('archivoElegido').style.display = 'none';
  document.getElementById('previaWrap').style.display = 'none';
  document.getElementById('dropzone').style.display = 'block';
  document.getElementById('resultadoImport').className = 'resultado-import';
});

function procesarArchivo(archivo) {
  if (!archivo.name.toLowerCase().endsWith('.csv')) {
    mostrarResultado('error', 'El archivo tiene que ser un .csv exportado con Instant Data Scraper.');
    return;
  }

  document.getElementById('nombreArchivo').textContent = archivo.name;
  document.getElementById('archivoElegido').style.display = 'flex';
  document.getElementById('dropzone').style.display = 'none';
  document.getElementById('resultadoImport').className = 'resultado-import';

  const lector = new FileReader();
  lector.onload = (e) => {
    const todasLasFilas = parsearCSV(e.target.result);
    if (todasLasFilas.length < 2) {
      mostrarResultado('error', 'El CSV no tiene filas de datos.');
      return;
    }
    FILAS_CSV = todasLasFilas.slice(1); // sin encabezado (no se usa: el mapeo es por contenido)
    analizarYMostrarPrevia();
  };
  lector.onerror = () => mostrarResultado('error', 'No se pudo leer el archivo. Probá de nuevo.');
  lector.readAsText(archivo, 'UTF-8');
}

// ── Análisis + previsualización ─────────────────────────────────────

function analizarYMostrarPrevia() {
  const { mapeo, columnas, filasUtiles } = ProspectorDetector.detectarColumnas(FILAS_CSV);
  MAPEO_ACTUAL = mapeo;
  COMERCIOS_A_IMPORTAR = ProspectorDetector.mapearComercios(FILAS_CSV, mapeo);

  const camposMapeados = Object.values(mapeo).filter(v => v != null).length;

  document.getElementById('statEncontrados').textContent = filasUtiles;
  document.getElementById('statColumnas').textContent = columnas;
  document.getElementById('statMapeados').textContent = `${camposMapeados}/${Object.keys(ETIQUETAS_CAMPO).length}`;

  document.getElementById('mapeoResumen').innerHTML = Object.entries(ETIQUETAS_CAMPO).map(([campo, etiqueta]) => {
    const detectado = mapeo[campo] != null;
    return `
      <div class="mapeo-chip ${detectado ? '' : 'sin-detectar'}">
        <span class="campo">${etiqueta}</span>
        <span class="valor">${detectado ? 'columna ' + (mapeo[campo] + 1) : 'no detectado'}</span>
      </div>`;
  }).join('');

  document.getElementById('cuerpoPrevia').innerHTML = COMERCIOS_A_IMPORTAR.slice(0, 10).map(c => `
    <tr>
      <td>${c.imagen ? `<img src="${escapeHtml(c.imagen)}" class="miniatura-comercio" loading="lazy">` : ''}</td>
      <td title="${escapeHtml(c.nombre)}">${escapeHtml(c.nombre) || '—'}</td>
      <td class="celda-muted" title="${escapeHtml(c.categoria)}">${escapeHtml(c.categoria) || '—'}</td>
      <td class="celda-muted">${c.rating !== '' ? c.rating : '—'}</td>
      <td class="celda-muted">${c.cantidadResenas !== '' ? c.cantidadResenas : '—'}</td>
      <td class="celda-muted" title="${escapeHtml(c.direccion)}">${escapeHtml(c.direccion) || '—'}</td>
    </tr>
  `).join('');

  document.getElementById('previaWrap').style.display = 'block';
}

function mostrarResultado(tipo, texto) {
  const el = document.getElementById('resultadoImport');
  el.className = 'resultado-import ' + tipo;
  el.textContent = texto;
}

// ── Importar ──────────────────────────────────────────────────────

document.getElementById('btnImportar').addEventListener('click', async () => {
  const btn = document.getElementById('btnImportar');
  btn.disabled = true;
  btn.textContent = 'Importando...';

  try {
    const res = await apiPost('importarComerciosProspector', { comercios: COMERCIOS_A_IMPORTAR });
    if (!res.ok) {
      mostrarResultado('error', res.error || 'No se pudo completar la importación.');
      return;
    }
    mostrarResultado('ok',
      `Listo: ${res.creados} comercios nuevos, ${res.actualizados} actualizados` +
      (res.omitidos ? `, ${res.omitidos} sin cambios` : '') + '.'
    );
    TODOS_LOS_IMPORTADOS = []; // fuerza recarga la próxima vez que se abra la pestaña
  } catch (err) {
    mostrarResultado('error', 'No se pudo conectar con el servidor. Probá de nuevo.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Importar';
  }
});

// ── Pestaña: Comercios Importados ───────────────────────────────────
// Reusa getComercios (ya trae TODOS los comercios) y filtra por
// Origen === 'Google Maps'. Si el volumen de comercios crece mucho en
// el futuro y esto se vuelve pesado, ahí sí se justifica un endpoint
// de lectura filtrado en el backend — por ahora no hace falta.

async function cargarImportados() {
  const cuerpo = document.getElementById('cuerpoTablaImportados');
  cuerpo.innerHTML = '<tr><td colspan="8" class="muted">Cargando...</td></tr>';

  try {
    const res = await apiGet('getComercios');
    const todos = Array.isArray(res) ? res : (res.datos || []);
    TODOS_LOS_IMPORTADOS = todos.filter(c => c.Origen === 'Google Maps');
    actualizarStatsImportados();
    poblarFiltroRubro();
    pintarTablaImportados(TODOS_LOS_IMPORTADOS);
  } catch (err) {
    cuerpo.innerHTML = '<tr><td colspan="8" class="muted">No se pudo conectar con el servidor.</td></tr>';
  }
}

function actualizarStatsImportados() {
  const total = TODOS_LOS_IMPORTADOS.length;
  const pendientes = TODOS_LOS_IMPORTADOS.filter(c => c.EstadoProspeccion === 'Pendiente de Auditoría').length;
  const auditados = TODOS_LOS_IMPORTADOS.filter(c => c.EstadoProspeccion === 'Auditado').length;
  const conRating = TODOS_LOS_IMPORTADOS.filter(c => c.Rating != null && c.Rating !== '');
  const promedio = conRating.length
    ? (conRating.reduce((acc, c) => acc + parseFloat(c.Rating), 0) / conRating.length).toFixed(1)
    : '—';

  document.getElementById('statImportados').textContent = total;
  document.getElementById('statPendientes').textContent = pendientes;
  document.getElementById('statAuditados').textContent = auditados;
  document.getElementById('statPromedioRating').textContent = promedio;
}

function poblarFiltroRubro() {
  const sel = document.getElementById('filtroRubro');
  sel.querySelectorAll('option:not(:first-child)').forEach(o => o.remove());
  const rubros = [...new Set(TODOS_LOS_IMPORTADOS.map(c => c.Rubro).filter(Boolean))].sort();
  rubros.forEach(r => sel.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`));
}

function filaImportado(c) {
  const badgeClase = c.EstadoProspeccion === 'Auditado' ? 'badge-prospeccion-auditado' : 'badge-prospeccion-pendiente';
  return `
    <tr data-id="${escapeHtml(c.ID)}">
      <td>${c['Imagen Google'] ? `<img src="${escapeHtml(c['Imagen Google'])}" class="miniatura-comercio" loading="lazy">` : ''}</td>
      <td title="${escapeHtml(c.Nombre)}">${escapeHtml(c.Nombre) || '—'}</td>
      <td class="celda-muted" title="${escapeHtml(c.Rubro)}">${escapeHtml(c.Rubro) || '—'}</td>
      <td class="celda-muted">${c.Rating || '—'}</td>
      <td class="celda-muted">${c['Cantidad de Reseñas'] || '—'}</td>
      <td class="celda-muted" title="${escapeHtml(c['Dirección'])}">${escapeHtml(c['Dirección']) || '—'}</td>
      <td><span class="badge ${badgeClase}">${escapeHtml(c.EstadoProspeccion) || '—'}</span></td>
      <td>
        <div class="celda-acciones">
          ${c['Google Maps'] ? `<a href="${escapeHtml(c['Google Maps'])}" target="_blank" rel="noopener" class="btn" title="Abrir en Google Maps">🗺️</a>` : ''}
          <a href="../comercios/ficha.html?id=${encodeURIComponent(c.ID)}" class="btn" title="Editar">✎</a>
          <button type="button" class="btn btn-auditar" data-id="${escapeHtml(c.ID)}" title="Auditar">🔍</button>
          <button type="button" class="btn peligro btn-eliminar-importado" data-id="${escapeHtml(c.ID)}" data-nombre="${escapeHtml(c.Nombre)}" title="Eliminar">🗑</button>
        </div>
      </td>
    </tr>
  `;
}

function pintarTablaImportados(lista) {
  const cuerpo = document.getElementById('cuerpoTablaImportados');
  cuerpo.innerHTML = lista.length
    ? lista.map(filaImportado).join('')
    : '<tr><td colspan="8" class="muted">No hay comercios que coincidan con el filtro.</td></tr>';
}

function aplicarFiltrosImportados() {
  const texto = document.getElementById('buscador').value.trim().toLowerCase();
  const rubro = document.getElementById('filtroRubro').value;
  const estado = document.getElementById('filtroEstadoProspeccion').value;
  const ratingMin = parseFloat(document.getElementById('filtroRating').value) || 0;
  const resenasMin = parseInt(document.getElementById('filtroResenas').value, 10) || 0;

  const filtrados = TODOS_LOS_IMPORTADOS.filter(c => {
    const matchTexto = !texto || (c.Nombre || '').toLowerCase().includes(texto);
    const matchRubro = !rubro || c.Rubro === rubro;
    const matchEstado = !estado || c.EstadoProspeccion === estado;
    const matchRating = !ratingMin || parseFloat(c.Rating || 0) >= ratingMin;
    const matchResenas = !resenasMin || parseInt(c['Cantidad de Reseñas'] || 0, 10) >= resenasMin;
    return matchTexto && matchRubro && matchEstado && matchRating && matchResenas;
  });

  pintarTablaImportados(filtrados);
}

['buscador', 'filtroRubro', 'filtroEstadoProspeccion', 'filtroRating', 'filtroResenas'].forEach(id => {
  document.getElementById(id).addEventListener('input', aplicarFiltrosImportados);
  document.getElementById(id).addEventListener('change', aplicarFiltrosImportados);
});

// ── Acciones de la tabla (Auditar reutiliza 100% el flujo existente,
// Eliminar reutiliza el mismo endpoint que usa Comercios) ───────────

document.getElementById('cuerpoTablaImportados').addEventListener('click', async (e) => {
  const btnAuditar = e.target.closest('.btn-auditar');
  if (btnAuditar) {
    const id = btnAuditar.dataset.id;
    btnAuditar.disabled = true;
    try {
      const res = await apiPost('iniciarAuditoria', { idComercio: id });
      if (res.ok) {
        window.location.href = `../auditoria/index.html?id=${encodeURIComponent(res.id)}`;
      } else {
        alert(res.error || 'No se pudo iniciar la auditoría.');
        btnAuditar.disabled = false;
      }
    } catch (err) {
      alert('No se pudo conectar con el servidor.');
      btnAuditar.disabled = false;
    }
    return;
  }

  const btnEliminar = e.target.closest('.btn-eliminar-importado');
  if (btnEliminar) {
    const id = btnEliminar.dataset.id;
    const nombre = btnEliminar.dataset.nombre || 'este comercio';
    if (!confirm(`¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await apiPost('eliminarComercio', { id });
      if (res.ok) {
        TODOS_LOS_IMPORTADOS = TODOS_LOS_IMPORTADOS.filter(c => c.ID !== id);
        actualizarStatsImportados();
        aplicarFiltrosImportados();
      } else {
        alert(res.error || 'No se pudo eliminar.');
      }
    } catch (err) {
      alert('No se pudo conectar con el servidor.');
    }
  }
});
