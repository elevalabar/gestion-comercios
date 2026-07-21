// ─────────────────────────────────────────────
// PANEL — estadísticas + listado reciente
// ─────────────────────────────────────────────

function badgeClase(prioridad) {
  if (prioridad === 'Alta') return 'badge-alta';
  if (prioridad === 'Media') return 'badge-media';
  return 'badge-baja';
}

async function cargarPanel() {
  // Reutilizar datos si ya están en sessionStorage (cargados por comercios.js)
  let comercios = [];
  const cache = sessionStorage.getItem('eleva_comercios_cache');
  const cacheTime = sessionStorage.getItem('eleva_comercios_cache_time');
  const CACHE_TTL = 2 * 60 * 1000; // 2 minutos

  if (cache && cacheTime && (Date.now() - Number(cacheTime)) < CACHE_TTL) {
    try {
      comercios = JSON.parse(cache);
    } catch (e) { /* falla silencioso, sigue a fetch */ }
  }

  if (comercios.length === 0) {
    const res = await apiGet('getComercios');
    if (!res.ok && res.error) {
      document.getElementById('listaRecientes').innerHTML =
        `<p class="muted">No se pudo cargar la información (${res.error}).</p>`;
      return;
    }
    comercios = Array.isArray(res) ? res : [];
    sessionStorage.setItem('eleva_comercios_cache', JSON.stringify(comercios));
    sessionStorage.setItem('eleva_comercios_cache_time', String(Date.now()));
  }

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
    <div class="fila-comercio" style="cursor: pointer;" onclick="window.location.href='../comercios/ficha.html?id=${encodeURIComponent(c.ID)}'">
      <div>
        <p class="nombre">${c.Nombre || 'Sin nombre'}</p>
        <p class="detalle">${c.Rubro || ''}</p>
      </div>
      <span class="badge ${badgeClase(c.Prioridad)}">${c.Prioridad || 'Sin definir'}</span>
    </div>
  `).join('');
}

cargarPanel();
