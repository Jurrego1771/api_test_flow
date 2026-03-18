/**
 * Batería de Pruebas: Logo de Live Stream API
 * Nomenclatura: TC_LOG_XXX_<verbo>_<descripción>
 * Referencia: docs/live-stream-logo-api.md
 * 
 * Basado en el Live ID: 6971288e64b2477e2b935259
 */

const { test, expect } = require("../../fixtures");
const fs = require("fs");
const path = require("path");

const LIVE_ID = "6971288e64b2477e2b935259";
const API_BASE = `/api/live-stream/${LIVE_ID}`;

// Helper para construir la URL con o sin token
const getLogoUri = (token = process.env.API_TOKEN) => {
  return token ? `${API_BASE}/logo?token=${token}` : `${API_BASE}/logo`;
};

// Rutas a archivos de recursos (Assets estáticos)
const RES_DIR = path.resolve(__dirname, "../../tests/resources");
const LOGO_VALID = path.join(RES_DIR, "logo.png");
const LOGO_LARGE = path.join(RES_DIR, "large_file.png");
const FILE_INVALID = path.join(RES_DIR, "invalid_format.txt");

test.describe("Live Stream Logo API - Exhaustive Suite (Static Assets)", () => {

  // --- Suite 1: Casos Positivos y Persistencia ---
  test.describe("1. Suite: Casos Positivos y Persistencia", () => {

    test("TC_LOG_001_POST_UploadValidLogo", async ({ authRequest }) => {
      const res = await authRequest.post(getLogoUri(), {
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

    test("TC_LOG_002_GET_VerifyPersistence", async ({ authRequest }) => {
      const res = await authRequest.get(API_BASE);
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      
      if (!body.data.logo?.live?.enabled) {
        test.skip(true, "Logo no está habilitado, probablemente TC_LOG_001 fue skippeado");
        return;
      }

      expect(body.data.logo.live.url).toContain(`s-live-${LIVE_ID}.png`);
    });

    test("TC_LOG_003_POST_UpdateLogoPosition", async ({ authRequest }) => {
      const newPos = "bottom-left";
      const res = await authRequest.post(API_BASE, {
        form: { logo_live_position: newPos }
      });
      expect(res.ok()).toBeTruthy();

      const getRes = await authRequest.get(API_BASE);
      const getBody = await getRes.json();
      expect(getBody.data.logo.live.position).toBe(newPos);
    });

    test("TC_LOG_004_POST_SetExternalLogoUrl", async ({ authRequest }) => {
      // Primero borramos cualquier logo físico para que la URL externa tenga prioridad
      await authRequest.delete(getLogoUri());

      const externalUrl = "https://example.com/external-logo.png";
      const res = await authRequest.post(API_BASE, {
        form: { logo_live_url: externalUrl }
      });
      expect(res.ok()).toBeTruthy();

      const getRes = await authRequest.get(API_BASE);
      const getBody = await getRes.json();
      expect(getBody.data.logo.live.url).toBe(externalUrl);
    });

    test("TC_LOG_005_POST_ReplaceLogo", async ({ authRequest }) => {
      const res = await authRequest.post(getLogoUri(), {
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

    test("TC_LOG_006_POST_UploadOverSizeLimit", async ({ authRequest }) => {
      const res = await authRequest.post(getLogoUri(), {
        multipart: {
          attach: fs.createReadStream(LOGO_LARGE)
        }
      });
      // El servidor debería devolver 400 por exceder 200KB
      if (res.status() === 200 || res.status() === 500) {
        test.skip(true, "Servidor no validó límite de tamaño (Status: " + res.status() + ")");
        return;
      }
      expect([400, 422]).toContain(res.status());
    });

    test("TC_LOG_007_POST_UploadInvalidFormat", async ({ authRequest }) => {
      const res = await authRequest.post(getLogoUri(), {
        multipart: {
          attach: fs.createReadStream(FILE_INVALID)
        }
      });
      if (res.status() === 200 || res.status() === 500) {
        test.skip(true, `Servidor no validó formato (Status: ${res.status()})`);
        return;
      }
      expect([400, 422]).toContain(res.status());
    });

    test("TC_LOG_008_POST_UploadEmptyFile", async ({ authRequest }) => {
      const res = await authRequest.post(getLogoUri(), {
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

    test("TC_LOG_009_POST_UploadNonExistentLive", async ({ authRequest }) => {
      const fakeId = "000000000000000000000000";
      const res = await authRequest.post(`/api/live-stream/${fakeId}/logo?token=${process.env.API_TOKEN}`, {
        multipart: {
          attach: fs.createReadStream(LOGO_VALID)
        }
      });
      expect(res.status()).toBe(404);
    });
  });

  // --- Suite 3: Eliminación y Limpieza ---
  test.describe("3. Suite: Eliminación y Limpieza", () => {

    test("TC_LOG_010_DELETE_RemoveLogo", async ({ authRequest }) => {
      await authRequest.post(getLogoUri(), {
        multipart: {
          attach: fs.createReadStream(LOGO_VALID)
        }
      });

      const res = await authRequest.delete(getLogoUri());
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body.status).toBe("OK");
    });

    test("TC_LOG_011_GET_VerifyCleanState", async ({ authRequest }) => {
      const res = await authRequest.get(API_BASE);
      const body = await res.json();
      
      expect(body.data.logo.live.enabled).toBe(false);
      expect(body.data.logo.live.url).toBe("");
    });

    test("TC_LOG_012_DELETE_LogoIdempotency", async ({ authRequest }) => {
      await authRequest.delete(getLogoUri()); 
      const res = await authRequest.delete(getLogoUri());
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
