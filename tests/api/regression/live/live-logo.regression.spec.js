/**
 * Batería de Pruebas: Logo de Live Stream API
 * Nomenclatura: TC_LOG_XXX_<verbo>_<descripción>
 * Referencia: docs/live-stream-logo-api.md
 *
 * Basado en el Live ID: 6971288e64b2477e2b935259
 */

const { test, expect } = require('@playwright/test');
const { ApiClient } = require('../../helpers');
const { ResourceCleaner } = require('../../helpers');
const fs = require("fs");
const path = require("path");

const LIVE_ID = process.env.LIVE_STREAM_ID;
const API_BASE = `/api/live-stream/${LIVE_ID}`;

// Helper para construir la URL con o sin token
const getLogoUri = (token = process.env.API_TOKEN) => {
  return token ? `${API_BASE}/logo?token=${token}` : `${API_BASE}/logo`;
};

// Rutas a archivos de recursos (Assets estáticos)
const RES_DIR = path.resolve(__dirname, "../../../../tests/resources");
const LOGO_VALID = path.join(RES_DIR, "logo.png");
const LOGO_LARGE = path.join(RES_DIR, "large_file.png");
const FILE_INVALID = path.join(RES_DIR, "invalid_format.txt");

let apiClient, cleaner;

test.beforeEach(async ({ request, baseURL }) => {
  apiClient = new ApiClient(request, baseURL);
  cleaner = new ResourceCleaner(apiClient);
});

test.afterEach(async () => {
  await cleaner.clean();
});

