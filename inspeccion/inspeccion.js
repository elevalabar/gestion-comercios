// ─────────────────────────────────────────────
// INSPECCIÓN INICIAL — página única con las 6 secciones (Google Business,
// Sitio Web, Instagram, Facebook, Contacto, Imagen). Las preguntas NO
// están acá: vienen de getInspeccionConfig (que lee InspPreguntas/
// InspOpciones). Agregar/editar una pregunta no toca este archivo.
//
// Rediseño de frontend (UX/visual, mismo criterio que auditoria.js): la
// lógica de datos, guardado (autosave por pregunta) y armado del análisis
// NO cambió — mismos endpoints, mismos payloads. Cada pregunta acá puede
// tener entre 2 y 4 opciones (no es Sí/No binario como Auditoría), así que
// en vez de un segmented de 2 mitades, cada opción se pinta en un punto de
// un gradiente rojo→verde según su posición (Orden) — la peor opción
// siempre roja, la mejor siempre verde, mismo lenguaje visual que
// Auditoría adaptado a N opciones.
//
// Categoría + condicionalidad (jul 2026): getInspeccionConfig ahora
// recibe idComercio y filtra el cuestionario por la Categoria del
// comercio (antes era el mismo cuestionario global para todos). Además,
// cada pregunta puede traer condicionalDe/condicionalValorOpcion — solo
// se muestra, cuenta y exige si la pregunta de la que depende ya fue
// respondida con el valor esperado (esPreguntaAplicable, en
// assets/js/condicional.js, mismo criterio que usa el backend al
// calcular el score). Sin nada cargado en esas columnas, el
// comportamiento es idéntico al de antes.
// ─────────────────────────────────────────────

const ICONOS_BLOQUE = {
  'Google Business': '⭐',
  'Sitio Web':        '🌐',
  'Instagram':         '📸',
  'Facebook':          '📘',
  'Contacto':          '📞',
  'Imagen':            '🖼️'
};

const params = new URLSearchParams(window.location.search);
const ID_INSPECCION = params.get('id');

let CONFIG = null;
let ID_COMERCIO = null;
let RESPUESTAS = {}; // { idPregunta: idOpcion }

if (!ID_INSPECCION) {
  document.getElementById('nombreComercio').textContent = 'Inspección no especificada';
} else {
  init();
}

async function init() {
  const insp = await apiGet('getInspeccion', { id: ID_INSPECCION });
  if (!insp || insp.error) {
    document.getElementById('nombreComercio').textContent = 'No se encontró la inspección';
    return;
  }

  ID_COMERCIO = insp.idComercio;
  RESPUESTAS = insp.respuestas || {};

  if (insp.estado === 'Finalizada') {
    window.location.href = `resultado.html?id=${encodeURIComponent(ID_INSPECCION)}`;
    return;
  }

  const comercio = await apiGet('getComercio', { id: ID_COMERCIO });
  document.getElementById('nombreComercio').textContent = comercio && comercio.Nombre ? comercio.Nombre : '';

  CONFIG = await apiGet('getInspeccionConfig', { idComercio: ID_COMERCIO });
  if (!CONFIG || !CONFIG.bloques) {
    document.getElementById('bloques').innerHTML = '<p class="muted">No se pudo cargar el cuestionario. Recargá la página para reintentar.</p>';
    return;
  }

  pintarBloques();
  actualizarAvance();
}

// ─────────────────────────────────────────────
// CONDICIONALIDAD
// ─────────────────────────────────────────────

// Todas las preguntas de CONFIG.bloques, en una sola lista plana.
function todasLasPreguntas() {
  return CONFIG ? CONFIG.bloques.flatMap(b => b.preguntas) : [];
}

// Subconjunto que aplica según las respuestas actuales — es lo que hay
// que mostrar, contar y exigir en cada momento (no todasLasPreguntas()).
function soloAplicables(lista) {
  return lista.filter(p => esPreguntaAplicable(p.condicionalDe, p.condicionalValorOpcion, RESPUESTAS));
}

// ─────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────

// Color de una opción según su posición dentro de la pregunta: interpola
// de rojo (peor) a verde (mejor) en la rueda de color (hue 0 -> 140).
// Con 2 opciones da exactamente rojo/verde, igual que Sí/No en Auditoría.
function colorOpcion(idx, total) {
  const hue = total > 1 ? Math.round((idx / (total - 1)) * 140) : 90;
  return `hsl(${hue}, 55%, 42%)`;
}

function renderOpcion(p, o, idx, total) {
  const activa = RESPUESTAS[p.id] === o.id;
  const estilo = activa ? ` style="background:${colorOpcion(idx, total)};border-color:${colorOpcion(idx, total)}"` : '';
  return `
    <button type="button" class="opcion-btn ${activa ? 'seleccionada' : ''}"${estilo}
      data-pregunta="${p.id}" data-opcion-id="${o.id}">${o.texto}</button>
  `;
}

