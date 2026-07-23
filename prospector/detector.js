// ─────────────────────────────────────────────
// PROSPECTOR · DETECTOR DE COLUMNAS
//
// Instant Data Scraper genera encabezados de CSV que son nombres de
// clase CSS internos de Google Maps (ej. "hfpxzc href", "xxVWCe",
// "W4Efsd 2") y pueden cambiar entre versiones. Por eso este detector
// NUNCA mira el nombre de columna: mapea por el CONTENIDO real de las
// celdas, tomando una muestra de filas del CSV.
//
// Para agregar un mapeo nuevo el día de mañana (ej. "Teléfono", "Web")
// alcanza con sumar un objeto al array DETECTORES. No hace falta tocar
// el resto del archivo ni el resto del módulo.
// ─────────────────────────────────────────────

// ── Utilidades de bajo nivel ─────────────────────────────────────

function limpiar(valor) {
  return (valor == null ? '' : String(valor)).trim();
}

// Instant Data Scraper repite este ícono placeholder exacto cuando el
// comercio no tiene foto de perfil propia. Nunca es una imagen real
// del comercio, así que se excluye explícitamente antes de puntuar.
const IMAGEN_PLACEHOLDER_RE = /ssl\.gstatic\.com\/local\/servicebusiness\/default_user\.png/i;

// El scraper también deja columnas "separador" con un solo carácter
// decorativo (típicamente "·"). Sin valor informativo: se descartan
// antes de puntuar cualquier campo.
function esSeparadorDecorativo(valor) {
  const v = limpiar(valor);
  return v.length > 0 && v.length <= 2 && !/[a-z0-9]/i.test(v);
}

// ── Detectores individuales ───────────────────────────────────────
// Cada detector puntúa UNA celda entre 0 y 1. El campo se asigna a la
// columna con mejor promedio sobre la muestra, siempre que supere un
// umbral mínimo (para no forzar un mapeo si ninguna columna calza).

