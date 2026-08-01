// ─────────────────────────────────────────────
// FICHA DE COMERCIO — modo Vista (panel de control) + modo Edición
// (el form original, intacto, se abre con "Editar información").
// Reutiliza 100% de guardarComercio, subirImagen, iniciarAuditoria,
// iniciarInspeccion, eliminarAuditoria tal como ya funcionaban.
// ─────────────────────────────────────────────

const params = new URLSearchParams(window.location.search);
const ID_COMERCIO = params.get('id');

// AREAS del Eleva Score: deben coincidir EXACTO con la constante AREAS de
// Code.gs (['Google','Web','WhatsApp','Redes','Catalogo','Branding']).
// No es una lista a criterio del frontend — es la misma fuente de verdad
// que ya usa finalizarAuditoria_() para guardar 'Score <Area>'.
const AREAS_SCORE = [
  { clave: 'Google', label: 'Google' },
  { clave: 'Web', label: 'Web' },
  { clave: 'WhatsApp', label: 'WhatsApp' },
  { clave: 'Redes', label: 'Redes' },
  { clave: 'Catalogo', label: 'Catálogo' },
  { clave: 'Branding', label: 'Branding' }
];

// Mapeo de PRESENTACIÓN para el Motor de Diagnóstico. Los códigos ('GB','CC',
// 'Auditoria','Inspeccion') son la fuente de verdad tal como los guarda el
// motor (Resultado JSON en Firestore) — esto solo humaniza el texto en
// pantalla, nunca se usa para calcular ni se reescribe el dato original.
const CANALES_DIAGNOSTICO = {
  GB: 'Google Business',
  CC: 'Contacto y Conversión'
};

const GRAVEDAD_BADGE_DIAGNOSTICO = {
  Alta: 'badge-gravedad-alta',
  Media: 'badge-gravedad-media',
  Baja: 'badge-gravedad-baja'
};

const TIPO_EVALUACION_LABEL = {
  Auditoria: 'Auditoría',
  Inspeccion: 'Inspección'
};

function formatPorcentajeDiagnostico(valor) {
  if (valor === null || valor === undefined || isNaN(valor)) return '—';
  return Math.round(valor * 100) + '%';
}

let comercioActual = null;
let auditoriasActuales = [];
let inspeccionesActuales = [];
let CATEGORIAS_CACHE = null; // { idCategoria: nombre }, se carga una sola vez

async function nombreDeCategoria(idCategoria) {
  if (!idCategoria) return '';
  if (!CATEGORIAS_CACHE) {
    CATEGORIAS_CACHE = {};
    try {
      const categorias = await apiGet('getCategorias');
      if (Array.isArray(categorias)) {
        categorias.forEach(c => { CATEGORIAS_CACHE[c['ID Categoria']] = c['Nombre']; });
      }
    } catch (err) {
      // si falla, se muestra el ID tal cual en vez del nombre
    }
  }
  return CATEGORIAS_CACHE[idCategoria] || idCategoria;
}

if (!ID_COMERCIO) {
  document.getElementById('tituloComercio').textContent = 'Comercio no especificado';
} else {
  cargarTodo();
}

function formatFecha(valor) {
  if (!valor) return '-';
  const d = new Date(valor);
  if (isNaN(d.getTime())) return valor;
  return d.toLocaleDateString('es-AR');
}

// ─────────────────────────────────────────────
// CARGA PRINCIPAL
// ─────────────────────────────────────────────

async function cargarTodo() {
  // Antes esto hacía 4 llamadas separadas al backend (getComercio,
  // getAuditoriasPorComercio, getInspeccionesPorComercio, getImagenes).
  // Cada llamada a Apps Script tiene un costo fijo propio, así que 4
  // llamadas tardaban ~4 veces más que 1. Ahora es una sola ejecución
  // (getFichaCompleta) que junta todo del lado del servidor.
  const datos = await apiGet('getFichaCompleta', { idComercio: ID_COMERCIO });

  if (!datos || !datos.ok) {
    document.getElementById('tituloComercio').textContent = 'No se encontró el comercio';
    return;
  }

  const c = datos.comercio;
  const auds = datos.auditorias;
  const insps = datos.inspecciones;
  const imgs = datos.imagenes;

  comercioActual = c;
  auditoriasActuales = Array.isArray(auds) ? auds : [];
  inspeccionesActuales = Array.isArray(insps) ? insps : [];

  document.getElementById('tituloComercio').textContent = c.Nombre || 'Sin nombre';
  document.getElementById('subtituloComercio').textContent = `${c.Rubro || ''} · alta: ${formatFecha(c['Fecha de alta'])}`;

  pintarFormulario(c);
  pintarVista(c);
  pintarAuditoriasTab(auditoriasActuales);
  pintarInspeccionesTab(inspeccionesActuales);
  await pintarResumen(c, auditoriasActuales, inspeccionesActuales);

  // El frontend no recalcula nada acá: datos.diagnostico ya viene resuelto
  // por el motor (Resultado JSON tal cual está en Firestore) y
  // datos.diagnosticoError distingue "sin diagnóstico todavía" (null, sin
  // error) de "no se pudo cargar" (null + error informado).
  pintarResumenDiagnostico(datos.diagnostico, datos.diagnosticoError);
  pintarTabDiagnostico(datos.diagnostico, datos.diagnosticoError);

  pintarImagenes(Array.isArray(imgs) ? imgs : []);
  IMAGENES_ACTUALES = Array.isArray(imgs) ? imgs : [];
  cargarArchivos();
}

// ─────────────────────────────────────────────
// MODO VISTA — header del panel
// ─────────────────────────────────────────────

function calcularEstrellas(scoreGeneral) {
  if (scoreGeneral === '' || scoreGeneral === undefined || scoreGeneral === null) {
    return { cantidad: 0, label: 'Todavía sin Eleva Score' };
  }
  const s = Number(scoreGeneral);
  if (s >= 90) return { cantidad: 5, label: 'Excelente presencia digital' };
  if (s >= 75) return { cantidad: 4, label: 'Buen potencial' };
  if (s >= 60) return { cantidad: 3, label: 'Aceptable' };
  if (s >= 40) return { cantidad: 2, label: 'Muchas oportunidades' };
  return { cantidad: 1, label: 'Necesita intervención urgente' };
}

function renderEstrellas(cantidad) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    html += i <= cantidad ? '★' : '<span class="vacia">★</span>';
  }
  return html;
}

function estadoComercialClase(estado) {
  if (estado === 'Cliente') return 'badge-cliente';
  if (estado === 'Descartado') return 'badge-alta';
  if (estado === 'Contactado' || estado === 'En seguimiento') return 'badge-media';
  return 'badge-baja'; // Nuevo
}

