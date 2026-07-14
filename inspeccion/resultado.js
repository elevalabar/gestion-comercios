// ─────────────────────────────────────────────
// RESULTADO DE LA INSPECCIÓN INICIAL
// Nivel de Oportunidad, Prioridad Comercial, Problemas detectados y
// Servicios sugeridos vienen calculados desde el backend
// (finalizarInspeccion) y quedan guardados en la Inspección — esta
// página solo los lee y los pinta.
// ─────────────────────────────────────────────

const params = new URLSearchParams(window.location.search);
const ID_INSPECCION = params.get('id');

let ID_COMERCIO = null;

const COLOR_NIVEL = {
  'Baja': '#4ade80',
  'Media': '#facc15',
  'Alta': '#fb923c',
  'Muy Alta': '#f87171'
};

const BADGE_PRIORIDAD = {
  'Alta': 'badge-alta',
  'Media': 'badge-media',
  'Baja': 'badge-baja'
};

document.getElementById('linkVolver').addEventListener('click', (e) => {
  e.preventDefault();
  if (ID_COMERCIO) window.location.href = `../comercios/ficha.html?id=${encodeURIComponent(ID_COMERCIO)}`;
  else window.location.href = '../comercios/index.html';
});

if (!ID_INSPECCION) {
  document.getElementById('tituloComercio').textContent = 'Inspección no especificada';
} else {
  init();
}

function formatFecha(valor) {
  if (!valor) return '';
  const d = new Date(valor);
  if (isNaN(d.getTime())) return valor;
  return d.toLocaleDateString('es-AR');
}

async function init() {
  const insp = await apiGet('getInspeccion', { id: ID_INSPECCION });
  if (!insp || insp.error) {
    document.getElementById('tituloComercio').textContent = 'No se encontró la inspección';
    return;
  }

  ID_COMERCIO = insp.idComercio;

  if (insp.estado !== 'Finalizada') {
    window.location.href = `index.html?id=${encodeURIComponent(ID_INSPECCION)}`;
    return;
  }

  const comercio = await apiGet('getComercio', { id: ID_COMERCIO });
  document.getElementById('tituloComercio').textContent =
    `Inspección Inicial · ${comercio && comercio.Nombre ? comercio.Nombre : ''}`;
  document.getElementById('fechaInspeccion').textContent = formatFecha(insp.fecha);

  const nivel = insp.nivelOportunidad || '-';
  const nivelEl = document.getElementById('nivelOportunidad');
  nivelEl.textContent = nivel;
  nivelEl.style.color = COLOR_NIVEL[nivel] || 'var(--text-primary)';

  const prioridadEl = document.getElementById('prioridadComercial');
  prioridadEl.textContent = insp.prioridadComercial || '-';
  prioridadEl.className = 'badge ' + (BADGE_PRIORIDAD[insp.prioridadComercial] || 'badge-baja');

  pintarLista('listaProblemas', insp.problemasDetectados, '¡Sin problemas detectados en esta inspección!');
  pintarLista('listaServicios', insp.serviciosSugeridos, 'No se sugirió ningún servicio puntual.');

  document.getElementById('btnIrSeguimiento').href = '../seguimiento/index.html';
  document.getElementById('btnIniciarAuditoria').addEventListener('click', onIniciarAuditoria);
}

function pintarLista(idContenedor, items, mensajeVacio) {
  const cont = document.getElementById(idContenedor);
  if (!items || !items.length) {
    cont.innerHTML = `<li class="muted">${mensajeVacio}</li>`;
    return;
  }
  cont.innerHTML = items.map(t => `<li>→ ${t}</li>`).join('');
}

async function onIniciarAuditoria(e) {
  e.preventDefault();
  const btn = e.target;
  btn.textContent = 'Iniciando...';
  try {
    const res = await apiPost('iniciarAuditoria', { idComercio: ID_COMERCIO });
    if (res.ok) {
      window.location.href = `../auditoria/index.html?id=${encodeURIComponent(res.id)}`;
    } else {
      alert(res.error || 'No se pudo iniciar la auditoría.');
      btn.textContent = 'Iniciar Auditoría Completa';
    }
  } catch (err) {
    alert('No se pudo conectar con el servidor. Probá de nuevo.');
    btn.textContent = 'Iniciar Auditoría Completa';
  }
}
