// ─────────────────────────────────────────────
// SEGUIMIENTO — listado de comercios en seguimiento activo
// ─────────────────────────────────────────────

let TODOS_EN_SEGUIMIENTO = [];

function badgeClaseEstado(estado) {
  if (estado === 'En seguimiento') return 'badge-alta';
  if (estado === 'Contactado') return 'badge-media';
  return 'badge-baja';
}

function pintarLista(lista) {
  const contenedor = document.getElementById('listaSeguimiento');

  if (lista.length === 0) {
    contenedor.innerHTML = '<p class="muted">No hay comercios en seguimiento activo.</p>';
    return;
  }

  contenedor.innerHTML = lista.map(c => `
    <a href="detalle.html?id=${encodeURIComponent(c.ID)}" class="fila-comercio">
      <div>
        <p class="nombre">${c.Nombre || 'Sin nombre'}</p>
        <p class="detalle">${c.Rubro || ''}</p>
      </div>
      <div class="der">
        <span class="badge ${badgeClaseEstado(c.Estado)}">${c.Estado || 'Sin definir'}</span>
      </div>
    </a>
  `).join('');
}

async function cargarComercios() {
  const res = await apiGet('getComercios');

  if (!res.ok && res.error) {
    document.getElementById('listaSeguimiento').innerHTML =
      `<p class="muted">No se pudo cargar la información (${res.error}).</p>`;
    return;
  }

  const todos = Array.isArray(res) ? res : [];
  TODOS_EN_SEGUIMIENTO = todos.filter(c => c.Estado === 'Contactado' || c.Estado === 'En seguimiento');
  pintarLista(TODOS_EN_SEGUIMIENTO);
}

document.getElementById('buscador').addEventListener('input', (e) => {
  const texto = e.target.value.toLowerCase().trim();
  const filtrados = TODOS_EN_SEGUIMIENTO.filter(c =>
    (c.Nombre || '').toLowerCase().includes(texto) ||
    (c.Rubro || '').toLowerCase().includes(texto)
  );
  pintarLista(filtrados);
});

cargarComercios();
