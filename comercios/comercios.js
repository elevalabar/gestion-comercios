// ─────────────────────────────────────────────
// LISTADO DE COMERCIOS — con buscador en vivo
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
      </div>
    </a>
  `).join('');
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
