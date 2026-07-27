// ─────────────────────────────────────────────
// CATEGORÍAS — puebla un <select> a partir de getCategorias (hoja
// Categorias en el backend). Nada de esto hardcodea nombres de
// categoría: agregar una categoría nueva es una fila en la hoja, este
// helper la va a mostrar sola la próxima vez que se cargue la página.
// ─────────────────────────────────────────────

async function poblarSelectCategorias(selectEl, valorSeleccionado) {
  selectEl.innerHTML = '<option value="">Sin categoría asignada</option>';
  try {
    const categorias = await apiGet('getCategorias');
    if (!Array.isArray(categorias)) return;
    categorias.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c['ID Categoria'];
      opt.textContent = c['Nombre'];
      selectEl.appendChild(opt);
    });
  } catch (err) {
    // si falla la carga de categorías, el select queda solo con "Sin
    // categoría asignada" — no bloquea el alta/edición del comercio
  }
  if (valorSeleccionado) selectEl.value = valorSeleccionado;
}
