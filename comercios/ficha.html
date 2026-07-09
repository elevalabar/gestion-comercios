// ─────────────────────────────────────────────
// FICHA DE COMERCIO — diagnóstico + prioridad + fotos
// ─────────────────────────────────────────────

const params = new URLSearchParams(window.location.search);
const ID_COMERCIO = params.get('id');

// Cada campo del diagnóstico: id interno -> nombre exacto de columna en el Sheet
const CAMPOS_DIAG = [
  { id: 'sitioweb_ok',  campo: 'Tiene sitio web' },
  { id: 'catalogo',     campo: 'Tiene catálogo' },
  { id: 'whatsapp_ok',  campo: 'Tiene WhatsApp' },
  { id: 'maps_ok',      campo: 'Tiene Google Maps' },
  { id: 'fotos_prop',   campo: 'Fotos propias' },
  { id: 'fotos_ilum',   campo: 'Fotos bien iluminadas' },
  { id: 'fotos_recien', campo: 'Fotos recientes' },
  { id: 'logo_colores', campo: 'Mismo logo/colores' },
  { id: 'bio_clara',    campo: 'Nombre/rubro claro en bio' },
  { id: 'cta',          campo: 'CTA claro' },
  { id: 'boton_wsp',    campo: 'Botón WhatsApp visible' },
  { id: 'horarios',     campo: 'Horarios publicados' }
];

if (!ID_COMERCIO) {
  document.getElementById('tituloComercio').textContent = 'Comercio no especificado';
} else {
  iniciarDiagGrid();
  cargarComercio();
  cargarImagenes();
}

function iniciarDiagGrid() {
  const grid = document.getElementById('diagGrid');
  grid.innerHTML = CAMPOS_DIAG.map(c => `
    <div class="campo">
      <label>${c.campo}</label>
      <select id="${c.id}" class="diag-select">
        <option value="">Sin definir</option>
        <option value="Sí">Sí</option>
        <option value="No">No</option>
      </select>
    </div>
  `).join('');

  document.querySelectorAll('.diag-select').forEach(sel => {
    sel.addEventListener('change', actualizarSugerencia);
  });

  document.getElementById('btnUsarSugerencia').addEventListener('click', () => {
    const sugerida = calcularPrioridadSugerida();
    if (sugerida) document.getElementById('prioridad').value = sugerida;
  });
}

function calcularPrioridadSugerida() {
  const respondidos = CAMPOS_DIAG
    .map(c => document.getElementById(c.id).value)
    .filter(v => v !== '');

  if (respondidos.length === 0) return null;

  const noes = respondidos.filter(v => v === 'No').length;

  if (noes >= 7) return 'Alta';
  if (noes >= 4) return 'Media';
  return 'Baja';
}

function actualizarSugerencia() {
  const sugerida = calcularPrioridadSugerida();
  const texto = document.getElementById('textoSugerencia');
  const respondidos = CAMPOS_DIAG.map(c => document.getElementById(c.id).value).filter(v => v !== '').length;
  const noes = CAMPOS_DIAG.map(c => document.getElementById(c.id).value).filter(v => v === 'No').length;

  if (!sugerida) {
    texto.textContent = 'Completá el diagnóstico para ver una sugerencia.';
  } else {
    texto.textContent = `Sugerencia automática: ${sugerida} (${noes} de ${respondidos} respondidos son "No")`;
  }
}

async function cargarComercio() {
  const c = await apiGet('getComercio', { id: ID_COMERCIO });

  if (!c || c.error) {
    document.getElementById('tituloComercio').textContent = 'No se encontró el comercio';
    return;
  }

  document.getElementById('tituloComercio').textContent = c.Nombre || 'Sin nombre';
  document.getElementById('subtituloComercio').textContent = `${c.Rubro || ''} · alta: ${c['Fecha de alta'] || '-'}`;

  document.getElementById('nombre').value = c.Nombre || '';
  document.getElementById('rubro').value = c.Rubro || '';
  document.getElementById('direccion').value = c['Dirección'] || '';
  document.getElementById('telefono').value = c['Teléfono'] || '';
  document.getElementById('whatsapp').value = c.WhatsApp || '';
  document.getElementById('instagram').value = c.Instagram || '';
  document.getElementById('facebook').value = c.Facebook || '';
  document.getElementById('sitioweb').value = c['Sitio web'] || '';
  document.getElementById('maps').value = c['Google Maps'] || '';
  document.getElementById('ultimaPublicacion').value = c['Última publicación en redes'] || '';
  document.getElementById('observaciones').value = c.Observaciones || '';
  document.getElementById('problemas').value = c['Problemas encontrados'] || '';
  document.getElementById('servicios').value = c['Servicios sugeridos'] || '';
  document.getElementById('prioridad').value = c.Prioridad || '';
  document.getElementById('estado').value = c.Estado || 'Nuevo';

  CAMPOS_DIAG.forEach(campo => {
    const val = c[campo.campo];
    if (val === 'Sí' || val === 'No') document.getElementById(campo.id).value = val;
  });

  actualizarSugerencia();
}

async function cargarImagenes() {
  const imgs = await apiGet('getImagenes', { idComercio: ID_COMERCIO });
  pintarImagenes(Array.isArray(imgs) ? imgs : []);
}

function pintarImagenes(imgs) {
  const grid = document.getElementById('fotosGrid');
  grid.innerHTML = imgs.map(img => `
    <div class="foto-item">
      <img src="${img.URL}" alt="foto">
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
    'Última publicación en redes': document.getElementById('ultimaPublicacion').value.trim(),
    'Observaciones': document.getElementById('observaciones').value.trim(),
    'Problemas encontrados': document.getElementById('problemas').value.trim(),
    'Servicios sugeridos': document.getElementById('servicios').value.trim(),
    'Prioridad': document.getElementById('prioridad').value,
    'Estado': document.getElementById('estado').value
  };

  CAMPOS_DIAG.forEach(c => {
    comercio[c.campo] = document.getElementById(c.id).value;
  });

  try {
    const res = await apiPost('guardarComercio', { comercio });
    if (res.ok) {
      window.location.href = 'index.html';
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
