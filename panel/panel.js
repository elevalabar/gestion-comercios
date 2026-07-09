// ─────────────────────────────────────────────
// PANEL — estadísticas + listado reciente
// ─────────────────────────────────────────────

function badgeClase(prioridad) {
  if (prioridad === 'Alta') return 'badge-alta';
  if (prioridad === 'Media') return 'badge-media';
  return 'badge-baja';
}

async function cargarPanel() {
  const res = await apiGet('getComercios');

  if (!res.ok && res.error) {
    document.getElementById('listaRecientes').innerHTML =
      `<p class="muted">No se pudo cargar la información (${res.error}).</p>`;
    return;
  }

  const comercios = Array.isArray(res) ? res : [];

  const total = comercios.length;
  const enSeguimiento = comercios.filter(c => c.Estado === 'En seguimiento' || c.Estado === 'Contactado').length;
  const clientes = comercios.filter(c => c.Estado === 'Cliente').length;
  const prioridadAlta = comercios.filter(c => c.Prioridad === 'Alta').length;

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statSeguimiento').textContent = enSeguimiento;
  document.getElementById('statClientes').textContent = clientes;
  document.getElementById('statAlta').textContent = prioridadAlta;

  const recientes = [...comercios]
    .sort((a, b) => new Date(b['Fecha de alta']) - new Date(a['Fecha de alta']))
    .slice(0, 5);

  const contenedor = document.getElementById('listaRecientes');

  if (recientes.length === 0) {
    contenedor.innerHTML = '<p class="muted">Todavía no cargaste ningún comercio.</p>';
    return;
  }

  contenedor.innerHTML = recientes.map(c => `
    <div class="fila-comercio">
      <div>
        <p class="nombre">${c.Nombre || 'Sin nombre'}</p>
        <p class="detalle">${c.Rubro || ''}</p>
      </div>
      <span class="badge ${badgeClase(c.Prioridad)}">${c.Prioridad || 'Sin definir'}</span>
    </div>
  `).join('');
}

cargarPanel();
