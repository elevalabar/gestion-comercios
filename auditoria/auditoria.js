// ─────────────────────────────────────────────
// AUDITORIA — completar preguntas dinámicamente por área
// ─────────────────────────────────────────────

const params = new URLSearchParams(window.location.search);
const ID_AUDITORIA = params.get('id');

let PREGUNTAS = [];
let RESPUESTAS = {};
let ID_COMERCIO = null;

document.getElementById('linkVolver').addEventListener('click', (e) => {
  e.preventDefault();
  if (ID_COMERCIO) window.location.href = `../comercios/ficha.html?id=${encodeURIComponent(ID_COMERCIO)}`;
  else window.location.href = '../comercios/index.html';
});

if (!ID_AUDITORIA) {
  document.getElementById('tituloComercio').textContent = 'Auditoría no especificada';
} else {
  init();
}

async function init() {
  const auditoria = await apiGet('getAuditoria', { id: ID_AUDITORIA });
  if (!auditoria || auditoria.error) {
    document.getElementById('tituloComercio').textContent = 'No se encontró la auditoría';
    return;
  }

  ID_COMERCIO = auditoria.comercioId;
  RESPUESTAS = auditoria.respuestas || {};

  if (auditoria.estado === 'Finalizada') {
    window.location.href = `resultado.html?id=${encodeURIComponent(ID_AUDITORIA)}`;
    return;
  }

  const comercio = await apiGet('getComercio', { id: ID_COMERCIO });
  document.getElementById('tituloComercio').textContent =
    `Auditoría · ${comercio && comercio.Nombre ? comercio.Nombre : ''}`;

  PREGUNTAS = await apiGet('getPreguntas', { rubro: comercio ? comercio.Rubro : '' });
  pintarPreguntas();
  actualizarAvance();
}

function pintarPreguntas() {
  const porArea = {};
  PREGUNTAS.forEach(p => {
    if (!porArea[p.area]) porArea[p.area] = [];
    porArea[p.area].push(p);
  });

  const contenedor = document.getElementById('areas');
  contenedor.innerHTML = Object.keys(porArea).map(area => `
    <div class="card area-bloque">
      <h3>${area}</h3>
      <div class="pregunta-grid">
        ${porArea[area].map(p => `
          <div class="pregunta-fila">
            <label>${p.texto}</label>
            <select data-pregunta-id="${p.id}" class="respuesta-select">
              <option value="">Sin responder</option>
              <option value="Sí" ${RESPUESTAS[p.id] === 'Sí' ? 'selected' : ''}>Sí</option>
              <option value="No" ${RESPUESTAS[p.id] === 'No' ? 'selected' : ''}>No</option>
            </select>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.respuesta-select').forEach(sel => {
    sel.addEventListener('change', onCambiarRespuesta);
  });
}

async function onCambiarRespuesta(e) {
  const preguntaId = e.target.dataset.preguntaId;
  const respuesta = e.target.value;
  RESPUESTAS[preguntaId] = respuesta;
  actualizarAvance();

  e.target.disabled = true;
  try {
    await apiPost('guardarRespuesta', { auditoriaId: ID_AUDITORIA, preguntaId, respuesta });
  } catch (err) {
    // el guardado falló pero dejamos el valor elegido en pantalla;
    // el usuario puede reintentar cambiando el select de nuevo
  } finally {
    e.target.disabled = false;
  }
}

function actualizarAvance() {
  const total = PREGUNTAS.length;
  const respondidas = PREGUNTAS.filter(p => RESPUESTAS[p.id] === 'Sí' || RESPUESTAS[p.id] === 'No').length;
  const pct = total > 0 ? Math.round((respondidas / total) * 100) : 0;
  document.getElementById('relleno').style.width = pct + '%';
  document.getElementById('textoAvance').textContent = `${respondidas} de ${total} respondidas`;
}

document.getElementById('btnFinalizar').addEventListener('click', async () => {
  const mensaje = document.getElementById('mensaje');
  mensaje.classList.remove('visible');

  const total = PREGUNTAS.length;
  const respondidas = PREGUNTAS.filter(p => RESPUESTAS[p.id] === 'Sí' || RESPUESTAS[p.id] === 'No').length;

  if (respondidas < total) {
    mensaje.textContent = `Todavía faltan ${total - respondidas} preguntas por responder.`;
    mensaje.classList.add('visible');
    return;
  }

  const btn = document.getElementById('btnFinalizar');
  btn.disabled = true;
  btn.textContent = 'Calculando score...';

  try {
    const res = await apiPost('finalizarAuditoria', { auditoriaId: ID_AUDITORIA });
    if (res.ok) {
      window.location.href = `resultado.html?id=${encodeURIComponent(ID_AUDITORIA)}`;
    } else {
      mensaje.textContent = res.error || 'No se pudo finalizar la auditoría.';
      mensaje.classList.add('visible');
    }
  } catch (err) {
    mensaje.textContent = 'No se pudo conectar con el servidor. Probá de nuevo.';
    mensaje.classList.add('visible');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Finalizar auditoría y calcular score';
  }
});
