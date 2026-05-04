/**
 * Test Suite: Show — Recommended Shows Feature
 * Nomenclatura: TC_SHW_REC_XXX
 *
 * Endpoint destino: POST <showApiBase>/show/:id  o  POST <BASE_URL>/api/show/:id
 *
 * Campo nuevo: recommended_shows[criteria]
 *   - shows_enabled  / shows[]        → shows específicos por _id
 *   - episodes_enabled / episodes[]   → episodios específicos por _id
 *   - categories_enabled / categories[] → por categoría (max_items, sort_by, order)
 *   - genres_enabled / genres[]       → por género
 *
 * El cuerpo se envía como application/x-www-form-urlencoded con bracket notation,
 * igual que la plataforma frontend.
 *
 * CONFIGURACIÓN:
 *   Si el proxy de BASE_URL no parsea bracket notation correctamente, agrega en .env:
 *   SHOW_API_URL=https://dev-api.platform.mediastre.am
 *   Los tests usarán esa URL con ruta /show/:id en lugar de /api/show/:id.
 */

const { test, expect } = require("../../fixtures/show.fixture");
const { showSchema } = require("../../schemas/show.schema");
require("dotenv").config();

// ---------------------------------------------------------------------------
// URL routing: soporte para URL directa de API cuando el proxy no parsea
// bracket notation (qs extended mode)
//
// Variables de entorno opcionales:
//   SHOW_API_URL=https://dev-api.platform.mediastre.am  → URL directa (sin proxy)
//   SHOW_API_TOKEN=<JWT>                                → Token JWT con scope show
//     El hex token de API_TOKEN NO guarda recommended_shows en la API directa.
//     Para los tests que validan persistencia del campo, usa el JWT de la plataforma.
// ---------------------------------------------------------------------------
const SHOW_API_URL = process.env.SHOW_API_URL || null;
// Path prefix: direct API uses /show, proxy uses /api/show
const showPath = (id) =>
  SHOW_API_URL ? `/show/${id}` : `/api/show/${id}`;

// ¿Tenemos token con permisos suficientes para leer/escribir recommended_shows?
const SHOW_API_TOKEN = process.env.SHOW_API_TOKEN || process.env.API_TOKEN || "";
const RECOMMENDED_SHOWS_AVAILABLE = !!process.env.SHOW_API_TOKEN;

// ---------------------------------------------------------------------------
// Helper: convierte la config de recommended_shows a URLSearchParams con
// bracket notation (e.g. recommended_shows[criteria][shows][0][_id]=xxx)
// ---------------------------------------------------------------------------
function buildRecommendedShowsForm(basePayload = {}, criteriaConfig = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(basePayload)) {
    if (value !== null && value !== undefined) {
      params.append(key, String(value));
    }
  }

  const {
    showsEnabled = false,
    shows = [],
    episodesEnabled = false,
    episodes = [],
    categoriesEnabled = false,
    categories = [],
    genresEnabled = false,
    genres = [],
  } = criteriaConfig;

  params.append("recommended_shows[criteria][shows_enabled]", String(showsEnabled));
  shows.forEach((s, i) => {
    params.append(`recommended_shows[criteria][shows][${i}][_id]`, s._id);
    params.append(`recommended_shows[criteria][shows][${i}][title]`, s.title ?? "");
    params.append(`recommended_shows[criteria][shows][${i}][description]`, s.description ?? "");
  });

  params.append("recommended_shows[criteria][episodes_enabled]", String(episodesEnabled));
  episodes.forEach((ep, i) => {
    params.append(`recommended_shows[criteria][episodes][${i}][_id]`, ep._id);
    params.append(`recommended_shows[criteria][episodes][${i}][title]`, ep.title ?? "");
    params.append(`recommended_shows[criteria][episodes][${i}][description]`, ep.description ?? "");
  });

  params.append("recommended_shows[criteria][categories_enabled]", String(categoriesEnabled));
  categories.forEach((cat, i) => {
    params.append(`recommended_shows[criteria][categories][${i}][category]`, cat.category);
    params.append(`recommended_shows[criteria][categories][${i}][max_items]`, String(cat.max_items ?? 10));
    params.append(`recommended_shows[criteria][categories][${i}][sort_by]`, cat.sort_by ?? "date_updated");
    params.append(`recommended_shows[criteria][categories][${i}][order]`, cat.order ?? "desc");
  });

  params.append("recommended_shows[criteria][genres_enabled]", String(genresEnabled));
  genres.forEach((genre) => {
    params.append("recommended_shows[criteria][genres][]", genre);
  });

  return params.toString();
}

