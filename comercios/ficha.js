// ─────────────────────────────────────────────
// FICHA DE COMERCIO — datos permanentes + fotos + historial de
// inspecciones iniciales + historial de auditorías
// (el diagnóstico ya NO vive acá, ver auditoria/)
// ─────────────────────────────────────────────

const params = new URLSearchParams(window.location.search);
const ID_COMERCIO = params.get('id');

// Íconos de contacto (mismo set visual que usa el resto de la app)
const ICONOS_CONTACTO = {
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>',
  sitioweb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/></svg>',
  maps: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 20l1.1-5.4A8.5 8.5 0 1 1 21 11.5z"/></svg>',
  telefono: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.4 2.1L8 9.9a16 16 0 0 0 6 6l1.4-1.4a2 2 0 0 1 2.1-.4c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.8 2.1z"/></svg>'
};

// caches livianos para calcular estadísticas de "Actividad" sin volver a pedir datos
let CACHE_INSPECCIONES = [];
let CACHE_AUDITORIAS = [];

if (!ID_COMERCIO) {
  document.getElementById('tituloComercio').textContent = 'Comercio no especificado';
} else {
  cargarComercio();
  cargarImagenes();
  cargarInspecciones();
  cargarAuditorias();
}

function formatFecha(valor) {
  if (!valor) return '-';
  const d = new Date(valor);
  if (isNaN(d.getTime())) return valor; // ya viene como texto no parseable, se muestra tal cual
  return d.toLocaleDateString('es-AR');
}

async function cargarComercio() {
  const c = await apiGet('getComercio', { id: ID_COMERCIO });

  if (!c || c.error) {
    document.getElementById('tituloComercio').textContent = 'No se encontró el comercio';
    return;
  }

  document.getElementById('tituloComercio').textContent = c.Nombre || 'Sin nombre';
  document.getElementById('subtituloComercio') && (document.getElementById('subtituloComercio').textContent = `${c.Rubro || ''} · alta: ${formatFecha(c['Fecha de alta'])}`);

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

  actualizarLinksClicables();
  poblarVistaPerfil(c);
}

// ─────────────────────────────────────────────
// VISTA DE PERFIL (lectura) — arma la cabecera, el panel de contacto
// y el resumen de notas a partir de los mismos datos que ya carga el
// formulario. No agrega ningún dato que no exista en el comercio.
// ─────────────────────────────────────────────

function poblarVistaPerfil(c) {
  document.getElementById('tituloComercio').textContent = c.Nombre || 'Sin nombre';

  const badgeEstado = document.getElementById('badgeEstado');
  if (c.Estado) {
    badgeEstado.textContent = c.Estado;
    badgeEstado.classList.remove('oculto');
  }

  const badgePrioridad = document.getElementById('badgePrioridad');
  if (c.Prioridad) {
    badgePrioridad.innerHTML = `<span class="badge-dot"></span>${c.Prioridad}`;
    badgePrioridad.className = 'badge ' + (c.Prioridad === 'Alta' ? 'badge-alta' : c.Prioridad === 'Media' ? 'badge-media' : 'badge-activo');
    badgePrioridad.classList.remove('oculto');
  }

  const descripcion = document.getElementById('descripcionComercio');
  if (c.Observaciones) {
    descripcion.textContent = c.Observaciones;
    descripcion.classList.remove('oculto');
  }

  if (c['Dirección']) {
    document.getElementById('txtDireccion').textContent = c['Dirección'];
    document.getElementById('metaDireccion').classList.remove('oculto');
  }
  if (c.Rubro) {
    document.getElementById('txtRubro').textContent = c.Rubro;
    document.getElementById('metaRubro').classList.remove('oculto');
  }
  document.getElementById('txtFechaAlta').textContent = `Creado el ${formatFecha(c['Fecha de alta'])}`;

  // Panel de contacto — solo se listan los canales que tienen un valor cargado
  const filasContacto = [
    { tipo: 'instagram', label: c.Instagram, clase: 'ic-instagram' },
    { tipo: 'facebook', label: c.Facebook, clase: 'ic-facebook' },
    { tipo: 'sitioweb', label: c['Sitio web'], clase: 'ic-web' },
    { tipo: 'maps', label: c['Google Maps'] ? 'Ver en Google Maps' : '', clase: 'ic-maps' },
    { tipo: 'whatsapp', label: c.WhatsApp, clase: 'ic-whatsapp' },
    { tipo: 'telefono', label: c['Teléfono'], clase: 'ic-telefono' }
  ].filter(f => f.label);

  const listaContacto = document.getElementById('listaContacto');
  if (filasContacto.length === 0) {
    listaContacto.innerHTML = '';
    document.getElementById('sinContacto').classList.remove('oculto');
  } else {
    document.getElementById('sinContacto').classList.add('oculto');
    listaContacto.innerHTML = filasContacto.map(f => {
      const url = construirLink(f.tipo, f.tipo === 'maps' ? c['Google Maps'] : f.label);
      return `
        <div class="contacto-fila">
          <span class="icono-contacto ${f.clase}">${ICONOS_CONTACTO[f.tipo]}</span>
          <a class="valor" href="${url || '#'}" target="_blank" rel="noopener">${f.label}</a>
          <span class="abrir"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14L21 3"/></svg></span>
        </div>`;
    }).join('');
  }

  // Notas y seguimiento (misma info que el formulario, en modo lectura)
  document.getElementById('viewObservaciones').value = c.Observaciones || 'Sin observaciones cargadas.';
  document.getElementById('viewProblemas').value = c['Problemas encontrados'] || 'Sin problemas registrados.';
  document.getElementById('viewServicios').value = c['Servicios sugeridos'] || 'Sin servicios sugeridos aún.';
}

