// ─────────────────────────────────────────────
// ALTA DE COMERCIO
// ─────────────────────────────────────────────

const form = document.getElementById('formNuevo');
const msgError = document.getElementById('msgError');
const btnGuardar = document.getElementById('btnGuardar');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msgError.classList.remove('visible');
  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Guardando...';

  const comercio = {
    'Nombre': document.getElementById('nombre').value.trim(),
    'Rubro': document.getElementById('rubro').value.trim(),
    'Dirección': document.getElementById('direccion').value.trim(),
    'Teléfono': document.getElementById('telefono').value.trim(),
    'WhatsApp': document.getElementById('whatsapp').value.trim(),
    'Instagram': document.getElementById('instagram').value.trim(),
    'Facebook': document.getElementById('facebook').value.trim(),
    'Sitio web': document.getElementById('sitioweb').value.trim(),
    'Google Maps': document.getElementById('maps').value.trim()
  };

  try {
    const res = await apiPost('guardarComercio', { comercio });
    if (res.ok) {
      // Cuando exista ficha.html, esto va a redirigir directo ahí con el id
      // para seguir cargando el diagnóstico. Por ahora vuelve al listado.
      window.location.href = `index.html`;
    } else {
      msgError.textContent = res.error || 'No se pudo guardar el comercio.';
      msgError.classList.add('visible');
    }
  } catch (err) {
    msgError.textContent = 'No se pudo conectar con el servidor. Probá de nuevo.';
    msgError.classList.add('visible');
  } finally {
    btnGuardar.disabled = false;
    btnGuardar.textContent = 'Guardar y continuar';
  }
});
