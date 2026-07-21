// ─────────────────────────────────────────────
// DIAGNÓSTICO — motor de formularios público.
// Las preguntas NO están acá: vienen de getDiagnosticoConfig
// (que lee DiagPreguntas/DiagOpciones). Este archivo solo sabe
// renderizar tipos genéricos (unica/multiple/escala/abierta) y
// validar/enviar. Agregar una pregunta nueva no toca este código.
//
// Rediseño visual (sidebar + cards): solo cambia CÓMO se pinta el
// wizard. La lógica de datos/validación/envío es la misma de antes
// función por función (compilarRespuestas, validarBloqueActual,
// enviarDiagnostico, etc. sin tocar).
// ─────────────────────────────────────────────

const TIEMPO_CARGA_FORM = Date.now();

let CONFIG = null;
let BLOQUE_ACTUAL = 0;
// respuestas[idPregunta] = { tipo, idOpciones: [], valorTexto: '', textoOtro: '' }
let RESPUESTAS = {};

// Paleta cíclica para el ícono de cada card de pregunta, asignada por
// bloque (todas las preguntas de un mismo bloque comparten color) —
// mismo criterio que el color por área ya usado en Auditoría/Inspección,
// pero acá no hay iconografía por tema porque el catálogo no trae ese
// dato: se cicla un color por posición de bloque, así funciona con
// cualquier catálogo sin tocar código si se agregan bloques nuevos.
const PALETA_BLOQUES = ['#4b8ef0', '#8b6ef0', '#1d9e75', '#e39a6b', '#e06b9b', '#3fb8c9'];

document.getElementById('btnEmpezar').addEventListener('click', empezar);
document.getElementById('btnAnterior').addEventListener('click', () => cambiarBloque(-1));
document.getElementById('btnSiguiente').addEventListener('click', onSiguiente);

async function empezar() {
  document.getElementById('intro').classList.add('oculto');
  document.getElementById('cargando').classList.remove('oculto');

  try {
    CONFIG = await apiGet('getDiagnosticoConfig', {});
    if (!CONFIG || !CONFIG.bloques || !CONFIG.bloques.length) {
      mostrarErrorCarga();
      return;
    }
  } catch (err) {
    mostrarErrorCarga();
    return;
  }

  document.getElementById('cargando').classList.add('oculto');
  document.getElementById('wizard').classList.remove('oculto');
  renderSidebarBloques();
  renderBloque();
}

function mostrarErrorCarga() {
  document.getElementById('cargando').innerHTML =
    '<p class="muted" style="text-align:center; margin-top:40px;">No se pudo cargar el diagnóstico. Recargá la página para reintentar.</p>';
}

// ---------- Helpers de estado ----------

function getRespuesta(idPregunta) {
  if (!RESPUESTAS[idPregunta]) {
    RESPUESTAS[idPregunta] = { idOpciones: [], valorTexto: '', textoOtro: '' };
  }
  return RESPUESTAS[idPregunta];
}

function condicionSatisfecha(pregunta) {
  if (!pregunta.condicionalDe) return true;
  const padre = RESPUESTAS[pregunta.condicionalDe];
  return !!(padre && padre.idOpciones.indexOf(pregunta.condicionalValorOpcion) !== -1);
}

// ---------- Sidebar / progreso (solo visual, no persiste) ----------

function renderSidebarBloques() {
  const nav = document.getElementById('sidebarBloques');
  nav.innerHTML = CONFIG.bloques.map((bloque, i) => {
    const estado = i < BLOQUE_ACTUAL ? 'completado' : i === BLOQUE_ACTUAL ? 'actual' : 'pendiente';
    const marca = estado === 'completado' ? '✔' : (i + 1);
    return `<div class="item-bloque ${estado}"><span class="marca">${marca}</span><span>${bloque.nombre}</span></div>`;
  }).join('');
}

function actualizarProgreso() {
  const total = CONFIG.bloques.length;
  const pct = Math.round(((BLOQUE_ACTUAL + 1) / total) * 100);
  document.getElementById('relleno').style.width = pct + '%';
  document.getElementById('rellenoMobile').style.width = pct + '%';
  document.getElementById('progresoTexto').textContent = `${pct}% completado`;
}

// ---------- Render ----------

function renderBloque() {
  const bloque = CONFIG.bloques[BLOQUE_ACTUAL];
  const totalBloques = CONFIG.bloques.length;

  actualizarProgreso();
  renderSidebarBloques();
  document.getElementById('tituloBloque').textContent = bloque.nombre;
  document.getElementById('mensaje').classList.remove('visible');

  const colorBloque = PALETA_BLOQUES[BLOQUE_ACTUAL % PALETA_BLOQUES.length];
  const preguntasVisibles = bloque.preguntas.filter(condicionSatisfecha);

  document.getElementById('contenidoBloque').innerHTML =
    preguntasVisibles.map(p => renderPregunta(p, colorBloque)).join('');

  attachEventos(preguntasVisibles);

  document.getElementById('btnAnterior').style.visibility = BLOQUE_ACTUAL === 0 ? 'hidden' : 'visible';
  document.getElementById('btnSiguiente').textContent =
    BLOQUE_ACTUAL === totalBloques - 1 ? 'Enviar diagnóstico ✓' : 'Siguiente →';
}

