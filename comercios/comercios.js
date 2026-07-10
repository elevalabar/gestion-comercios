// ─────────────────────────────────────────────
// LISTADO DE COMERCIOS — con buscador en vivo y eliminación
// ─────────────────────────────────────────────

let TODOS_LOS_COMERCIOS = [];

function badgeClase(prioridad) {
  if (prioridad === 'Alta') return 'badge-alta';
  if (prioridad === 'Media') return 'badge-media';
  return 'badge-baja';
}

function pintarLista(lista) {
  const contenedor = document.getElementById('listaComercios');

  if (lista.length === 0) {
    contenedor.innerHTML = '<p class="muted">No se encontraron comercios.</p>';
    return;
  }

  contenedor.innerHTML = lista.map(c => `
    <a href="ficha.html?id=${encodeURIComponent(c.ID)}" class="fila-comercio">
      <div>
        <p class="nombre">${c.Nombre || 'Sin nombre'}</p>
        <p class="detalle">${c.Rubro || ''}</p>
      </div>
      <div class="der">
        <span class="badge ${badgeClase(c.Prioridad)}">${c.Prioridad || 'Sin definir'}</span>
        <span class="muted">${c.Estado || ''}</span>
        <button type="button" class="btn-eliminar" data-id="${c.ID}" data-nombre="${(c.Nombre || 'este comercio').replace(/"/g, '&quot;')}" title="Eliminar">✕</button>
      </div>
    </a>
  `).join('');

  document.querySelectorAll('.btn-eliminar').forEach(btn => {
    btn.addEventListener('click', onClickEliminar);
  });
}

async function onClickEliminar(e) {
  // el botón vive adentro del <a> de la fila: si no frenamos esto acá,
  // el clic también navega a la ficha del comercio.
  e.preventDefault();
  e.stopPropagation();

  const id = e.currentTarget.dataset.id;
  const nombre = e.currentTarget.dataset.nombre;

  const confirmado = confirm(`¿Eliminar "${nombre}"? Esto también borra sus fotos. No se puede deshacer.`);
  if (!confirmado) return;

  e.currentTarget.disabled = true;
  try {
    const res = await apiPost('eliminarComercio', { id });
    if (res.ok) {
      TODOS_LOS_COMERCIOS = TODOS_LOS_COMERCIOS.filter(c => c.ID !== id);
      pintarLista(TODOS_LOS_COMERCIOS);
    } else {
      alert(res.error || 'No se pudo eliminar el comercio.');
      e.currentTarget.disabled = false;
    }
  } catch (err) {
    alert('No se pudo conectar con el servidor. Probá de nuevo.');
    e.currentTarget.disabled = false;
  }
}

async function cargarComercios() {
  const res = await apiGet('getComercios');

  if (!res.ok && res.error) {
    document.getElementById('listaComercios').innerHTML =
      `<p class="muted">No se pudo cargar la información (${res.error}).</p>`;
    return;
  }

  TODOS_LOS_COMERCIOS = Array.isArray(res) ? res : [];
  pintarLista(TODOS_LOS_COMERCIOS);
}

document.getElementById('buscador').addEventListener('input', (e) => {
  const texto = e.target.value.toLowerCase().trim();
  const filtrados = TODOS_LOS_COMERCIOS.filter(c =>
    (c.Nombre || '').toLowerCase().includes(texto) ||
    (c.Rubro || '').toLowerCase().includes(texto)
  );
  pintarLista(filtrados);
});

cargarComercios();