// ─────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────

document.getElementById('tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab');
  if (!btn) return;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('activo'));
  document.querySelectorAll('.panel-tab').forEach(p => p.classList.remove('activo'));
  btn.classList.add('activo');
  document.querySelector(`.panel-tab[data-panel="${btn.dataset.tab}"]`).classList.add('activo');
});

// ─────────────────────────────────────────────
// TOGGLE DEL PANEL DE EDICIÓN
// ─────────────────────────────────────────────

function abrirEdicion() {
  document.getElementById('bloqueEdicion').classList.remove('oculto');
  document.getElementById('bloqueEdicion').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function cerrarEdicion() {
  document.getElementById('bloqueEdicion').classList.add('oculto');
}

document.getElementById('btnEditarComercio').addEventListener('click', abrirEdicion);
document.getElementById('btnAccionEditar').addEventListener('click', abrirEdicion);
document.getElementById('btnCerrarEdicion').addEventListener('click', cerrarEdicion);
document.getElementById('btnCancelarEdicion').addEventListener('click', cerrarEdicion);

// Accesos rápidos del Resumen — reutilizan los botones/acciones que ya existen
document.getElementById('btnAccionInspeccion').addEventListener('click', () => {
  document.querySelector('.tab[data-tab="inspecciones"]').click();
  document.getElementById('btnIniciarInspeccion').click();
});
document.getElementById('btnAccionAuditoria').addEventListener('click', () => {
  document.querySelector('.tab[data-tab="auditorias"]').click();
  document.getElementById('btnIniciarAuditoria').click();
});
document.getElementById('btnAccionFoto').addEventListener('click', () => {
  document.querySelector('.tab[data-tab="fotos"]').click();
  document.getElementById('inputFoto').click();
});

// ─────────────────────────────────────────────
// LINKS CLICKEABLES — junto a Teléfono/WhatsApp/Instagram/Facebook/
// Sitio web/Google Maps se muestra un botón "↗" que abre el link en una
// pestaña nueva, sin dejar de poder editar el input de al lado.
// ─────────────────────────────────────────────

function construirLink(tipo, valorCrudo) {
  const valor = (valorCrudo || '').trim();
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

async function cargarImagenes() {
  const imgs = await apiGet('getImagenes', { idComercio: ID_COMERCIO });
  pintarImagenes(Array.isArray(imgs) ? imgs : []);
}

function pintarImagenes(imgs) {
  const grid = document.getElementById('fotosGrid');
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

  // Foto de portada en la cabecera del perfil (la primera foto cargada)
  const portada = document.getElementById('fotoPortada');
  const portadaVacia = document.getElementById('fotoPortadaVacia');
  if (imgs.length > 0) {
    portada.src = imgs[0].URL;
    portada.style.display = '';
    portadaVacia.style.display = 'none';
  } else {
    portada.style.display = 'none';
    portadaVacia.style.display = '';
  }
}

document.getElementById('inputFoto').addEventListener('change', async (e) => {
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
    document.getElementById('inputFoto').value = '';
    cargarImagenes();
  };
  lector.readAsDataURL(archivo);
});

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
    'Estado': document.getElementById('estado').value
  };

  try {
    const res = await apiPost('guardarComercio', { comercio });
    if (res.ok) {
      // En vez de volver al listado, quedamos en la ficha con la vista de
      // perfil ya actualizada — el guardado en sí no cambió.
      cerrarEdicion();
      cargarComercio();
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
// INSPECCIONES INICIALES
// ─────────────────────────────────────────────

function badgeClaseInspeccion(estado) {
  if (estado === 'Finalizada') return 'badge-baja';
  if (estado === 'Omitida') return 'badge-baja';
  return 'badge-media';
}

async function cargarInspecciones() {
  const lista = await apiGet('getInspeccionesPorComercio', { idComercio: ID_COMERCIO });
  const contenedor = document.getElementById('listaInspecciones');
  const btnIniciar = document.getElementById('btnIniciarInspeccion');

  // Comercios cargados antes de este módulo no tienen ninguna Inspección
  // todavía (la hoja Inspecciones simplemente no tiene filas para su ID) —
  // nunca se asume que ya existe una. El botón cambia de texto según haya
  // o no historial, para que quede claro que es la primera vez.
  const hayHistorial = Array.isArray(lista) && lista.length > 0;
  btnIniciar.textContent = hayHistorial ? '+ Iniciar nueva inspección' : 'Realizar Inspección Inicial';

  CACHE_INSPECCIONES = hayHistorial ? lista : [];
  actualizarStatsActividad();

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
          <p class="fecha-auditoria">${formatFecha(i.fecha)}</p>
        </div>
        <div class="der">
          ${i.estado === 'Finalizada' ? `<span class="muted">${i.nivelOportunidad || '-'} · Prioridad ${i.prioridadComercial || '-'}</span>` : ''}
          <span class="badge ${badgeClaseInspeccion(i.estado)}">${i.estado}</span>
        </div>
      </a>`;
  }).join('');
}

document.getElementById('btnIniciarInspeccion').addEventListener('click', async (e) => {
  const btn = e.target;
  btn.disabled = true;
  btn.textContent = 'Iniciando...';
  try {
    const res = await apiPost('iniciarInspeccion', { idComercio: ID_COMERCIO });
    if (res.ok) {
      window.location.href = `../inspeccion/index.html?id=${encodeURIComponent(res.id)}`;
    } else {
      alert(res.error || 'No se pudo iniciar la inspección.');
    }
  } catch (err) {
    alert('No se pudo conectar con el servidor. Probá de nuevo.');
  } finally {
    btn.disabled = false;
    cargarInspecciones(); // recalcula el texto correcto (con o sin historial) en vez de hardcodearlo acá
  }
});

// ─────────────────────────────────────────────
// AUDITORÍAS
// ─────────────────────────────────────────────

function badgeClaseAuditoria(estado) {
  return estado === 'Finalizada' ? 'badge-baja' : 'badge-media';
}

async function cargarAuditorias() {
  const lista = await apiGet('getAuditoriasPorComercio', { idComercio: ID_COMERCIO });
  const contenedor = document.getElementById('listaAuditorias');

  CACHE_AUDITORIAS = Array.isArray(lista) ? lista : [];
  actualizarStatsActividad();

  if (!Array.isArray(lista) || lista.length === 0) {
    contenedor.innerHTML = '<p class="muted">Todavía no se hizo ninguna auditoría a este comercio.</p>';
    return;
  }

  contenedor.innerHTML = lista.map(a => `
    <div class="fila-auditoria">
      <a href="../auditoria/resultado.html?id=${encodeURIComponent(a['ID Auditoria'])}">
        <div>
          <p class="fecha-auditoria">${formatFecha(a['Fecha'])}</p>
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
          cargarAuditorias();
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

document.getElementById('btnIniciarAuditoria').addEventListener('click', async (e) => {
  const btn = e.target;
  btn.disabled = true;
  btn.textContent = 'Iniciando...';
  try {
    const res = await apiPost('iniciarAuditoria', { idComercio: ID_COMERCIO });
    if (res.ok) {
      window.location.href = `../auditoria/index.html?id=${encodeURIComponent(res.id)}`;
    } else {
      alert(res.error || 'No se pudo iniciar la auditoría.');
    }
  } catch (err) {
    alert('No se pudo conectar con el servidor. Probá de nuevo.');
  } finally {
    btn.disabled = false;
    btn.textContent = '+ Iniciar nueva auditoría';
  }
});

// ─────────────────────────────────────────────
// RESUMEN DE ACTIVIDAD — cuenta real de inspecciones/auditorías y
// último score, calculado a partir de las mismas listas que ya se piden.
// ─────────────────────────────────────────────

function actualizarStatsActividad() {
  document.getElementById('statInspecciones').textContent = CACHE_INSPECCIONES.length;
  document.getElementById('statAuditorias').textContent = CACHE_AUDITORIAS.length;

  const auditoriasFinalizadas = CACHE_AUDITORIAS.filter(a => a['Estado'] === 'Finalizada' && a['Score General'] != null);
  const ultimaConScore = auditoriasFinalizadas[0]; // la API ya las devuelve ordenadas por fecha
  document.getElementById('statScore').textContent = ultimaConScore ? ultimaConScore['Score General'] : '–';

  const partes = [];
  if (CACHE_AUDITORIAS[0]) partes.push(`Última auditoría: ${formatFecha(CACHE_AUDITORIAS[0]['Fecha'])}`);
  if (CACHE_INSPECCIONES[0]) partes.push(`Última inspección: ${formatFecha(CACHE_INSPECCIONES[0].fecha)}`);
  document.getElementById('txtUltimaActividad').textContent = partes.length ? partes.join(' · ') : 'Todavía no hay actividad registrada en este comercio.';
}
