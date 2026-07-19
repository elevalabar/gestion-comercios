// ─────────────────────────────────────────────
// AUDITORIA — completar preguntas dinámicamente por área
//
// Rediseño de frontend (UX/visual únicamente): la lógica de datos,
// guardado (autosave por pregunta) y cálculo de score NO cambió —
// mismos endpoints, mismos payloads, mismos nombres de campo que
// espera el backend. Lo que cambió es cómo se arma el DOM: en vez de
// un único template string gigante, cada pieza tiene su propia función
// (renderHeader/renderArea/renderPregunta) para que sea más fácil de
// tocar a futuro.
// ─────────────────────────────────────────────

const ICONOS_AREA = {
  Google:   '⭐',
  Web:      '🌐',
  WhatsApp: '📱',
  Redes:    '📷',
  Catalogo: '📖',
  Branding: '🎨'
};

// Orden fijo de visualización (mismo criterio que AREAS en Code.gs), para
// que las áreas siempre aparezcan en el mismo lugar sin importar el orden
// en que vengan las preguntas desde el backend. Cualquier área que no esté
// en esta lista igual se muestra, al final.
const ORDEN_AREAS = ['Google', 'Web', 'WhatsApp', 'Redes', 'Catalogo', 'Branding'];

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
  document.getElementById('nombreComercio').textContent = 'Auditoría no especificada';
} else {
  init();
}

async function init() {
  const auditoria = await apiGet('getAuditoria', { id: ID_AUDITORIA });
  if (!auditoria || auditoria.error) {
    document.getElementById('nombreComercio').textContent = 'No se encontró la auditoría';
    return;
  }

  ID_COMERCIO = auditoria['ID Comercio'];
  RESPUESTAS = auditoria.respuestas || {};

  if (auditoria['Estado'] === 'Finalizada') {
    window.location.href = `resultado.html?id=${encodeURIComponent(ID_AUDITORIA)}`;
    return;
  }

  const comercio = await apiGet('getComercio', { id: ID_COMERCIO });
  renderHeader(comercio);

  PREGUNTAS = await apiGet('getPreguntas', { rubro: comercio ? comercio.Rubro : '' });
  pintarPreguntas();
  actualizarAvance();
}

// ─────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────

function renderHeader(comercio) {
  document.getElementById('nombreComercio').textContent = comercio && comercio.Nombre ? comercio.Nombre : '';
  document.getElementById('rubroComercio').textContent = comercio && comercio.Rubro ? comercio.Rubro : '';
}

function renderPregunta(p) {
  const id = p['ID Pregunta'];
  const respuesta = RESPUESTAS[id] || '';
  return `
    <div class="pregunta-row" data-pregunta-id="${id}">
      <span class="pregunta-texto">${p['Texto']}</span>
      <span class="guardado-check">✔ Guardado</span>
      <div class="segmented" role="group" aria-label="${p['Texto']}">
        <button type="button" class="seg-btn seg-si ${respuesta === 'Sí' ? 'activo' : ''}" data-valor="Sí">Sí</button>
        <button type="button" class="seg-btn seg-no ${respuesta === 'No' ? 'activo' : ''}" data-valor="No">No</button>
      </div>
    </div>
  `;
}

function renderArea(area, preguntas) {
  const respondidas = preguntas.filter(p => RESPUESTAS[p['ID Pregunta']] === 'Sí' || RESPUESTAS[p['ID Pregunta']] === 'No').length;
  return `
    <div class="card area-card" data-area="${area}">
      <div class="area-card-header">
        <span class="area-icon">${ICONOS_AREA[area] || '📋'}</span>
        <h3>${area}</h3>
        <span class="area-contador" data-area-contador="${area}">${respondidas}/${preguntas.length}</span>
      </div>
      <div class="pregunta-list">
        ${preguntas.map(renderPregunta).join('')}
      </div>
    </div>
  `;
}

function pintarPreguntas() {
  const porArea = {};
  PREGUNTAS.forEach(p => {
    const area = p['Area'];
    if (!porArea[area]) porArea[area] = [];
    porArea[area].push(p);
  });

  const areasOrdenadas = [
    ...ORDEN_AREAS.filter(a => porArea[a]),
    ...Object.keys(porArea).filter(a => ORDEN_AREAS.indexOf(a) === -1)
  ];

  const contenedor = document.getElementById('areas');
  contenedor.innerHTML = areasOrdenadas.map(area => renderArea(area, porArea[area])).join('');

  document.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', onCambiarRespuesta);
  });
}

