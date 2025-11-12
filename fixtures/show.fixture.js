// fixtures/show.fixture.js
// Helper para crear y limpiar shows durante tests

module.exports = {
  /**
   * createShow(authRequest, attrs) -> { show, cleanup }
   * - authRequest: Playwright request fixture with authentication
   * - attrs: optional attributes: title, type, description, genres (array), rating, categories (array)
   */
  async createShow(authRequest, attrs = {}) {
    const title = attrs.title || `qa_show_${Date.now()}`;
    const type = attrs.type || "tvshow";

    const form = {
      title,
      type,
    };
    if (attrs.description) form.description = attrs.description;
    if (attrs.genres) {
      // La API puede aceptar array o csv; enviar como JSON array si el helper del request lo soporta
      // Para compatibilidad con los otros fixtures, mandamos como coma-separado si es array
      form.genres = Array.isArray(attrs.genres) ? attrs.genres.join(",") : attrs.genres;
    }
    if (attrs.rating != null) form.rating = attrs.rating;
    if (attrs.first_emision) form.first_emision = attrs.first_emision;
    if (attrs.categories) form.categories = Array.isArray(attrs.categories) ? attrs.categories.join(",") : attrs.categories;

    let res, body;
    try {
      res = await authRequest.post("/api/show", { form });
      // Algunos endpoints devuelven directamente el objeto, otros envuelven en { status, data }
      body = await res.json().catch(() => null);
    } catch (e) {
      const err = new Error(`createShow error: ${e.message}`);
      err.cause = e;
      throw err;
    }

    if (!res || !res.ok() || !body) {
      const err = new Error(`createShow failed: status=${res ? res.status() : "?"}`);
      err.responseBody = body;
      throw err;
    }

    // Normalizar retorno: si la API devuelve { status: 'OK', data: {...} } o array
    const created = body.data ? (Array.isArray(body.data) ? body.data[0] : body.data) : body;
    const id = created && (created._id || created.id);

    return {
      show: created,
      async cleanup() {
        try {
          if (id) {
            await authRequest.delete(`/api/show/${id}`);
          }
        } catch (e) {
          // no-op: cleanup should not throw
          console.warn(`[show.fixture] cleanup failed for id=${id}:`, e && e.message);
        }
      },
    };
  },
};
