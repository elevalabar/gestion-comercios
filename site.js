// ─────────────────────────────────────────────
// ELEVALAB — datos y componentes compartidos del sitio público.
// Todo lo editable (redes, proyectos, navegación, acceso al sistema) vive ACÁ,
// en un solo lugar, para no tener que tocar los archivos .html.
// ─────────────────────────────────────────────

// Contacto: único lugar donde se escribe. Lo leen el pie, la home y Contacto.
const CONTACTO = {
  correo: 'elevalab.ar@gmail.com',
  instagram: { usuario: '@elevalab.ar', url: 'https://instagram.com/elevalab.ar' }
};

// Redes / enlaces externos.
// Completar github, linkedin y cv apenas existan esas URLs.
// Mientras estén vacíos ("") el sitio muestra "Próximamente".
const REDES = {
  instagram: CONTACTO.instagram.url,
  github: '',
  linkedin: '',
  cv: ''
};

// Texto descriptivo de cada canal (se usa en Contacto).
const REDES_INFO = [
  { clave: 'instagram', nombre: 'Instagram', detalle: CONTACTO.instagram.usuario },
  { clave: 'github', nombre: 'GitHub', detalle: 'Repositorios de ElevaLab' },
  { clave: 'linkedin', nombre: 'LinkedIn', detalle: 'Sebastián Quiven' },
  { clave: 'cv', nombre: 'CV', detalle: 'Currículum de Sebastián Quiven' }
];

// Sistema de gestión de comercios (panel privado) y diagnóstico gratuito.
// ÚNICO lugar donde se escribe la dirección. Si el sistema cambia de dirección
// (por ejemplo a admin.elevalab.com.ar), se cambia SOLO esta línea.
// Debe terminar en "/". El panel pide usuario y contraseña; esta web no guarda ni muestra datos del panel.
const SISTEMA_BASE = 'https://admin.elevalab.com.ar/';
const ACCESO_SISTEMA = SISTEMA_BASE + 'index.html';
const DIAGNOSTICO_URL = SISTEMA_BASE + 'diagnostico/index.html';

// Logo (relativo a la raíz del sitio; se le antepone `base`).
const LOGO = 'assets/img/logo-dorado-160.webp';
const LOGO_PNG = 'assets/img/logo-dorado-160.png';

// ── DATOS COMUNES ──
// Áreas de trabajo de la home. Regla: cada "ejemplo" debe estar respaldado por la ficha del
// proyecto indicado en PROYECTOS (campo "proyecto" = id). Si no hay ejemplo, no se muestra.
const SERVICIOS = [
  { nombre: 'Presencia digital',
    descripcion: 'Ordenar y mejorar cómo se ve tu negocio en internet, para que sea más fácil entender qué ofrecés y cómo contactarte.',
    ejemplo: null },
  { nombre: 'Sitios web y páginas de presentación',
    descripcion: 'Una página propia para presentar tu negocio y mostrar lo que ofrecés.',
    ejemplo: { proyecto: 'yca', texto: 'Sitio y catálogo público de YCA Cerámica' } },
  { nombre: 'Herramientas de gestión a medida',
    descripcion: 'Sistemas para centralizar en un solo lugar tareas y datos que hoy están dispersos.',
    ejemplo: { proyecto: 'yca', texto: 'Sistema de gestión de YCA Cerámica' } },
  { nombre: 'Soluciones a medida y automatización',
    descripcion: 'Cuando lo que necesitás no existe armado, se desarrolla a tu medida.',
    ejemplo: { proyecto: 'burdel-bot', texto: 'Bot que automatiza tareas de una comunidad de Discord' } }
];

const ICONOS_SERVICIO = [
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.6"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="12" rx="1.6"/><path d="M2 19.5h20"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4.5l-3 15"/></svg>'
];

// Navegación principal. "ruta" = página interna; "url" = enlace externo.
const NAV = [
  { id: 'inicio', texto: 'Inicio', ruta: 'index.html' },
  { id: 'sobre', texto: 'Sobre', ruta: 'sobre/index.html' },
  { id: 'proyectos', texto: 'Proyectos', ruta: 'proyectos/index.html' },
  { id: 'diagnostico', texto: 'Diagnóstico', url: DIAGNOSTICO_URL },
  { id: 'contacto', texto: 'Contacto', ruta: 'contacto/index.html' }
];

