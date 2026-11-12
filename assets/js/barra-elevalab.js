// ─────────────────────────────────────────────
// BARRA SUPERIOR DE ELEVALAB — páginas públicas del diagnóstico
// Dibuja la misma barra que elevalab.com.ar para que el diagnóstico siga pareciendo parte de la web principal.
// Solo arma enlaces: NO hace ninguna conexión, no lee ni envía datos y no toca el formulario ni el envío a Apps Script.
// Los enlaces a la web principal son absolutos porque este sitio vive en otro subdominio (admin.elevalab.com.ar).
// Son una COPIA de la navegación de elevalab-web/assets/js/site.js (NAV): si cambian allá, actualizarlos acá a mano.
// Uso: <div id="barra-elevalab" data-logo="../assets/img/logo.png" data-actual="diagnostico"></div>
//      y cargar este script al final de la página. Depende de: assets/css/barra-elevalab.css.
// ─────────────────────────────────────────────
(function () {
  'use strict';

  var WEB = 'https://elevalab.com.ar/';
  var destino = document.getElementById('barra-elevalab');
  if (!destino) return;

  var logo = destino.getAttribute('data-logo') || '';
  var actual = destino.getAttribute('data-actual') || '';

  var ICONO_MENU = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>';
  var ICONO_CERRAR = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>';

  // El enlace de la página actual no sale de este sitio: apunta a «#» y queda marcado como página actual.
  function enlace(id, texto, href) {
    var esActual = id === actual;
    return '<a href="' + (esActual ? '#' : href) + '"' + (esActual ? ' aria-current="page"' : '') + '>' + texto + '</a>';
  }

  destino.innerHTML =
    '<a class="barra-skip" href="#barra-saltar">Ir al contenido</a>' +
    '<header class="barra-eleva" id="barra-caja"><div class="barra-contenedor">' +
      '<a class="barra-marca" href="' + WEB + 'index.html" aria-label="ElevaLab, inicio">' +
        '<img src="' + logo + '" alt="" width="38" height="38"><span>Eleva<b>Lab</b></span></a>' +
      '<button class="barra-btn-menu" id="barra-btn-menu" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="barra-enlaces">' + ICONO_MENU + '</button>' +
      '<nav class="barra-enlaces" id="barra-enlaces" aria-label="Navegación principal de ElevaLab">' +
        enlace('inicio', 'Inicio', WEB + 'index.html') +
        enlace('proyectos', 'Proyectos', WEB + 'proyectos/index.html') +
        enlace('diagnostico', 'Diagnóstico', WEB + 'index.html') +
        enlace('contacto', 'Contacto', WEB + 'contacto/index.html') +
        '<a class="barra-acceso" href="' + WEB + 'acceso/index.html">Acceso al sistema</a>' +
        '<a class="barra-cta" href="' + WEB + 'contacto/index.html">Hablemos →</a>' +
      '</nav></div></header>';

  var btn = document.getElementById('barra-btn-menu');
  var nav = document.getElementById('barra-enlaces');
  var caja = document.getElementById('barra-caja');

  function fijar(abierto) {
    nav.classList.toggle('abierto', abierto);
    btn.setAttribute('aria-expanded', String(abierto));
    btn.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
    btn.innerHTML = abierto ? ICONO_CERRAR : ICONO_MENU;
  }

  btn.addEventListener('click', function () { fijar(!nav.classList.contains('abierto')); });
  nav.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a')) fijar(false); });
  document.addEventListener('click', function (e) {
    if (nav.classList.contains('abierto') && !e.composedPath().includes(caja)) fijar(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('abierto')) { fijar(false); btn.focus(); }
  });
  if (window.matchMedia) {
    window.matchMedia('(min-width: 900px)').addEventListener('change', function (e) { if (e.matches) fijar(false); });
  }
})();
