// ─────────────────────────────────────────────
// DIAGNÓSTICO — motor de formularios público.
// Las preguntas NO están acá: vienen de getDiagnosticoConfig
// (que lee DiagPreguntas/DiagOpciones). Este archivo solo sabe
// renderizar tipos genéricos (unica/multiple/escala/abierta) y
// validar/enviar. Agregar una pregunta nueva no toca este código.
// ─────────────────────────────────────────────

const TIEMPO_CARGA_FORM = Date.now();

let CONFIG = null;
let BLOQUE_ACTUAL = 0;
// respuestas[idPregunta] = { tipo, idOpciones: [], valorTexto: '', textoOtro: '' }
let RESPUESTAS = {};

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

// ---------- Render ----------

function renderBloque() {
  const bloque = CONFIG.bloques[BLOQUE_ACTUAL];
  const totalBloques = CONFIG.bloques.length;

  document.getElementById('relleno').style.width = Math.round(((BLOQUE_ACTUAL + 1) / totalBloques) * 100) + '%';
  document.getElementById('textoAvance').textContent = `Bloque ${BLOQUE_ACTUAL + 1} de ${totalBloques} — ${bloque.nombre}`;
  document.getElementById('mensaje').classList.remove('visible');

  const preguntasVisibles = bloque.preguntas.filter(condicionSatisfecha);

  const html = `
    <h2 class="bloque-titulo">${bloque.nombre}</h2>
    ${preguntasVisibles.map(renderPregunta).join('')}
  `;
  document.getElementById('contenidoBloque').innerHTML = html;

  attachEventos(preguntasVisibles);

  document.getElementById('btnAnterior').style.visibility = BLOQUE_ACTUAL === 0 ? 'hidden' : 'visible';
  document.getElementById('btnSiguiente').textContent =
    BLOQUE_ACTUAL === totalBloques - 1 ? 'Enviar diagnóstico ✓' : 'Siguiente →';
}

function renderPregunta(p) {
  const r = getRespuesta(p.id);

  if (p.tipo === 'abierta') {
    return `
      <div class="pregunta" data-pregunta="${p.id}">
        <p class="pregunta-texto">${p.texto}</p>
        <input type="text" data-input-texto="${p.id}" value="${escapeAttr(r.valorTexto)}" placeholder="Escribí acá...">
      </div>`;
  }

  if (p.tipo === 'escala') {
    return `
      <div class="pregunta" data-pregunta="${p.id}">
        <p class="pregunta-texto">${p.texto}</p>
        <div class="opciones escala-opciones">
          ${[1, 2, 3, 4, 5].map(n => `
            <button type="button" class="opcion-btn ${r.valorTexto === String(n) ? 'seleccionada' : ''}"
              data-escala="${p.id}" data-valor="${n}">${n}</button>
          `).join('')}
        </div>
      </div>`;
  }

  // unica / multiple
  const maxSel = p.maxSelecciones ? Number(p.maxSelecciones) : null;
  const contador = p.tipo === 'multiple' && maxSel ? `<span class="pregunta-contador"> (elegí hasta ${maxSel} — ${r.idOpciones.length}/${maxSel})</span>` : '';
  const limiteAlcanzado = p.tipo === 'multiple' && maxSel && r.idOpciones.length >= maxSel;

  const opcionesHtml = p.opciones.map(o => {
    const seleccionada = r.idOpciones.indexOf(o.id) !== -1;
    const deshabilitada = p.tipo === 'multiple' && limiteAlcanzado && !seleccionada;
    return `
      <button type="button" class="opcion-btn ${seleccionada ? 'seleccionada' : ''}"
        data-opcion="${p.id}" data-opcion-id="${o.id}" data-es-otro="${o.esOtro ? '1' : '0'}"
        ${deshabilitada ? 'disabled' : ''}>${o.texto}</button>`;
  }).join('');

  const otroSeleccionado = p.opciones.some(o => o.esOtro && r.idOpciones.indexOf(o.id) !== -1);
  const otroHtml = otroSeleccionado ? `
    <div class="otro-texto">
      <input type="text" data-input-otro="${p.id}" value="${escapeAttr(r.textoOtro)}" placeholder="Contanos cuál...">
    </div>` : '';

  return `
    <div class="pregunta" data-pregunta="${p.id}">
      <p class="pregunta-texto">${p.texto}${contador}</p>
      <div class="opciones">${opcionesHtml}</div>
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
