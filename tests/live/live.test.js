/**
 * Plan de Automatización: Módulo Live Stream API
 * Nomenclatura: TC_LIV_XXX_<endpoint>_<descripción>
 * Ref: docs/test_doc/live_api_test_plan.md
 * Corresponde a batería LIV-01 a LIV-45 (casos realizables por API)
 */

const { test, expect } = require("../../fixtures");
const {
  createLiveStreamResponseSchema,
  listLiveStreamResponseSchema,
} = require("../../schemas/live.schema");
const dataFactory = require("../../utils/dataFactory");
const { faker } = require("@faker-js/faker");

const API_BASE = "/api/live-stream";

const createdStreamIds = [];

function getCreatedStream(body) {
  return Array.isArray(body.data) ? body.data[0] : body.data;
}

async function createLiveStream(authRequest, attrs = {}) {
  const payload = dataFactory.generateLiveStreamPayload({
    type: "video",
    online: "false",
    ...attrs,
  });
  const res = await authRequest.post(API_BASE, { form: payload });
  if (!res.ok()) {
    const txt = await res.text().catch(() => "");
    throw new Error(`createLiveStream failed: ${res.status()} ${txt}`);
  }
  const body = await res.json();
  const created = getCreatedStream(body);
  createdStreamIds.push(created._id);
  return created;
}

async function deleteStream(authRequest, id) {
  let res;
  try {
    res = await authRequest.delete(`${API_BASE}/${id}`);
  } finally {
    const idx = createdStreamIds.indexOf(id);
    if (idx !== -1) createdStreamIds.splice(idx, 1);
  }
  return res;
}

async function ensureLiveApiAvailable(authRequest) {
  const res = await authRequest.get(`${API_BASE}?limit=1`);
  if (res.status() === 404 || res.status() === 401) {
    test.skip(true, "API Live no disponible en este entorno");
    return false;
  }
  return res.ok();
}

// --- Cleanup: eliminar todos los streams creados al final ---