function iconoCard(color) {
  return `<span class="pregunta-icono" style="background:${color}">?</span>`;
}

function renderPregunta(p, colorBloque) {
  const r = getRespuesta(p.id);

  if (p.tipo === 'abierta') {
    return `
      <div class="pregunta-card" data-pregunta="${p.id}">
        <div class="pregunta-card-cabecera">
          ${iconoCard(colorBloque)}
          <p class="pregunta-texto">${p.texto}</p>
        </div>
        <input type="text" data-input-texto="${p.id}" value="${escapeAttr(r.valorTexto)}" placeholder="Escribí acá...">
      </div>`;
  }

  if (p.tipo === 'escala') {
    return `
      <div class="pregunta-card" data-pregunta="${p.id}">
        <div class="pregunta-card-cabecera">
          ${iconoCard(colorBloque)}
          <p class="pregunta-texto">${p.texto}</p>
        </div>
        <div class="opciones-cards escala-opciones">
          ${[1, 2, 3, 4, 5].map(n => `
            <button type="button" class="opcion-card ${r.valorTexto === String(n) ? 'seleccionada' : ''}"
              data-escala="${p.id}" data-valor="${n}">${n}</button>
          `).join('')}
        </div>
      </div>`;
  }

  // unica / multiple
  const maxSel = p.maxSelecciones ? Number(p.maxSelecciones) : null;
  const contador = p.tipo === 'multiple' && maxSel ? `<span class="pregunta-contador">Elegí hasta ${maxSel} — ${r.idOpciones.length}/${maxSel}</span>` : '';
  const limiteAlcanzado = p.tipo === 'multiple' && maxSel && r.idOpciones.length >= maxSel;

  const opcionesHtml = p.opciones.map(o => {
    const seleccionada = r.idOpciones.indexOf(o.id) !== -1;
    const deshabilitada = p.tipo === 'multiple' && limiteAlcanzado && !seleccionada;
    return `
      <button type="button" class="opcion-card ${seleccionada ? 'seleccionada' : ''}"
        data-opcion="${p.id}" data-opcion-id="${o.id}" data-es-otro="${o.esOtro ? '1' : '0'}"
        ${deshabilitada ? 'disabled' : ''}>
        <span class="check">${seleccionada ? '✓' : ''}</span>
        <span>${o.texto}</span>
      </button>`;
  }).join('');

  const otroSeleccionado = p.opciones.some(o => o.esOtro && r.idOpciones.indexOf(o.id) !== -1);
  const otroHtml = otroSeleccionado ? `
    <div class="otro-texto">
      <input type="text" data-input-otro="${p.id}" value="${escapeAttr(r.textoOtro)}" placeholder="Contanos cuál...">
    </div>` : '';

  return `
    <div class="pregunta-card" data-pregunta="${p.id}">
      <div class="pregunta-card-cabecera">
        ${iconoCard(colorBloque)}
        <p class="pregunta-texto">${p.texto}${contador}</p>
      </div>
      <div class="opciones-cards tipo-${p.tipo}">${opcionesHtml}</div>
      ${otroHtml}
    </div>`;
}

function escapeAttr(str) {
  return String(str || '').replace(/"/g, '&quot;');
}

// ---------- Eventos ----------

function attachEventos(preguntas) {
  const mapaPreguntas = {};
  preguntas.forEach(p => { mapaPreguntas[p.id] = p; });

  document.querySelectorAll('[data-opcion]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idPregunta = btn.dataset.opcion;
      const idOpcion = btn.dataset.opcionId;
      const pregunta = mapaPreguntas[idPregunta];
      const r = getRespuesta(idPregunta);

      if (pregunta.tipo === 'unica') {
        r.idOpciones = [idOpcion];
        if (btn.dataset.esOtro !== '1') r.textoOtro = '';
      } else {
        const idx = r.idOpciones.indexOf(idOpcion);
        const maxSel = pregunta.maxSelecciones ? Number(pregunta.maxSelecciones) : null;
        if (idx !== -1) {
          r.idOpciones.splice(idx, 1);
        } else {
          if (maxSel && r.idOpciones.length >= maxSel) return;
          r.idOpciones.push(idOpcion);
        }
      }
      renderBloque();
    });
  });

  document.querySelectorAll('[data-escala]').forEach(btn => {
    btn.addEventListener('click', () => {
      getRespuesta(btn.dataset.escala).valorTexto = btn.dataset.valor;
      renderBloque();
    });
  });

  document.querySelectorAll('[data-input-texto]').forEach(input => {
    input.addEventListener('input', () => {
      getRespuesta(input.dataset.inputTexto).valorTexto = input.value;
    });
  });

  document.querySelectorAll('[data-input-otro]').forEach(input => {
    input.addEventListener('input', () => {
      getRespuesta(input.dataset.inputOtro).textoOtro = input.value;
    });
  });
}