function estadoServicioClase(valor) {
  if (valor === 'Activo') return 'badge-servicio-activo';
  if (valor === 'Pausado') return 'badge-servicio-pausado';
  if (valor === 'Finalizado') return 'badge-servicio-finalizado';
  return 'badge-sin-servicio';
}

function construirLink(tipo, valorCrudo) {
  const valor = String(valorCrudo || '').trim();
  if (!valor) return null;
  const esUrlCompleta = /^https?:\/\//i.test(valor);
  switch (tipo) {
    case 'telefono':
      return 'tel:' + valor.replace(/[^\d+]/g, '');
    case 'whatsapp': {
      const digitos = valor.replace(/[^\d]/g, '');
      return digitos ? `https://wa.me/${digitos}` : null;
    }
    case 'instagram':
      if (esUrlCompleta) return valor;
      return `https://instagram.com/${valor.replace(/^@/, '')}`;
    case 'facebook':
      if (esUrlCompleta) return valor;
      return `https://facebook.com/${valor.replace(/^@/, '')}`;
    case 'sitioweb':
    case 'maps':
      return esUrlCompleta ? valor : `https://${valor}`;
    default:
      return null;
  }
}

function itemContacto(icono, etiqueta, valor, tipo) {
  const url = construirLink(tipo, valor);
  if (!url) {
    return `<div class="contacto-item vacio"><span class="izq"><span class="icono">${icono}</span> ${etiqueta}: No registrado</span></div>`;
  }
  return `
    <div class="contacto-item">
      <span class="izq"><span class="icono">${icono}</span> <span class="valor">${valor}</span></span>
      <a href="${url}" target="_blank" rel="noopener" class="abrir">Abrir ↗</a>
    </div>`;
}

function pintarVista(c) {
  document.getElementById('vistaNombre').textContent = c.Nombre || 'Sin nombre';
  document.getElementById('vistaRubro').textContent = c.Rubro || 'Sin rubro';
  document.getElementById('vistaDireccion').textContent = c['Dirección'] || 'No registrada';

  const vistaCategoria = document.getElementById('vistaCategoria');
  if (c.Categoria) {
    nombreDeCategoria(c.Categoria).then(nombre => { vistaCategoria.textContent = nombre; });
  } else {
    vistaCategoria.textContent = 'Sin categoría asignada';
  }

  const badgeEstado = document.getElementById('badgeEstadoComercial');
  badgeEstado.textContent = c.Estado || 'Nuevo';
  badgeEstado.className = 'badge badge-punto ' + estadoComercialClase(c.Estado);

  const badgeServicio = document.getElementById('badgeEstadoServicio');
  badgeServicio.textContent = c['Estado del Servicio'] || '—';
  badgeServicio.className = 'badge badge-punto ' + estadoServicioClase(c['Estado del Servicio']);

  document.getElementById('listaContactoVista').innerHTML = [
    itemContacto('☎️', 'Teléfono', c['Teléfono'], 'telefono'),
    itemContacto('💬', 'WhatsApp', c.WhatsApp, 'whatsapp'),
    itemContacto('📷', 'Instagram', c.Instagram, 'instagram'),
    itemContacto('📘', 'Facebook', c.Facebook, 'facebook'),
    itemContacto('🌐', 'Sitio web', c['Sitio web'], 'sitioweb'),
    itemContacto('📍', 'Google Maps', c['Google Maps'], 'maps')
  ].join('');

  document.getElementById('vistaObservaciones').textContent = String(c.Observaciones || '').trim() || 'Sin notas cargadas.';
}

// ─────────────────────────────────────────────
// RESUMEN — Eleva Score (real, AREAS de Code.gs) + Última inspección
// ─────────────────────────────────────────────

async function pintarResumen(c, auditorias, inspecciones) {
  const auditoriaReciente = auditorias.find(a => a['Estado'] === 'Finalizada');
  const contEleve = document.getElementById('contenidoEleveScore');

  if (!auditoriaReciente) {
    contEleve.innerHTML = '<p class="muted">Todavía no hay auditorías finalizadas para calcular el Eleva Score.</p>';
    document.getElementById('vistaEstrellas').innerHTML = '';
    document.getElementById('vistaEstrellasLabel').textContent = '';
  } else {
    const scoreGeneral = auditoriaReciente['Score General'];
    const estrellas = calcularEstrellas(scoreGeneral);
    document.getElementById('vistaEstrellas').innerHTML = renderEstrellas(estrellas.cantidad);
    document.getElementById('vistaEstrellasLabel').textContent =
      (scoreGeneral !== '' ? `${estrellas.label} · Eleva Score ${scoreGeneral}` : estrellas.label);

    // Mismo criterio que el PDF: solo se muestran las áreas que tuvieron
    // preguntas aplicables para la categoría de este comercio.
    const barras = AREAS_SCORE
      .filter(area => {
        const valor = auditoriaReciente['Score ' + area.clave];
        return valor !== '' && valor !== undefined && valor !== null;
      })
      .map(area => {
        const valor = auditoriaReciente['Score ' + area.clave];
        const num = Number(valor);
        return `
          <div class="barra-fila">
            <div class="barra-label"><span>${area.label}</span><span>${num}</span></div>
            <div class="barra-track"><div class="barra-fill" style="width:${num}%;"></div></div>
          </div>`;
      }).join('');

    contEleve.innerHTML = `
      <div class="score-card">
        <div class="score-circulo">
          <div class="num">${scoreGeneral !== '' ? scoreGeneral : '-'}</div>
          <div class="den">de 100</div>
        </div>
        <div class="score-barras">${barras}</div>
      </div>
      <a href="../auditoria/resultado.html?id=${encodeURIComponent(auditoriaReciente['ID Auditoria'])}" style="display:inline-block; margin-top: 14px; font-size: 13px;">Ver auditoría completa →</a>
    `;
  }

  const inspeccionReciente = inspecciones.find(i => i.estado === 'Finalizada');
  const contInsp = document.getElementById('contenidoUltimaInspeccion');

  if (!inspeccionReciente) {
    contInsp.innerHTML = '<p class="muted">Todavía no se hizo ninguna inspección inicial a este comercio.</p>';
    return;
  }

  const detalle = await apiGet('getInspeccion', { id: inspeccionReciente.id });
  const problemas = (detalle && Array.isArray(detalle.problemasDetectados)) ? detalle.problemasDetectados : [];

  const hallazgosHtml = problemas.length
    ? problemas.map(p => {
        const sev = inferirSeveridad(p);
        const icono = sev === 'critico' ? '🔴' : (sev === 'importante' ? '🟡' : '🟢');
        return `<div class="hallazgo"><span>${icono}</span> ${p}</div>`;
      }).join('')
    : '<p class="muted">No se detectaron problemas en la última inspección.</p>';

  contInsp.innerHTML = `
    <p class="muted" style="margin-bottom: 12px;">Realizada el ${formatFecha(detalle.fecha)}</p>
    ${hallazgosHtml}
    <a href="../inspeccion/resultado.html?id=${encodeURIComponent(inspeccionReciente.id)}" style="display:inline-block; margin-top: 14px; font-size: 13px;">Ver inspección →</a>
  `;
}

