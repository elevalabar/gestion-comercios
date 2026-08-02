// ─────────────────────────────────────────────
// INFORME PDF DE DIAGNÓSTICO — assets/js/pdfDiagnostico.js
//
// Capa de presentación PURA sobre ResultadoDiagnostico + catálogos vigentes.
// No recalcula nada del motor, no duplica reglas de cobertura/madurez/
// oportunidades. Todo dato que necesita se recibe explícito por parámetro
// (comercio, diagnostico, catalogoOportunidades, catalogoServicios,
// configuracionMarca) — no lee comercioActual, ID_COMERCIO ni ningún otro
// estado global de ficha.js, para poder testearse a futuro en aislamiento
// con solo un ResultadoDiagnostico + datos de comercio de prueba.
//
// Único punto de entrada público: PDFDiagnostico.generar({...}).
//
// Reutiliza de ficha.js SOLO lo genuinamente compartido y sin estado propio
// de comercio: obtenerLogoBase64() (fetch estático del logo, no depende de
// ningún comercio) y los colores base de marca (COLOR_TEXT_PDF,
// COLOR_MUTED_PDF, COLOR_ACCENT_PDF, COLOR_DANGER_PDF, COLOR_SUCCESS_PDF).
// Todo lo demás (membrete, pie, tarjeta de comercio, secciones, CTA,
// nombre de archivo) es autocontenido acá porque el diseño y el copy son
// exclusivos del informe de diagnóstico.
//
// Copy de textos (estado insuficiente/preliminar/completo, CTA, etiquetas
// de atributo, etiquetas de estado de barra, descripciones por defecto) es
// un supuesto propio a falta del copy final del documento aprobado —
// señalado en el resumen de la implementación de cada versión.
//
// V3: iteración exclusivamente visual sobre la V2 ya validada. No cambia
// contenido, orden, filtrado/dedupe, lookup ni ninguna regla de cobertura/
// madurez/oportunidades — solo cómo se dibuja. Un detalle corregido en esta
// versión: la paleta semántica por atributo no coincidía con la aprobada
// (Completitud usaba el mismo verde que Conversión); queda Presencia=Accent,
// Completitud=Warning, Conversión=Success.
// ─────────────────────────────────────────────

