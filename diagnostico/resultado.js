// ─────────────────────────────────────────────
// RESULTADO DEL DIAGNÓSTICO
// Los puntajes vienen calculados desde el backend (guardarEnvioDiagnostico)
// y llegan acá por query string. Si DiagReglasPuntaje todavía no tiene
// reglas cargadas para una categoría, el valor llega vacío — se
// muestra un mensaje neutro en vez de "0%" o "NaN%".
// ─────────────────────────────────────────────

const CATEGORIAS = ['Presencia Digital', 'Organizacion', 'Ventas', 'Problema Principal'];

const ETIQUETAS = {
  'Presencia Digital': 'Presencia digital',
  'Organizacion': 'Organización',
  'Ventas': 'Ventas y facturación',
  'Problema Principal': 'Urgencia del problema principal'
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
  'Ventas': [
    'Empezar a emitir facturas de forma más consistente',
    'Llevar un registro simple de ingresos y gastos'
  ],
  'Problema Principal': [
    'Este es el punto que más te está afectando hoy — conviene priorizarlo'
  ]
};

const params = new URLSearchParams(window.location.search);

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

pintarCategorias();
pintarOportunidades();