// Heurística client-side, sin campo nuevo en el backend (decisión
// aprobada: severidad inferida por ahora). Si en el futuro el motor de
// Inspección Inicial empieza a guardar severidad explícita por regla,
// esta función se reemplaza por leer ese dato directo.
function inferirSeveridad(texto) {
  const t = (texto || '').toLowerCase();
  const critico = ['no tiene', 'no posee', 'no funciona', 'no genera confianza', 'imagen general del negocio percibida como mala'];
  if (critico.some(k => t.indexOf(k) !== -1)) return 'critico';
  return 'importante';
}

// ─────────────────────────────────────────────
// DIAGNÓSTICO — card resumida (Resumen) + tab completo
// Solo presentación: todo el valor viene ya calculado en
// datos.diagnostico (Resultado JSON de resultadosdiagnostico/{idComercio}).
// ─────────────────────────────────────────────

function pintarResumenDiagnostico(diagnostico, diagnosticoError) {
  const cont = document.getElementById('contenidoDiagnosticoResumen');

  if (diagnosticoError) {
    cont.innerHTML = '<p class="muted">No se pudo cargar el diagnóstico. Probá recargar la página.</p>';
    return;
  }

  if (!diagnostico) {
    cont.innerHTML = '<p class="muted">Todavía no se calculó ningún diagnóstico para este comercio.</p>';
    return;
  }

  const madurez = diagnostico.madurezGlobal ? diagnostico.madurezGlobal.valor : null;
  const oportunidades = Array.isArray(diagnostico.oportunidades) ? diagnostico.oportunidades : [];
  const tipoLabel = TIPO_EVALUACION_LABEL[diagnostico.tipoEvaluacion] || diagnostico.tipoEvaluacion || '-';

  cont.innerHTML = `
    <div class="score-card">
      <div class="score-circulo">
        <div class="num">${formatPorcentajeDiagnostico(madurez)}</div>
        <div class="den">madurez</div>
      </div>
      <div>
        <p style="margin-bottom:6px; font-size:13px;">
          ${oportunidades.length} oportunidad${oportunidades.length === 1 ? '' : 'es'} detectada${oportunidades.length === 1 ? '' : 's'}
        </p>
        <p class="muted" style="font-size:12px;">Última evaluación: ${tipoLabel} · ${formatFecha(diagnostico.fecha)}</p>
      </div>
    </div>
    <a href="#" class="ir-a-tab-diagnostico" style="display:inline-block; margin-top: 14px; font-size: 13px;">Ver diagnóstico completo →</a>
  `;

  const link = cont.querySelector('.ir-a-tab-diagnostico');
  if (link) {
    link.addEventListener('click', (ev) => {
      ev.preventDefault();
      const tabBtn = document.querySelector('.tab[data-tab="diagnostico"]');
      if (tabBtn) tabBtn.click();
    });
  }
}

function pintarTabDiagnostico(diagnostico, diagnosticoError) {
  const cont = document.getElementById('contenidoDiagnosticoTab');

  if (diagnosticoError) {
    cont.innerHTML = '<p class="muted">No se pudo cargar el diagnóstico. Probá recargar la página.</p>';
    return;
  }

  if (!diagnostico) {
    cont.innerHTML = '<p class="muted">Todavía no se calculó ningún diagnóstico para este comercio. Se genera automáticamente al finalizar una Auditoría o una Inspección.</p>';
    return;
  }

  const madurez = diagnostico.madurezGlobal ? diagnostico.madurezGlobal.valor : null;
  const coberturaGlobal = diagnostico.madurezGlobal ? diagnostico.madurezGlobal.coberturaGlobal : null;
  const tipoLabel = TIPO_EVALUACION_LABEL[diagnostico.tipoEvaluacion] || diagnostico.tipoEvaluacion || '-';

  const canales = Array.isArray(diagnostico.canales) ? diagnostico.canales : [];
  const canalesHtml = canales.map(canal => {
    const nombreCanal = CANALES_DIAGNOSTICO[canal.idCanal] || canal.idCanal;
    const atributos = Array.isArray(canal.atributos) ? canal.atributos : [];

    const atributosHtml = atributos.map(attr => {
      if (!attr.aplica) {
        return `
          <div class="diagnostico-atributo-fila">
            <div class="diagnostico-atributo-label"><span>${attr.idAtributo}</span><span class="no-aplica">No aplica</span></div>
          </div>`;
      }
      const pct = attr.valor === null || attr.valor === undefined ? 0 : Math.round(attr.valor * 100);
      return `
        <div class="diagnostico-atributo-fila">
          <div class="diagnostico-atributo-label">
            <span>${attr.idAtributo}</span>
            <span>${formatPorcentajeDiagnostico(attr.valor)} · cobertura ${formatPorcentajeDiagnostico(attr.cobertura)}</span>
          </div>
          <div class="barra-track"><div class="barra-fill" style="width:${pct}%;"></div></div>
        </div>`;
    }).join('');

    return `
      <div class="diagnostico-canal">
        <div class="diagnostico-canal-header">
          <h4>${nombreCanal}</h4>
          <span class="cobertura">${formatPorcentajeDiagnostico(canal.valor)} · cobertura ${formatPorcentajeDiagnostico(canal.cobertura)}</span>
        </div>
        ${atributosHtml}
      </div>`;
  }).join('');

  const oportunidades = Array.isArray(diagnostico.oportunidades) ? diagnostico.oportunidades : [];
  const oportunidadesHtml = oportunidades.length
    ? oportunidades.map(op => {
        const badgeClase = GRAVEDAD_BADGE_DIAGNOSTICO[op.gravedad] || 'badge-sin-servicio';
        return `
          <div class="diagnostico-oportunidad">
            <div class="izq">
              <div class="nombre">${op.nombre || op.idOportunidad}</div>
              ${op.servicio ? `<div class="servicio">${op.servicio}</div>` : ''}
            </div>
            <span class="badge badge-punto ${badgeClase}">${op.gravedad || '—'}</span>
          </div>`;
      }).join('')
    : '<p class="muted">No se detectaron oportunidades.</p>';

  cont.innerHTML = `
    <div class="diagnostico-meta">
      Última actualización: ${tipoLabel} finalizada el ${formatFecha(diagnostico.fecha)} · Cobertura global: ${formatPorcentajeDiagnostico(coberturaGlobal)}
      <button type="button" id="btnDescargarPDFDiagnostico" class="btn-secundario" style="margin-left: 12px;">Descargar Informe PDF</button>
    </div>

    <div class="score-card" style="margin-bottom: 20px;">
      <div class="score-circulo">
        <div class="num">${formatPorcentajeDiagnostico(madurez)}</div>
        <div class="den">Madurez Global</div>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom: 20px;">
      ${canalesHtml}
    </div>

    <h4 style="margin-bottom: 10px;">Oportunidades</h4>
    ${oportunidadesHtml}
  `;

  // El PDF de cliente vive en assets/js/pdfDiagnostico.js (namespace
  // PDFDiagnostico). Acá SOLO se orquesta: pedir el dato faltante
  // (catálogos vigentes + configuración de marca) y pasarle todo
  // explícito al generador — nada de lógica de armado ni de estado
  // global de la ficha cruza hacia ese archivo.
  const btnPDF = document.getElementById('btnDescargarPDFDiagnostico');
  if (btnPDF) {
    btnPDF.addEventListener('click', async () => {
      btnPDF.disabled = true;
      const textoOriginal = btnPDF.textContent;
      btnPDF.textContent = 'Generando...';
      try {
        const datos = await apiGet('obtenerDatosPDFDiagnostico', { idComercio: ID_COMERCIO });
        if (!datos || !datos.ok) {
          throw new Error((datos && datos.error) || 'No se pudo obtener la información para el PDF.');
        }
        await PDFDiagnostico.generar({
          comercio: comercioActual,
          diagnostico: diagnostico,
          catalogoOportunidades: datos.oportunidades,
          catalogoServicios: datos.servicios,
          configuracionMarca: datos.configuracionMarca
        });
      } catch (err) {
        console.error('Error generando PDF de diagnóstico:', err);
        alert('No se pudo generar el PDF: ' + (err && err.message ? err.message : err));
      }
      btnPDF.disabled = false;
      btnPDF.textContent = textoOriginal;
    });
  }
}