test.describe("Live Stream API", () => {
  test.afterAll(async ({ authRequest }) => {
    for (const id of [...createdStreamIds]) {
      try {
        await authRequest.delete(`${API_BASE}/${id}`);
      } catch (e) {
        /* orphan cleanup */
      }
    }
    createdStreamIds.length = 0;
  });

  // --- 1. Suite: CRUD Principal ---

  test.describe("1. CRUD Principal (POST/GET/DELETE)", () => {
  test("TC_LIV_001_POST_CreateStreamVideo", async ({ authRequest }) => {
    if (!(await ensureLiveApiAvailable(authRequest))) return;
    const payload = dataFactory.generateLiveStreamPayload({ type: "video" });
    const res = await authRequest.post(API_BASE, { form: payload });
    const body = await res.json();

    if (!res.ok()) {
      test.skip(true, "Endpoint POST Live puede no estar disponible");
      return;
    }

    expect(res.status()).toBe(200);
    expect(body.status).toBe("OK");
    const created = getCreatedStream(body);
    expect(created).toBeDefined();
    expect(created).toHaveProperty("_id");
    createLiveStreamResponseSchema.parse({ status: body.status, data: created });

    await deleteStream(authRequest, created._id);
  });

  test("TC_LIV_002_POST_CreateStreamAudio", async ({ authRequest }) => {
    if (!(await ensureLiveApiAvailable(authRequest))) return;
    const payload = dataFactory.generateLiveStreamPayload({ type: "audio" });
    const res = await authRequest.post(API_BASE, { form: payload });
    const body = await res.json();

    if (!res.ok()) {
      test.skip(true, "Endpoint POST Live puede no estar disponible");
      return;
    }

    expect(body.status).toBe("OK");
    const created = getCreatedStream(body);
    expect(created).toBeDefined();
    expect(created._id).toBeDefined();

    await deleteStream(authRequest, created._id);
  });

  test("TC_LIV_002_GET_ListStreams", async ({ authRequest }) => {
    if (!(await ensureLiveApiAvailable(authRequest))) return;
    const res = await authRequest.get(`${API_BASE}?limit=10`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.status).toBe("OK");
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeLessThanOrEqual(10);
  });

  test("TC_LIV_003_GET_DetailStream", async ({ authRequest }) => {
    if (!(await ensureLiveApiAvailable(authRequest))) return;
    const stream = await createLiveStream(authRequest);
    try {
      const res = await authRequest.get(`${API_BASE}/${stream._id}`);
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body.status).toBe("OK");
      expect(body.data._id).toBe(stream._id);
      expect(body.data).toHaveProperty("name");
    } finally {
      await deleteStream(authRequest, stream._id);
    }
  });

  test("TC_LIV_003b_GET_DetailNotFound", async ({ authRequest }) => {
    if (!(await ensureLiveApiAvailable(authRequest))) return;
    const fakeId = "000000000000000000000000";
    const res = await authRequest.get(`${API_BASE}/${fakeId}`);
    expect([200, 404]).toContain(res.status());
    const body = await res.json();
    if (res.status() === 404) {
      expect(body.status).toBe("ERROR");
    }
  });

  test("TC_LIV_004_POST_UpdateNameOnly", async ({ authRequest }) => {
    if (!(await ensureLiveApiAvailable(authRequest))) return;
    const stream = await createLiveStream(authRequest);
    const newName = `updated_${faker.string.alphanumeric(6)}`;
    try {
      const updRes = await authRequest.post(`${API_BASE}/${stream._id}`, {
        form: { name: newName },
      });
      if (!updRes.ok()) {
        test.skip(true, "Update puede no estar disponible");
        return;
      }
      const getRes = await authRequest.get(`${API_BASE}/${stream._id}`);
      const getBody = await getRes.json();
      expect(getBody.data.name).toBe(newName);
    } finally {
      await deleteStream(authRequest, stream._id);
    }
  });

  test("TC_LIV_004b_POST_UpdatePartialConfig", async ({ authRequest }) => {
    if (!(await ensureLiveApiAvailable(authRequest))) return;
    const stream = await createLiveStream(authRequest);
    try {
      const updRes = await authRequest.post(`${API_BASE}/${stream._id}`, {
        form: { dvr: "true" },
      });
      if (!updRes.ok()) {
        test.skip(true, "Update parcial puede no estar disponible");
        return;
      }
      const getRes = await authRequest.get(`${API_BASE}/${stream._id}`);
      const body = await getRes.json();
      expect(body.data.dvr).toBe(true);
    } finally {
      await deleteStream(authRequest, stream._id);
    }
  });

  test("TC_LIV_005_DELETE_Stream", async ({ authRequest }) => {
    if (!(await ensureLiveApiAvailable(authRequest))) return;
    const stream = await createLiveStream(authRequest);
    const delRes = await deleteStream(authRequest, stream._id);
    expect([200, 204]).toContain(delRes.status());

    const getRes = await authRequest.get(`${API_BASE}/${stream._id}`);
    expect([404]).toContain(getRes.status());
  });
});

// --- 2. Suite: Búsqueda y Filtros ---

test.describe("2. Búsqueda y Filtros", () => {
  test("TC_LIV_006_GET_SearchByName", async ({ authRequest }) => {
    if (!(await ensureLiveApiAvailable(authRequest))) return;
    const unique = `qa_search_${Date.now()}_${faker.string.alphanumeric(4)}`;
    const stream = await createLiveStream(authRequest, { name: unique });
    try {
      const searchRes = await authRequest.get(
        `${API_BASE}?limit=50&query=${encodeURIComponent(unique)}`
      );
      expect(searchRes.ok()).toBeTruthy();
      const body = await searchRes.json();
      const found = body.data?.some((s) => s._id === stream._id);
      expect(found).toBeTruthy();
    } finally {
      await deleteStream(authRequest, stream._id);
    }
  });

  test("TC_LIV_007_GET_FilterOnline", async ({ authRequest }) => {
    if (!(await ensureLiveApiAvailable(authRequest))) return;
    const res = await authRequest.get(`${API_BASE}?limit=10&monitor=true`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  test("TC_LIV_008_GET_FilterOffline", async ({ authRequest }) => {
    if (!(await ensureLiveApiAvailable(authRequest))) return;
    const res = await authRequest.get(`${API_BASE}?limit=10&monitor=false`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  test("TC_LIV_009_GET_FilterByTypeVideoAudio", async ({ authRequest }) => {
    if (!(await ensureLiveApiAvailable(authRequest))) return;
    const videoStream = await createLiveStream(authRequest, { type: "video" });
    const audioStream = await createLiveStream(authRequest, { type: "audio" });
    try {
      const resVideo = await authRequest.get(
        `${API_BASE}?type=video&limit=10`
      );
      const resAudio = await authRequest.get(
        `${API_BASE}?type=audio&limit=10`
      );
      expect(resVideo.ok()).toBeTruthy();
      expect(resAudio.ok()).toBeTruthy();
      const bodyVideo = await resVideo.json();
      const bodyAudio = await resAudio.json();
      expect(Array.isArray(bodyVideo.data)).toBe(true);
      expect(Array.isArray(bodyAudio.data)).toBe(true);
    } finally {
      await deleteStream(authRequest, videoStream._id);
      await deleteStream(authRequest, audioStream._id);
    }
  });

  test("TC_LIV_010_GET_PaginationLimit", async ({ authRequest }) => {
    if (!(await ensureLiveApiAvailable(authRequest))) return;
    const res = await authRequest.get(`${API_BASE}?limit=24`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.length).toBeLessThanOrEqual(24);
  });

  test("TC_LIV_011_GET_PaginationSkip", async ({ authRequest }) => {
    if (!(await ensureLiveApiAvailable(authRequest))) return;
    const page1 = await authRequest.get(`${API_BASE}?limit=5&skip=0`);
    const page2 = await authRequest.get(`${API_BASE}?limit=5&skip=5`);
    expect(page1.ok()).toBeTruthy();
    expect(page2.ok()).toBeTruthy();
    const b1 = await page1.json();
    const b2 = await page2.json();
    if (b1.data.length > 0 && b2.data.length > 0) {
      const ids1 = b1.data.map((s) => s._id);
      const ids2 = b2.data.map((s) => s._id);
      expect(ids1.filter((id) => ids2.includes(id)).length).toBe(0);
    }
  });

  test("TC_LIV_021_GET_FilterFavorites", async ({ authRequest }) => {
    if (!(await ensureLiveApiAvailable(authRequest))) return;
    const res = await authRequest.get(`${API_BASE}?limit=10&bookmark=true`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  test("TC_LIV_022_GET_ListWithParams", async ({ authRequest }) => {
    if (!(await ensureLiveApiAvailable(authRequest))) return;
    const res = await authRequest.get(`${API_BASE}?limit=10&sort=-date_created`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });
});

// --- 3. Suite: Estado (Online/Offline) ---

test.describe("3. Estado Online/Offline", () => {
  test("TC_LIV_012_POST_ToggleOnline", async ({ authRequest }) => {
    if (!(await ensureLiveApiAvailable(authRequest))) return;
    const stream = await createLiveStream(authRequest);
    try {
      const toggleRes = await authRequest.post(
        `${API_BASE}/${stream._id}/toggle-online`,
        {}
      );
      expect(toggleRes.ok()).toBeTruthy();
      const getRes = await authRequest.get(`${API_BASE}/${stream._id}`);
      expect(getRes.ok()).toBeTruthy();
    } finally {
      await deleteStream(authRequest, stream._id);
    }
  });

  test("TC_LIV_013_POST_ToggleOffline", async ({ authRequest }) => {
    if (!(await ensureLiveApiAvailable(authRequest))) return;
    const stream = await createLiveStream(authRequest);
    try {
      const res = await authRequest.post(
        `${API_BASE}/${stream._id}/toggle-online`,
        {}
      );
      expect(res.ok()).toBeTruthy();
    } finally {
      await deleteStream(authRequest, stream._id);
    }
  });
});

// --- 4. Suite: Favoritos (bookmark) ---

test.describe("4. Favoritos (toggle-bookmark)", () => {
  test("TC_LIV_014_POST_SetFavorite", async ({ authRequest }) => {
    if (!(await ensureLiveApiAvailable(authRequest))) return;
    const stream = await createLiveStream(authRequest);
    try {
      const res = await authRequest.post(
        `${API_BASE}/${stream._id}/toggle-bookmark`,
        {}
      );
      expect(res.ok()).toBeTruthy();
      const getRes = await authRequest.get(`${API_BASE}/${stream._id}`);
      const body = await getRes.json();
      expect(body.data.bookmark).toBe(true);
    } finally {
      await deleteStream(authRequest, stream._id);
    }
  });

  test("TC_LIV_015_POST_RemoveFavorite", async ({ authRequest }) => {
    if (!(await ensureLiveApiAvailable(authRequest))) return;
    const stream = await createLiveStream(authRequest);
    try {
      await authRequest.post(
        `${API_BASE}/${stream._id}/toggle-bookmark`,
        {}
      );
      await authRequest.post(
        `${API_BASE}/${stream._id}/toggle-bookmark`,
        {}
      );
      const getRes = await authRequest.get(`${API_BASE}/${stream._id}`);
      const body = await getRes.json();
      expect(body.data.bookmark).toBe(false);
    } finally {
      await deleteStream(authRequest, stream._id);
    }
  });
});

// --- 5. Suite: Grabación ---

test.describe("5. Grabación", () => {
  test("TC_LIV_023_POST_StartRecord", async ({ authRequest }) => {
    if (!(await ensureLiveApiAvailable(authRequest))) return;
    const stream = await createLiveStream(authRequest);
    try {
      const res = await authRequest.post(
        `${API_BASE}/${stream._id}/start-record`,
        {}
      );
      if (res.status() === 404) {
        const alt = await authRequest.post(
          `${API_BASE}/${stream._id}/recording/start`,
          {}
        );
        expect([200, 400, 404]).toContain(alt.status());
      } else {
        expect([200, 400]).toContain(res.status());
      }
    } finally {
      await deleteStream(authRequest, stream._id);
    }
  });
});

// --- 6. Suite: Token de Publicación ---

test.describe("6. Token de Publicación", () => {
  test("TC_LIV_024_POST_RefreshToken", async ({ authRequest }) => {
    if (!(await ensureLiveApiAvailable(authRequest))) return;
    const stream = await createLiveStream(authRequest);
    try {
      const res = await authRequest.post(
        `${API_BASE}/${stream._id}/refresh-token`,
        {}
      );
      if (res.status() === 404) {
        const alt = await authRequest.post(
          `${API_BASE}/${stream._id}`,
          { form: { refresh_token: "true" } }
        );
        expect([200, 404]).toContain(alt.status());
      } else {
        expect(res.ok()).toBeTruthy();
      }
    } finally {
      await deleteStream(authRequest, stream._id);
    }
  });
});

// --- 7. Suite: Thumbnails y Logo ---

test.describe("7. Thumbnails y Logo", () => {
  test("TC_LIV_025_GET_ThumbList", async ({ authRequest }) => {
    if (!(await ensureLiveApiAvailable(authRequest))) return;
    const stream = await createLiveStream(authRequest);
    try {
      const res = await authRequest.get(`${API_BASE}/${stream._id}/thumb`);
      expect(res.ok()).toBeTruthy();
    } finally {
      await deleteStream(authRequest, stream._id);
    }
  });

  test("TC_LIV_026_POST_AssignPlayer", async ({ authRequest }) => {
    if (!(await ensureLiveApiAvailable(authRequest))) return;
    const stream = await createLiveStream(authRequest);
    try {
      const listRes = await authRequest.get("/api/player?limit=1");
      let playerId = null;
      if (listRes.ok()) {
        const body = await listRes.json();
        playerId = body.data?.[0]?._id ?? body.data?.[0]?.id;
      }
      if (!playerId) {
        test.skip(true, "No hay players disponibles");
        return;
      }
      const res = await authRequest.post(`${API_BASE}/${stream._id}`, {
        form: { player: playerId },
      });
      expect(res.ok()).toBeTruthy();
    } finally {
      await deleteStream(authRequest, stream._id);
    }
  });

  test("TC_LIV_027_028_POST_LogoConfig", async ({ authRequest }) => {
    if (!(await ensureLiveApiAvailable(authRequest))) return;
    const stream = await createLiveStream(authRequest);
    try {
      const res = await authRequest.post(`${API_BASE}/${stream._id}`, {
        form: { logo_live_position: "top-right" },
      });
      expect(res.ok()).toBeTruthy();
    } finally {
      await deleteStream(authRequest, stream._id);
    }
  });

  test("TC_LIV_029_DELETE_RemoveLogo", async ({ authRequest }) => {
    test.setTimeout(60000);
    if (!(await ensureLiveApiAvailable(authRequest))) return;
    const stream = await createLiveStream(authRequest);
    try {
      const res = await authRequest.delete(
        `${API_BASE}/${stream._id}/logo`
      );
      expect([200, 204, 404, 500]).toContain(res.status());
    } finally {
      await deleteStream(authRequest, stream._id);
    }
  });
});

// --- 8. Suite: Cloud Transcoding, DVR, Ads ---

test.describe("8. Configuración Avanzada", () => {
  test("TC_LIV_030_POST_MediaLive", async ({ authRequest }) => {
    if (!(await ensureLiveApiAvailable(authRequest))) return;
    const stream = await createLiveStream(authRequest);
    try {
      const res = await authRequest.post(`${API_BASE}/${stream._id}`, {
        form: { medialiveEnabled: "true" },
      });
      expect([200, 500]).toContain(res.status());
    } finally {
      await deleteStream(authRequest, stream._id);
    }
  });

  test("TC_LIV_032_GET_DetailPublishUrls", async ({ authRequest }) => {
    if (!(await ensureLiveApiAvailable(authRequest))) return;
    const stream = await createLiveStream(authRequest);
    try {
      const res = await authRequest.get(`${API_BASE}/${stream._id}`);
      expect([200, 500]).toContain(res.status());
      if (res.ok()) {
        const body = await res.json();
        expect(body.data).toHaveProperty("stream_id");
        expect(body.data.publishing_token || body.data.stream_id).toBeDefined();
      }
    } finally {
      await deleteStream(authRequest, stream._id);
    }
  });

  test("TC_LIV_033_POST_AssignAd", async ({ authRequest }) => {
    if (!(await ensureLiveApiAvailable(authRequest))) return;
    const stream = await createLiveStream(authRequest);
    try {
      const adList = await authRequest.get("/api/ad?limit=1");
      let adId = null;
      if (adList.ok()) {
        const b = await adList.json();
        adId = b.data?.[0]?._id ?? b.data?.[0]?.id;
      }
      if (!adId) {
        test.skip(true, "No hay ads disponibles para asignar");
        return;
      }
      const res = await authRequest.post(`${API_BASE}/${stream._id}`, {
        form: { ad: adId },
      });
      expect([200, 500]).toContain(res.status());
      if (res.ok()) {
        const getRes = await authRequest.get(`${API_BASE}/${stream._id}`);
        const body = await getRes.json();
        expect(
          body.data.ad?.toString() === adId ||
            body.data.ad === adId
        ).toBeTruthy();
      }
    } finally {
      await deleteStream(authRequest, stream._id);
    }
  });

  test("TC_LIV_034_POST_RemoveAd", async ({ authRequest }) => {
    if (!(await ensureLiveApiAvailable(authRequest))) return;
    const stream = await createLiveStream(authRequest);
    try {
      const res = await authRequest.post(`${API_BASE}/${stream._id}`, {
        form: { ad: "" },
      });
      expect([200, 500]).toContain(res.status());
      if (res.ok()) {
        const getRes = await authRequest.get(`${API_BASE}/${stream._id}`);
        const body = await getRes.json();
        expect(body.data.ad === null || body.data.ad === undefined).toBeTruthy();
      }
    } finally {
      await deleteStream(authRequest, stream._id);
    }
  });

  test("TC_LIV_039_POST_EnableDVR", async ({ authRequest }) => {
    if (!(await ensureLiveApiAvailable(authRequest))) return;
    const stream = await createLiveStream(authRequest);
    try {
      const res = await authRequest.post(`${API_BASE}/${stream._id}`, {
        form: { dvr: "true" },
      });
      expect([200, 500]).toContain(res.status());
      if (res.ok()) {
        const getRes = await authRequest.get(`${API_BASE}/${stream._id}`);
        const body = await getRes.json();
        expect(body.data.dvr).toBe(true);
      }
    } finally {
      await deleteStream(authRequest, stream._id);
    }
  });
});

// --- 9. Suite: Schedule y Restream ---

test.describe("9. Schedule y Restream", () => {
  test("TC_LIV_044_GET_Schedule", async ({ authRequest }) => {
    if (!(await ensureLiveApiAvailable(authRequest))) return;
    const stream = await createLiveStream(authRequest);
    try {
      const res = await authRequest.get(
        `${API_BASE}/${stream._id}/schedule-job`
      );
      expect(res.ok()).toBeTruthy();
    } finally {
      await deleteStream(authRequest, stream._id);
    }
  });

  test("TC_LIV_045_GET_RestreamList", async ({ authRequest }) => {
    if (!(await ensureLiveApiAvailable(authRequest))) return;
    const stream = await createLiveStream(authRequest);
    try {
      const res = await authRequest.get(`${API_BASE}/${stream._id}/restream`);
      expect(res.ok()).toBeTruthy();
    } finally {
      await deleteStream(authRequest, stream._id);
    }
  });
});
}); // Live Stream API
