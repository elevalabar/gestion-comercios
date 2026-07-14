// ─────────────────────────────────────────────
// ALTA DE COMERCIO
// Al guardar, la Inspección Inicial arranca automáticamente (es parte
// del flujo de alta) — si iniciarInspeccion falla por algún motivo, no
// bloqueamos: el comercio ya quedó guardado, así que mandamos igual a
// la ficha para no dejar al usuario colgado.
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
    if (!res.ok) {
      msgError.textContent = res.error || 'No se pudo guardar el comercio.';
      msgError.classList.add('visible');
      btnGuardar.disabled = false;
      btnGuardar.textContent = 'Guardar y continuar';
      return;
    }

    try {
      const insp = await apiPost('iniciarInspeccion', { idComercio: res.id });
      if (insp.ok) {
        window.location.href = `../inspeccion/index.html?id=${encodeURIComponent(insp.id)}`;
        return;
      }
    } catch (err) {
      // no se pudo iniciar la inspección automáticamente; el comercio ya
      // quedó guardado, así que no bloqueamos al usuario acá
    }

    window.location.href = `ficha.html?id=${encodeURIComponent(res.id)}`;
  } catch (err) {
    msgError.textContent = 'No se pudo conectar con el servidor. Probá de nuevo.';
    msgError.classList.add('visible');
    btnGuardar.disabled = false;
    btnGuardar.textContent = 'Guardar y continuar';
  }
});
