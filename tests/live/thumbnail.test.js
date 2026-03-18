const { test, expect, request } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const BASE_URL = process.env.BASE_URL;
const API_TOKEN = process.env.API_TOKEN;
const LIVE_ID = "6971288e64b2477e2b935259"; // Usando el ID del usuario

const API_BASE = `/api/live-stream/${LIVE_ID}`;
const THUMB_URI = `${API_BASE}/thumb`;

// Recursos estáticos
const THUMB_VALID = path.resolve('tests/resources/logo.png');

test.describe.configure({ mode: 'serial' });

test.describe("Live Stream Thumbnail API - Batería de Pruebas", () => {
  let authRequest;
  let thumbId;

  test.beforeAll(async ({ playwright }) => {
    authRequest = await playwright.request.newContext({
      baseURL: BASE_URL,
    });
  });

  // Helper para construir URLs con token
  const getThumbUri = (id = '', token = API_TOKEN) => {
    const base = id ? `${THUMB_URI}/${id}` : THUMB_URI;
    return token ? `${base}?token=${token}` : base;
  };

  test.describe("1. Suite: Casos Positivos y Persistencia", () => {

    test("TC_THB_001_POST_UploadThumbnail", async () => {
      const res = await authRequest.post(getThumbUri(), {
        multipart: {
          thumb: fs.createReadStream(THUMB_VALID)
        }
      });

      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("OK");
    });

    test("TC_THB_002_GET_VerifyThumbnailList", async () => {
      const res = await authRequest.get(getThumbUri());
      expect(res.status()).toBe(200);
      
      const body = await res.json();
      expect(body.status).toBe("OK");
      expect(Array.isArray(body.data.thumbnails)).toBeTruthy();
      
      // Guardamos un ID para los siguientes tests
      if (body.data.thumbnails.length > 0) {
        thumbId = body.data.thumbnails[0]._id;
      }
      expect(thumbId).toBeDefined();
    });

    test("TC_THB_003_POST_SetDefaultThumbnail", async () => {
      test.skip(!thumbId, "No hay thumbnail para marcar como default");

      const res = await authRequest.post(getThumbUri(thumbId));
      expect(res.status()).toBe(200);
      
      const body = await res.json();
      expect(body.status).toBe("OK");

      // Verificamos en el listado
      const listRes = await authRequest.get(getThumbUri());
      const listBody = await listRes.json();
      const thumb = listBody.data.thumbnails.find(t => t._id === thumbId);
      expect(thumb.is_default).toBe(true);
    });

    test("TC_THB_004_DELETE_RemoveThumbnail", async () => {
      test.setTimeout(60000); // Ampliamos timeout para la espera de 45s
      test.skip(!thumbId, "No hay thumbnail para borrar");

      const res = await authRequest.delete(getThumbUri(thumbId));
      expect(res.status()).toBe(200);
      
      const body = await res.json();
      expect(body.status).toBe("OK");

      // Espera solicitada por el usuario para propagación de cambios
      await new Promise(r => setTimeout(r, 45000));

      // Verificamos que ya no esté en la lista
      const listRes = await authRequest.get(getThumbUri());
      const listBody = await listRes.json();
      const thumbExists = listBody.data.thumbnails.some(t => t._id === thumbId);
      expect(thumbExists).toBe(false);
    });
  });

  test.describe("2. Suite: Seguridad (Auth)", () => {
    test("TC_THB_005_POST_UploadNoToken", async () => {
      const res = await authRequest.post(getThumbUri('', ''), {
        multipart: {
          thumb: fs.createReadStream(THUMB_VALID)
        }
      });
      // El servidor suele devolver 401 o 403
      expect([401, 403]).toContain(res.status());
    });

    test("TC_THB_006_DELETE_RemoveNoToken", async () => {
      const res = await authRequest.delete(getThumbUri('dummy_id', ''));
      expect([401, 403]).toContain(res.status());
    });
  });
});
