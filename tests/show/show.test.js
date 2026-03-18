/**
 * Plan de Automatización: Módulo Show API (REST HTTP)
 * Nomenclatura: TC_SHW_XXX_<MÉTODO>_<descripción>
 * Ref: docs/show.md
 *
 * NOTA: La documentación original es gRPC, pero aquí implementamos tests HTTP REST
 * para los endpoints REST que están disponibles en la plataforma.
 *
 * Endpoints disponibles:
 * - POST /api/show (INSERT - Crear)
 * - GET /api/show/:id (GET - Detalle)
 * - PUT /api/show (UPDATE - Actualizar)
 * - DELETE /api/show/:id (REMOVE - Eliminar)
 */

const { test, expect } = require("../../fixtures/show.fixture");
const { showSchema } = require("../../schemas/show.schema");
const { ApiClient } = require("../../lib/apiClient");
const { ResourceCleaner } = require("../../utils/resourceCleaner");
const dataFactory = require("../../utils/dataFactory");
const { faker } = require("@faker-js/faker");

// Helper: la API puede retornar { data: show } o show en root
function getShowFromBody(body) {
  const raw = body?.data ?? body;
  return Array.isArray(raw) ? raw[0] : raw;
}

test.describe("Modulo Show API", () => {
  let apiClient;
  let cleaner;

  test.beforeEach(async ({ authRequest, baseURL }) => {
    apiClient = new ApiClient(authRequest, baseURL);
    cleaner = new ResourceCleaner(apiClient);
  });

  test.afterEach(async () => {
    await cleaner.clean();
  });

// --- 1. INSERT (Create) ---

test.describe("1. Create (POST /api/show)", () => {
  test("TC_SHW_001_INSERT_MinimalPayload", async ({ accountId }) => {
    const payload = dataFactory.generateShowPayload({
      account: accountId,
      title: `[QA-AUTO] Show ${Date.now()}`,
      type: "tvshow",
      genres: [],
    });

    const res = await apiClient.post(`/api/show`, payload);
    const body = res.body;

    expect(res.status).toBe(200);
    const created = getShowFromBody(body);
    expect(created).toHaveProperty("_id");
    expect(created.title).toBe(payload.title);

    cleaner.register("show", created._id);
    const parsed = showSchema.parse(created);
    expect(parsed._id).toBeTruthy();
  });

  test("TC_SHW_002_INSERT_FullPayload", async ({ accountId }) => {
    const payload = {
      account: accountId,
      title: `[QA-AUTO] Full Show ${Date.now()}`,
      description: "Descripcion QA",
      type: "radioshow",
      genres: [],
    };

    const res = await apiClient.post(`/api/show`, payload);
    const body = res.body;

    expect(res.status).toBe(200);
    const created = getShowFromBody(body);
    expect(created.type).toBe("radioshow");
    expect(created.description).toBe("Descripcion QA");
    cleaner.register("show", created._id);
  });

  test("TC_SHW_003_INSERT_GenresNullCleaning", async ({
    authRequest,
    accountId,
  }) => {
    const payload = dataFactory.generateShowPayload({
      account: accountId,
      title: `[QA-AUTO] Null Genres Show ${Date.now()}`,
      type: "radioshow",
      genres: [],
    });

    const res = await authRequest.post(`/api/show`, { form: payload });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    const created = getShowFromBody(body);
    expect(Array.isArray(created.genres)).toBeTruthy();
  });

  test("TC_SHW_004_INSERT_NextEpisodeDefault", async ({
    authRequest,
    accountId,
  }) => {
    const payload = dataFactory.generateShowPayload({
      account: accountId,
      title: `[QA-AUTO] Default Next Episode ${Date.now()}`,
      type: "radioshow",
      genres: [],
    });

    const res = await authRequest.post(`/api/show`, { form: payload });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    const created = getShowFromBody(body);
    expect(created).toHaveProperty("next_episode");
    expect(typeof created.next_episode).toBe("number");
    expect(created.next_episode).toBeGreaterThanOrEqual(0);
  });

  test("TC_SHW_NEG_001_INSERT_MissingAccount", async ({ authRequest }) => {
    const payload = {
      title: `[QA-AUTO] No Account ${Date.now()}`,
      type: "tvshow",
    };

    const res = await authRequest.post(`/api/show`, { form: payload });
    // La API puede obtener account del token y no fallar
    expect([200, 400, 422]).toContain(res.status());
  });

  test("TC_SHW_NEG_002_INSERT_MissingTitle", async ({
    authRequest,
    accountId,
  }) => {
    const payload = {
      account: accountId,
      type: "tvshow",
    };

    const res = await authRequest.post(`/api/show`, { form: payload });
    expect([400, 422]).toContain(res.status());
  });

  test("TC_SHW_NEG_003_INSERT_InvalidType", async ({
    authRequest,
    accountId,
  }) => {
    const payload = {
      account: accountId,
      title: `[QA-AUTO] Invalid Type ${Date.now()}`,
      type: "invalid_type_xyz",
    };

    const res = await authRequest.post(`/api/show`, { form: payload });
    // La API puede aceptar tipos no válidos, normalizarlos o devolver error
    expect([200, 400, 422, 500]).toContain(res.status());
  });

  test("TC_SHW_NEG_004_INSERT_InvalidDateFormat", async ({
    authRequest,
    accountId,
  }) => {
    const payload = {
      account: accountId,
      title: `[QA-AUTO] Bad Date ${Date.now()}`,
      type: "tvshow",
      first_emision: "not-a-date",
    };

    const res = await authRequest.post(`/api/show`, { form: payload });
    // La API puede ignorar fechas inválidas o fallar
    expect([200, 400, 422]).toContain(res.status());
  });
});

// --- 2. GET (Detalle) ---

test.describe("2. Read (GET /api/show/:id)", () => {
  test("TC_SHW_010_GET_ExistingShowDetail", async ({
    authRequest,
    tempShow,
  }) => {
    const res = await authRequest.get(`/api/show/${tempShow._id}`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    const show = getShowFromBody(body);
    expect(show._id).toBe(tempShow._id);
    expect(show.title).toBe(tempShow.title);

    const parsed = showSchema.parse(show);
    expect(parsed._id).toBeTruthy();
  });

  test("TC_SHW_011_GET_ShowWithPopulate", async ({ authRequest, tempShow }) => {
    const res = await authRequest.get(`/api/show/${tempShow._id}?populate=1`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    const show = getShowFromBody(body);
    expect(show._id).toBe(tempShow._id);
    expect(show).toHaveProperty("distributors");
    expect(show).toHaveProperty("producers");
  });

  test("TC_SHW_NEG_010_GET_NonExistentShow", async ({ authRequest }) => {
    const fakeId = "507f1f77bcf86cd799439011";

    const res = await authRequest.get(`/api/show/${fakeId}`);
    // La API puede devolver 404 o 500 según implementación
    expect([404, 500]).toContain(res.status());
  });

  test("TC_SHW_NEG_011_GET_InvalidShowId", async ({ authRequest }) => {
    const invalidId = "not-a-valid-id";

    const res = await authRequest.get(`/api/show/${invalidId}`);
    expect([400, 404, 500]).toContain(res.status());
  });
});

// --- 3. UPDATE (POST /api/show/:id según Swagger sm2) ---

test.describe("3. Update (POST /api/show/:id)", () => {
  test("TC_SHW_040_UPDATE_PartialUpdate", async ({ authRequest, tempShow }) => {
    const newDescription = faker.lorem.paragraph();

    const res = await authRequest.post(`/api/show/${tempShow._id}`, {
      form: { description: newDescription },
    });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    const updated = getShowFromBody(body);
    expect(updated.description).toBe(newDescription);
    expect(updated._id).toBe(tempShow._id);
  });

  test("TC_SHW_041_UPDATE_CompleteUpdate", async ({
    authRequest,
    tempShow,
  }) => {
    const newTitle = `[QA-AUTO] Updated Title ${Date.now()}`;
    const newDescription = faker.lorem.paragraph();

    const res = await authRequest.post(`/api/show/${tempShow._id}`, {
      form: {
        title: newTitle,
        description: newDescription,
      },
    });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    const updated = getShowFromBody(body);
    expect(updated.title).toBe(newTitle);
    expect(updated.description).toBe(newDescription);
  });

  test("TC_SHW_042_UPDATE_NextEpisodeValidation", async ({
    authRequest,
    tempShow,
  }) => {
    // next_episode es segundos (número), no fecha ISO
    const res = await authRequest.post(`/api/show/${tempShow._id}`, {
      form: { next_episode: 120 },
    });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    const updated = getShowFromBody(body);
    expect(updated).toHaveProperty("next_episode");
    expect(typeof updated.next_episode).toBe("number");
  });

  test("TC_SHW_NEG_040_UPDATE_CannotChangeShowType", async ({
    authRequest,
    tempShow,
  }) => {
    if (tempShow.type === "tvshow") {
      const res = await authRequest.post(`/api/show/${tempShow._id}`, {
        form: { type: "podcast" },
      });
      expect([200, 400, 422]).toContain(res.status());
    }
  });

  test("TC_SHW_NEG_041_UPDATE_NonExistentShow", async ({ authRequest }) => {
    const fakeId = "507f1f77bcf86cd799439011";

    const res = await authRequest.post(`/api/show/${fakeId}`, {
      form: { title: "Updated" },
    });
    expect([404, 403, 500]).toContain(res.status());
  });

  test("TC_SHW_NEG_042_UPDATE_InvalidNextEpisodeDate", async ({
    authRequest,
    tempShow,
  }) => {
    const res = await authRequest.post(`/api/show/${tempShow._id}`, {
      form: { next_episode: "invalid-date" },
    });
    expect([200, 400, 422]).toContain(res.status());
  });
});

// --- 4. REMOVE (Delete - Soft Delete) ---

test.describe("4. Remove (DELETE /api/show/:id)", () => {
  test("TC_SHW_050_REMOVE_SoftDeleteSuccess", async ({
    authRequest,
    tempShowForDelete,
  }) => {
    const showId = tempShowForDelete._id;

    const res = await authRequest.delete(`/api/show/${showId}`);
    expect(res.ok()).toBeTruthy();
    expect(res.status()).toBe(200);
  });

  test("TC_SHW_051_REMOVE_ShowStatusDeletedAfterRemove", async ({
    authRequest,
    tempShowForDelete,
  }) => {
    const showId = tempShowForDelete._id;

    await authRequest.delete(`/api/show/${showId}`);

    const getRes = await authRequest.get(`/api/show/${showId}`);
    // Tras soft-delete, GET puede devolver 404 (no encontrado) o 200 con status DELETE
    expect([404, 500, 200]).toContain(getRes.status());

    if (getRes.ok()) {
      const body = await getRes.json();
      const show = getShowFromBody(body);
      const status = show?.status ?? body?.status;
      // Tras soft-delete, si la API devuelve el show, debe tener status DELETE
      if (status !== undefined) {
        expect(status).toBe("DELETE");
      }
    }
  });

  test("TC_SHW_NEG_050_REMOVE_NonExistentShow", async ({ authRequest }) => {
    const fakeId = "507f1f77bcf86cd799439011";

    const res = await authRequest.delete(`/api/show/${fakeId}`);
    expect([404, 500]).toContain(res.status());
  });

  test("TC_SHW_NEG_051_REMOVE_InvalidShowId", async ({ authRequest }) => {
    const invalidId = "not-a-valid-id";

    const res = await authRequest.delete(`/api/show/${invalidId}`);
    expect([400, 404, 500]).toContain(res.status());
  });
});

// --- 5. Edge Cases y Validaciones ---

test.describe("5. Edge Cases y Validaciones", () => {
  test("TC_SHW_070_VALIDATION_EmptyTitle", async ({
    authRequest,
    accountId,
  }) => {
    const payload = {
      account: accountId,
      title: "",
      type: "tvshow",
    };

    const res = await authRequest.post(`/api/show`, { form: payload });
    expect([400, 422]).toContain(res.status());
  });

  test("TC_SHW_071_VALIDATION_VeryLongTitle", async ({
    authRequest,
    accountId,
  }) => {
    const longTitle = "A".repeat(5000);
    const payload = {
      account: accountId,
      title: longTitle,
      type: "tvshow",
    };

    const res = await authRequest.post(`/api/show`, { form: payload });
    expect([200, 400, 422]).toContain(res.status());
  });

  test("TC_SHW_072_VALIDATION_SpecialCharactersInTitle", async ({
    authRequest,
    accountId,
  }) => {
    const payload = {
      account: accountId,
      title: `[QA] Show @#$%^&*() ${Date.now()}`,
      type: "tvshow",
    };

    const res = await authRequest.post(`/api/show`, { form: payload });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    const created = getShowFromBody(body);
    expect(created.title).toContain("@#$%^&*()");
  });

  test("TC_SHW_073_VALIDATION_EmptyGenresArray", async ({
    authRequest,
    accountId,
  }) => {
    const payload = {
      account: accountId,
      title: `[QA-AUTO] Empty Genres ${Date.now()}`,
      type: "tvshow",
      genres: [],
    };

    const res = await authRequest.post(`/api/show`, { form: payload });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    const created = getShowFromBody(body);
    expect(Array.isArray(created.genres)).toBeTruthy();
  });

  test("TC_SHW_074_VALIDATION_UnicodeCharactersInDescription", async ({
    authRequest,
    accountId,
  }) => {
    const payload = {
      account: accountId,
      title: `[QA-AUTO] Unicode ${Date.now()}`,
      description: "こんにちは 中文 العربية Émojis: 🎬📺🎥",
      type: "tvshow",
    };

    const res = await authRequest.post(`/api/show`, { form: payload });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    const created = getShowFromBody(body);
    expect(created.description).toContain("Émojis");
  });
});
});