// Catálogo de proyectos. Fuente única para la home y /proyectos/.
//
// estado: 'en-vivo' | 'prototipo' | 'interno'
// pendiente: true mientras el proyecto no tenga información real
//            (el sitio muestra "Ficha en preparación" y no los textos de relleno).
// url: dejar '' si no hay un enlace público real — el sitio NUNCA inventa una URL.
// textoSinEnlace: mensaje opcional para cuando no hay url (ej. "Bot privado, sin acceso público").
// tecnologias: dejar [] si todavía no está confirmado.
// imagen: ruta opcional de la miniatura real (webp 1200 × 750, relación 16:10), por ejemplo
//         'assets/img/proyectos/el-burdel.webp'. Si no existe, se muestra una portada tipográfica.
const PROYECTOS = [
  {
    id: 'spa-sosiego',
    nombre: 'Spa Sosiego',
    categoria: 'Categoría a definir',
    estado: 'prototipo',
    pendiente: true,
    descripcionBreve: 'Descripción pendiente de completar.',
    problema: 'Contenido pendiente — completar con el problema u objetivo real del proyecto.',
    construido: 'Contenido pendiente — completar con lo que efectivamente se construyó.',
    tecnologias: [],
    url: ''
  },
  {
    id: 'el-burdel',
    nombre: 'El Burdel',
    categoria: 'Plataforma modular de juegos y dinámicas',
    estado: 'en-vivo',
    pendiente: false,
    descripcionBreve: 'El Burdel es una plataforma web privada de dinámicas y minijuegos para una comunidad cerrada, con usuarios, administración propia, sesiones en vivo, puntuación y contenido.',
    problema: 'Darle a una comunidad un espacio propio para centralizar juego, participación, ranking y contenido, con acceso controlado y administración propia.',
    construido: 'Un dashboard privado con sesiones de juego en vivo (Taboo, Wordle, El Impostor, ¿Quién Soy?, El Millonario y Ruleta), ranking global y tests de personalidad grupal, además de noticias, galería de fotos, reproductor de música y horóscopo diario y mensual. Se completa con un panel de administración modular, herramientas de control de usuarios y sesiones, landing pública y páginas legales.',
    aporte: 'Diagnóstico y resolución de problemas de registro y autenticación, rediseño UX y modularización del panel de administración, desarrollo de los módulos de Tests y Horóscopo —este último automatizado con Google Apps Script y la API de Gemini—, mejoras del sistema de música, rediseño de la landing pública y desarrollo de la galería.',
    potencial: 'El Burdel nació para una comunidad privada concreta, pero su combinación de usuarios, administración, dinámicas en vivo, puntuación, ranking y contenido funciona como una base adaptable a otro tipo de experiencias interactivas: eventos y cumpleaños, encuentros recreativos para grupos, sistemas de puntos y desafíos para gimnasios, dinámicas para clubes o comunidades, o experiencias para salones y otros espacios. Por ahora esto es potencial de la arquitectura, no un servicio que ElevaLab ofrezca hoy.',
    tecnologias: ['HTML5', 'CSS3', 'JavaScript (ES6)', 'Firebase Authentication', 'Firebase Realtime Database', 'Google Apps Script', 'Google Drive', 'Gemini API', 'GitHub Pages'],
    url: 'https://elburdel.com.ar',
    textoEnlace: 'Visitar El Burdel ↗'
  },
  {
    id: 'yca',
    nombre: 'YCA Cerámica',
    categoria: 'Plataforma web y sistema de gestión para un taller de cerámica',
    estado: 'en-vivo',
    pendiente: false,
    descripcionBreve: 'YCA Cerámica es el sitio de un taller de cerámica artesanal en Buenos Aires que combina un catálogo público con un sistema privado de gestión para administrar cursos, alumnos, inventario, pagos y producción.',
    problema: 'Centralizar la gestión de un taller artesanal que necesitaba manejar catálogo, insumos, cursos, alumnos, pagos, documentación y seguimiento de horneados desde un mismo lugar, en vez de procesos dispersos.',
    construido: 'Un sistema con una parte pública y un entorno privado de gestión: catálogo de piezas e insumos con filtros, catálogo de pastas cerámicas con códigos internos, cursos con inscripción y estados, y un área privada para alumnos. El panel de administración cubre inventario, galería y pagos, con generación de contratos y comprobantes en PDF, envío de emails a suscriptores, etiquetas con código QR y seguimiento de pedidos de horneado, además de calculadoras técnicas de yeso, engobes, cocción, contracción, absorción y costos.',
    aporte: 'Desarrollo integral del sistema: la totalidad del frontend, el panel de administración, el panel contable, las calculadoras técnicas y de costos, el seguimiento de horneados mediante QR y el sistema de autenticación, además de la integración del frontend con Google Apps Script y las automatizaciones para PDFs, archivos y Google Drive. También mejoras posteriores como el catálogo de pastas con códigos, el historial de cálculos y las herramientas de comunicación con alumnos y suscriptores.',
    potencial: 'YCA Cerámica nació para un taller artesanal concreto, pero su combinación de catálogo público, panel privado de gestión, administración de alumnos o clientes, inventario, pagos, documentos, automatizaciones y seguimiento de trabajos mediante estados funciona como una base adaptable a otras actividades: talleres y espacios de oficios, academias o centros de formación, estudios o profesionales que trabajan con turnos, alumnos o clientes, y emprendimientos que combinan catálogo con gestión interna. Por ahora esto es potencial de la arquitectura, no un servicio que ElevaLab ofrezca hoy.',
    tecnologias: ['HTML5', 'CSS3', 'JavaScript (ES6)', 'Google Apps Script', 'Google Sheets', 'Google Drive', 'jsPDF', 'Códigos QR', 'GitHub Pages'],
    url: 'https://ycaceramica.com.ar',
    textoEnlace: 'Visitar YCA Cerámica ↗'
  },
  {
    id: 'bot-discord',
    nombre: 'Bot de Discord',
    categoria: 'Automatización',
    estado: 'prototipo',
    pendiente: true,
    descripcionBreve: 'Descripción pendiente de completar.',
    problema: 'Contenido pendiente — completar con el problema u objetivo real del proyecto.',
    construido: 'Contenido pendiente — completar con lo que efectivamente se construyó.',
    tecnologias: [],
    url: ''
  },
  {
    id: 'gestion-comercios',
    nombre: 'Gestión de comercios',
    categoria: 'Herramienta interna · ElevaLab',
    estado: 'interno',
    pendiente: false,
    descripcionBreve: 'Herramienta interna para relevar y dar seguimiento a comercios: fichas, auditorías, diagnóstico y prospección.',
    problema: 'Centralizar el relevamiento y seguimiento de comercios en un solo lugar, en vez de planillas sueltas.',
    construido: 'Una aplicación web con alta y ficha de comercios, cuestionarios de auditoría e inspección, un diagnóstico digital y un módulo de prospección desde datos de Google Maps.',
    tecnologias: ['Google Apps Script', 'Google Sheets', 'JavaScript'],
    url: ''
  },
  {
    id: 'burdel-bot',
    nombre: 'Bot de automatización para Discord',
    categoria: 'Automatización para una comunidad de Discord',
    estado: 'en-vivo',
    pendiente: false,
    descripcionBreve: 'Es un bot privado que funciona 24/7 dentro de una comunidad de Discord, automatizando contenido, membresía y organización del servidor.',
    problema: 'Automatizar tareas que antes requerían intervención manual dentro de una comunidad de Discord: compartir contenido de redes sociales, controlar la actividad de los miembros y evitar que el canal principal se volviera un historial interminable.',
    construido: 'Un bot que detecta y procesa links de Instagram, TikTok, X/Twitter y YouTube para publicarlos dentro de Discord, gestiona automáticamente la membresía —cambiando el estado de usuarios inactivos, reincorporándolos si vuelven a participar y expulsándolos si la inactividad se mantiene— y archiva el canal principal cada mes, creando uno nuevo con los permisos correspondientes. Se completa con funciones sociales como cumpleaños, salas en vivo, roles y agenda deportiva diaria.',
    aporte: 'Desarrollo del sistema de gestión de actividad y membresía, diseño de las reglas de inactividad, reincorporación y expulsión, implementación del archivado automático, migración y evolución de la infraestructura, integración y mantenimiento de los servicios externos, y resolución de incidentes reales en producción.',
    potencial: 'Nació para una comunidad de Discord concreta, pero sus mecanismos de gestión de membresía, archivado y notificaciones funcionan como una base adaptable a otras comunidades privadas, clubes o grupos de socios que necesiten automatizar moderación, recordatorios o seguimiento de actividad. Por ahora esto es potencial de la arquitectura, no un servicio que ElevaLab ofrezca hoy.',
    tecnologias: ['Node.js', 'discord.js v14', 'Discord API', 'ESPN', 'TheSportsDB', 'Cloudflare Tunnel', 'PM2', 'Termux (Android)'],
    url: '',
    textoSinEnlace: 'Bot privado, sin acceso público'
  }
];