const PDFDiagnostico = (function () {

  // ───────────────────────────────────────────
  // CLASIFICACIÓN (misma lógica aprobada de la V1, sin cambios de rangos)
  // ───────────────────────────────────────────

  // Rangos de cobertura aprobados (calificador interno, nunca se muestra
  // el número al cliente): ver eleva-lab-motor-diagnostico.
  function bandaCobertura_(coberturaGlobal) {
    if (coberturaGlobal === null || coberturaGlobal === undefined) return 'insuficiente';
    if (coberturaGlobal >= 0.75) return 'completo';
    if (coberturaGlobal >= 0.35) return 'preliminar';
    return 'insuficiente';
  }

  // Rangos de Madurez Global aprobados (versión inicial del MVP).
  function nivelMadurez_(valor) {
    if (valor === null || valor === undefined) return null;
    if (valor < 0.35) return 'Arrancando';
    if (valor < 0.65) return 'En desarrollo';
    if (valor < 0.85) return 'Consolidado';
    return 'Avanzado';
  }

  // SUPUESTO: etiquetas cliente para idAtributo técnico — el documento
  // aprobado las define, pero no está disponible en este entorno. Ocultan
  // el idAtributo crudo (Existencia/Completitud/Conversión) como pide la
  // especificación; ajustar acá si el copy real difiere.
  const ATRIBUTOS_LABEL = {
    Existencia: 'Presencia',
    Completitud: 'Información completa',
    Conversión: 'Facilita el contacto'
  };

  // Vocabulario definitivo por atributo (aprobado) — cada atributo tiene
  // sus propias 3 palabras, ninguna se repite entre atributos, para que
  // nunca vuelva a leerse "Presencia: Completo" como si el canal ya
  // estuviera resuelto. Nunca se muestra el valor numérico.
  function etiquetaExistencia_(valor) {
    if (valor === null || valor === undefined) return '';
    if (valor >= 0.99) return 'Existe';
    if (valor > 0) return 'Existe parcialmente';
    return 'No existe';
  }

  function etiquetaCompletitud_(valor) {
    if (valor === null || valor === undefined) return '';
    if (valor >= 0.99) return 'Completo';
    if (valor > 0) return 'Parcial';
    return 'Sin completar';
  }

  function etiquetaConversion_(valor) {
    if (valor === null || valor === undefined) return '';
    if (valor >= 0.99) return 'Preparado';
    if (valor > 0) return 'Parcialmente preparado';
    return 'Sin preparar';
  }

  function etiquetaEstadoAtributo_(idAtributo, valor) {
    if (idAtributo === 'Existencia') return etiquetaExistencia_(valor);
    if (idAtributo === 'Completitud') return etiquetaCompletitud_(valor);
    if (idAtributo === 'Conversión') return etiquetaConversion_(valor);
    return '';
  }

  const ORDEN_GRAVEDAD = { Alta: 0, Media: 1, Baja: 2 };

  const CANALES_LABEL = {
    GB: 'Google Business',
    CC: 'Contacto y Conversión'
  };

  // ───────────────────────────────────────────
  // PALETA — colores base compartidos con ficha.js (marca) + colores
  // propios del diagnóstico (semánticos por atributo, tarjetas, gravedad).
  // Paleta semántica aprobada: Presencia→Accent, Completitud→Warning,
  // Conversión→Success. Los colores semánticos se usan solo para
  // comunicar significado (atributo, gravedad), nunca como decoración.
  // ───────────────────────────────────────────

  const COLOR_CARD_BG = [248, 249, 252];
  const COLOR_CARD_BG_ACCENT = [235, 239, 253]; // tinte Accent muy suave — solo para el CTA
  const COLOR_CARD_BORDER = [224, 226, 234];
  const COLOR_PRESENCIA = [75, 110, 240];      // = COLOR_ACCENT_PDF, coherencia de marca
  const COLOR_COMPLETITUD = [199, 138, 33];    // Warning discreto (ámbar)
  const COLOR_CONVERSION = [29, 158, 117];     // = COLOR_SUCCESS_PDF
  const COLOR_TRACK = [230, 230, 235];

  function colorPorAtributo_(idAtributo) {
    if (idAtributo === 'Existencia') return COLOR_PRESENCIA;
    if (idAtributo === 'Completitud') return COLOR_COMPLETITUD;
    if (idAtributo === 'Conversión') return COLOR_CONVERSION;
    return COLOR_PRESENCIA;
  }

  // Variantes discretas para el chip de gravedad — evitan rojo agresivo o
  // apariencia de alerta; fondo claro + texto de mayor contraste.
  const GRAVEDAD_ESTILO = {
    Alta: { texto: [156, 66, 40], fondo: [250, 235, 229] },
    Media: { texto: [154, 105, 22], fondo: [252, 241, 220] },
    Baja: { texto: [107, 110, 122], fondo: [237, 238, 242] }
  };

  // ───────────────────────────────────────────
  // HELPERS DE DIBUJO propios (sin depender de dibujarListaPDF/dibujarChipPDF
  // de ficha.js — el diseño de tarjetas es distinto al de Auditoría/Inspección)
  // ───────────────────────────────────────────

  function saltoPaginaSiHaceFalta_(doc, y, margen) {
    if (y > (margen || 265)) {
      doc.addPage();
      return 20;
    }
    return y;
  }

  // opciones: { x, ancho, colorFondo } — todas opcionales, con el
  // comportamiento previo (tarjeta a todo el ancho de página) como default.
  // Se usa tal cual (sin opciones) en comercio/estado/CTA; con x/ancho
  // custom para las tarjetas de canal lado a lado; con colorFondo custom
  // solo en el CTA (tinte Accent en vez del fondo neutro habitual).
  function dibujarTarjetaFondo_(doc, y, alto, opciones) {
    const anchoPagina = doc.internal.pageSize.getWidth();
    const x = (opciones && opciones.x !== undefined) ? opciones.x : 15;
    const ancho = (opciones && opciones.ancho !== undefined) ? opciones.ancho : anchoPagina - 30;
    const colorFondo = (opciones && opciones.colorFondo) || COLOR_CARD_BG;
    doc.setFillColor(...colorFondo);
    doc.setDrawColor(...COLOR_CARD_BORDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, ancho, alto, 3, 3, 'FD');
    return ancho;
  }

  // Ícono de "solución" para Servicios recomendados: círculo de check
  // dibujado con líneas (no depende de glyphs de fuente).
  function dibujarIconoCheck_(doc, cx, cy) {
    doc.setFillColor(...COLOR_CONVERSION);
    doc.circle(cx, cy, 3, 'F');
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.8);
    doc.line(cx - 1.3, cy, cx - 0.3, cy + 1.2);
    doc.line(cx - 0.3, cy + 1.2, cx + 1.6, cy - 1.3);
  }

  // Indicador de Presencia (Alternativa C — aprobada): 3 estados, sin
  // barra. "Existe" y "No existe" son prácticamente binarios en la
  // mayoría de los canales; "Existe parcialmente" cubre el caso real de
  // Contacto y Conversión (ej. tiene WhatsApp pero no teléfono). Todo
  // dibujado con líneas/curvas, mismo criterio que dibujarIconoCheck_.
  function dibujarIndicadorExistencia_(doc, cx, cy, valor) {
    const r = 2.6;

    if (valor >= 0.99) {
      // Existe: círculo lleno + check blanco.
      doc.setFillColor(...COLOR_PRESENCIA);
      doc.circle(cx, cy, r, 'F');
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.7);
      doc.line(cx - 1.1, cy, cx - 0.2, cy + 1);
      doc.line(cx - 0.2, cy + 1, cx + 1.3, cy - 1.1);
      return;
    }

    if (valor > 0) {
      // Existe parcialmente: medio círculo relleno (mitad izquierda),
      // aproximado con 2 curvas Bézier de cuarto de círculo (k=0.5523),
      // más el borde completo en color track para que se lea como un
      // círculo entero medio lleno, no como una forma cortada.
      doc.setDrawColor(...COLOR_TRACK);
      doc.setLineWidth(0.6);
      doc.circle(cx, cy, r, 'S');

      const k = r * 0.5523;
      doc.setFillColor(...COLOR_PRESENCIA);
      doc.lines(
        [
          [-k, 0, -r, r * 0.4477, -r, r],
          [0, k, r * 0.4477, r, r, r]
        ],
        cx, cy - r,
        [1, 1], 'F', true
      );
      return;
    }

    // No existe: anillo vacío (solo contorno), sin relleno.
    doc.setDrawColor(...COLOR_MUTED_PDF);
    doc.setLineWidth(0.6);
    doc.circle(cx, cy, r, 'S');
  }

  // Chip de gravedad, alineado a la derecha de xDerecha.
  function dibujarChipGravedad_(doc, xDerecha, yBase, gravedad) {
    const estilo = GRAVEDAD_ESTILO[gravedad];
    if (!estilo) return;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    const anchoTexto = doc.getTextWidth(gravedad);
    const padding = 3;
    const anchoChip = anchoTexto + padding * 2;
    const alto = 5;
    const x = xDerecha - anchoChip;
    doc.setFillColor(...estilo.fondo);
    doc.roundedRect(x, yBase, anchoChip, alto, 1.2, 1.2, 'F');
    doc.setTextColor(...estilo.texto);
    doc.text(gravedad, x + padding, yBase + 3.6);
  }

  // ───────────────────────────────────────────
  // LOGO — vendoreado localmente para no depender del cache/estado de
  // ficha.js (obtenerLogoBase64 en ese archivo es puramente utilitario,
  // sin comercio asociado, así que reusarlo es seguro; se cachea también
  // acá por si este módulo se usa alguna vez sin ficha.js cargado).
  // ───────────────────────────────────────────

  let logoCache = null;
  async function obtenerLogo_() {
    if (logoCache) return logoCache;
    if (typeof obtenerLogoBase64 === 'function') {
      // Reutiliza el fetch/caché ya existente en ficha.js si está disponible.
      logoCache = await obtenerLogoBase64();
      return logoCache;
    }
    try {
      const resp = await fetch('../assets/img/logo.png');
      const blob = await resp.blob();
      logoCache = await new Promise((resolve, reject) => {
        const lector = new FileReader();
        lector.onload = () => resolve(lector.result);
        lector.onerror = reject;
        lector.readAsDataURL(blob);
      });
    } catch (err) {
      logoCache = null;
    }
    return logoCache;
  }

  // ───────────────────────────────────────────
  // MEMBRETE — incluye la identidad de marca de Eleva Lab
  // (Instagram/sitio web), condicionada a configuracionMarca. No hardcodea
  // ningún handle ni dominio.
  // ───────────────────────────────────────────

  async function dibujarMembrete_(doc, configuracionMarca) {
    const logo = await obtenerLogo_();
    const anchoPagina = doc.internal.pageSize.getWidth();
    const xTexto = logo ? 36 : 15;

    if (logo) {
      try { doc.addImage(logo, 'PNG', 15, 12, 16, 16); } catch (err) { /* logo opcional */ }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...COLOR_TEXT_PDF);
    doc.text('Eleva Lab', xTexto, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...COLOR_MUTED_PDF);
    doc.text('Informe de Diagnóstico Digital', xTexto, 27);

    // Identidad de marca — @instagram y/o sitio web, cada uno solo si está
    // configurado Y su flag "Mostrar" está activo. Nunca hardcodeado.
    const partesIdentidad = [];
    if (configuracionMarca && configuracionMarca.mostrarInstagram && configuracionMarca.instagram) {
      partesIdentidad.push(configuracionMarca.instagram);
    }
    if (configuracionMarca && configuracionMarca.mostrarSitioWeb && configuracionMarca.sitioWeb) {
      partesIdentidad.push(configuracionMarca.sitioWeb);
    }
    if (partesIdentidad.length > 0) {
      doc.setFontSize(9);
      doc.setTextColor(...COLOR_MUTED_PDF);
      doc.text(partesIdentidad.join('  ·  '), xTexto, 32);
    }

    doc.setDrawColor(...COLOR_PRESENCIA);
    doc.setLineWidth(1);
    doc.line(15, 38, anchoPagina - 15, 38);

    return 48; // próxima Y libre
  }

  // ───────────────────────────────────────────
  // TARJETA DE COMERCIO — usa solo datos ya disponibles en `comercio`
  // (viene tal cual de comercioActual en la ficha). No agrega llamadas a
  // datos que no existen. Deja espacio reservado para un logo del comercio
  // a futuro (comentado, sin implementar la carga todavía).
  //
  // opciones.amplia (V3): en banda "insuficiente" se agranda levemente la
  // tarjeta (más aire interno) para que la página no se sienta vacía,
  // sin agregar ni inventar ningún dato nuevo.
  // ───────────────────────────────────────────

  function dibujarTarjetaComercio_(doc, y, comercio, opciones) {
    const amplia = !!(opciones && opciones.amplia);
    const alto = amplia ? 40 : 34;
    // Futuro: si comercio.logoUrl (o campo equivalente) existiera, acá es
    // donde se dibujaría con doc.addImage, corriendo xTexto como se hace
    // en dibujarMembrete_ con el logo de Eleva Lab. No se implementa ahora.
    const anchoCaja = dibujarTarjetaFondo_(doc, y, alto);
    const xTexto = 22;
    let yTexto = y + 11;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...COLOR_TEXT_PDF);
    doc.text((comercio && comercio.Nombre) || 'Comercio sin nombre', xTexto, yTexto);
    yTexto += 7;

    const rubroCategoria = [comercio && comercio.Rubro].filter(Boolean).join(' · ');
    if (rubroCategoria) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...COLOR_MUTED_PDF);
      doc.text(rubroCategoria, xTexto, yTexto);
      yTexto += 6;
    }

    // Datos de contacto disponibles — se listan solo los que existen,
    // nunca un campo vacío ni un placeholder.
    const contacto = [];
    if (comercio) {
      if (comercio['Dirección']) contacto.push(comercio['Dirección']);
      if (comercio['Teléfono']) contacto.push(comercio['Teléfono']);
      if (comercio.Instagram) contacto.push(comercio.Instagram);
      if (comercio['Sitio web']) contacto.push(comercio['Sitio web']);
    }
    if (contacto.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...COLOR_MUTED_PDF);
      const lineas = doc.splitTextToSize(contacto.join('  ·  '), anchoCaja - 14);
      doc.text(lineas, xTexto, yTexto);
    }

    return y + alto + 10;
  }

  // ───────────────────────────────────────────
  // ESTADO / MADUREZ DIGITAL — tarjeta destacada con escala visual de los
  // 4 niveles ya definidos (sin inventar niveles ni mostrar el número).
  // ───────────────────────────────────────────

  const NIVELES_ESCALA = ['Arrancando', 'En desarrollo', 'Consolidado', 'Avanzado'];

  // Identidad cromática propia por etapa (V3 corrección) — los tramos
  // alcanzados ya no comparten un único color plano: cada etapa recorrida
  // usa su propio tono (progresión de intensidad, misma familia semántica
  // que el resto del informe), y el nivel actual queda como protagonista
  // (color pleno + texto bold + marcador). Los tramos futuros quedan en
  // COLOR_TRACK, sin cambios.
  const COLORES_ETAPA = [
    [156, 176, 246], // Arrancando — tono más claro de la familia Accent
    [110, 138, 244], // En desarrollo
    [75, 110, 240],  // Consolidado — = COLOR_PRESENCIA
    [47, 79, 199]    // Avanzado — más saturado, cierre de la escala
  ];

  function dibujarEscalaMadurez_(doc, y, nivelActual) {
    const anchoPagina = doc.internal.pageSize.getWidth();
    const anchoTotal = anchoPagina - 30;
    const gap = 3;
    const anchoSegmento = anchoTotal / NIVELES_ESCALA.length;
    const anchoBarra = anchoSegmento - gap;
    const indiceActual = NIVELES_ESCALA.indexOf(nivelActual);

    NIVELES_ESCALA.forEach((nivel, i) => {
      const x = 15 + i * anchoSegmento;
      const centroX = x + anchoBarra / 2;
      const activo = i === indiceActual;
      const alcanzado = indiceActual >= 0 && i <= indiceActual;

      doc.setFillColor(...(alcanzado ? COLORES_ETAPA[i] : COLOR_TRACK));
      doc.roundedRect(x, y, anchoBarra, activo ? 5.5 : 4, 1.4, 1.4, 'F');

      // Etiqueta centrada en su propio tramo, con wrap a 2 líneas si el
      // ancho disponible no alcanza a 7.5pt — nunca se deja desbordar
      // hacia el tramo vecino.
      doc.setFont('helvetica', activo ? 'bold' : 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...(activo ? COLOR_TEXT_PDF : COLOR_MUTED_PDF));
      const lineas = doc.splitTextToSize(nivel, anchoBarra + 1);
      lineas.forEach((linea, li) => {
        doc.text(linea, centroX, y + 9 + li * 3.6, { align: 'center' });
      });
    });

    // +4 de aire extra si alguna etiqueta necesitó 2 líneas, para no pisar
    // el contenido siguiente.
    const maxLineas = Math.max(...NIVELES_ESCALA.map(n => doc.splitTextToSize(n, anchoBarra + 1).length));
    return y + 16 + (maxLineas > 1 ? 4 : 0);
  }

  function armarSeccionEstado_(doc, y, diagnostico, banda) {
    const madurez = diagnostico.madurezGlobal ? diagnostico.madurezGlobal.valor : null;

    if (banda === 'insuficiente') {
      // V3: alto levemente mayor (antes 38) para dar más presencia cuando
      // es de los pocos bloques que se muestran en esta banda.
      const alto = 44;
      const anchoCaja = dibujarTarjetaFondo_(doc, y, alto);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(...COLOR_TEXT_PDF);
      doc.text('Todavía estamos relevando tu presencia digital', 22, y + 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(...COLOR_MUTED_PDF);
      const lineas = doc.splitTextToSize(
        'Este comercio todavía no cuenta con información suficiente para una evaluación completa. A medida que avancemos con el relevamiento, este informe se irá completando.',
        anchoCaja - 14
      );
      doc.text(lineas, 22, y + 22);
      return y + alto + 10;
    }

    const nivel = nivelMadurez_(madurez);
    const altoBase = banda === 'preliminar' ? 54 : 38;
    const anchoCaja = dibujarTarjetaFondo_(doc, y, altoBase);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_MUTED_PDF);
    doc.text('MADUREZ DIGITAL', 22, y + 10);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...COLOR_PRESENCIA);
    doc.text(nivel || '-', 22, y + 21);

    dibujarEscalaMadurez_(doc, y + 27, nivel);

    if (banda === 'preliminar') {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...COLOR_MUTED_PDF);
      const lineas = doc.splitTextToSize(
        'Este informe corresponde a un primer relevamiento. Algunas áreas requieren una revisión más profunda para completar el diagnóstico.',
        anchoCaja - 14
      );
      doc.text(lineas, 22, y + 47);
    }

    return y + altoBase + 10;
  }

  // ───────────────────────────────────────────
  // SITUACIÓN POR CANAL — tarjetas lado a lado (Google Business | Contacto
  // y Conversión) cuando hay más de un canal visible, apiladas si por algún
  // motivo hubiera más de dos. Regla de visualización uniforme ya aprobada,
  // sin cambios: canal enteramente hueco no se muestra; atributo
  // aplica=false no se muestra; atributo aplica=true con valor=null (hueco)
  // no se muestra. Las tarjetas son independientes en altura — no se fuerza
  // que ambas midan lo mismo.
  // ───────────────────────────────────────────

  const BASE_ALTO_CANAL = 16;
  const ALTO_POR_ATRIBUTO = 13; // antes 11 — +2 para la etiqueta de estado de la barra

  function atributosVisiblesDeCanal_(canal) {
    return (Array.isArray(canal.atributos) ? canal.atributos : [])
      .filter(a => a.aplica && a.valor !== null && a.valor !== undefined);
  }

  function alturaTarjetaCanal_(canal) {
    return BASE_ALTO_CANAL + atributosVisiblesDeCanal_(canal).length * ALTO_POR_ATRIBUTO;
  }

  function dibujarTarjetaCanal_(doc, x, y, ancho, canal) {
    const atributosVisibles = atributosVisiblesDeCanal_(canal);
    const altoCaja = alturaTarjetaCanal_(canal);
    dibujarTarjetaFondo_(doc, y, altoCaja, { x, ancho });

    const nombreCanal = CANALES_LABEL[canal.idCanal] || canal.idCanal;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...COLOR_TEXT_PDF);
    doc.text(nombreCanal, x + 7, y + 11);

    let yAtributo = y + 20;
    const anchoBarraMax = ancho - 20;

    atributosVisibles.forEach(attr => {
      const label = ATRIBUTOS_LABEL[attr.idAtributo] || attr.idAtributo;
      const estado = etiquetaEstadoAtributo_(attr.idAtributo, attr.valor);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...COLOR_TEXT_PDF);
      doc.text(label, x + 7, yAtributo - 1.5);

      if (attr.idAtributo === 'Existencia') {
        // Presencia: indicador de estado, sin barra (Alternativa C).
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...COLOR_TEXT_PDF);
        doc.text(estado, x + 7 + anchoBarraMax - 6, yAtributo - 1.5, { align: 'right' });
        dibujarIndicadorExistencia_(doc, x + 7 + anchoBarraMax - 2.6, yAtributo - 3.5, attr.valor);
      } else {
        // Completitud / Conversión: mantienen la barra, con su propio
        // vocabulario (nunca "Completo" genérico compartido entre los tres).
        const color = colorPorAtributo_(attr.idAtributo);
        const anchoFill = anchoBarraMax * Math.max(0, Math.min(attr.valor, 1));

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...COLOR_MUTED_PDF);
        doc.text(estado, x + 7 + anchoBarraMax, yAtributo - 1.5, { align: 'right' });

        doc.setFillColor(...COLOR_TRACK);
        doc.roundedRect(x + 7, yAtributo, anchoBarraMax, 3.5, 1.2, 1.2, 'F');
        if (attr.valor > 0) {
          doc.setFillColor(...color);
          doc.roundedRect(x + 7, yAtributo, anchoFill, 3.5, 1.2, 1.2, 'F');
        }
      }

      yAtributo += ALTO_POR_ATRIBUTO;
    });

    return altoCaja;
  }

  function armarSeccionCanales_(doc, y, diagnostico) {
    const anchoPagina = doc.internal.pageSize.getWidth();
    const canales = Array.isArray(diagnostico.canales) ? diagnostico.canales : [];
    const canalesVisibles = canales.filter(
      c => c.valor !== null && c.valor !== undefined && atributosVisiblesDeCanal_(c).length > 0
    );
    if (canalesVisibles.length === 0) return y;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...COLOR_TEXT_PDF);
    doc.text('Situación por canal', 15, y);
    y += 9;

    const gap = 6;
    const anchoTotal = anchoPagina - 30;

    for (let i = 0; i < canalesVisibles.length; i += 2) {
      const par = canalesVisibles.slice(i, i + 2);
      const alturaMax = Math.max(...par.map(alturaTarjetaCanal_));

      y = saltoPaginaSiHaceFalta_(doc, y, 275 - alturaMax);

      const anchoCard = par.length === 2 ? (anchoTotal - gap) / 2 : anchoTotal;
      par.forEach((canal, idx) => {
        const x = 15 + idx * (anchoCard + gap);
        dibujarTarjetaCanal_(doc, x, y, anchoCard, canal);
      });

      y += alturaMax + 8;
    }

    return y + 2;
  }

  // ───────────────────────────────────────────
  // OPORTUNIDADES + SERVICIOS — el punto exacto del lookup en vivo (2
  // saltos): idOportunidad → catálogo vigente de Oportunidades (nombre,
  // gravedad, descripcionPDF, idServicio) → catálogo vigente de Servicios
  // (nombre, descripcion). El histórico solo aporta idOportunidad.
  //
  // Reglas de omisión:
  //  - idOportunidad sin match en catálogo vigente → se omite la
  //    oportunidad completa.
  //  - idServicio vacío o sin match en catálogo vigente de Servicios → la
  //    oportunidad se sigue mostrando (tiene nombre/descripción propios),
  //    pero NO se agrega ninguna entrada a Servicios recomendados por esa
  //    oportunidad. Nunca se muestra un ID crudo ni un servicio incompleto.
  //
  // (Sin cambios en V3 — es lógica funcional, no capa visual.)
  // ───────────────────────────────────────────

  function resolverOportunidadesYServicios_(diagnostico, catalogoOportunidades, catalogoServicios) {
    const historicas = Array.isArray(diagnostico.oportunidades) ? diagnostico.oportunidades : [];

    const oportunidadesPorId = {};
    (catalogoOportunidades || []).forEach(o => { oportunidadesPorId[o.idOportunidad] = o; });

    const serviciosPorId = {};
    (catalogoServicios || []).forEach(s => { serviciosPorId[s.idServicio] = s; });

    const oportunidadesResueltas = historicas
      .map(op => {
        const vigente = oportunidadesPorId[op.idOportunidad]; // ← lookup en vivo, salto 1
        if (!vigente) return null; // idOportunidad histórico ya no existe en el catálogo actual
        const servicio = vigente.idServicio ? serviciosPorId[vigente.idServicio] : null; // ← salto 2
        return {
          idOportunidad: op.idOportunidad,
          nombre: vigente.nombre,
          descripcion: vigente.descripcionPDF || '',
          gravedad: vigente.gravedad,
          servicio: servicio || null // null si no hay idServicio o no existe en el catálogo vigente
        };
      })
      .filter(Boolean)
      .sort((a, b) => (ORDEN_GRAVEDAD[a.gravedad] ?? 99) - (ORDEN_GRAVEDAD[b.gravedad] ?? 99));

    // Servicios recomendados: solo de oportunidades con servicio resuelto,
    // deduplicados por idServicio.
    const serviciosVistos = new Set();
    const serviciosResueltos = [];
    oportunidadesResueltas.forEach(op => {
      if (op.servicio && !serviciosVistos.has(op.servicio.idServicio)) {
        serviciosVistos.add(op.servicio.idServicio);
        serviciosResueltos.push(op.servicio);
      }
    });

    return { oportunidadesResueltas, serviciosResueltos };
  }

  // ───────────────────────────────────────────
  // SECCIÓN OPORTUNIDADES — badge numerado circular + chip de gravedad
  // discreto + separador entre ítems. Mismo contenido/orden/filtrado que
  // ya resolvió resolverOportunidadesYServicios_ (sin cambios acá).
  // ───────────────────────────────────────────

  function armarSeccionOportunidades_(doc, y, oportunidadesResueltas) {
    const anchoPagina = doc.internal.pageSize.getWidth();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...COLOR_TEXT_PDF);
    doc.text('Oportunidades detectadas', 15, y);
    y += 9;

    if (oportunidadesResueltas.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(...COLOR_MUTED_PDF);
      doc.text('No se detectaron hallazgos relevantes en esta evaluación.', 15, y);
      return y + 10;
    }

    // Límite físico real de la página (A4 = 297mm), con margen para no
    // pisar el pie. Cada oportunidad es una unidad indivisible: se mide
    // su alto real ANTES de dibujar nada, y si no entra completa en lo
    // que queda de página, se pasa entera a la siguiente — nunca se
    // empieza a dibujar sin saber si termina.
    const LIMITE_INFERIOR = 278;

    oportunidadesResueltas.forEach((op, i) => {
      const esUltima = i === oportunidadesResueltas.length - 1;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const lineasDescripcion = op.descripcion ? doc.splitTextToSize(op.descripcion, 163) : [];

      const altoItem =
        9 + // título / badge / número
        (lineasDescripcion.length ? 5 * lineasDescripcion.length : 0) +
        5 + (esUltima ? 2 : 7); // aire + separador (o cierre si es la última)

      if (y + altoItem > LIMITE_INFERIOR) {
        doc.addPage();
        y = 20;
      }

      const numero = String(i + 1).padStart(2, '0');
      const centroX = 19;

      doc.setFillColor(...COLOR_PRESENCIA);
      doc.circle(centroX, y, 4.2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text(numero, centroX, y + 1.3, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...COLOR_TEXT_PDF);
      doc.text(op.nombre || '', 30, y + 1.3);

      if (op.gravedad) {
        dibujarChipGravedad_(doc, anchoPagina - 15, y - 3.3, op.gravedad);
      }

      y += 9;

      if (lineasDescripcion.length) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...COLOR_MUTED_PDF);
        doc.text(lineasDescripcion, 30, y);
        y += 5 * lineasDescripcion.length;
      }

      y += 5;

      if (!esUltima) {
        doc.setDrawColor(...COLOR_CARD_BORDER);
        doc.setLineWidth(0.2);
        doc.line(15, y, anchoPagina - 15, y);
        y += 7;
      } else {
        y += 2;
      }
    });

    return y + 2;
  }

  // ───────────────────────────────────────────
  // SECCIÓN SERVICIOS — bloques más chicos que Oportunidades (refuerza
  // "detectamos → te proponemos"), con ícono de check en vez de precio o
  // llamado urgente. Mismo contenido/lookup que ya resolvió
  // resolverOportunidadesYServicios_ (sin cambios acá).
  // ───────────────────────────────────────────

  function armarSeccionServicios_(doc, y, serviciosResueltos) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...COLOR_TEXT_PDF);
    doc.text('Servicios recomendados', 15, y);
    y += 9;

    if (serviciosResueltos.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(...COLOR_MUTED_PDF);
      doc.text('No hay servicios puntuales para recomendar por el momento.', 15, y);
      return y + 10;
    }

    serviciosResueltos.forEach(servicio => {
      y = saltoPaginaSiHaceFalta_(doc, y, 260);

      dibujarIconoCheck_(doc, 18, y - 1.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...COLOR_TEXT_PDF);
      doc.text(servicio.nombre || '', 26, y);
      y += 5;

      if (servicio.descripcion) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...COLOR_MUTED_PDF);
        const lineas = doc.splitTextToSize(servicio.descripcion, 167);
        doc.text(lineas, 26, y);
        y += 4.5 * lineas.length;
      }

      y += 4;
    });

    return y + 2;
  }

  // ───────────────────────────────────────────
  // CTA — tarjeta final, mismo copy aprobado por banda de cobertura.
  // V3: fondo con tinte Accent muy suave para darle más presencia sin
  // convertirlo en banner.
  // ───────────────────────────────────────────

  function armarCTA_(doc, y, banda) {
    y = saltoPaginaSiHaceFalta_(doc, y, 240);

    let texto;
    if (banda === 'insuficiente') {
      texto = 'Coordinemos una instancia de relevamiento para completar tu diagnóstico y poder mostrarte resultados concretos.';
    } else if (banda === 'preliminar') {
      texto = 'Con estos resultados ya podemos avanzar en los servicios recomendados. Una auditoría más profunda nos permite completar y afinar el diagnóstico, sin ser un requisito para empezar.';
    } else {
      texto = 'Con este diagnóstico completo, podemos avanzar directamente con los servicios recomendados para tu negocio.';
    }

    const alto = banda === 'insuficiente' ? 26 : 30;
    const anchoCaja = dibujarTarjetaFondo_(doc, y, alto, { colorFondo: COLOR_CARD_BG_ACCENT });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...COLOR_TEXT_PDF);
    doc.text(banda === 'insuficiente' ? '¿Seguimos con el relevamiento?' : '¿Querés mejorar estos puntos?', 22, y + 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_MUTED_PDF);
    const lineas = doc.splitTextToSize(texto, anchoCaja - 14);
    doc.text(lineas, 22, y + 18);

    return y + alto + 10;
  }

  // ───────────────────────────────────────────
  // PIE — variante con handles de marca (misma info que el membrete, para
  // que sea legible aunque se imprima solo la última página).
  // ───────────────────────────────────────────

  function dibujarPie_(doc, configuracionMarca) {
    const alturaPagina = doc.internal.pageSize.getHeight();
    const partes = ['Generado por Eleva Lab · ' + new Date().toLocaleDateString('es-AR')];

    if (configuracionMarca && configuracionMarca.mostrarInstagram && configuracionMarca.instagram) {
      partes.push(configuracionMarca.instagram);
    }
    if (configuracionMarca && configuracionMarca.mostrarSitioWeb && configuracionMarca.sitioWeb) {
      partes.push(configuracionMarca.sitioWeb);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_MUTED_PDF);
    doc.text(partes.join(' · '), 15, alturaPagina - 10);
  }

  // ───────────────────────────────────────────
  // NOMBRE DE ARCHIVO — variante parametrizada (no lee comercioActual).
  // ───────────────────────────────────────────

  function nombreArchivo_(comercio, fecha) {
    const nombreComercio = ((comercio && comercio.Nombre) || 'comercio')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_');
    const fechaObj = fecha ? new Date(fecha) : new Date();
    const fechaLimpia = fechaObj.toLocaleDateString('es-AR').replace(/\//g, '-');
    return `Diagnostico_${nombreComercio}_${fechaLimpia}.pdf`;
  }

  // ───────────────────────────────────────────
  // ORQUESTADOR PÚBLICO
  // ───────────────────────────────────────────

  /**
   * @param {Object} datos
   * @param {Object} datos.comercio               Fila del comercio (igual shape que comercioActual)
   * @param {Object} datos.diagnostico             ResultadoDiagnostico tal cual (Resultado JSON)
   * @param {Array}  datos.catalogoOportunidades   [{idOportunidad, nombre, gravedad, descripcionPDF, idServicio}]
   * @param {Array}  datos.catalogoServicios       [{idServicio, nombre, descripcion}]
   * @param {Object} datos.configuracionMarca      {instagram, sitioWeb, mostrarInstagram, mostrarSitioWeb}
   */
  async function generar(datos) {
    const { comercio, diagnostico, catalogoOportunidades, catalogoServicios, configuracionMarca } = datos || {};

    if (!diagnostico) {
      alert('Todavía no hay un diagnóstico calculado para este comercio.');
      return;
    }
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error('No se cargó la librería para generar PDFs (jsPDF). Recargá la página (Ctrl+F5) y probá de nuevo; si sigue, puede haber un bloqueador de contenido activo en el navegador.');
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    // Banda calculada antes de dibujar nada: la usa tanto la sección de
    // estado como la tarjeta de comercio (V3: densidad — más aire en la
    // tarjeta de comercio cuando el resto del informe va a mostrar poco
    // contenido). Sin cambios en la regla de cálculo de banda en sí.
    const coberturaGlobal = diagnostico.madurezGlobal ? diagnostico.madurezGlobal.coberturaGlobal : null;
    const banda = bandaCobertura_(coberturaGlobal);

    let y = await dibujarMembrete_(doc, configuracionMarca);
    y = dibujarTarjetaComercio_(doc, y, comercio, { amplia: banda === 'insuficiente' });

    y = armarSeccionEstado_(doc, y, diagnostico, banda);
    y += 4;
    y = armarSeccionCanales_(doc, y, diagnostico);
    y += 2;

    if (banda !== 'insuficiente') {
      const { oportunidadesResueltas, serviciosResueltos } =
        resolverOportunidadesYServicios_(diagnostico, catalogoOportunidades, catalogoServicios);

      // Salto de página FORZADO (no condicional): la primera página
      // siempre termina en Membrete + Identificación + Madurez Digital +
      // Situación por canal; "Oportunidades detectadas" siempre arranca
      // en la segunda página.
      doc.addPage();
      y = 20;

      y = armarSeccionOportunidades_(doc, y, oportunidadesResueltas);
      y += 2;
      y = armarSeccionServicios_(doc, y, serviciosResueltos);
      y += 2;
    }

    y = armarCTA_(doc, y, banda);

    dibujarPie_(doc, configuracionMarca);
    doc.save(nombreArchivo_(comercio, diagnostico.fecha));
  }

  return { generar };

})();