// ─────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('activo'));
    tab.classList.add('activo');
    const key = tab.dataset.tab;
    document.querySelectorAll('.tab-panel').forEach(p => {
      p.classList.toggle('oculto', p.dataset.tabPanel !== key);
    });
  });
});

// ─────────────────────────────────────────────
// MODO VISTA <-> MODO EDICIÓN
// ─────────────────────────────────────────────

function irAModoEdicion() {
  document.getElementById('modoVista').classList.add('oculto');
  document.getElementById('modoEdicion').classList.remove('oculto');
}

function irAModoVista() {
  document.getElementById('modoEdicion').classList.add('oculto');
  document.getElementById('modoVista').classList.remove('oculto');
}

document.getElementById('btnEditar').addEventListener('click', irAModoEdicion);
document.getElementById('btnCancelarEdicion').addEventListener('click', () => {
  if (comercioActual) pintarFormulario(comercioActual); // descarta cambios sin guardar
  irAModoVista();
});

// ─────────────────────────────────────────────
// FORMULARIO DE EDICIÓN (igual que antes, + Estado del Servicio)
// ─────────────────────────────────────────────

function pintarFormulario(c) {
  document.getElementById('nombre').value = c.Nombre || '';
  document.getElementById('rubro').value = c.Rubro || '';
  poblarSelectCategorias(document.getElementById('categoria'), c.Categoria || '');
  document.getElementById('direccion').value = c['Dirección'] || '';
  document.getElementById('telefono').value = c['Teléfono'] || '';
  document.getElementById('whatsapp').value = c.WhatsApp || '';
  document.getElementById('instagram').value = c.Instagram || '';
  document.getElementById('facebook').value = c.Facebook || '';
  document.getElementById('sitioweb').value = c['Sitio web'] || '';
  document.getElementById('maps').value = c['Google Maps'] || '';
  document.getElementById('observaciones').value = c.Observaciones || '';
  document.getElementById('problemas').value = c['Problemas encontrados'] || '';
  document.getElementById('servicios').value = c['Servicios sugeridos'] || '';
  document.getElementById('prioridad').value = c.Prioridad || '';
  document.getElementById('estado').value = c.Estado || 'Nuevo';
  document.getElementById('estadoServicio').value = c['Estado del Servicio'] || '';

  actualizarLinksClicables();
}

function actualizarLinksClicables() {
  ['telefono', 'whatsapp', 'instagram', 'facebook', 'sitioweb', 'maps'].forEach(tipo => {
    const input = document.getElementById(tipo);
    const enlace = document.getElementById('enlace-' + tipo);
    if (!input || !enlace) return;

    const actualizar = () => {
      const url = construirLink(tipo, input.value);
      if (url) {
        enlace.href = url;
        enlace.style.display = '';
      } else {
        enlace.removeAttribute('href');
        enlace.style.display = 'none';
      }
    };

    actualizar();
    input.addEventListener('input', actualizar);
  });
}

document.getElementById('formFicha').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msgError = document.getElementById('msgError');
  const btnGuardar = document.getElementById('btnGuardar');
  msgError.classList.remove('visible');
  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Guardando...';

  const comercio = {
    'ID': ID_COMERCIO,
    'Nombre': document.getElementById('nombre').value.trim(),
    'Rubro': document.getElementById('rubro').value.trim(),
    'Categoria': document.getElementById('categoria').value,
    'Dirección': document.getElementById('direccion').value.trim(),
    'Teléfono': document.getElementById('telefono').value.trim(),
    'WhatsApp': document.getElementById('whatsapp').value.trim(),
    'Instagram': document.getElementById('instagram').value.trim(),
    'Facebook': document.getElementById('facebook').value.trim(),
    'Sitio web': document.getElementById('sitioweb').value.trim(),
    'Google Maps': document.getElementById('maps').value.trim(),
    'Observaciones': document.getElementById('observaciones').value.trim(),
    'Problemas encontrados': document.getElementById('problemas').value.trim(),
    'Servicios sugeridos': document.getElementById('servicios').value.trim(),
    'Prioridad': document.getElementById('prioridad').value,
    'Estado': document.getElementById('estado').value,
    'Estado del Servicio': document.getElementById('estadoServicio').value
  };

  try {
    const res = await apiPost('guardarComercio', { comercio });
    if (res.ok) {
      // Vista -> Editar -> Guardar -> vuelve sola a Vista (no navega a index.html)
      await cargarTodo();
      irAModoVista();
    } else {
      msgError.textContent = res.error || 'No se pudo guardar.';
      msgError.classList.add('visible');
    }
  } catch (err) {
    msgError.textContent = 'No se pudo conectar con el servidor. Probá de nuevo.';
    msgError.classList.add('visible');
  } finally {
    btnGuardar.disabled = false;
    btnGuardar.textContent = 'Guardar cambios';
  }
});