const ETIQUETAS_ESTADO = {
  'en-vivo': 'En vivo',
  'prototipo': 'Prototipo',
  'interno': 'Interno'
};

const ICONO_MENU = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>';
const ICONO_CERRAR = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>';

// Proyectos a mostrar: con { soloReales: true } se omiten las fichas pendientes.
function proyectosVisibles(opciones) {
  const solo = opciones && opciones.soloReales;
  return solo ? PROYECTOS.filter(p => !p.pendiente) : PROYECTOS;
}

// ── Helpers ──────────────────────────────────────────────────
function indicadorEstado(estado) {
  const clave = ETIQUETAS_ESTADO[estado] ? estado : 'prototipo';
  return `<span class="estado ${clave}"><i aria-hidden="true"></i>${ETIQUETAS_ESTADO[clave]}</span>`;
}

function categoriaProyecto(p) {
  return p.categoria === 'Categoría a definir' ? 'Ficha en preparación' : p.categoria;
}

function enlaceProyecto(p) {
  if (p.url) {
    const texto = p.textoEnlace || 'Ver proyecto ↗';
    return `<a class="btn btn-oscuro" href="${p.url}" target="_blank" rel="noopener">${texto}</a>`;
  }
  if (p.textoSinEnlace) {
    return `<span class="sin-enlace">${p.textoSinEnlace}</span>`;
  }
  if (p.estado === 'interno') {
    return `<span class="sin-enlace">Herramienta interna, sin acceso público</span>`;
  }
  return `<span class="sin-enlace">Enlace próximamente</span>`;
}