// ---------- Navegación ----------

function validarBloqueActual() {
  const bloque = CONFIG.bloques[BLOQUE_ACTUAL];
  const preguntasVisibles = bloque.preguntas.filter(condicionSatisfecha);

  for (const p of preguntasVisibles) {
    if (!p.obligatoria) continue;
    const r = getRespuesta(p.id);
    const sinResponder =
      (p.tipo === 'abierta' && !r.valorTexto.trim()) ||
      (p.tipo === 'escala' && !r.valorTexto) ||
      ((p.tipo === 'unica' || p.tipo === 'multiple') && r.idOpciones.length === 0);
    if (sinResponder) {
      const mensaje = document.getElementById('mensaje');
      mensaje.textContent = 'Faltan algunas respuestas antes de seguir.';
      mensaje.classList.add('visible');
      return false;
    }
  }
  return true;
}

function cambiarBloque(delta) {
  BLOQUE_ACTUAL += delta;
  renderBloque();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function onSiguiente() {
  if (!validarBloqueActual()) return;

  const esUltimo = BLOQUE_ACTUAL === CONFIG.bloques.length - 1;
  if (esUltimo) {
    enviarDiagnostico();
  } else {
    cambiarBloque(1);
  }
}

// ---------- Envío ----------

function detectarDispositivo() {
  const ua = navigator.userAgent;
  if (/Mobi|Android/i.test(ua)) return 'Móvil';
  if (/Tablet|iPad/i.test(ua)) return 'Tablet';
  return 'PC';
}

function detectarNavegador() {
  const ua = navigator.userAgent;
  if (ua.indexOf('Edg') !== -1) return 'Edge';
  if (ua.indexOf('Chrome') !== -1) return 'Chrome';
  if (ua.indexOf('Firefox') !== -1) return 'Firefox';
  if (ua.indexOf('Safari') !== -1) return 'Safari';
  return 'Otro';
}

function compilarRespuestas() {
  const salida = [];
  Object.keys(RESPUESTAS).forEach(idPregunta => {
    const r = RESPUESTAS[idPregunta];

    if (r.valorTexto && r.idOpciones.length === 0) {
      // abierta o escala
      salida.push({ idPregunta, idOpcion: '', valorTexto: r.valorTexto });
      return;
    }

    r.idOpciones.forEach(idOpcion => {
      const esEstaLaOtro = r.textoOtro && esOpcionOtro(idPregunta, idOpcion);
      salida.push({ idPregunta, idOpcion, valorTexto: esEstaLaOtro ? r.textoOtro : '' });
    });
  });
  return salida;
}

function esOpcionOtro(idPregunta, idOpcion) {
  for (const bloque of CONFIG.bloques) {
    for (const p of bloque.preguntas) {
      if (p.id !== idPregunta) continue;
      const opcion = p.opciones.find(o => o.id === idOpcion);
      return !!(opcion && opcion.esOtro);
    }
  }
  return false;
}

async function enviarDiagnostico() {
  const btn = document.getElementById('btnSiguiente');
  btn.disabled = true;
  btn.textContent = 'Enviando...';

  const payload = {
    version: CONFIG.version,
    tiempoSegundos: Math.round((Date.now() - TIEMPO_CARGA_FORM) / 1000),
    tiempoCargaForm: TIEMPO_CARGA_FORM,
    dispositivo: detectarDispositivo(),
    navegador: detectarNavegador(),
    completado: true,
    campoVerificacion: document.getElementById('campoVerif').value,
    respuestas: compilarRespuestas()
  };

  try {
    const res = await apiPost('guardarEnvioDiagnostico', payload);
    if (res.ok) {
      const q = new URLSearchParams();
      Object.keys(res.puntajes || {}).forEach(cat => q.set(cat, res.puntajes[cat]));
      if (res.nivelUrgencia) q.set('NivelUrgencia', res.nivelUrgencia);
      window.location.href = `resultado.html?${q.toString()}`;
    } else {
      mostrarErrorEnvio(res.error);
    }
  } catch (err) {
    mostrarErrorEnvio();
  } finally {
    btn.disabled = false;
    btn.textContent = 'Enviar diagnóstico ✓';
  }
}

function mostrarErrorEnvio(texto) {
  const mensaje = document.getElementById('mensaje');
  mensaje.textContent = texto || 'No se pudo enviar el diagnóstico. Probá de nuevo.';
  mensaje.classList.add('visible');
}