// ─────────────────────────────────────────────
// FOTOS / ARCHIVOS
// ─────────────────────────────────────────────

let IMAGENES_ACTUALES = [];

async function cargarImagenes() {
  const imgs = await apiGet('getImagenes', { idComercio: ID_COMERCIO });
  IMAGENES_ACTUALES = Array.isArray(imgs) ? imgs : [];
  pintarImagenes(IMAGENES_ACTUALES);
}

function pintarImagenes(imgs) {
  const grid = document.getElementById('fotosGridVista');

  // Portada: la que el usuario haya elegido manualmente (comercioActual['ID
  // Imagen Portada']), si existe entre las fotos actuales. Si no hay ninguna
  // elegida (o la elegida ya no existe), se usa la primera foto cargada.
  const idPortada = comercioActual && comercioActual['ID Imagen Portada'];
  const fotoPortada = imgs.find(img => img['ID Imagen'] === idPortada) || imgs[0];

  const fotoPanel = document.getElementById('fotoComercioVista');
  if (fotoPortada) {
    fotoPanel.innerHTML = `<img src="${fotoPortada.URL}" alt="Foto de portada">`;
  } else {
    fotoPanel.innerHTML = '<span class="sin-foto">Sin foto</span>';
  }

  grid.innerHTML = imgs.map(img => `
    <div class="foto-item">
      <a href="${img.URL}" target="_blank" rel="noopener">
        <img src="${img.URL}" alt="foto">
      </a>
      ${fotoPortada && img['ID Imagen'] === fotoPortada['ID Imagen']
        ? '<span class="badge-portada">Portada</span>'
        : `<button type="button" data-id="${img['ID Imagen']}" class="btnUsarPortada" title="Usar como portada">★</button>`}
      <button type="button" data-id="${img['ID Imagen']}" class="btnEliminarFoto">✕</button>
    </div>
  `).join('');

  document.querySelectorAll('.btnUsarPortada').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const res = await apiPost('guardarPortada', { idComercio: ID_COMERCIO, idImagen: btn.dataset.id });
      if (res && res.ok) {
        comercioActual['ID Imagen Portada'] = btn.dataset.id;
        pintarImagenes(IMAGENES_ACTUALES);
      } else {
        btn.disabled = false;
        alert((res && res.error) || 'No se pudo cambiar la portada.');
      }
    });
  });

  document.querySelectorAll('.btnEliminarFoto').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = '…';
      const res = await apiPost('eliminarImagen', { idImagen: btn.dataset.id });
      if (!res || res.ok === false) {
        btn.disabled = false;
        btn.textContent = '✕';
        alert((res && res.error) || 'No se pudo eliminar la foto.');
        return;
      }
      cargarImagenes();
    });
  });
}

let ARCHIVO_FOTO_ELEGIDO = null;

document.getElementById('btnElegirFoto').addEventListener('click', () => {
  document.getElementById('inputFotoVista').click();
});

document.getElementById('inputFotoVista').addEventListener('change', (e) => {
  const archivo = e.target.files[0];
  ARCHIVO_FOTO_ELEGIDO = archivo || null;

  document.getElementById('nombreFotoElegida').textContent = archivo ? archivo.name : '';
  document.getElementById('btnSubirFoto').classList.toggle('oculto', !archivo);
  document.getElementById('estadoSubidaFoto').textContent = '';
});

document.getElementById('btnSubirFoto').addEventListener('click', async () => {
  const archivo = ARCHIVO_FOTO_ELEGIDO;
  if (!archivo) return;

  const btnSubir = document.getElementById('btnSubirFoto');
  const estado = document.getElementById('estadoSubidaFoto');

  btnSubir.disabled = true;
  estado.textContent = 'Subiendo imagen...';

  const lector = new FileReader();
  lector.onload = async (ev) => {
    const base64 = ev.target.result.split(',')[1];
    try {
      const res = await apiPost('subirImagen', {
        idComercio: ID_COMERCIO,
        nombreArchivo: archivo.name,
        tipo: archivo.type,
        datos: base64
      });

      if (!res || res.ok === false) {
        estado.textContent = 'No se pudo subir la imagen. Probá de nuevo.';
        btnSubir.disabled = false;
        return;
      }

      document.getElementById('inputFotoVista').value = '';
      ARCHIVO_FOTO_ELEGIDO = null;
      document.getElementById('nombreFotoElegida').textContent = '';
      btnSubir.classList.add('oculto');
      btnSubir.disabled = false;
      estado.textContent = '';
      cargarImagenes();
    } catch (err) {
      estado.textContent = 'No se pudo conectar con el servidor. Probá de nuevo.';
      btnSubir.disabled = false;
    }
  };
  lector.readAsDataURL(archivo);
});

// ─────────────────────────────────────────────
// OTROS ARCHIVOS (PDF, Word, etc. — no se usan como portada)
// ─────────────────────────────────────────────

async function cargarArchivos() {
  const archivos = await apiGet('getArchivos', { idComercio: ID_COMERCIO });
  pintarArchivos(Array.isArray(archivos) ? archivos : []);
}

function pintarArchivos(archivos) {
  const lista = document.getElementById('listaArchivosVista');

  if (archivos.length === 0) {
    lista.innerHTML = '<p class="muted">Todavía no se subió ningún archivo.</p>';
    return;
  }

  lista.innerHTML = archivos.map(a => `
    <div class="archivo-item">
      <a href="${a.URL}" target="_blank" rel="noopener">${a['Nombre Archivo'] || 'Archivo'}</a>
      <button type="button" data-id="${a['ID Archivo']}" class="btnEliminarArchivo">✕</button>
    </div>
  `).join('');

  document.querySelectorAll('.btnEliminarArchivo').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = '…';
      const res = await apiPost('eliminarArchivo', { idArchivo: btn.dataset.id });
      if (!res || res.ok === false) {
        btn.disabled = false;
        btn.textContent = '✕';
        alert((res && res.error) || 'No se pudo eliminar el archivo.');
        return;
      }
      cargarArchivos();
    });
  });
}

let ARCHIVO_ELEGIDO = null;

document.getElementById('btnElegirArchivo').addEventListener('click', () => {
  document.getElementById('inputArchivoVista').click();
});