// Miniatura: imagen real si el proyecto la define; si no, portada tipográfica con identidad propia.
// modo 'tarjeta': el nombre del proyecto es el título (h3) dentro de la portada.
// modo 'ficha': la portada es decorativa (el título está en el cuerpo de la ficha).
function portadaProyecto(p, base, modo) {
  if (p.imagen) {
    return `<span class="portada"><img src="${base}${p.imagen}" alt="Captura de ${p.nombre}" width="1200" height="750" loading="lazy" decoding="async"></span>`;
  }
  const clase = ['el-burdel', 'yca', 'burdel-bot', 'gestion-comercios', 'spa-sosiego'].includes(p.id) ? 'p-' + p.id : 'p-generico';
  const inicial = p.nombre.trim().charAt(0).toUpperCase();
  const titulo = modo === 'tarjeta' ? `<h3 class="tit">${p.nombre}</h3>` : '';
  return `<span class="portada gen ${clase}"><span class="inicial" aria-hidden="true">${inicial}</span>${titulo}</span>`;
}

// ── Nav ──────────────────────────────────────────────────────
function renderNavSitio(activo, base) {
  base = base || '';
  document.body.insertAdjacentHTML('afterbegin', '<a class="skip" href="#contenido">Ir al contenido</a>');

  const contenedor = document.getElementById('nav-sitio');
  if (!contenedor) return;

  const enlaces = NAV.map(n => n.url
    ? `<a href="${n.url}">${n.texto}</a>`
    : `<a href="${base}${n.ruta}"${n.id === activo ? ' aria-current="page"' : ''}>${n.texto}</a>`
  ).join('');

  contenedor.innerHTML = `
    <div class="contenedor">
      <a class="marca" href="${base}index.html" aria-label="ElevaLab, inicio">
        <picture><source srcset="${base}${LOGO}" type="image/webp"><img src="${base}${LOGO_PNG}" alt="" width="38" height="38"></picture>
        <span>Eleva<b>Lab</b></span>
      </a>
      <button class="btn-menu" id="btnMenu" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="enlacesNav">${ICONO_MENU}</button>
      <nav class="enlaces" id="enlacesNav" aria-label="Navegación principal">
        ${enlaces}
        <a class="nav-acceso" href="${base}acceso/index.html"${activo === 'acceso' ? ' aria-current="page"' : ''}>Acceso al sistema</a>
        <a class="nav-cta" href="${base}contacto/index.html">Hablemos →</a>
      </nav>
    </div>
  `;

  const btn = document.getElementById('btnMenu');
  const nav = document.getElementById('enlacesNav');
  const fijar = abierto => {
    nav.classList.toggle('abierto', abierto);
    btn.setAttribute('aria-expanded', String(abierto));
    btn.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
    btn.innerHTML = abierto ? ICONO_CERRAR : ICONO_MENU;
  };
  btn.addEventListener('click', () => fijar(!nav.classList.contains('abierto')));
  nav.addEventListener('click', e => { if (e.target.closest('a')) fijar(false); });
  document.addEventListener('click', e => {
    // composedPath se calcula al despachar el clic, así que sigue siendo válido aunque el icono del botón haya cambiado.
    if (nav.classList.contains('abierto') && !e.composedPath().includes(contenedor)) fijar(false);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('abierto')) {
      fijar(false);
      btn.focus();
    }
  });
  window.matchMedia('(min-width: 900px)').addEventListener('change', e => { if (e.matches) fijar(false); });
}

