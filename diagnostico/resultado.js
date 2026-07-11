// ─────────────────────────────────────────────
// RESULTADO DEL DIAGNÓSTICO
// Los puntajes vienen calculados desde el backend (guardarEnvioDiagnostico)
// y llegan acá por query string. Si DiagReglasPuntaje todavía no tiene
// reglas cargadas para una categoría, el valor llega vacío — se
// muestra un mensaje neutro en vez de "0%" o "NaN%".
//
// Urgencia es un caso aparte: no se muestra como barra de %, sino como
// una etiqueta (Baja/Media/Alta/Muy alta) — mide impacto/dolor, no
// madurez del negocio.
// ─────────────────────────────────────────────

const CATEGORIAS = ['Presencia Digital', 'Organizacion', 'Marketing y Captacion', 'Ventas y Gestion'];

const ETIQUETAS = {
  'Presencia Digital': 'Presencia digital',
  'Organizacion': 'Organización',
  'Marketing y Captacion': 'Marketing y captación',
  'Ventas y Gestion': 'Ventas y gestión'
};

// Sugerencias genéricas por categoría cuando el puntaje es bajo (<50).
// Son un punto de partida — no dependen de qué preguntas específicas
// se respondieron, así que no hace falta tocar este archivo si cambia
// el cuestionario.
const SUGERENCIAS = {
  'Presencia Digital': [
    'Crear o completar tu perfil de Google Business',
    'Sumar WhatsApp Business con catálogo',
    'Ordenar tus redes con la misma info de contacto y horarios'
  ],
  'Organizacion': [
    'Pasar tus pedidos de la memoria/papel a una agenda digital simple',
    'Definir un lugar único donde anotar todo (evita olvidos)'
  ],
  'Marketing y Captacion': [
    'Publicar contenido con más regularidad',
    'Sumar un canal nuevo de captación (recomendaciones, publicidad paga)'
  ],
  'Ventas y Gestion': [
    'Empezar a emitir facturas de forma más consistente',
    'Llevar un registro simple de ingresos y gastos'
  ]
};

const COLOR_URGENCIA = {
  'Baja': '#4ade80',
  'Media': '#facc15',
  'Alta': '#fb923c',
  'Muy alta': '#f87171'
};

const params = new URLSearchParams(window.location.search);

function pintarUrgencia() {
  const nivel = params.get('NivelUrgencia');
  if (!nivel) return;

  const cont = document.getElementById('urgencia');
  cont.innerHTML = `
    <div class="urgencia-badge" style="border-color:${COLOR_URGENCIA[nivel] || '#888'}">
      <span class="urgencia-label">Nivel de urgencia</span>
      <span class="urgencia-valor" style="color:${COLOR_URGENCIA[nivel] || '#888'}">${nivel}</span>
    </div>
    <p class="muted urgencia-nota">Qué tan urgente es resolver el problema que nos contaste — no mide qué tan bien está tu negocio, sino cuánto te está doliendo hoy.</p>
  `;
}

function pintarCategorias() {
  const cont = document.getElementById('categorias');
  cont.innerHTML = CATEGORIAS.map(cat => {
    const valor = params.get(cat);
    const tieneValor = valor !== null && valor !== '' && !isNaN(Number(valor));
    const pct = tieneValor ? Number(valor) : 0;

    return `
      <div class="categoria">
        <div class="categoria-header">
          <span>${ETIQUETAS[cat]}</span>
          <span class="valor">${tieneValor ? pct + '%' : 'Próximamente'}</span>
        </div>
        <div class="barra"><div class="relleno" style="width:${tieneValor ? pct : 0}%"></div></div>
      </div>`;
  }).join('');
}

function pintarOportunidades() {
  const lista = document.getElementById('listaOportunidades');
  const items = [];

  CATEGORIAS.forEach(cat => {
    const valor = params.get(cat);
    const tieneValor = valor !== null && valor !== '' && !isNaN(Number(valor));
    if (!tieneValor || Number(valor) < 50) {
      (SUGERENCIAS[cat] || []).forEach(s => items.push(s));
    }
  });

  if (!items.length) {
    lista.innerHTML = '<li>¡Buen puntaje general! Seguí así.</li>';
    return;
  }

  lista.innerHTML = items.slice(0, 5).map(s => `<li>→ ${s}</li>`).join('');
}

pintarUrgencia();
pintarCategorias();
pintarOportunidades();