document.getElementById('inputArchivoVista').addEventListener('change', (e) => {
  const archivo = e.target.files[0];
  ARCHIVO_ELEGIDO = archivo || null;

  document.getElementById('nombreArchivoElegido').textContent = archivo ? archivo.name : '';
  document.getElementById('btnSubirArchivo').classList.toggle('oculto', !archivo);
  document.getElementById('estadoSubidaArchivo').textContent = '';
});

document.getElementById('btnSubirArchivo').addEventListener('click', async () => {
  const archivo = ARCHIVO_ELEGIDO;
  if (!archivo) return;

  const btnSubir = document.getElementById('btnSubirArchivo');
  const estado = document.getElementById('estadoSubidaArchivo');

  btnSubir.disabled = true;
  estado.textContent = 'Subiendo archivo...';

  const lector = new FileReader();
  lector.onload = async (ev) => {
    const base64 = ev.target.result.split(',')[1];
    try {
      const res = await apiPost('subirArchivo', {
        idComercio: ID_COMERCIO,
        nombreArchivo: archivo.name,
        tipo: archivo.type,
        datos: base64
      });

      if (!res || res.ok === false) {
        estado.textContent = 'No se pudo subir el archivo. Probá de nuevo.';
        btnSubir.disabled = false;
        return;
      }

      document.getElementById('inputArchivoVista').value = '';
      ARCHIVO_ELEGIDO = null;
      document.getElementById('nombreArchivoElegido').textContent = '';
      btnSubir.classList.add('oculto');
      btnSubir.disabled = false;
      estado.textContent = '';
      cargarArchivos();
    } catch (err) {
      estado.textContent = 'No se pudo conectar con el servidor. Probá de nuevo.';
      btnSubir.disabled = false;
    }
  };
  lector.readAsDataURL(archivo);
});

// ─────────────────────────────────────────────
// INSPECCIONES INICIALES
// ─────────────────────────────────────────────

function badgeClaseInspeccion(estado) {
  if (estado === 'Finalizada') return 'badge-baja';
  if (estado === 'Omitida') return 'badge-baja';
  return 'badge-media';
}

function pintarInspeccionesTab(lista) {
  const contenedor = document.getElementById('listaInspecciones');
  const btnIniciar = document.getElementById('btnIniciarInspeccion');

  const hayHistorial = Array.isArray(lista) && lista.length > 0;
  btnIniciar.textContent = hayHistorial ? '+ Iniciar nueva inspección' : 'Realizar Inspección Inicial';

  if (!hayHistorial) {
    contenedor.innerHTML = '<p class="muted">Todavía no se hizo ninguna inspección inicial a este comercio.</p>';
    return;
  }

  contenedor.innerHTML = lista.map(i => {
    const href = i.estado === 'Finalizada'
      ? `../inspeccion/resultado.html?id=${encodeURIComponent(i.id)}`
      : `../inspeccion/index.html?id=${encodeURIComponent(i.id)}`;
    return `
      <div class="fila-auditoria">
        <a href="${href}">
          <div>
            <p>${formatFecha(i.fecha)}</p>
          </div>
          <div class="der">
            ${i.estado === 'Finalizada' ? `<span class="muted">${i.nivelOportunidad || '-'} · Prioridad ${i.prioridadComercial || '-'}</span>` : ''}
            <span class="badge ${badgeClaseInspeccion(i.estado)}">${i.estado}</span>
          </div>
        </a>
        ${i.estado === 'Finalizada' ? `<button type="button" class="btnDescargarPDF" data-id="${i.id}" title="Descargar PDF">📄</button>` : ''}
        <button type="button" class="btnEliminarInspeccion" data-id="${i.id}" data-estado="${i.estado}" title="Eliminar inspección">✕</button>
      </div>`;
  }).join('');

  document.querySelectorAll('#listaInspecciones .btnDescargarPDF').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      btn.disabled = true;
      try {
        await generarPDFInspeccion(btn.dataset.id);
      } catch (err) {
        console.error('Error generando PDF de inspección:', err);
        alert('No se pudo generar el PDF: ' + (err && err.message ? err.message : err));
      }
      btn.disabled = false;
    });
  });

  document.querySelectorAll('.btnEliminarInspeccion').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (btn.dataset.estado === 'Finalizada') {
        if (!confirm('Esta inspección ya está FINALIZADA. Si la eliminás se pierden el puntaje, los problemas detectados y los servicios sugeridos, y no se puede deshacer. ¿Eliminarla igual?')) return;
      } else {
        if (!confirm('¿Eliminar esta inspección? Esta acción no se puede deshacer.')) return;
      }
      btn.disabled = true;
      try {
        const res = await apiPost('eliminarInspeccion', { idInspeccion: btn.dataset.id });
        if (res.ok) {
          await cargarTodo();
        } else {
          alert(res.error || 'No se pudo eliminar la inspección.');
          btn.disabled = false;
        }
      } catch (err) {
        alert('No se pudo conectar con el servidor. Probá de nuevo.');
        btn.disabled = false;
      }
    });
  });
}

async function iniciarInspeccion() {
  try {
    const res = await apiPost('iniciarInspeccion', { idComercio: ID_COMERCIO });
    if (res.ok) {
      window.location.href = `../inspeccion/index.html?id=${encodeURIComponent(res.id)}`;
    } else {
      alert(res.error || 'No se pudo iniciar la inspección.');
    }
  } catch (err) {
    alert('No se pudo conectar con el servidor. Probá de nuevo.');
  }
}

document.getElementById('btnIniciarInspeccion').addEventListener('click', iniciarInspeccion);
document.getElementById('btnIrInspeccionVista').addEventListener('click', iniciarInspeccion);

// ─────────────────────────────────────────────
// AUDITORÍAS
// ─────────────────────────────────────────────

function badgeClaseAuditoria(estado) {
  return estado === 'Finalizada' ? 'badge-baja' : 'badge-media';
}

