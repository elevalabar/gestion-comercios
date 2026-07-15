// ─────────────────────────────────────────────
// RESULTADO — muestra el Eleva Score de una auditoría finalizada
// ─────────────────────────────────────────────

const params = new URLSearchParams(window.location.search);
const ID_AUDITORIA = params.get('id');

// Mismas áreas que en AuditoriaBackend.gs — si se agrega un área
// nueva ahí, se agrega también acá.
const AREAS = ['Google', 'Web', 'WhatsApp', 'Redes', 'Catalogo', 'Branding'];

let ID_COMERCIO = null;

document.getElementById('linkVolver').addEventListener('click', (e) => {
  e.preventDefault();
  if (ID_COMERCIO) window.location.href = `../comercios/ficha.html?id=${encodeURIComponent(ID_COMERCIO)}`;
  else window.location.href = '../comercios/index.html';
});

if (!ID_AUDITORIA) {
  document.getElementById('tituloComercio').textContent = 'Auditoría no especificada';
} else {
  init();
}

function formatFecha(valor) {
  if (!valor) return '-';
  const d = new Date(valor);
  if (isNaN(d.getTime())) return valor;
  return d.toLocaleDateString('es-AR');
}

async function init() {
  const auditoria = await apiGet('getAuditoria', { id: ID_AUDITORIA });
  if (!auditoria || auditoria.error) {
    document.getElementById('tituloComercio').textContent = 'No se encontró la auditoría';
    return;
  }

  ID_COMERCIO = auditoria['ID Comercio'];

  if (auditoria['Estado'] !== 'Finalizada') {
    // todavía no tiene score calculado, la mandamos a completarla
    window.location.href = `index.html?id=${encodeURIComponent(ID_AUDITORIA)}`;
    return;
  }

  const comercio = await apiGet('getComercio', { id: ID_COMERCIO });
  document.getElementById('tituloComercio').textContent =
    `Resultado · ${comercio && comercio.Nombre ? comercio.Nombre : ''}`;
  document.getElementById('fechaAuditoria').textContent = `Auditoría del ${formatFecha(auditoria['Fecha'])}`;

  document.getElementById('scoreGeneral').textContent =
    auditoria['Score General'] !== '' && auditoria['Score General'] !== undefined ? auditoria['Score General'] : '-';

  const contenedor = document.getElementById('areasResultado');
  const filas = AREAS
    .map(area => ({ area, valor: auditoria['Score ' + area] }))
    .filter(f => f.valor !== '' && f.valor !== undefined && f.valor !== null);

  if (filas.length === 0) {
    contenedor.innerHTML = '<p class="muted">Esta auditoría no tiene preguntas asociadas a ninguna área.</p>';
    return;
  }

  contenedor.innerHTML = filas.map(f => `
    <div class="fila-area">
      <span class="nombre-area">${f.area}</span>
      <div class="barra"><div class="relleno" style="width:${f.valor}%"></div></div>
      <span class="valor">${f.valor}</span>
    </div>
  `).join('');
}