// ── Footer ───────────────────────────────────────────────────
function renderFooterSitio(base) {
  base = base || '';
  const contenedor = document.getElementById('pie-sitio');
  if (!contenedor) return;

  const redes = `<li><a href="mailto:${CONTACTO.correo}">Correo</a></li>` + REDES_INFO
    .filter(r => REDES[r.clave])
    .map(r => `<li><a href="${REDES[r.clave]}" target="_blank" rel="noopener">${r.nombre}</a></li>`)
    .join('');
  const explorar = NAV.map(n => n.url
    ? `<li><a href="${n.url}">${n.texto}</a></li>`
    : `<li><a href="${base}${n.ruta}">${n.texto}</a></li>`).join('');

  contenedor.innerHTML = `
    <div class="contenedor">
      <div class="pie-grid">
        <div>
          <a class="pie-marca" href="${base}index.html">
            <picture><source srcset="${base}${LOGO}" type="image/webp"><img src="${base}${LOGO_PNG}" alt="" width="44" height="44" loading="lazy"></picture>
            <span>Eleva<b>Lab</b></span>
          </a>
          <p class="pie-frase">Tecnología para que los negocios avancen.</p>
        </div>
        <div>
          <h2 class="pie-tit">Explorar</h2>
          <ul>${explorar}</ul>
        </div>
        <div>
          <h2 class="pie-tit">Redes</h2>
          <ul>${redes}</ul>
        </div>
        <div>
          <h2 class="pie-tit">Sistema</h2>
          <ul><li><a href="${base}acceso/index.html">Acceso al sistema</a></li></ul>
        </div>
      </div>
      <div class="pie-base">
        <span>© ${new Date().getFullYear()} ElevaLab. Un proyecto de Sebastián Quiven.</span>
        <span><a href="mailto:${CONTACTO.correo}">${CONTACTO.correo}</a></span>
      </div>
    </div>
  `;
}

// ── Soluciones (home) ────────────────────────────────────────
// prefijoProyectos: ruta hacia proyectos/index.html
function renderServicios(idContenedor, prefijoProyectos) {
  const cont = document.getElementById(idContenedor);
  if (!cont) return;
  cont.innerHTML = SERVICIOS.map((s, i) => `
    <li class="sol">
      <div class="ico">${ICONOS_SERVICIO[i] || ''}</div>
      <div>
        <h3>${s.nombre}</h3>
        <p>${s.descripcion}</p>
        ${s.ejemplo ? `<a class="ejemplo" href="${prefijoProyectos}#${s.ejemplo.proyecto}"><span>Ejemplo real:</span> ${s.ejemplo.texto} <span aria-hidden="true">&nbsp;↗</span></a>` : ''}
      </div>
    </li>`).join('');
}

