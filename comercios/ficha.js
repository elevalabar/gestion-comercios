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

let comercioActual = null;
let auditoriasActuales = [];
let inspeccionesActuales = [];

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
  const [c, auds, insps] = await Promise.all([
    apiGet('getComercio', { id: ID_COMERCIO }),
    apiGet('getAuditoriasPorComercio', { idComercio: ID_COMERCIO }),
    apiGet('getInspeccionesPorComercio', { idComercio: ID_COMERCIO })
  ]);

  if (!c || c.error) {
    document.getElementById('tituloComercio').textContent = 'No se encontró el comercio';
    return;
  }

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

  cargarImagenes();
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

    const barras = AREAS_SCORE.map(area => {
      const valor = auditoriaReciente['Score ' + area.clave];
      const num = (valor === '' || valor === undefined) ? 0 : Number(valor);
      return `
        <div class="barra-fila">
          <div class="barra-label"><span>${area.label}</span><span>${valor === '' || valor === undefined ? '—' : num}</span></div>
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

async function cargarImagenes() {
  const imgs = await apiGet('getImagenes', { idComercio: ID_COMERCIO });
  pintarImagenes(Array.isArray(imgs) ? imgs : []);
}

function pintarImagenes(imgs) {
  const grid = document.getElementById('fotosGridVista');

  // Portada del panel izquierdo: usa la primera foto cargada, si hay.
  const fotoPanel = document.getElementById('fotoComercioVista');
  if (imgs.length > 0) {
    fotoPanel.innerHTML = `<img src="${imgs[0].URL}" alt="Foto de portada">`;
  } else {
    fotoPanel.innerHTML = '<span class="sin-foto">Sin foto</span>';
  }

  grid.innerHTML = imgs.map(img => `
    <div class="foto-item">
      <a href="${img.URL}" target="_blank" rel="noopener">
        <img src="${img.URL}" alt="foto">
      </a>
      <button type="button" data-id="${img['ID Imagen']}" class="btnEliminarFoto">✕</button>
    </div>
  `).join('');

  document.querySelectorAll('.btnEliminarFoto').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      await apiPost('eliminarImagen', { idImagen: btn.dataset.id });
      cargarImagenes();
    });
  });
}

document.getElementById('inputFotoVista').addEventListener('change', async (e) => {
  const archivo = e.target.files[0];
  if (!archivo) return;

  const lector = new FileReader();
  lector.onload = async (ev) => {
    const base64 = ev.target.result.split(',')[1];
    await apiPost('subirImagen', {
      idComercio: ID_COMERCIO,
      nombreArchivo: archivo.name,
      tipo: archivo.type,
      datos: base64
    });
    document.getElementById('inputFotoVista').value = '';
    cargarImagenes();
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
      <a href="${href}" class="fila-auditoria">
        <div>
          <p>${formatFecha(i.fecha)}</p>
        </div>
        <div class="der">
          ${i.estado === 'Finalizada' ? `<span class="muted">${i.nivelOportunidad || '-'} · Prioridad ${i.prioridadComercial || '-'}</span>` : ''}
          <span class="badge ${badgeClaseInspeccion(i.estado)}">${i.estado}</span>
        </div>
      </a>`;
  }).join('');
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
      <button type="button" class="btnEliminarAuditoria" data-id="${a['ID Auditoria']}" title="Eliminar auditoría">✕</button>
    </div>
  `).join('');

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
// SEGUIMIENTO — por ahora solo linkea al módulo existente (todavía no
// trae los datos de Seguimiento en línea acá; eso queda para la etapa
// de "conectar tabs" con datos propios).
// ─────────────────────────────────────────────

document.getElementById('btnIrSeguimientoVista').setAttribute('href', '../seguimiento/index.html');
