// ─────────────────────────────────────────────
// CONDICIONALIDAD — un solo criterio, compartido por auditoria.js e
// inspeccion.js, espejo exacto de esPreguntaAplicable_ en Código.gs.
//
// El backend YA excluye del score las preguntas no aplicables (no entran
// al denominador). Esto de acá es solo para que la pantalla coincida con
// lo que el backend va a calcular: si no se muestra, tampoco debería
// contarse como pendiente en el progreso ni exigirse en "Finalizar".
//
// Nota: Auditoría e Inspección tienen formas de dato distintas para la
// pregunta (Auditoría: objeto crudo de la hoja Preguntas, claves con
// espacios; Inspección: objeto armado por getInspeccionConfig_, claves
// camelCase) — por eso la función recibe idPadre/valorGatillante sueltos
// en vez de la pregunta entera, y cada módulo arma esos dos valores como
// corresponda a su forma de dato.
// ─────────────────────────────────────────────

function esPreguntaAplicable(idPadre, valorGatillante, respuestas) {
  if (!idPadre) return true;
  const respuestaPadre = respuestas[idPadre];
  if (respuestaPadre === undefined || respuestaPadre === null || respuestaPadre === '') return false;
  return String(respuestaPadre) === String(valorGatillante);
}