function pintarAuditoriasTab(lista) {
  const contenedor = document.getElementById('listaAuditorias');

  if (!Array.isArray(lista) || lista.length === 0) {
    contenedor.innerHTML = '<p class="muted">Todavía no se hizo ninguna auditoría a este comercio.</p>';
    return;
  }

  contenedor.innerHTML = lista.map(a => `
    <div class="fila-auditoria">
      <a href="../auditoria/resultado.html?id=${encodeURIComponent(a['ID Auditoria'])}">
        <div>
          <p>${formatFecha(a['Fecha'])}</p>
        </div>
        <div class="der">
          ${a['Estado'] === 'Finalizada' ? `<span class="muted">Score: ${a['Score General'] ?? '-'}</span>` : ''}
          <span class="badge ${badgeClaseAuditoria(a['Estado'])}">${a['Estado']}</span>
        </div>
      </a>
      ${a['Estado'] === 'Finalizada' ? `<button type="button" class="btnDescargarPDF" data-id="${a['ID Auditoria']}" title="Descargar PDF">📄</button>` : ''}
      <button type="button" class="btnEliminarAuditoria" data-id="${a['ID Auditoria']}" title="Eliminar auditoría">✕</button>
    </div>
  `).join('');

  document.querySelectorAll('#listaAuditorias .btnDescargarPDF').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const auditoria = auditoriasActuales.find(x => x['ID Auditoria'] === btn.dataset.id);
      if (!auditoria) return;
      btn.disabled = true;
      try {
        await generarPDFAuditoria(auditoria);
      } catch (err) {
        console.error('Error generando PDF de auditoría:', err);
        alert('No se pudo generar el PDF: ' + (err && err.message ? err.message : err));
      }
      btn.disabled = false;
    });
  });

  document.querySelectorAll('.btnEliminarAuditoria').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!confirm('¿Eliminar esta auditoría? Esta acción no se puede deshacer.')) return;
      btn.disabled = true;
      try {
        const res = await apiPost('eliminarAuditoria', { idAuditoria: btn.dataset.id });
        if (res.ok) {
          await cargarTodo();
        } else {
          alert(res.error || 'No se pudo eliminar la auditoría.');
          btn.disabled = false;
        }
      } catch (err) {
        alert('No se pudo conectar con el servidor. Probá de nuevo.');
        btn.disabled = false;
      }
    });
  });
}

async function iniciarAuditoria() {
  try {
    const res = await apiPost('iniciarAuditoria', { idComercio: ID_COMERCIO });
    if (res.ok) {
      window.location.href = `../auditoria/index.html?id=${encodeURIComponent(res.id)}`;
    } else {
      alert(res.error || 'No se pudo iniciar la auditoría.');
    }
  } catch (err) {
    alert('No se pudo conectar con el servidor. Probá de nuevo.');
  }
}

document.getElementById('btnIniciarAuditoria').addEventListener('click', iniciarAuditoria);
document.getElementById('btnIrAuditoriaVista').addEventListener('click', iniciarAuditoria);

// ─────────────────────────────────────────────
// EXPORTACIÓN A PDF (Auditoría / Inspección)
// 100% client-side con jsPDF, sin tocar backend. Reutiliza AREAS_SCORE,
// comercioActual y formatFecha ya existentes. Paleta de colores idéntica
// a la usada en auditoria/index.html e inspeccion/index.html.
// ─────────────────────────────────────────────

const COLORES_AREA_PDF = {
  Google: [232, 178, 61],
  Web: [75, 142, 240],
  WhatsApp: [62, 207, 142],
  Redes: [167, 139, 250],
  Catalogo: [240, 149, 75],
  Branding: [240, 107, 168]
};

const COLOR_ACCENT_PDF = [75, 110, 240];
const COLOR_TEXT_PDF = [26, 27, 35];
const COLOR_MUTED_PDF = [110, 112, 125];
const COLOR_DANGER_PDF = [216, 90, 48];
const COLOR_SUCCESS_PDF = [29, 158, 117];
const COLOR_WARNING_PDF = [186, 117, 23];

let LOGO_BASE64_CACHE = null;

async function obtenerLogoBase64() {
  if (LOGO_BASE64_CACHE) return LOGO_BASE64_CACHE;
  try {
    const resp = await fetch('../assets/img/logo.png');
    const blob = await resp.blob();
    LOGO_BASE64_CACHE = await new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => resolve(lector.result);
      lector.onerror = reject;
      lector.readAsDataURL(blob);
    });
  } catch (err) {
    LOGO_BASE64_CACHE = null;
  }
  return LOGO_BASE64_CACHE;
}

function nombreArchivoPDF(prefijo, fecha) {
  const nombreComercio = (comercioActual && comercioActual.Nombre || 'comercio')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_');
  const fechaLimpia = formatFecha(fecha).replace(/\//g, '-');
  return `${prefijo}_${nombreComercio}_${fechaLimpia}.pdf`;
}

async function dibujarMembrete(doc, subtitulo) {
  const logo = await obtenerLogoBase64();
  const anchoPagina = doc.internal.pageSize.getWidth();
  const xTexto = logo ? 36 : 15;

  if (logo) {
    try { doc.addImage(logo, 'PNG', 15, 12, 16, 16); } catch (err) { /* logo opcional */ }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...COLOR_TEXT_PDF);
  doc.text('Eleva Lab', xTexto, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_MUTED_PDF);
  doc.text(subtitulo, xTexto, 27);

  doc.setDrawColor(...COLOR_ACCENT_PDF);
  doc.setLineWidth(1);
  doc.line(15, 34, anchoPagina - 15, 34);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...COLOR_TEXT_PDF);
  doc.text((comercioActual && comercioActual.Nombre) || 'Comercio sin nombre', 15, 44);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLOR_MUTED_PDF);
  doc.text((comercioActual && comercioActual.Rubro) || '', 15, 50);

  if (comercioActual && comercioActual.Categoria) {
    const nombreCategoria = await nombreDeCategoria(comercioActual.Categoria);
    if (nombreCategoria) {
      doc.setFontSize(9);
      doc.text(`Categoría: ${nombreCategoria}`, 15, 55);
      return 65; // hay una línea más de membrete, empieza más abajo
    }
  }

  return 60; // próxima Y libre para el contenido
}

function dibujarPiePDF(doc) {
  const alturaPagina = doc.internal.pageSize.getHeight();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_MUTED_PDF);
  doc.text(`Generado por Eleva Lab · ${new Date().toLocaleDateString('es-AR')}`, 15, alturaPagina - 10);
}

