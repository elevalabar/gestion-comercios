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
// de atributo, descripciones por defecto) es un supuesto propio a falta
// del copy final del documento aprobado — señalado en el resumen de la
// implementación de cada versión.
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

  const ORDEN_GRAVEDAD = { Alta: 0, Media: 1, Baja: 2 };

  const CANALES_LABEL = {
    GB: 'Google Business',
    CC: 'Contacto y Conversión'
  };

  // ───────────────────────────────────────────
  // PALETA — colores base compartidos con ficha.js (marca) + colores
  // propios del diagnóstico (semánticos por atributo, tarjetas)
  // ───────────────────────────────────────────

  const COLOR_CARD_BG = [248, 249, 252];
  const COLOR_CARD_BORDER = [224, 226, 234];
  const COLOR_PRESENCIA = [75, 110, 240];      // = COLOR_ACCENT_PDF, coherencia de marca
  const COLOR_COMPLETITUD = [29, 158, 117];    // = COLOR_SUCCESS_PDF
  const COLOR_CONVERSION = [126, 87, 194];     // violeta — tercer semántico, no estridente
  const COLOR_TRACK = [230, 230, 235];

  function colorPorAtributo_(idAtributo) {
    if (idAtributo === 'Existencia') return COLOR_PRESENCIA;
    if (idAtributo === 'Completitud') return COLOR_COMPLETITUD;
    if (idAtributo === 'Conversión') return COLOR_CONVERSION;
    return COLOR_PRESENCIA;
  }

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

  function dibujarTarjetaFondo_(doc, y, alto) {
    const anchoPagina = doc.internal.pageSize.getWidth();
    const anchoCaja = anchoPagina - 30;
    doc.setFillColor(...COLOR_CARD_BG);
    doc.setDrawColor(...COLOR_CARD_BORDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(15, y, anchoCaja, alto, 3, 3, 'FD');
    return anchoCaja;
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
  // ───────────────────────────────────────────

  function dibujarTarjetaComercio_(doc, y, comercio) {
    const alto = 34;
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

  function dibujarEscalaMadurez_(doc, y, nivelActual) {
    const anchoPagina = doc.internal.pageSize.getWidth();
    const anchoTotal = anchoPagina - 30;
    const anchoSegmento = anchoTotal / NIVELES_ESCALA.length;
    const indiceActual = NIVELES_ESCALA.indexOf(nivelActual);

    NIVELES_ESCALA.forEach((nivel, i) => {
      const x = 15 + i * anchoSegmento;
      const activo = i === indiceActual;
      const alcanzado = indiceActual >= 0 && i <= indiceActual;

      doc.setFillColor(...(alcanzado ? COLOR_PRESENCIA : COLOR_TRACK));
      doc.roundedRect(x, y, anchoSegmento - 3, 4, 1.2, 1.2, 'F');

      doc.setFont('helvetica', activo ? 'bold' : 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...(activo ? COLOR_TEXT_PDF : COLOR_MUTED_PDF));
      doc.text(nivel, x, y + 9);
    });

    return y + 16;
  }

  function armarSeccionEstado_(doc, y, diagnostico, banda) {
    const madurez = diagnostico.madurezGlobal ? diagnostico.madurezGlobal.valor : null;

    if (banda === 'insuficiente') {
      const alto = 38;
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
      doc.text(lineas, 22, y + 19);
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
  // SITUACIÓN POR CANAL — tarjetas, colores semánticos por atributo.
  // Regla de visualización uniforme ya aprobada, sin cambios: canal
  // enteramente hueco no se muestra; atributo aplica=false no se muestra;
  // atributo aplica=true con valor=null (hueco) no se muestra.
  // ───────────────────────────────────────────

  function armarSeccionCanales_(doc, y, diagnostico) {
    const canales = Array.isArray(diagnostico.canales) ? diagnostico.canales : [];
    const canalesVisibles = canales.filter(c => c.valor !== null && c.valor !== undefined);
    if (canalesVisibles.length === 0) return y;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...COLOR_TEXT_PDF);
    doc.text('Situación por canal', 15, y);
    y += 9;

    canalesVisibles.forEach(canal => {
      const atributosVisibles = (Array.isArray(canal.atributos) ? canal.atributos : [])
        .filter(a => a.aplica && a.valor !== null && a.valor !== undefined);
      if (atributosVisibles.length === 0) return;

      y = saltoPaginaSiHaceFalta_(doc, y, 250);

      const altoCaja = 16 + atributosVisibles.length * 11;
      const anchoCaja = dibujarTarjetaFondo_(doc, y, altoCaja);

      const nombreCanal = CANALES_LABEL[canal.idCanal] || canal.idCanal;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...COLOR_TEXT_PDF);
      doc.text(nombreCanal, 22, y + 11);

      let yAtributo = y + 20;
      const anchoBarraMax = anchoCaja - 20;

      atributosVisibles.forEach(attr => {
        const label = ATRIBUTOS_LABEL[attr.idAtributo] || attr.idAtributo;
        const color = colorPorAtributo_(attr.idAtributo);
        const anchoFill = anchoBarraMax * Math.max(0, Math.min(attr.valor, 1));

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...COLOR_TEXT_PDF);
        doc.text(label, 22, yAtributo - 1.5);

        doc.setFillColor(...COLOR_TRACK);
        doc.roundedRect(22, yAtributo, anchoBarraMax, 3.5, 1.2, 1.2, 'F');
        if (attr.valor > 0) {
          doc.setFillColor(...color);
          doc.roundedRect(22, yAtributo, anchoFill, 3.5, 1.2, 1.2, 'F');
        }

        yAtributo += 11;
      });

      y += altoCaja + 8;
    });

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

  function armarSeccionOportunidades_(doc, y, oportunidadesResueltas) {
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

    oportunidadesResueltas.forEach((op, i) => {
      y = saltoPaginaSiHaceFalta_(doc, y, 255);

      const numero = String(i + 1).padStart(2, '0');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(...COLOR_PRESENCIA);
      doc.text(numero, 15, y);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...COLOR_TEXT_PDF);
      doc.text(op.nombre || '', 28, y);
      y += 6;

      if (op.descripcion) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...COLOR_MUTED_PDF);
        const lineas = doc.splitTextToSize(op.descripcion, 165);
        doc.text(lineas, 28, y);
        y += 5 * lineas.length;
      }

      y += 6;
    });

    return y + 2;
  }

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

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(...COLOR_COMPLETITUD);
      doc.text(servicio.nombre || '', 15, y);
      y += 5.5;

      if (servicio.descripcion) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...COLOR_MUTED_PDF);
        const lineas = doc.splitTextToSize(servicio.descripcion, 175);
        doc.text(lineas, 15, y);
        y += 5 * lineas.length;
      }

      y += 5;
    });

    return y + 2;
  }

  // ───────────────────────────────────────────
  // CTA — tarjeta final, mismo copy aprobado por banda de cobertura.
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
    const anchoCaja = dibujarTarjetaFondo_(doc, y, alto);

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

    let y = await dibujarMembrete_(doc, configuracionMarca);
    y = dibujarTarjetaComercio_(doc, y, comercio);

    const coberturaGlobal = diagnostico.madurezGlobal ? diagnostico.madurezGlobal.coberturaGlobal : null;
    const banda = bandaCobertura_(coberturaGlobal);

    y = armarSeccionEstado_(doc, y, diagnostico, banda);
    y += 4;
    y = armarSeccionCanales_(doc, y, diagnostico);
    y += 2;

    if (banda !== 'insuficiente') {
      const { oportunidadesResueltas, serviciosResueltos } =
        resolverOportunidadesYServicios_(diagnostico, catalogoOportunidades, catalogoServicios);
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
