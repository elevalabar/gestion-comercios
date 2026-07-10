// ─────────────────────────────────────────────
// FICHA DE COMERCIO — datos permanentes + fotos + historial de auditorías
// (el diagnóstico ya NO vive acá, ver auditoria/)
// ─────────────────────────────────────────────

const params = new URLSearchParams(window.location.search);
const ID_COMERCIO = params.get('id');

if (!ID_COMERCIO) {
  document.getElementById('tituloComercio').textContent = 'Comercio no especificado';
} else {
  cargarComercio();
  cargarImagenes();
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
  document.getElementById('subtituloComercio').textContent = `${c.Rubro || ''} · alta: ${formatFecha(c['Fecha de alta'])}`;

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

// ─────────────────────────────────────────────
// AUDITORÍAS
// ─────────────────────────────────────────────

function badgeClaseAuditoria(estado) {
  return estado === 'Finalizada' ? 'badge-baja' : 'badge-media';
}

async function cargarAuditorias() {
  const lista = await apiGet('getAuditoriasPorComercio', { comercioId: ID_COMERCIO });
  const contenedor = document.getElementById('listaAuditorias');

  if (!Array.isArray(lista) || lista.length === 0) {
    contenedor.innerHTML = '<p class="muted">Todavía no se hizo ninguna auditoría a este comercio.</p>';
    return;
  }

  contenedor.innerHTML = lista.map(a => `
    <a href="../auditoria/resultado.html?id=${encodeURIComponent(a.id)}" class="fila-auditoria">
      <div>
        <p>${formatFecha(a.fecha)}</p>
      </div>
      <div class="der">
        ${a.estado === 'Finalizada' ? `<span class="muted">Score: ${a.scoreGeneral ?? '-'}</span>` : ''}
        <span class="badge ${badgeClaseAuditoria(a.estado)}">${a.estado}</span>
      </div>
    </a>
  `).join('');
}

document.getElementById('btnIniciarAuditoria').addEventListener('click', async (e) => {
  const btn = e.target;
  btn.disabled = true;
  btn.textContent = 'Iniciando...';
  try {
    const res = await apiPost('iniciarAuditoria', { comercioId: ID_COMERCIO });
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