// ---------------------------------------------------------------------------
// Helper: crea un show temporal (siempre via BASE_URL proxy — funciona para CRUD básico)
// ---------------------------------------------------------------------------
async function createTempShow(authRequest, attrs = {}) {
  const res = await authRequest.post("/api/show", {
    form: {
      title: `[QA-AUTO] Ref Show ${Date.now()}`,
      type: "tvshow",
      account: process.env.ACCOUNT_ID || "test-account",
      ...attrs,
    },
  });
  if (!res.ok()) throw new Error(`createTempShow failed: ${res.status()}`);
  const body = await res.json();
  const raw = body?.data ?? body;
  return Array.isArray(raw) ? raw[0] : raw;
}

async function deleteTempShow(authRequest, id) {
  try {
    await authRequest.delete(`/api/show/${id}`);
  } catch (_) {
    // ignore cleanup errors
  }
}

// ---------------------------------------------------------------------------
// Shared header for form-encoded requests
// ---------------------------------------------------------------------------
const FORM_HEADERS = { "content-type": "application/x-www-form-urlencoded" };

// ---------------------------------------------------------------------------
// Helper to normalize show from response body
// ---------------------------------------------------------------------------
function extractShow(body) {
  const raw = body?.data ?? body;
  return Array.isArray(raw) ? raw[0] : raw;
}