// ── Proyectos destacados (home): solo los que tienen información real ──
function renderProyectosDestacados(idContenedor, prefijo, base) {
  const cont = document.getElementById(idContenedor);
  if (!cont) return;
  base = base || '';
  cont.innerHTML = proyectosVisibles({ soloReales: true }).map(p => `
    <li>
      <a class="tarjeta" href="${prefijo}#${p.id}">
        ${portadaProyecto(p, base, 'tarjeta')}
        <span class="cuerpo">
          ${p.imagen ? `<h3>${p.nombre}</h3>` : ''}
          <span class="cat">${categoriaProyecto(p)}</span>
        </span>
        <span class="pie-t">${indicadorEstado(p.estado)}<span class="ver">Ver caso →</span></span>
      </a>
    </li>`).join('');
}

// ── Listado completo (/proyectos/) ───────────────────────────
function renderListaProyectosCompleta(idContenedor, base) {
  const cont = document.getElementById(idContenedor);
  if (!cont) return;
  base = base || '';

  cont.innerHTML = PROYECTOS.map(p => {
    const tecnologias = p.tecnologias.length
      ? `<ul class="tec">${p.tecnologias.map(t => `<li>${t}</li>`).join('')}</ul>`
      : 'Por confirmar.';

    const aporte = p.aporte ? `<div class="ancho"><dt>Mi aporte</dt><dd>${p.aporte}</dd></div>` : '';
    const potencial = p.potencial ? `<div class="ancho"><dt>Potencial de adaptación</dt><dd>${p.potencial}</dd></div>` : '';

    const cuerpo = p.pendiente
      ? `<p class="pr-pend">Ficha en preparación. Este proyecto todavía no tiene descripción pública.</p>`
      : `
        <p class="pr-desc">${p.descripcionBreve}</p>
        <dl class="pr-datos">
          <div><dt>Problema / objetivo</dt><dd>${p.problema}</dd></div>
          <div><dt>Qué se construyó</dt><dd>${p.construido}</dd></div>
          <div class="ancho"><dt>Tecnologías</dt><dd>${tecnologias}</dd></div>
          ${aporte}
          ${potencial}
        </dl>`;

    return `
      <article class="proyecto" id="${p.id}">
        ${portadaProyecto(p, base, 'ficha')}
        <div class="cuerpo-p">
          <div class="pr-top">
            ${indicadorEstado(p.estado)}
            <span class="pr-cat">${categoriaProyecto(p)}</span>
          </div>
          <h2>${p.nombre}</h2>
          ${cuerpo}
          <div class="pr-enlace">${enlaceProyecto(p)}</div>
        </div>
      </article>
    `;
  }).join('');
}

// ── Contacto ─────────────────────────────────────────────────
function renderContactoSitio(idContenedor) {
  const cont = document.getElementById(idContenedor);
  if (!cont) return;

  const principal = `
    <a class="card-contacto" href="mailto:${CONTACTO.correo}?subject=Consulta%20desde%20la%20web%20de%20ElevaLab">
      <span><span class="mini">Escribinos por correo</span><span class="grande">${CONTACTO.correo}</span></span>
      <span class="flecha-g" aria-hidden="true">→</span>
    </a>`;

  const filas = REDES_INFO.map(r => {
    const valor = REDES[r.clave]
      ? `<a class="enlace" href="${REDES[r.clave]}" target="_blank" rel="noopener">Abrir ↗</a>`
      : `<span class="pendiente">Próximamente</span>`;
    return `<li><div><b>${r.nombre}</b><small>${r.detalle}</small></div>${valor}</li>`;
  }).join('');

  cont.innerHTML = principal + `<ul class="canales" style="margin-top:28px">${filas}</ul>`;
}

// Bloque de contacto de la home: lee CONTACTO.
function renderContactoHome(idContenedor) {
  const cont = document.getElementById(idContenedor);
  if (!cont) return;
  cont.innerHTML = `
    <a class="card-contacto" href="mailto:${CONTACTO.correo}?subject=Consulta%20desde%20la%20web%20de%20ElevaLab">
      <span><span class="mini">Escribinos por correo</span><span class="grande">${CONTACTO.correo}</span></span>
      <span class="flecha-g" aria-hidden="true">→</span>
    </a>
    <p class="secundario">También por Instagram: <a class="enlace" href="${CONTACTO.instagram.url}" target="_blank" rel="noopener">${CONTACTO.instagram.usuario} ↗</a></p>`;
}
