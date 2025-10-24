// fixtures/category.fixture.js
const { test } = require("./authRequest.fixture");

/**
 * Fixture para categorías:
 * - Crea una categoría padre y una hija (hija -> parent = padre._id)
 * - Expone ambas en el contexto de tests: { parentCategory, childCategory }
 * - Elimina ambas categorías al finalizar el uso
 */
exports.test = test.extend({
  parentCategory: async ({ authRequest }, use) => {
    const parentPayload = {
      name: `qa_parent_${Date.now()}`,
      description: "Categoría padre para pruebas automáticas",
      drm: "deny",
      track: true,
      visible: true,
    };

    // Crear categoría padre
    const response = await authRequest.post("/api/category", {
      form: parentPayload,
    });
    const body = await response.json();

    // La API puede devolver objeto o array
    const raw = body.data;
    const parentCategory = Array.isArray(raw) ? raw[0] : raw;

    console.log(
      "✅ Creada categoría padre:",
      parentCategory?.name,
      parentCategory?._id
    );

    await use(parentCategory);

    // Cleanup padre
    try {
      const delResp = await authRequest.delete(
        `/api/category/${parentCategory._id}`
      );
      const delStatus = delResp.status();
      const delText = await delResp.text();
      console.log(
        `🧹 DELETE parentCategory -> status=${delStatus} body=${delText}`
      );
    } catch (e) {
      console.log(
        "⚠️ No se pudo eliminar categoría padre:",
        parentCategory?._id,
        e
      );
    }
  },

  childCategory: async ({ authRequest, parentCategory }, use) => {
    const childPayload = {
      name: `qa_child_${Date.now()}`,
      description: "Categoría hija para pruebas automáticas",
      drm: "deny",
      parent: parentCategory._id,
      track: true,
      visible: true,
    };

    // Crear categoría hija
    const response = await authRequest.post("/api/category", {
      form: childPayload,
    });
    const body = await response.json();

    const raw = body.data;
    const childCategory = Array.isArray(raw) ? raw[0] : raw;

    console.log(
      "✅ Creada categoría hija:",
      childCategory?.name,
      childCategory?._id
    );

    await use(childCategory);

    // Cleanup hija
    try {
      const delResp = await authRequest.delete(
        `/api/category/${childCategory._id}`
      );
      const delStatus = delResp.status();
      const delText = await delResp.text();
      console.log(
        `🧹 DELETE childCategory -> status=${delStatus} body=${delText}`
      );
    } catch (e) {
      console.log(
        "⚠️ No se pudo eliminar categoría hija:",
        childCategory?._id,
        e
      );
    }
  },
});