async function generarPDFAuditoria(auditoria) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    throw new Error('No se cargó la librería para generar PDFs (jsPDF). Recargá la página (Ctrl+F5) y probá de nuevo; si sigue, puede haber un bloqueador de contenido activo en el navegador.');
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  let y = await dibujarMembrete(doc, 'Informe de Auditoría Digital');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLOR_MUTED_PDF);
  doc.text(`Fecha de la auditoría: ${formatFecha(auditoria['Fecha'])}`, 15, y);
  y += 12;

  const scoreGeneral = auditoria['Score General'];
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(30);
  doc.setTextColor(...COLOR_ACCENT_PDF);
  doc.text(String(scoreGeneral !== '' && scoreGeneral !== undefined ? scoreGeneral : '-'), 15, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLOR_MUTED_PDF);
  doc.text('Eleva Score general (sobre 100)', 15, y + 19);
  y += 32;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...COLOR_TEXT_PDF);
  doc.text('Resultado por área', 15, y);
  y += 9;

  const anchoBarraMax = 115;
  // Solo se dibujan las áreas que tuvieron al menos una pregunta
  // aplicable para la categoría de este comercio — finalizarAuditoria_
  // devuelve '' (no 0) en un área sin preguntas aplicables, así que acá
  // alcanza con filtrar por eso. Con Categorias Aplicables vacío en
  // todas las preguntas (comportamiento por defecto, sin cargar nada
  // todavía), esto sigue mostrando las 6 áreas de siempre.
  const areasConScore = AREAS_SCORE.filter(area => {
    const valor = auditoria['Score ' + area.clave];
    return valor !== '' && valor !== undefined && valor !== null;
  });

  if (areasConScore.length < AREAS_SCORE.length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_MUTED_PDF);
    doc.text('Se muestran solo las áreas relevantes para este tipo de comercio.', 15, y);
    y += 6;
  }

  areasConScore.forEach(area => {
    const valor = auditoria['Score ' + area.clave];
    const num = Number(valor);
    const color = COLORES_AREA_PDF[area.clave] || COLOR_ACCENT_PDF;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...COLOR_TEXT_PDF);
    doc.text(area.label, 15, y + 4);

    doc.setFillColor(230, 230, 235);
    doc.roundedRect(55, y, anchoBarraMax, 5, 1.5, 1.5, 'F');

    if (num > 0) {
      doc.setFillColor(...color);
      doc.roundedRect(55, y, anchoBarraMax * (Math.min(num, 100) / 100), 5, 1.5, 1.5, 'F');
    }

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLOR_TEXT_PDF);
    doc.text(String(num), 55 + anchoBarraMax + 6, y + 4.5);

    y += 12;
  });

  dibujarPiePDF(doc);
  doc.save(nombreArchivoPDF('Auditoria', auditoria['Fecha']));
}

function dibujarChipPDF(doc, x, y, etiqueta, valor, color) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_MUTED_PDF);
  doc.text(etiqueta, x, y);

  doc.setFillColor(...color);
  doc.roundedRect(x, y + 3, 75, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(String(valor), x + 5, y + 10);
}

function dibujarListaPDF(doc, titulo, items, y, colorPunto, textoVacio) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...COLOR_TEXT_PDF);
  doc.text(titulo, 15, y);
  y += 8;

  const lista = Array.isArray(items) ? items : [];
  if (lista.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...COLOR_MUTED_PDF);
    doc.text(textoVacio, 15, y);
    return y + 10;
  }

  doc.setFontSize(10);
  lista.forEach(item => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setFillColor(...colorPunto);
    doc.circle(17, y - 1.3, 1.1, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLOR_TEXT_PDF);
    const lineas = doc.splitTextToSize(String(item), 172);
    doc.text(lineas, 22, y);
    y += 6 * lineas.length;
  });

  return y + 6;
}

async function generarPDFInspeccion(idInspeccion) {
  const detalle = await apiGet('getInspeccion', { id: idInspeccion });
  if (!detalle) {
    alert('No se pudo obtener el detalle de la inspección.');
    return;
  }

  if (!window.jspdf || !window.jspdf.jsPDF) {
    throw new Error('No se cargó la librería para generar PDFs (jsPDF). Recargá la página (Ctrl+F5) y probá de nuevo; si sigue, puede haber un bloqueador de contenido activo en el navegador.');
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  let y = await dibujarMembrete(doc, 'Informe de Inspección Inicial');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLOR_MUTED_PDF);
  doc.text(`Fecha de la inspección: ${formatFecha(detalle.fecha)}`, 15, y);
  y += 14;

  const nivel = detalle.nivelOportunidad || '-';
  const prioridad = detalle.prioridadComercial || '-';
  const colorPrioridad = prioridad === 'Alta' ? COLOR_DANGER_PDF
    : (prioridad === 'Media' ? COLOR_WARNING_PDF : COLOR_WARNING_PDF);

  dibujarChipPDF(doc, 15, y, 'Nivel de Oportunidad', nivel, COLOR_ACCENT_PDF);
  dibujarChipPDF(doc, 105, y, 'Prioridad Comercial', prioridad, colorPrioridad);
  y += 26;

  const sinProblemas = !Array.isArray(detalle.problemasDetectados) || detalle.problemasDetectados.length === 0;
  const sinServicios = !Array.isArray(detalle.serviciosSugeridos) || detalle.serviciosSugeridos.length === 0;

  if (sinProblemas && sinServicios) {
    y = dibujarPanelSinHallazgos(doc, y);
  } else {
    y = dibujarListaPDF(doc, 'Problemas detectados', detalle.problemasDetectados, y, COLOR_DANGER_PDF,
      '¡Sin problemas detectados en esta inspección!');
    y += 4;
    y = dibujarListaPDF(doc, 'Servicios sugeridos', detalle.serviciosSugeridos, y, COLOR_SUCCESS_PDF,
      'No se sugirió ningún servicio puntual.');
  }

  dibujarPiePDF(doc);
  doc.save(nombreArchivoPDF('Inspeccion', detalle.fecha));
}

const COLOR_SUCCESS_SOFT_PDF = [225, 245, 238];

function dibujarPanelSinHallazgos(doc, y) {
  const anchoPagina = doc.internal.pageSize.getWidth();
  const anchoCaja = anchoPagina - 30;
  const altoCaja = 28;

  doc.setFillColor(...COLOR_SUCCESS_SOFT_PDF);
  doc.roundedRect(15, y, anchoCaja, altoCaja, 3, 3, 'F');

  // Círculo + tilde dibujados a mano (más confiable que un emoji en jsPDF)
  const cx = 27, cy = y + altoCaja / 2;
  doc.setFillColor(...COLOR_SUCCESS_PDF);
  doc.circle(cx, cy, 5, 'F');
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1.1);
  doc.line(cx - 2.3, cy, cx - 0.5, cy + 2.2);
  doc.line(cx - 0.5, cy + 2.2, cx + 2.8, cy - 2.6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...COLOR_SUCCESS_PDF);
  doc.text('Sin hallazgos en esta inspección', 38, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...COLOR_TEXT_PDF);
  doc.text('No se detectaron problemas ni se sugirieron servicios adicionales.', 38, y + 19);

  return y + altoCaja + 10;
}

// ─────────────────────────────────────────────
// SEGUIMIENTO — por ahora solo linkea al módulo existente (todavía no
// trae los datos de Seguimiento en línea acá; eso queda para la etapa
// de "conectar tabs" con datos propios).
// ─────────────────────────────────────────────

document.getElementById('btnIrSeguimientoVista').setAttribute('href', '../seguimiento/index.html');