function renderPregunta(p) {
  const opcionesHtml = p.opciones.map((o, idx) => renderOpcion(p, o, idx, p.opciones.length)).join('');
  return `
    <div class="pregunta-row" data-pregunta="${p.id}">
      <div class="pregunta-cabecera">
        <span class="pregunta-texto">${p.texto}</span>
        <span class="guardado-check">✔ Guardado</span>
      </div>
      <div class="opciones">${opcionesHtml}</div>
    </div>
  `;
}

function renderBloque(nombreBloque, preguntas) {
  const respondidas = preguntas.filter(p => RESPUESTAS[p.id]).length;
  return `
    <div class="card bloque-card" data-bloque="${nombreBloque}">
      <div class="bloque-card-header">
        <span class="bloque-icon">${ICONOS_BLOQUE[nombreBloque] || '📋'}</span>
        <h3>${nombreBloque}</h3>
        <span class="bloque-contador" data-bloque-contador="${nombreBloque}">${respondidas}/${preguntas.length}</span>
      </div>
      <div class="pregunta-list">
        ${preguntas.map(renderPregunta).join('')}
      </div>
    </div>
  `;
}

// Se vuelve a llamar completa cada vez que cambia una respuesta: una
// pregunta puerta (¿Tiene sitio web? / ¿Tiene Instagram? / etc.) puede
// hacer aparecer o desaparecer sus dependientes. Un bloque cuyas
// preguntas queden todas no-aplicables directamente no se pinta (en la
// práctica no debería pasar, porque la pregunta puerta de cada bloque no
// depende de nada y siempre queda visible).
function pintarBloques() {
  const contenedor = document.getElementById('bloques');
  contenedor.innerHTML = CONFIG.bloques
    .map(bloque => ({ nombre: bloque.nombre, preguntas: soloAplicables(bloque.preguntas) }))
    .filter(bloque => bloque.preguntas.length > 0)
    .map(bloque => renderBloque(bloque.nombre, bloque.preguntas))
    .join('');

  document.querySelectorAll('[data-opcion-id]').forEach(btn => {
    btn.addEventListener('click', onElegirOpcion);
  });
}

// ─────────────────────────────────────────────
// GUARDADO (autosave por pregunta — sin cambios de backend)
// ─────────────────────────────────────────────

async function onElegirOpcion(e) {
  const boton = e.currentTarget;
  const idPregunta = boton.closest('.pregunta-row').dataset.pregunta;
  const idOpcion = boton.dataset.opcionId;

  RESPUESTAS[idPregunta] = idOpcion;

  // Repintar puede hacer aparecer/desaparecer preguntas dependientes de
  // esta — se preserva el scroll para no desorientar al usuario.
  const scrollY = window.scrollY;
  pintarBloques();
  window.scrollTo(0, scrollY);
  actualizarAvance();

  const fila = document.querySelector(`.pregunta-row[data-pregunta="${idPregunta}"]`);
  const botonesFila = fila ? fila.querySelectorAll('.opcion-btn') : [];
  botonesFila.forEach(b => b.disabled = true);

  try {
    await apiPost('guardarRespuestaInspeccion', { idInspeccion: ID_INSPECCION, idPregunta, idOpcion });
    if (fila) mostrarGuardado(fila);
  } catch (err) {
    // el guardado falló pero el valor queda elegido en pantalla; el usuario
    // puede reintentar tocando la opción de nuevo
  } finally {
    botonesFila.forEach(b => b.disabled = false);
  }
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
  if (!CONFIG) return;

  const aplicables = soloAplicables(todasLasPreguntas());
  const total = aplicables.length;
  const respondidas = aplicables.filter(p => RESPUESTAS[p.id]).length;
  const pct = total > 0 ? Math.round((respondidas / total) * 100) : 0;

  document.getElementById('relleno').style.width = pct + '%';
  document.getElementById('textoAvance').textContent = `${respondidas} de ${total} respondidas`;
  document.getElementById('textoPorcentaje').textContent = `${pct}% completado`;

  CONFIG.bloques.forEach(bloque => {
    const el = document.querySelector(`[data-bloque-contador="${bloque.nombre}"]`);
    if (!el) return;
    const preguntasBloque = soloAplicables(bloque.preguntas);
    const resp = preguntasBloque.filter(p => RESPUESTAS[p.id]).length;
    el.textContent = `${resp}/${preguntasBloque.length}`;
  });
}

document.getElementById('btnGenerar').addEventListener('click', async () => {
  const mensaje = document.getElementById('mensaje');
  mensaje.classList.remove('visible');

  const aplicables = soloAplicables(todasLasPreguntas());
  const total = aplicables.length;
  const respondidas = aplicables.filter(p => RESPUESTAS[p.id]).length;

  if (respondidas < total) {
    mensaje.textContent = `Todavía faltan ${total - respondidas} preguntas por responder.`;
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