// ─────────────────────────────────────────────
// GUARDADO (autosave por pregunta — sin cambios de backend)
// ─────────────────────────────────────────────

async function onCambiarRespuesta(e) {
  const boton = e.currentTarget;
  const fila = boton.closest('.pregunta-row');
  const preguntaId = fila.dataset.preguntaId;
  const valorClickeado = boton.dataset.valor;

  // Click sobre el botón ya activo = deshacer la respuesta (vuelve a "sin
  // responder"), mismo comportamiento que daba la opción "Sin responder"
  // del <select> original — sin agregar un tercer botón visible.
  const respuesta = RESPUESTAS[preguntaId] === valorClickeado ? '' : valorClickeado;
  RESPUESTAS[preguntaId] = respuesta;

  pintarEstadoPregunta(fila, respuesta);
  actualizarAvance();

  const botonesFila = fila.querySelectorAll('.seg-btn');
  botonesFila.forEach(b => b.disabled = true);

  try {
    await apiPost('guardarRespuesta', { idAuditoria: ID_AUDITORIA, idPregunta: preguntaId, respuesta });
    mostrarGuardado(fila);
  } catch (err) {
    // el guardado falló pero dejamos el valor elegido en pantalla;
    // el usuario puede reintentar clickeando de nuevo
  } finally {
    botonesFila.forEach(b => b.disabled = false);
  }
}

function pintarEstadoPregunta(fila, respuesta) {
  fila.querySelector('.seg-si').classList.toggle('activo', respuesta === 'Sí');
  fila.querySelector('.seg-no').classList.toggle('activo', respuesta === 'No');
}

function mostrarGuardado(fila) {
  const check = fila.querySelector('.guardado-check');
  check.classList.add('visible');
  clearTimeout(check._timeoutId);
  check._timeoutId = setTimeout(() => check.classList.remove('visible'), 1000);
}

// ─────────────────────────────────────────────
// PROGRESO
// ─────────────────────────────────────────────

function actualizarAvance() {
  const total = PREGUNTAS.length;
  const respondidas = PREGUNTAS.filter(p => RESPUESTAS[p['ID Pregunta']] === 'Sí' || RESPUESTAS[p['ID Pregunta']] === 'No').length;
  const pct = total > 0 ? Math.round((respondidas / total) * 100) : 0;

  document.getElementById('relleno').style.width = pct + '%';
  document.getElementById('textoAvance').textContent = `${respondidas} de ${total} respuestas`;
  document.getElementById('textoPorcentaje').textContent = `${pct}% completado`;

  // Contador por área (header de cada card)
  const porArea = {};
  PREGUNTAS.forEach(p => {
    const area = p['Area'];
    if (!porArea[area]) porArea[area] = [];
    porArea[area].push(p);
  });
  Object.keys(porArea).forEach(area => {
    const el = document.querySelector(`[data-area-contador="${area}"]`);
    if (!el) return;
    const resp = porArea[area].filter(p => RESPUESTAS[p['ID Pregunta']] === 'Sí' || RESPUESTAS[p['ID Pregunta']] === 'No').length;
    el.textContent = `${resp}/${porArea[area].length}`;
  });
}

document.getElementById('btnFinalizar').addEventListener('click', async () => {
  const mensaje = document.getElementById('mensaje');
  mensaje.classList.remove('visible');

  const total = PREGUNTAS.length;
  const respondidas = PREGUNTAS.filter(p => RESPUESTAS[p['ID Pregunta']] === 'Sí' || RESPUESTAS[p['ID Pregunta']] === 'No').length;

  if (respondidas < total) {
    mensaje.textContent = `Todavía faltan ${total - respondidas} preguntas por responder.`;
    mensaje.classList.add('visible');
    return;
  }

  const btn = document.getElementById('btnFinalizar');
  btn.disabled = true;
  btn.textContent = 'Calculando score...';

  try {
    const res = await apiPost('finalizarAuditoria', { idAuditoria: ID_AUDITORIA });
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
