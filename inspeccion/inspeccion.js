// ─────────────────────────────────────────────
// INSPECCIÓN INICIAL — página única con las 6 secciones (Google Business,
// Sitio Web, Instagram, Facebook, Contacto, Imagen). Las preguntas NO
// están acá: vienen de getInspeccionConfig (que lee InspPreguntas/
// InspOpciones). Agregar/editar una pregunta no toca este archivo.
// ─────────────────────────────────────────────

const params = new URLSearchParams(window.location.search);
const ID_INSPECCION = params.get('id');

let CONFIG = null;
let ID_COMERCIO = null;
let RESPUESTAS = {}; // { idPregunta: idOpcion }
let TOTAL_PREGUNTAS = 0;

if (!ID_INSPECCION) {
  document.getElementById('tituloComercio').textContent = 'Inspección no especificada';
} else {
  init();
}

async function init() {
  const insp = await apiGet('getInspeccion', { id: ID_INSPECCION });
  if (!insp || insp.error) {
    document.getElementById('tituloComercio').textContent = 'No se encontró la inspección';
    return;
  }

  ID_COMERCIO = insp.idComercio;
  RESPUESTAS = insp.respuestas || {};

  if (insp.estado === 'Finalizada') {
    window.location.href = `resultado.html?id=${encodeURIComponent(ID_INSPECCION)}`;
    return;
  }

  const comercio = await apiGet('getComercio', { id: ID_COMERCIO });
  document.getElementById('tituloComercio').textContent =
    `Inspección Inicial · ${comercio && comercio.Nombre ? comercio.Nombre : ''}`;

  CONFIG = await apiGet('getInspeccionConfig', {});
  if (!CONFIG || !CONFIG.bloques) {
    document.getElementById('bloques').innerHTML = '<p class="muted">No se pudo cargar el cuestionario. Recargá la página para reintentar.</p>';
    return;
  }

  TOTAL_PREGUNTAS = CONFIG.bloques.reduce((acc, b) => acc + b.preguntas.length, 0);
  pintarBloques();
  actualizarAvance();
}

function pintarBloques() {
  const contenedor = document.getElementById('bloques');
  contenedor.innerHTML = CONFIG.bloques.map(bloque => `
    <div class="card bloque">
      <h3>${bloque.nombre}</h3>
      ${bloque.preguntas.map(renderPregunta).join('')}
    </div>
  `).join('');

  document.querySelectorAll('[data-opcion]').forEach(btn => {
    btn.addEventListener('click', onElegirOpcion);
  });
}

function renderPregunta(p) {
  const idOpcionElegida = RESPUESTAS[p.id];
  const opcionesHtml = p.opciones.map(o => `
    <button type="button" class="opcion-btn ${idOpcionElegida === o.id ? 'seleccionada' : ''}"
      data-opcion="${p.id}" data-opcion-id="${o.id}">${o.texto}</button>
  `).join('');

  return `
    <div class="pregunta" data-pregunta="${p.id}">
      <p class="pregunta-texto">${p.texto}</p>
      <div class="opciones">${opcionesHtml}</div>
    </div>`;
}

async function onElegirOpcion(e) {
  const idPregunta = e.target.dataset.opcion;
  const idOpcion = e.target.dataset.opcionId;

  RESPUESTAS[idPregunta] = idOpcion;

  // Repinta solo los botones de esa pregunta (evita perder el scroll)
  document.querySelectorAll(`[data-pregunta="${idPregunta}"] .opcion-btn`).forEach(btn => {
    btn.classList.toggle('seleccionada', btn.dataset.opcionId === idOpcion);
  });

  actualizarAvance();

  try {
    await apiPost('guardarRespuestaInspeccion', { idInspeccion: ID_INSPECCION, idPregunta, idOpcion });
  } catch (err) {
    // el guardado falló pero el valor queda elegido en pantalla; el usuario
    // puede reintentar tocando la opción de nuevo
  }
}

function actualizarAvance() {
  const respondidas = Object.keys(RESPUESTAS).filter(k => RESPUESTAS[k]).length;
  const pct = TOTAL_PREGUNTAS > 0 ? Math.round((respondidas / TOTAL_PREGUNTAS) * 100) : 0;
  document.getElementById('relleno').style.width = pct + '%';
  document.getElementById('textoAvance').textContent = `${respondidas} de ${TOTAL_PREGUNTAS} respondidas`;
}

document.getElementById('btnGenerar').addEventListener('click', async () => {
  const mensaje = document.getElementById('mensaje');
  mensaje.classList.remove('visible');

  const respondidas = Object.keys(RESPUESTAS).filter(k => RESPUESTAS[k]).length;
  if (respondidas < TOTAL_PREGUNTAS) {
    mensaje.textContent = `Todavía faltan ${TOTAL_PREGUNTAS - respondidas} preguntas por responder.`;
    mensaje.classList.add('visible');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  const btn = document.getElementById('btnGenerar');
  btn.disabled = true;
  btn.textContent = 'Generando análisis...';

  try {
    const res = await apiPost('finalizarInspeccion', { idInspeccion: ID_INSPECCION });
    if (res.ok) {
      window.location.href = `resultado.html?id=${encodeURIComponent(ID_INSPECCION)}`;
    } else {
      mensaje.textContent = res.error || 'No se pudo generar el análisis.';
      mensaje.classList.add('visible');
    }
  } catch (err) {
    mensaje.textContent = 'No se pudo conectar con el servidor. Probá de nuevo.';
    mensaje.classList.add('visible');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generar Análisis Inicial';
  }
});

document.getElementById('linkOmitir').addEventListener('click', async (e) => {
  e.preventDefault();
  const link = e.target;
  link.textContent = 'Guardando...';
  try {
    await apiPost('omitirInspeccion', { idInspeccion: ID_INSPECCION });
  } catch (err) {
    // si falla el guardado del estado igual dejamos avanzar al usuario;
    // la inspección queda "En curso" y se puede retomar después
  }
  window.location.href = ID_COMERCIO
    ? `../comercios/ficha.html?id=${encodeURIComponent(ID_COMERCIO)}`
    : '../comercios/index.html';
});