const DETECTORES = [
  {
    campo: 'googleMapsUrl',
    umbral: 0.5,
    test(valor) {
      const v = limpiar(valor);
      return /^https?:\/\/(www\.)?google\.[a-z.]+\/maps\//i.test(v) ? 1 : 0;
    }
  },
  {
    campo: 'imagen',
    umbral: 0.5,
    test(valor) {
      const v = limpiar(valor);
      if (!v) return 0;
      if (IMAGEN_PLACEHOLDER_RE.test(v)) return 0; // placeholder, no cuenta
      return /^https?:\/\/.*googleusercontent\.com\//i.test(v) ? 1 : 0;
    }
  },
  {
    campo: 'cantidadResenas',
    umbral: 0.5,
    test(valor) {
      const v = limpiar(valor);
      // formato típico: "(82)" o "(1.234)"
      return /^\(\s*\d{1,3}(\.\d{3})*\s*\)$/.test(v) ? 1 : 0;
    }
  },
  {
    campo: 'rating',
    umbral: 0.5,
    test(valor) {
      const v = limpiar(valor);
      if (!/^\d([.,]\d)?$/.test(v)) return 0;
      const n = parseFloat(v.replace(',', '.'));
      return n >= 0 && n <= 5 ? 1 : 0;
    }
  },
  {
    campo: 'direccion',
    umbral: 0.4,
    test(valor) {
      const v = limpiar(valor);
      if (!v || v.length < 6) return 0;
      if (/^https?:\/\//i.test(v)) return 0;
      if (/^\(\s*\d/.test(v)) return 0; // no es "(82)"
      if (/^\d([.,]\d)?$/.test(v)) return 0; // no es un rating suelto
      if (v.includes('·')) return 0; // "·" delata texto de horarios/reseñas, no dirección
      // dirección típica: mezcla de letras y números (calle + altura)
      return /\d/.test(v) && /[a-zA-Zá-úÁ-Ú]/.test(v) ? 0.8 : 0.2;
    }
  }
];

// Un detector de contenido puede empatar por casualidad entre la
// columna real y una columna "basura" del scraper (texto suelto de
// reseñas/horarios cortado de forma inconsistente entre filas). Para
// desempatar se pondera el score por qué tan llena está la columna en
// la muestra: los campos estructurados reales (nombre, dirección,
// categoría) vienen casi siempre completos; los fragmentos sueltos de
// reseñas/horarios tienen huecos irregulares.
function fillRatio(valores) {
  const llenos = valores.filter(v => limpiar(v)).length;
  return valores.length ? llenos / valores.length : 0;
}

// Nombre y Categoría se resuelven aparte (ver resolverNombreYCategoria)
// porque ninguno tiene un patrón de contenido propio confiable: ambos
// son texto libre sin dígitos ni URLs. Lo que los distingue es
// estadístico, no sintáctico — el nombre del comercio es casi siempre
// único fila por fila, la categoría se repite mucho (varias
// peluquerías, varias barberías, etc.).

function esTextoLibreCandidato(valor) {
  const v = limpiar(valor);
  if (!v) return false;
  if (/^https?:\/\//i.test(v)) return false;
  if (/\d/.test(v)) return false;
  if (v.includes('·')) return false; // delata fragmento de horarios/reseñas
  if (esSeparadorDecorativo(v)) return false;
  return true;
}

function resolverNombreYCategoria(columnas, muestras) {
  // columnas ya asignadas a otro campo quedan afuera de esta ronda.
  // Se exige alta completitud (no solo que lo poco que haya matchee)
  // y que la gran mayoría de los valores presentes sean texto libre
  // "limpio" — así se descartan los fragmentos sueltos de reseñas u
  // horarios, que además de tener huecos irregulares mezclan texto
  // con puntuación/dígitos en algunas filas.
  const candidatas = columnas.filter(idx => {
    const todos = muestras.map(fila => fila[idx]);
    if (fillRatio(todos) < 0.6) return false;
    const valores = todos.filter(v => limpiar(v));
    const limpios = valores.filter(esTextoLibreCandidato).length;
    return (limpios / valores.length) >= 0.9;
  });

  if (candidatas.length === 0) return {};

  const conRatio = candidatas.map(idx => {
    const todos = muestras.map(fila => fila[idx]);
    const valores = todos.map(v => limpiar(v)).filter(Boolean);
    const distintos = new Set(valores.map(v => v.toLowerCase()));
    const ratio = distintos.size / valores.length;
    const relleno = fillRatio(todos);
    return {
      idx,
      // Nombre: valores casi todos distintos Y columna casi completa.
      scoreNombre: ratio * relleno,
      // Categoría: valores muy repetidos Y columna casi completa (así
      // no le gana una columna corta de reseñas/horarios que también
      // se repite poco, pero solo porque tiene la mitad de las celdas
      // vacías).
      scoreCategoria: (1 - ratio) * relleno
    };
  });

  const resultado = {};
  const porNombre = [...conRatio].sort((a, b) => b.scoreNombre - a.scoreNombre);
  resultado.nombre = porNombre[0].idx;

  const restantes = conRatio.filter(c => c.idx !== resultado.nombre);
  if (restantes.length > 0) {
    restantes.sort((a, b) => b.scoreCategoria - a.scoreCategoria);
    resultado.categoria = restantes[0].idx;
  }
  return resultado;
}

// ── Función principal ─────────────────────────────────────────────
// filas: array de arrays (CSV ya parseado, SIN encabezado).
// Devuelve { mapeo: { campo: indiceColumna|null, ... }, columnas: n }

function detectarColumnas(filas, opciones = {}) {
  const tamanioMuestra = opciones.tamanioMuestra || 25;

  const filasUtiles = filas.filter(fila => fila.some(c => limpiar(c)));
  if (filasUtiles.length === 0) {
    return { mapeo: {}, columnas: 0, filasUtiles: 0 };
  }

  const numColumnas = filasUtiles[0].length;
  const muestras = filasUtiles.slice(0, tamanioMuestra);

  const columnasDisponibles = [];
  for (let i = 0; i < numColumnas; i++) {
    const valores = muestras.map(fila => fila[i]);
    // columnas 100% vacías o 100% separador decorativo quedan afuera
    // de entrada, no compiten por ningún campo
    const util = valores.some(v => limpiar(v) && !esSeparadorDecorativo(v));
    if (util) columnasDisponibles.push(i);
  }

  const mapeo = {};
  const columnasUsadas = new Set();

  for (const detector of DETECTORES) {
    let mejorIdx = null;
    let mejorScore = 0;

    for (const idx of columnasDisponibles) {
      if (columnasUsadas.has(idx)) continue;
      const todosLosValores = muestras.map(fila => fila[idx]);
      const valores = todosLosValores.filter(v => limpiar(v));
      if (valores.length === 0) continue;
      const scoreBase = valores.reduce((acc, v) => acc + detector.test(v), 0) / valores.length;
      // se pondera por completitud para que una columna casi vacía no
      // le gane a la columna real solo porque sus pocos valores llenos
      // matchean bien el patrón
      const score = scoreBase * fillRatio(todosLosValores);
      if (score > mejorScore) {
        mejorScore = score;
        mejorIdx = idx;
      }
    }

    if (mejorIdx !== null && mejorScore >= detector.umbral) {
      mapeo[detector.campo] = mejorIdx;
      columnasUsadas.add(mejorIdx);
    } else {
      mapeo[detector.campo] = null;
    }
  }

  const columnasLibres = columnasDisponibles.filter(idx => !columnasUsadas.has(idx));
  const { nombre, categoria } = resolverNombreYCategoria(columnasLibres, muestras);
  mapeo.nombre = nombre != null ? nombre : null;
  mapeo.categoria = categoria != null ? categoria : null;

  return { mapeo, columnas: numColumnas, filasUtiles: filasUtiles.length };
}

// ── Aplicar el mapeo a todas las filas → objetos de comercio ──────
// Nunca lanza error si falta una columna: el campo queda vacío.

function normalizarRating(valor) {
  const v = limpiar(valor);
  if (!v) return '';
  const n = parseFloat(v.replace(',', '.'));
  return isNaN(n) ? '' : n;
}

function normalizarCantidadResenas(valor) {
  const v = limpiar(valor);
  const match = v.match(/\d[\d.]*/);
  if (!match) return '';
  return parseInt(match[0].replace(/\./g, ''), 10);
}

function mapearFila(fila, mapeo) {
  const obtener = (campo) => {
    const idx = mapeo[campo];
    return idx == null ? '' : limpiar(fila[idx]);
  };

  // Guarda de sanidad: para algunos rubros (ej. veterinarias/petshops)
  // Google arma el HTML con un campo de menos, y eso corre la columna
  // de dirección un lugar hacia la izquierda para esa fila puntual.
  // Si lo que cayó en "categoría" tiene dígitos, no es una categoría
  // real (las categorías de Google Maps nunca los tienen) — se
  // descarta en vez de guardar basura, y esa fila queda con categoría
  // vacía para revisar a mano en la previsualización.
  let categoria = obtener('categoria');
  if (/\d/.test(categoria)) categoria = '';

  return {
    nombre: obtener('nombre'),
    categoria,
    rating: normalizarRating(obtener('rating')),
    cantidadResenas: normalizarCantidadResenas(obtener('cantidadResenas')),
    direccion: obtener('direccion'),
    imagen: obtener('imagen'),
    googleMapsUrl: obtener('googleMapsUrl')
  };
}

function mapearComercios(filas, mapeo) {
  return filas
    .filter(fila => fila.some(c => limpiar(c)))
    .map(fila => mapearFila(fila, mapeo));
}

// Exponer en navegador (script clásico, sin módulos, según convención
// del proyecto) y en Node (para poder testear este archivo aislado).
if (typeof window !== 'undefined') {
  window.ProspectorDetector = { detectarColumnas, mapearComercios };
}
if (typeof module !== 'undefined') {
  module.exports = { detectarColumnas, mapearComercios };
}