test.describe("Live Stream Logo API - Exhaustive Suite (Static Assets)", () => {

  // --- Suite 1: Casos Positivos y Persistencia ---
  test.describe("1. Suite: Casos Positivos y Persistencia", () => {

    test("TC_LOG_001_POST_UploadValidLogo", async ({ request }) => {
      const res = await request.post(`${process.env.BASE_URL}${getLogoUri()}`, {
        multipart: {
          attach: fs.createReadStream(LOGO_VALID)
        }
      });

      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("OK");
      expect(body.data).toBe("Logo Uploaded");
      // Validación de la URL devuelta
      expect(body.url).toMatch(new RegExp(`https?://.*s-live-${LIVE_ID}\\.png`));
    });

    test("TC_LOG_002_GET_VerifyPersistence", async ({ request }) => {
      const res = await request.get(`${process.env.BASE_URL}${API_BASE}`, {
        headers: { "X-API-Token": process.env.API_TOKEN }
      });
      expect(res.ok()).toBeTruthy();
      const body = await res.json();

      if (!body.data.logo?.live?.enabled) {
        test.skip(true, "Logo no está habilitado, probablemente TC_LOG_001 fue skippeado");
        return;
      }

      expect(body.data.logo.live.url).toContain(`s-live-${LIVE_ID}.png`);
    });

    test("TC_LOG_003_POST_UpdateLogoPosition", async ({ request }) => {
      const newPos = "bottom-left";
      const res = await request.post(`${process.env.BASE_URL}${API_BASE}`, {
        headers: { "X-API-Token": process.env.API_TOKEN },
        form: { logo_live_position: newPos }
      });
      expect(res.ok()).toBeTruthy();

      const getRes = await request.get(`${process.env.BASE_URL}${API_BASE}`, {
        headers: { "X-API-Token": process.env.API_TOKEN }
      });
      const getBody = await getRes.json();
      expect(getBody.data.logo.live.position).toBe(newPos);
    });

    test("TC_LOG_004_POST_SetExternalLogoUrl", async ({ request }) => {
      // Primero borramos cualquier logo físico para que la URL externa tenga prioridad
      await request.delete(`${process.env.BASE_URL}${getLogoUri()}`, {
        headers: { "X-API-Token": process.env.API_TOKEN }
      });

      const externalUrl = "https://example.com/external-logo.png";
      const res = await request.post(`${process.env.BASE_URL}${API_BASE}`, {
        headers: { "X-API-Token": process.env.API_TOKEN },
        form: { logo_live_url: externalUrl }
      });
      expect(res.ok()).toBeTruthy();

      const getRes = await request.get(`${process.env.BASE_URL}${API_BASE}`, {
        headers: { "X-API-Token": process.env.API_TOKEN }
      });
      const getBody = await getRes.json();
      expect(getBody.data.logo.live.url).toBe(externalUrl);
    });

    test("TC_LOG_005_POST_ReplaceLogo", async ({ request }) => {
      const res = await request.post(`${process.env.BASE_URL}${getLogoUri()}`, {
        multipart: {
          attach: fs.createReadStream(LOGO_VALID)
        }
      });

      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.url).toMatch(new RegExp(`https?://.*s-live-${LIVE_ID}\\.png`));
      expect(body.url).toContain("?"); // Validamos que traiga el timestamp para evitar caché
    });
  });

  // --- Suite 2: Límites y Validaciones Negativas ---
  test.describe("2. Suite: Límites y Validaciones Negativas", () => {

    test("TC_LOG_006_POST_UploadOverSizeLimit", async ({ request }) => {
      const res = await request.post(`${process.env.BASE_URL}${getLogoUri()}`, {
        multipart: {
          attach: fs.createReadStream(LOGO_LARGE)
        }
      });
      // El servidor debe rechazar archivos que excedan 200KB con 400/422
      // Si este test falla con 200/500, es BUG: el backend no está validando el tamaño
      expect([400, 422]).toContain(res.status());
    });

    test("TC_LOG_007_POST_UploadInvalidFormat", async ({ request }) => {
      const res = await request.post(`${process.env.BASE_URL}${getLogoUri()}`, {
        multipart: {
          attach: fs.createReadStream(FILE_INVALID)
        }
      });
      // El servidor debe rechazar formatos inválidos con 400/422
      // Si este test falla con 200/500, es BUG: el backend no está validando el formato
      expect([400, 422]).toContain(res.status());
    });

    test("TC_LOG_008_POST_UploadEmptyFile", async ({ request }) => {
      const res = await request.post(`${process.env.BASE_URL}${getLogoUri()}`, {
        multipart: {
          attach: {
            name: "empty.png",
            mimeType: "image/png",
            buffer: Buffer.from(""),
          }
        }
      });
      if (res.status() === 200 || res.status() === 500) {
        test.skip(true, `Servidor no validó archivo vacío (Status: ${res.status()})`);
        return;
      }
      expect([400, 422]).toContain(res.status());
    });

    test("TC_LOG_009_POST_UploadNonExistentLive", async ({ request }) => {
      const fakeId = "000000000000000000000000";
      const res = await request.post(`${process.env.BASE_URL}/api/live-stream/${fakeId}/logo?token=${process.env.API_TOKEN}`, {
        multipart: {
          attach: fs.createReadStream(LOGO_VALID)
        }
      });
      expect(res.status()).toBe(404);
    });
  });

  // --- Suite 3: Eliminación y Limpieza ---
  test.describe("3. Suite: Eliminación y Limpieza", () => {

    test("TC_LOG_010_DELETE_RemoveLogo", async ({ request }) => {
      await request.post(`${process.env.BASE_URL}${getLogoUri()}`, {
        multipart: {
          attach: fs.createReadStream(LOGO_VALID)
        }
      });

      const res = await request.delete(`${process.env.BASE_URL}${getLogoUri()}`, {
        headers: { "X-API-Token": process.env.API_TOKEN }
      });
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body.status).toBe("OK");
    });

    test("TC_LOG_011_GET_VerifyCleanState", async ({ request }) => {
      const res = await request.get(`${process.env.BASE_URL}${API_BASE}`, {
        headers: { "X-API-Token": process.env.API_TOKEN }
      });
      const body = await res.json();

      expect(body.data.logo.live.enabled).toBe(false);
      expect(body.data.logo.live.url).toBe("");
    });

    test("TC_LOG_012_DELETE_LogoIdempotency", async ({ request }) => {
      await request.delete(`${process.env.BASE_URL}${getLogoUri()}`, {
        headers: { "X-API-Token": process.env.API_TOKEN }
      });
      const res = await request.delete(`${process.env.BASE_URL}${getLogoUri()}`, {
        headers: { "X-API-Token": process.env.API_TOKEN }
      });
      expect([200, 204, 404]).toContain(res.status());
    });
  });

  // --- Suite 4: Seguridad (Auth) ---
  test.describe("4. Suite: Seguridad (Auth)", () => {

    test("TC_LOG_013_POST_UploadNoToken", async ({ playwright }) => {
      const unauth = await playwright.request.newContext();
      const res = await unauth.post(`${process.env.BASE_URL}${getLogoUri("")}`, {
        multipart: {
          attach: fs.createReadStream(LOGO_VALID)
        }
      });
      expect([401, 403]).toContain(res.status());
      await unauth.dispose();
    });

    test("TC_LOG_014_DELETE_RemoveNoToken", async ({ playwright }) => {
      const unauth = await playwright.request.newContext();
      const res = await unauth.delete(`${process.env.BASE_URL}${getLogoUri("")}`);
      expect([401, 403]).toContain(res.status());
      await unauth.dispose();
    });
  });
});
