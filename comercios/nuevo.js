// ─────────────────────────────────────────────
// ALTA DE COMERCIO
//
// Antes de crear el registro, se busca por nombre (ignorando mayúsculas/
// minúsculas, tildes y espacios de más — normalización que hace el
// backend en buscarComerciosPorNombre_). Si hay coincidencias, se
// muestra un modal con los comercios existentes en vez de guardar
// directamente, y el usuario elige "Ver comercio" (por cada coincidencia),
// "Cancelar" (vuelve al formulario sin guardar) o "Crear igualmente"
// (guarda el comercio nuevo tal cual, aunque el nombre se repita).
//
// Etapa 2 (pendiente, fuera de este cambio): sumar Teléfono, Google Maps,
// Sitio web e Instagram a la detección para mejorar la precisión — hoy
// solo compara por Nombre.
//
// Al guardar, la Inspección Inicial arranca automáticamente (es parte
// del flujo de alta) — si iniciarInspeccion falla por algún motivo, no
// bloqueamos: el comercio ya quedó guardado, así que mandamos igual a
// la ficha para no dejar al usuario colgado.
// ─────────────────────────────────────────────

const form = document.getElementById('formNuevo');
const msgError = document.getElementById('msgError');
const btnGuardar = document.getElementById('btnGuardar');

const modalDuplicados = document.getElementById('modalDuplicados');
const listaDuplicados = document.getElementById('listaDuplicados');
const btnCancelarDuplicado = document.getElementById('btnCancelarDuplicado');
const btnCrearIgualmente = document.getElementById('btnCrearIgualmente');

let comercioPendiente = null; // guarda los datos del form mientras el modal está abierto

function leerComercioDelForm() {
  return {
    'Nombre': document.getElementById('nombre').value.trim(),
    'Rubro': document.getElementById('rubro').value.trim(),
    'Dirección': document.getElementById('direccion').value.trim(),
    'Teléfono': document.getElementById('telefono').value.trim(),
    'WhatsApp': document.getElementById('whatsapp').value.trim(),
    'Instagram': document.getElementById('instagram').value.trim(),
    'Facebook': document.getElementById('facebook').value.trim(),
    'Sitio web': document.getElementById('sitioweb').value.trim(),
    'Google Maps': document.getElementById('maps').value.trim()
  };
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msgError.classList.remove('visible');
  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Buscando duplicados...';

  const comercio = leerComercioDelForm();

  try {
    const duplicados = await apiGet('buscarComerciosPorNombre', { nombre: comercio.Nombre });
    if (Array.isArray(duplicados) && duplicados.length > 0) {
      comercioPendiente = comercio;
      mostrarModalDuplicados(duplicados);
      btnGuardar.disabled = false;
      btnGuardar.textContent = 'Guardar y continuar';
      return;
    }
  } catch (err) {
    // si falla la búsqueda de duplicados no bloqueamos el alta por eso;
    // seguimos directo a guardar como si no hubiera coincidencias
  }

  await guardarYContinuar(comercio);
});

function mostrarModalDuplicados(duplicados) {
  listaDuplicados.innerHTML = duplicados.map(c => `
    <div class="fila-duplicado">
      <div>
        <p class="nombre">${c.nombre}</p>
        <p class="direccion">${c.direccion || 'Sin dirección cargada'}${c.rubro ? ' · ' + c.rubro : ''}</p>
      </div>
      <a href="ficha.html?id=${encodeURIComponent(c.id)}" class="btn" target="_blank" rel="noopener">Ver comercio</a>
    </div>
  `).join('');
  modalDuplicados.classList.remove('oculto');
}

function cerrarModalDuplicados() {
  modalDuplicados.classList.add('oculto');
  comercioPendiente = null;
}

btnCancelarDuplicado.addEventListener('click', () => {
  cerrarModalDuplicados();
});

btnCrearIgualmente.addEventListener('click', async () => {
  if (!comercioPendiente) return;
  const comercio = comercioPendiente;
  cerrarModalDuplicados();
  await guardarYContinuar(comercio);
});

async function guardarYContinuar(comercio) {
  msgError.classList.remove('visible');
  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Guardando...';

  try {
    const res = await apiPost('guardarComercio', { comercio });
    if (!res.ok) {
      msgError.textContent = res.error || 'No se pudo guardar el comercio.';
      msgError.classList.add('visible');
      btnGuardar.disabled = false;
      btnGuardar.textContent = 'Guardar y continuar';
      return;
    }

    try {
      const insp = await apiPost('iniciarInspeccion', { idComercio: res.id });
      if (insp.ok) {
        window.location.href = `../inspeccion/index.html?id=${encodeURIComponent(insp.id)}`;
        return;
      }
    } catch (err) {
      // no se pudo iniciar la inspección automáticamente; el comercio ya
      // quedó guardado, así que no bloqueamos al usuario acá
    }

    window.location.href = `ficha.html?id=${encodeURIComponent(res.id)}`;
  } catch (err) {
    msgError.textContent = 'No se pudo conectar con el servidor. Probá de nuevo.';
    msgError.classList.add('visible');
    btnGuardar.disabled = false;
    btnGuardar.textContent = 'Guardar y continuar';
  }
}