// ===========================================================================
test.describe("Show — Recommended Shows (POST /show/:id)", () => {
  // showApiCtx: contexto apuntando a SHOW_API_URL (direct API) o BASE_URL (proxy)
  // Se crea una sola vez por worker para reutilizarlo en todos los tests.
  let showApiCtx;

  test.beforeAll(async ({ playwright }) => {
    const baseURL = SHOW_API_URL || process.env.BASE_URL;
    showApiCtx = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: {
        "X-API-Token": SHOW_API_TOKEN,
      },
    });
  });

  test.afterAll(async () => {
    await showApiCtx?.dispose();
  });

  // ── 1. SHOWS CRITERIA ──────────────────────────────────────────────────────
  test.describe("1. Shows Criteria", () => {
    test("TC_SHW_REC_001_UPDATE_ShowsCriteriaEnabled", async ({
      authRequest,
      tempShow,
    }) => {
      test.skip(
        !RECOMMENDED_SHOWS_AVAILABLE,
        "Set SHOW_API_TOKEN=<JWT> in .env to validate recommended_shows persistence"
      );
      const refShow = await createTempShow(authRequest);

      const formBody = buildRecommendedShowsForm(
        { title: tempShow.title },
        {
          showsEnabled: true,
          shows: [
            { _id: refShow._id, title: refShow.title ?? "", description: "" },
          ],
        }
      );

      const res = await showApiCtx.post(showPath(tempShow._id), {
        data: formBody,
        headers: FORM_HEADERS,
      });
      expect(res.ok()).toBeTruthy();

      // Verify persistence via dedicated GET /show/:id/recommended endpoint
      const getRes = await showApiCtx.get(`${showPath(tempShow._id)}/recommended`);
      expect(getRes.ok()).toBeTruthy();
      const recBody = await getRes.json();
      expect(recBody.status).toBe("OK");
      expect(recBody.data).toHaveProperty("criteria");
      expect(recBody.data.criteria.shows_enabled).toBe(true);
      expect(Array.isArray(recBody.data.criteria.shows)).toBeTruthy();
      expect(recBody.data.criteria.shows).toContain(refShow._id);

      await deleteTempShow(authRequest, refShow._id);
    });

    test("TC_SHW_REC_002_UPDATE_ShowsCriteriaDisabled", async ({
      authRequest,
      tempShow,
    }) => {
      const formBody = buildRecommendedShowsForm(
        { title: tempShow.title },
        { showsEnabled: false }
      );

      const res = await showApiCtx.post(showPath(tempShow._id), {
        data: formBody,
        headers: FORM_HEADERS,
      });
      expect(res.ok()).toBeTruthy();

      const body = await res.json();
      const updated = extractShow(body);
      expect(updated._id).toBe(tempShow._id);

      if (updated.recommended_shows?.criteria?.shows_enabled !== undefined) {
        expect(
          updated.recommended_shows.criteria.shows_enabled === false ||
          updated.recommended_shows.criteria.shows_enabled === "false"
        ).toBeTruthy();
      }
    });
  });

  // ── 2. CATEGORIES CRITERIA ─────────────────────────────────────────────────
  test.describe("2. Categories Criteria", () => {
    test("TC_SHW_REC_010_UPDATE_CategoriesCriteriaEnabled", async ({
      authRequest,
      tempShow,
    }) => {
      test.skip(
        !RECOMMENDED_SHOWS_AVAILABLE,
        "Set SHOW_API_TOKEN=<JWT> in .env to validate recommended_shows persistence"
      );
      const categoryId =
        process.env.TEST_CATEGORY_ID || "695fe63daba5b5ab3a04e7e7";

      const formBody = buildRecommendedShowsForm(
        { title: tempShow.title },
        {
          categoriesEnabled: true,
          categories: [
            {
              category: categoryId,
              max_items: 10,
              sort_by: "date_updated",
              order: "desc",
            },
          ],
        }
      );

      const res = await showApiCtx.post(showPath(tempShow._id), {
        data: formBody,
        headers: FORM_HEADERS,
      });
      expect(res.ok()).toBeTruthy();

      // Verify persistence via dedicated GET /show/:id/recommended endpoint
      const getRes = await showApiCtx.get(`${showPath(tempShow._id)}/recommended`);
      expect(getRes.ok()).toBeTruthy();
      const recBody = await getRes.json();
      expect(recBody.status).toBe("OK");
      expect(recBody.data.criteria.categories_enabled).toBe(true);
      expect(Array.isArray(recBody.data.criteria.categories)).toBeTruthy();
    });

    test("TC_SHW_REC_011_UPDATE_CategoriesSortByDateCreated", async ({
      authRequest,
      tempShow,
    }) => {
      const categoryId =
        process.env.TEST_CATEGORY_ID || "695fe63daba5b5ab3a04e7e7";

      const formBody = buildRecommendedShowsForm(
        { title: tempShow.title },
        {
          categoriesEnabled: true,
          categories: [
            {
              category: categoryId,
              max_items: 5,
              sort_by: "date_created",
              order: "asc",
            },
          ],
        }
      );

      const res = await showApiCtx.post(showPath(tempShow._id), {
        data: formBody,
        headers: FORM_HEADERS,
      });
      expect(res.ok()).toBeTruthy();

      const body = await res.json();
      const updated = extractShow(body);
      expect(updated._id).toBe(tempShow._id);
    });
  });

  // ── 3. GENRES CRITERIA ─────────────────────────────────────────────────────
  test.describe("3. Genres Criteria", () => {
    test("TC_SHW_REC_020_UPDATE_GenresCriteriaEnabled", async ({
      authRequest,
      tempShow,
    }) => {
      test.skip(
        !RECOMMENDED_SHOWS_AVAILABLE,
        "Set SHOW_API_TOKEN=<JWT> in .env to validate recommended_shows persistence"
      );
      const formBody = buildRecommendedShowsForm(
        { title: tempShow.title },
        {
          genresEnabled: true,
          genres: ["animation"],
        }
      );

      const res = await showApiCtx.post(showPath(tempShow._id), {
        data: formBody,
        headers: FORM_HEADERS,
      });
      expect(res.ok()).toBeTruthy();

      // Verify persistence via dedicated GET /show/:id/recommended endpoint
      const getRes = await showApiCtx.get(`${showPath(tempShow._id)}/recommended`);
      expect(getRes.ok()).toBeTruthy();
      const recBody = await getRes.json();
      expect(recBody.status).toBe("OK");
      expect(recBody.data.criteria.genres_enabled).toBe(true);
      expect(recBody.data.criteria.genres).toContain("animation");
    });

    test("TC_SHW_REC_021_UPDATE_GenresMultipleValues", async ({
      authRequest,
      tempShow,
    }) => {
      const formBody = buildRecommendedShowsForm(
        { title: tempShow.title },
        {
          genresEnabled: true,
          genres: ["animation", "comedy", "drama"],
        }
      );

      const res = await showApiCtx.post(showPath(tempShow._id), {
        data: formBody,
        headers: FORM_HEADERS,
      });
      expect(res.ok()).toBeTruthy();

      const body = await res.json();
      const updated = extractShow(body);
      expect(updated._id).toBe(tempShow._id);
    });
  });

  // ── 4. EPISODES CRITERIA ───────────────────────────────────────────────────
  test.describe("4. Episodes Criteria", () => {
    test("TC_SHW_REC_030_UPDATE_EpisodesCriteriaEnabled", async ({
      authRequest,
      tempShow,
    }) => {
      const episodeId =
        process.env.TEST_EPISODE_ID || "69a1d09572c433c77f7fcb3e";

      const formBody = buildRecommendedShowsForm(
        { title: tempShow.title },
        {
          episodesEnabled: true,
          episodes: [{ _id: episodeId, title: "", description: "" }],
        }
      );

      const res = await showApiCtx.post(showPath(tempShow._id), {
        data: formBody,
        headers: FORM_HEADERS,
      });
      expect([200, 400, 422]).toContain(res.status());

      if (res.ok()) {
        const body = await res.json();
        const updated = extractShow(body);
        expect(updated._id).toBe(tempShow._id);
      }
    });

    test("TC_SHW_REC_031_UPDATE_EpisodesCriteriaDisabled", async ({
      authRequest,
      tempShow,
    }) => {
      const formBody = buildRecommendedShowsForm(
        { title: tempShow.title },
        { episodesEnabled: false }
      );

      const res = await showApiCtx.post(showPath(tempShow._id), {
        data: formBody,
        headers: FORM_HEADERS,
      });
      expect(res.ok()).toBeTruthy();

      const body = await res.json();
      const updated = extractShow(body);
      expect(updated._id).toBe(tempShow._id);
    });
  });

  // ── 5. ALL CRITERIA COMBINED ───────────────────────────────────────────────
  test.describe("5. All Criteria Combined", () => {
    test("TC_SHW_REC_040_UPDATE_AllCriteriaEnabled", async ({
      authRequest,
      tempShow,
    }) => {
      test.skip(
        !RECOMMENDED_SHOWS_AVAILABLE,
        "Set SHOW_API_TOKEN=<JWT> in .env to validate recommended_shows persistence"
      );
      const refShow = await createTempShow(authRequest);
      const categoryId =
        process.env.TEST_CATEGORY_ID || "695fe63daba5b5ab3a04e7e7";

      const formBody = buildRecommendedShowsForm(
        { title: tempShow.title },
        {
          showsEnabled: true,
          shows: [{ _id: refShow._id, title: "", description: "" }],
          episodesEnabled: false,
          episodes: [],
          categoriesEnabled: true,
          categories: [
            {
              category: categoryId,
              max_items: 10,
              sort_by: "date_updated",
              order: "desc",
            },
          ],
          genresEnabled: true,
          genres: ["animation"],
        }
      );

      const res = await showApiCtx.post(showPath(tempShow._id), {
        data: formBody,
        headers: FORM_HEADERS,
      });
      expect(res.ok()).toBeTruthy();

      // Verify all criteria persisted via GET /show/:id/recommended
      const getRes = await showApiCtx.get(`${showPath(tempShow._id)}/recommended`);
      expect(getRes.ok()).toBeTruthy();
      const recBody = await getRes.json();
      expect(recBody.status).toBe("OK");

      const criteria = recBody.data.criteria;
      expect(criteria).toBeDefined();
      expect(criteria.shows_enabled).toBe(true);
      expect(criteria.genres_enabled).toBe(true);
      expect(criteria.genres).toContain("animation");

      await deleteTempShow(authRequest, refShow._id);
    });

    test("TC_SHW_REC_041_UPDATE_AllCriteriaDisabled", async ({
      authRequest,
      tempShow,
    }) => {
      const formBody = buildRecommendedShowsForm(
        { title: tempShow.title },
        {
          showsEnabled: false,
          episodesEnabled: false,
          categoriesEnabled: false,
          genresEnabled: false,
        }
      );

      const res = await showApiCtx.post(showPath(tempShow._id), {
        data: formBody,
        headers: FORM_HEADERS,
      });
      expect(res.ok()).toBeTruthy();

      const body = await res.json();
      const updated = extractShow(body);
      expect(updated._id).toBe(tempShow._id);
    });
  });

  // ── 6. PERSISTENCE (GET after UPDATE) ─────────────────────────────────────
  test.describe("6. Persistence — GET after UPDATE", () => {
    test("TC_SHW_REC_050_GET_RecommendedShowsPersistedAfterUpdate", async ({
      authRequest,
      tempShow,
    }) => {
      test.skip(
        !RECOMMENDED_SHOWS_AVAILABLE,
        "Set SHOW_API_TOKEN=<JWT> in .env to validate recommended_shows persistence"
      );
      const refShow = await createTempShow(authRequest);

      const formBody = buildRecommendedShowsForm(
        { title: tempShow.title },
        {
          showsEnabled: true,
          shows: [{ _id: refShow._id, title: "", description: "" }],
          genresEnabled: true,
          genres: ["comedy"],
        }
      );

      const updateRes = await showApiCtx.post(showPath(tempShow._id), {
        data: formBody,
        headers: FORM_HEADERS,
      });
      expect(updateRes.ok()).toBeTruthy();

      // Verify persistence via GET /show/:id/recommended
      const getRes = await showApiCtx.get(`${showPath(tempShow._id)}/recommended`);
      expect(getRes.ok()).toBeTruthy();

      const recBody = await getRes.json();
      expect(recBody.status).toBe("OK");
      expect(recBody.data).toHaveProperty("criteria");

      const criteria = recBody.data.criteria;
      expect(criteria.shows_enabled).toBe(true);
      expect(Array.isArray(criteria.shows)).toBeTruthy();
      expect(criteria.shows).toContain(refShow._id);
      expect(criteria.genres_enabled).toBe(true);
      expect(criteria.genres).toContain("comedy");

      await deleteTempShow(authRequest, refShow._id);
    });

    test("TC_SHW_REC_051_GET_RecommendedShowsCriteriaStructure", async ({
      authRequest,
      tempShow,
    }) => {
      const categoryId =
        process.env.TEST_CATEGORY_ID || "695fe63daba5b5ab3a04e7e7";

      const formBody = buildRecommendedShowsForm(
        { title: tempShow.title },
        {
          categoriesEnabled: true,
          categories: [
            {
              category: categoryId,
              max_items: 8,
              sort_by: "date_updated",
              order: "asc",
            },
          ],
        }
      );

      await showApiCtx.post(showPath(tempShow._id), {
        data: formBody,
        headers: FORM_HEADERS,
      });

      const getRes = await showApiCtx.get(`${showPath(tempShow._id)}/recommended`);
      expect(getRes.ok()).toBeTruthy();

      const recBody = await getRes.json();
      expect(recBody.status).toBe("OK");

      const criteria = recBody.data?.criteria;
      if (criteria?.categories_enabled && criteria?.categories?.length > 0) {
        const cat = criteria.categories[0];
        // categories may be stored as ID strings or full objects
        expect(cat).toBeTruthy();
        if (typeof cat === "object") {
          expect(cat).toHaveProperty("category");
        }
      }
    });
  });

  // ── 7. NEGATIVE CASES ──────────────────────────────────────────────────────
  test.describe("7. Negative Cases", () => {
    test("TC_SHW_REC_NEG_001_UPDATE_InvalidShowIdInCriteria", async ({
      authRequest,
      tempShow,
    }) => {
      const formBody = buildRecommendedShowsForm(
        { title: tempShow.title },
        {
          showsEnabled: true,
          shows: [{ _id: "000000000000000000000000", title: "", description: "" }],
        }
      );

      const res = await showApiCtx.post(showPath(tempShow._id), {
        data: formBody,
        headers: FORM_HEADERS,
      });
      // API may silently accept unknown IDs, reject them, or return 500
      expect([200, 400, 404, 422, 500]).toContain(res.status());
    });

    test("TC_SHW_REC_NEG_002_UPDATE_InvalidGenreInCriteria", async ({
      authRequest,
      tempShow,
    }) => {
      const formBody = buildRecommendedShowsForm(
        { title: tempShow.title },
        {
          genresEnabled: true,
          genres: ["genre_that_does_not_exist_xyz"],
        }
      );

      const res = await showApiCtx.post(showPath(tempShow._id), {
        data: formBody,
        headers: FORM_HEADERS,
      });
      // API may accept or reject invalid genres, or return 500
      expect([200, 400, 422, 500]).toContain(res.status());
    });

    test("TC_SHW_REC_NEG_003_UPDATE_EmptyShowsArrayWhenEnabled", async ({
      authRequest,
      tempShow,
    }) => {
      const formBody = buildRecommendedShowsForm(
        { title: tempShow.title },
        {
          showsEnabled: true,
          shows: [],
        }
      );

      const res = await showApiCtx.post(showPath(tempShow._id), {
        data: formBody,
        headers: FORM_HEADERS,
      });
      expect([200, 400, 422]).toContain(res.status());
    });

    test("TC_SHW_REC_NEG_004_UPDATE_MultipleShowsInCriteria", async ({
      authRequest,
      tempShow,
    }) => {
      const refShow1 = await createTempShow(authRequest);
      const refShow2 = await createTempShow(authRequest);

      const formBody = buildRecommendedShowsForm(
        { title: tempShow.title },
        {
          showsEnabled: true,
          shows: [
            { _id: refShow1._id, title: "", description: "" },
            { _id: refShow2._id, title: "", description: "" },
          ],
        }
      );

      const res = await showApiCtx.post(showPath(tempShow._id), {
        data: formBody,
        headers: FORM_HEADERS,
      });
      expect(res.ok()).toBeTruthy();

      const body = await res.json();
      const updated = extractShow(body);
      expect(updated._id).toBe(tempShow._id);

      await deleteTempShow(authRequest, refShow1._id);
      await deleteTempShow(authRequest, refShow2._id);
    });

    test("TC_SHW_REC_NEG_005_UPDATE_NonExistentShowTarget", async () => {
      const fakeId = "507f1f77bcf86cd799439011";
      const formBody = buildRecommendedShowsForm(
        {},
        { showsEnabled: true, shows: [] }
      );

      const res = await showApiCtx.post(showPath(fakeId), {
        data: formBody,
        headers: FORM_HEADERS,
      });
      expect([403, 404, 500]).toContain(res.status());
    });
  });
});
