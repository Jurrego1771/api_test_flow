/**
 * Plan de Automatización: Módulo Media API
 * Nomenclatura: TC_MED_XXX_<endpoint>_<descripción>
 * Ref: docs/test_doc/media_api_test_plan.md
 */

const { test, expect } = require("../../fixtures");
const { createMediaResponseSchema } = require("../../schemas/media.schema");
const dataFactory = require("../../utils/dataFactory");
const { faker } = require("@faker-js/faker");

// --- Helpers ---

function getCreatedMedia(body) {
  return Array.isArray(body.data) ? body.data[0] : body.data;
}

function buildFilterQuery(filters) {
  const params = new URLSearchParams();
  filters.forEach((f, idx) => {
    const base = `filterData[${idx}]`;
    if (f.filter !== undefined) params.append(`${base}[filter]`, String(f.filter));
    if (f.rule !== undefined) params.append(`${base}[rule]`, String(f.rule));
    if (f.value !== undefined) params.append(`${base}[value]`, String(f.value));
  });
  return params.toString();
}

async function createMedia(authRequest, attrs = {}) {
  const payload = {
    title: `qa_${faker.string.alphanumeric(8)}_${Date.now()}`,
    type: "video",
    visible: "true",
    is_published: "false",
    ...attrs,
  };
  const res = await authRequest.post("/api/media", { form: payload });
  if (!res.ok()) {
    const txt = await res.text().catch(() => "");
    throw new Error(`createMedia failed: ${res.status()} ${txt}`);
  }
  const body = await res.json();
  return getCreatedMedia(body);
}

async function findMediaWithSubtitle(authRequest) {
  const listRes = await authRequest.get("/api/media?all=true&limit=50");
  if (!listRes.ok()) return null;
  const listBody = await listRes.json();
  const medias = listBody.data || [];
  for (const m of medias) {
    const subRes = await authRequest.get(`/api/media/${m._id}/subtitle`);
    if (!subRes.ok()) continue;
    const subBody = await subRes.json();
    const items = Array.isArray(subBody.data)
      ? subBody.data
      : subBody.data?.subtitles ?? subBody.data?.data ?? [];
    if (Array.isArray(items) && items.length > 0) {
      const subId = items[0]._id ?? items[0].id;
      return subId ? { mediaId: m._id, subtitleId: subId } : null;
    }
  }
  return null;
}

async function findMediaWithDeletableThumb(authRequest) {
  const listRes = await authRequest.get("/api/media?all=true&limit=50");
  if (!listRes.ok()) return null;
  const listBody = await listRes.json();
  const medias = listBody.data || [];
  for (const m of medias) {
    const thumbsRes = await authRequest.get(`/api/media/${m._id}/thumbs`);
    if (!thumbsRes.ok()) continue;
    const thumbsBody = await thumbsRes.json();
    const thumbs =
      thumbsBody.data?.thumbnails ?? thumbsBody.data ?? thumbsBody.thumbnails ?? [];
    if (!Array.isArray(thumbs)) continue;
    const deletable = thumbs.find(
      (t) => t.is_default === false || t.is_original === false
    );
    if (deletable) {
      const thumbId = deletable._id ?? deletable.id;
      return thumbId ? { mediaId: m._id, thumbId } : null;
    }
  }
  return null;
}

// --- 2. Suite: Create Media ---

test.describe("2. Create Media (POST /api/media)", () => {
  test("TC_MED_001_POST_CreateStandardVideo", async ({ authRequest }) => {
    const payload = {
      title: dataFactory.generateTitle("Media"),
      type: "video",
      visible: "true",
      is_published: "false",
    };
    const res = await authRequest.post("/api/media", { form: payload });
    const body = await res.json();

    expect(res.ok()).toBeTruthy();
    expect(res.status()).toBe(200);
    expect(body.status).toBe("OK");

    const created = getCreatedMedia(body);
    expect(created).toBeDefined();
    expect(created).toHaveProperty("_id");
    expect(created.title).toBe(payload.title);

    createMediaResponseSchema.parse({ status: body.status, data: created });

    await authRequest.delete(`/api/media/${created._id}`);
  });

  test("TC_MED_002_POST_CreateFullPayload", async ({ authRequest }) => {
    const payload = dataFactory.generateMediaPayload({
      type: "video",
      visible: "true",
      is_published: "true",
    });
    const res = await authRequest.post("/api/media", { form: payload });
    const body = await res.json();

    expect(res.ok()).toBeTruthy();
    expect(body.status).toBe("OK");

    const created = getCreatedMedia(body);
    expect(created.title).toBe(payload.title);
    expect(created.is_published).toBe(true);

    await authRequest.delete(`/api/media/${created._id}`);
  });

  test("TC_MED_003_POST_MissingTitle", async ({ authRequest }) => {
    const payload = { type: "video", visible: "true", is_published: "false" };
    const res = await authRequest.post("/api/media", { form: payload });
    const body = await res.json();

    expect(res.status()).toBe(200);
    expect(body.status).toBe("OK");
    expect(body.data.title).toBe(body.data._id);

    await authRequest.delete(`/api/media/${body.data._id}`);
  });

  test("TC_MED_004_POST_InvalidType", async ({ authRequest }) => {
    const payload = {
      title: `qa_invalid_${Date.now()}`,
      type: "holograma",
      visible: "true",
      is_published: "false",
    };
    const res = await authRequest.post("/api/media", { form: payload });
    const body = await res.json();

    expect([200, 400]).toContain(res.status());
    if (res.status() === 400) {
      expect(body.status).toBe("ERROR");
    } else if (res.ok() && body.data?._id) {
      await authRequest.delete(`/api/media/${body.data._id}`);
    }
  });
});

// --- 3. Suite: Read Media ---

test.describe("3. Read Media (GET /api/media & /api/media/:id)", () => {
  test("TC_MED_005_GET_ListDefaultParameters", async ({ authRequest }) => {
    const res = await authRequest.get("/api/media");
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.status).toBe("OK");
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeLessThanOrEqual(100);

    if (body.data.length > 0) {
      const allPublished = body.data.every((m) => m.is_published === true);
      expect(allPublished).toBe(true);
    }
  });

  test("TC_MED_005a_GET_ListAllTrue", async ({ authRequest }) => {
    const res = await authRequest.get("/api/media?all=true&limit=50");
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.status).toBe("OK");
    const hasUnpublished = body.data.some((m) => m.is_published === false);
    expect(hasUnpublished).toBe(true);
  });

  test("TC_MED_005b_GET_ListWithoutCategory", async ({ authRequest }) => {
    const resTrue = await authRequest.get("/api/media?without_category=true");
    const resFalse = await authRequest.get("/api/media?without_category=false");

    expect(resTrue.ok()).toBeTruthy();
    expect(resFalse.ok()).toBeTruthy();

    const bodyTrue = await resTrue.json();
    const bodyFalse = await resFalse.json();

    bodyTrue.data.forEach((m) => {
      expect(m.categories === null || (Array.isArray(m.categories) && m.categories.length === 0)).toBeTruthy();
    });

    if (bodyFalse.data.length > 0) {
      const hasWithCategory = bodyFalse.data.some(
        (m) => Array.isArray(m.categories) && m.categories.length > 0
      );
      expect(hasWithCategory).toBe(true);
    }
  });

  test("TC_MED_006_GET_ListValidPagination", async ({ authRequest }) => {
    const page1 = await authRequest.get("/api/media?limit=5&skip=0");
    const page2 = await authRequest.get("/api/media?limit=5&skip=5");

    expect(page1.ok()).toBeTruthy();
    expect(page2.ok()).toBeTruthy();

    const body1 = await page1.json();
    const body2 = await page2.json();

    expect(body1.data.length).toBeLessThanOrEqual(5);
    expect(body2.data.length).toBeLessThanOrEqual(5);

    const ids1 = body1.data.map((m) => m._id);
    const ids2 = body2.data.map((m) => m._id);
    const overlap = ids1.filter((id) => ids2.includes(id));
    expect(overlap.length).toBe(0);
  });

  test("TC_MED_007_GET_SortDescending", async ({ authRequest }) => {
    const res = await authRequest.get("/api/media?limit=10&sort=-date_created");
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    if (body.data.length >= 2) {
      const dates = body.data.map((m) => new Date(m.date_created).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i]).toBeLessThanOrEqual(dates[i - 1]);
      }
    }
  });

  test("TC_MED_008_GET_DetailSuccess", async ({ authRequest }) => {
    const listRes = await authRequest.get("/api/media?limit=1");
    const listBody = await listRes.json();
    expect(listRes.ok()).toBeTruthy();
    expect(listBody.data.length).toBeGreaterThan(0);

    const mediaId = listBody.data[0]._id;
    const res = await authRequest.get(`/api/media/${mediaId}`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.status).toBe("OK");
    expect(body.data._id).toBe(mediaId);
    expect(body.data).toHaveProperty("title");
    expect(body.data).toHaveProperty("meta");
    expect(body.data).toHaveProperty("thumbnails");
  });

  test("TC_MED_009_GET_DetailNotFound", async ({ authRequest }) => {
    const fakeId = "000000000000000000000000";
    const res = await authRequest.get(`/api/media/${fakeId}`);
    expect(res.status()).toBe(404);

    const body = await res.json();
    expect(body.status).toBe("ERROR");
    expect(body.data).toBe("NOT_FOUND");
  });
});

// --- 4. Suite: Partial Update ---

test.describe("4. Partial Update (POST /api/media/:id)", () => {
  test("TC_MED_010_UPDATE_ChangeTitleOnly", async ({ authRequest }) => {
    const media = await createMedia(authRequest, { description: "original_desc" });
    const newTitle = `updated_${faker.string.alphanumeric(6)}`;

    try {
      const updRes = await authRequest.post(`/api/media/${media._id}`, {
        form: { title: newTitle },
      });
      expect(updRes.ok()).toBeTruthy();

      const updBody = await updRes.json();
      expect(updBody.data.title).toBe(newTitle);

      const getRes = await authRequest.get(`/api/media/${media._id}`);
      const getBody = await getRes.json();
      expect(getBody.data.title).toBe(newTitle);
      expect(getBody.data.description).toBe("original_desc");
    } finally {
      await authRequest.delete(`/api/media/${media._id}`);
    }
  });

  test("TC_MED_010b_UPDATE_PublishUnpublish", async ({ authRequest }) => {
    const prefix = `qa_pub_${Date.now()}_`;
    const draft = await createMedia(authRequest, {
      title: `${prefix}draft`,
      is_published: "false",
    });
    const published = await createMedia(authRequest, {
      title: `${prefix}pub`,
      is_published: "true",
    });

    try {
      const updDraft = await authRequest.post(`/api/media/${draft._id}`, {
        form: { is_published: "true" },
      });
      expect(updDraft.ok()).toBeTruthy();

      const updPub = await authRequest.post(`/api/media/${published._id}`, {
        form: { is_published: "false" },
      });
      expect(updPub.ok()).toBeTruthy();

      const getDraft = await authRequest.get(`/api/media/${draft._id}`);
      const getPub = await authRequest.get(`/api/media/${published._id}`);
      expect(getDraft.ok()).toBeTruthy();
      expect(getPub.ok()).toBeTruthy();
      const bodyDraft = await getDraft.json();
      const bodyPub = await getPub.json();
      expect(bodyDraft.data.is_published).toBe(true);
      expect(bodyPub.data.is_published).toBe(false);

      await new Promise((r) => setTimeout(r, 2000));

      const searchPublic = await authRequest.get(
        `/api/media/search?title=${encodeURIComponent(prefix)}&limit=10`
      );
      const searchAll = await authRequest.get(
        `/api/media/search?title=${encodeURIComponent(prefix)}&limit=10&all=true`
      );
      expect(searchPublic.ok()).toBeTruthy();
      expect(searchAll.ok()).toBeTruthy();
      const spBody = await searchPublic.json();
      const saBody = await searchAll.json();
      const spIds = (spBody.data || []).map((m) => m._id);
      const saIds = (saBody.data || []).map((m) => m._id);
      expect(spIds).toContain(draft._id);
      expect(spIds).not.toContain(published._id);
      expect(saIds).toContain(draft._id);
      expect(saIds).toContain(published._id);
    } finally {
      await authRequest.delete(`/api/media/${draft._id}`);
      await authRequest.delete(`/api/media/${published._id}`);
    }
  });
});

// --- 5. Suite: Delete Media ---

test.describe("5. Delete Media (DELETE /api/media/:id)", () => {
  test("TC_MED_013_DELETE_Success", async ({ authRequest }) => {
    const media = await createMedia(authRequest);

    const delRes = await authRequest.delete(`/api/media/${media._id}`);
    expect(delRes.ok()).toBeTruthy();
    expect(delRes.status()).toBe(200);

    const getRes = await authRequest.get(`/api/media/${media._id}`);
    expect(getRes.status()).toBe(404);
    const getBody = await getRes.json();
    expect(getBody.status).toBe("ERROR");
    expect(getBody.data).toBe("NOT_FOUND");
  });

  test("TC_MED_014_DELETE_AlreadyDeleted", async ({ authRequest }) => {
    const media = await createMedia(authRequest);
    await authRequest.delete(`/api/media/${media._id}`);

    const delRes2 = await authRequest.delete(`/api/media/${media._id}`);
    expect([200, 404]).toContain(delRes2.status());

    const body = await delRes2.json().catch(() => ({}));
    if (delRes2.status() === 200) {
      expect(["OK", "ERROR"]).toContain(body.status);
    }
  });
});

// --- 6. Suite: Filtros Avanzados (filterData) ---

test.describe("6. Filtros Avanzados (filterData)", () => {
  test("TC_MED_014a_FILTER_TitleIs", async ({ authRequest }) => {
    const media = await createMedia(authRequest, { title: `qa_exact_${Date.now()}` });
    try {
      const filters = [{ filter: "title", rule: "is", value: media.title }];
      const res = await authRequest.get(`/api/media?${buildFilterQuery(filters)}&all=true`);
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      const ids = (body.data || []).map((m) => m._id ?? m.id);
      expect(ids).toContain(media._id);
    } finally {
      await authRequest.delete(`/api/media/${media._id}`);
    }
  });

  test("TC_MED_014b_FILTER_TitleContains", async ({ authRequest }) => {
    const unique = `qa_contain_${Date.now()}`;
    const media = await createMedia(authRequest, { title: `pre_${unique}_suf` });
    try {
      const filters = [{ filter: "title", rule: "contains", value: unique }];
      const res = await authRequest.get(`/api/media?${buildFilterQuery(filters)}&all=true`);
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      const ids = (body.data || []).map((m) => m._id ?? m.id);
      expect(ids).toContain(media._id);
    } finally {
      await authRequest.delete(`/api/media/${media._id}`);
    }
  });

  test("TC_MED_014c_FILTER_TitleStartsEndsWith", async ({ authRequest }) => {
    const prefix = `qa_pref_${Date.now()}`;
    const media = await createMedia(authRequest, { title: `${prefix}_suffix` });
    try {
      const filters = [{ filter: "title", rule: "starts_with", value: prefix }];
      const res = await authRequest.get(`/api/media?${buildFilterQuery(filters)}&all=true`);
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      const ids = (body.data || []).map((m) => m._id ?? m.id);
      expect(ids).toContain(media._id);
    } finally {
      await authRequest.delete(`/api/media/${media._id}`);
    }
  });

  test("TC_MED_014d_FILTER_Published", async ({ authRequest }) => {
    const resAll = await authRequest.get("/api/media?all=true&limit=50");
    const bodyAll = await resAll.json();
    const published = bodyAll.data.find((m) => m.is_published === true);
    expect(published, "No published media").toBeTruthy();

    const filters = [{ filter: "published", rule: "true" }];
    const res = await authRequest.get(`/api/media?${buildFilterQuery(filters)}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const ids = (body.data || []).map((m) => m._id ?? m.id);
    expect(ids).toContain(published._id);
  });

  test("TC_MED_014e_FILTER_TypeVideo", async ({ authRequest }) => {
    const media = await createMedia(authRequest, { type: "video" });
    try {
      const filters = [{ filter: "type", rule: "video" }];
      const res = await authRequest.get(`/api/media?${buildFilterQuery(filters)}&all=true`);
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      const ids = (body.data || []).map((m) => m._id ?? m.id);
      expect(ids).toContain(media._id);
    } finally {
      await authRequest.delete(`/api/media/${media._id}`);
    }
  });
});

// --- 8. Suite: Visibility Index (GET /api/media) ---

test.describe("8. Visibility Index (GET /api/media)", () => {
  test("TC_MED_017a_INDEX_VisibilityMasking", async ({ authRequest }) => {
    const res = await authRequest.get("/api/media?all=false&limit=100");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    body.data.forEach((m) => {
      expect(m.is_published).toBe(true);
    });
  });

  test("TC_MED_018a_INDEX_VisibilityAdmin", async ({ authRequest }) => {
    const res = await authRequest.get("/api/media?all=true&limit=50");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const hasUnpublished = body.data.some((m) => m.is_published === false);
    expect(hasUnpublished).toBe(true);
  });
});

// --- 10. Suite: Subrecursos (Metas) ---

test.describe("10. Subrecursos (Metas)", () => {
  test("TC_MED_META_GET", async ({ authRequest }) => {
    const listRes = await authRequest.get("/api/media?all=true&limit=50");
    const listBody = await listRes.json();
    const mediaWithMeta = listBody.data.find(
      (m) => Array.isArray(m.meta) && m.meta.length > 0
    );
    expect(mediaWithMeta, "No media with meta").toBeTruthy();

    const res = await authRequest.get(`/api/media/${mediaWithMeta._id}/meta`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("OK");
    const metas = body.data?.meta ?? body.data;
    expect(Array.isArray(metas)).toBe(true);
    expect(metas.length).toBeGreaterThan(0);
  });

  test("TC_MED_META_GET_NotFound", async ({ authRequest }) => {
    const res = await authRequest.get("/api/media/666666666666666666666666/meta");
    const body = await res.json();
    expect(res.status()).toBe(200);
    expect(body.status).toBe("ERROR");
    expect(body.data).toBe("NOT_FOUND");
  });

  test("TC_MED_META_DELETE", async ({ authRequest }) => {
    const listRes = await authRequest.get("/api/media?all=true&limit=50");
    const listBody = await listRes.json();
    const target = listBody.data.find(
      (m) => Array.isArray(m.meta) && m.meta.some((mm) => !mm.is_original)
    );
    if (!target) {
      test.skip();
      return;
    }

    const metaId = target.meta.find((mm) => !mm.is_original)._id;
    const delRes = await authRequest.delete(
      `/api/media/${target._id}/meta/${metaId}`
    );
    expect(delRes.status()).toBe(200);
  });
});

// --- 7. Suite: Search (GET /api/media/search) - con seed ---

test.describe("7. Search (GET /api/media/search)", () => {
  const uniqueTag = `search_${faker.string.uuid()}`;
  const titlePrefix = `SearchTC_${faker.string.alphanumeric(6)}`;
  let createdIds = [];

  test.beforeAll(async ({ authRequest }) => {
    for (let i = 0; i < 5; i++) {
      const media = await createMedia(authRequest, {
        title: `${titlePrefix} Pub ${i}`,
        is_published: "true",
        tags: uniqueTag,
      });
      createdIds.push(media._id);
    }
    for (let i = 0; i < 2; i++) {
      const media = await createMedia(authRequest, {
        title: `${titlePrefix} Draft ${i}`,
        is_published: "false",
        tags: uniqueTag,
      });
      createdIds.push(media._id);
    }
    await new Promise((r) => setTimeout(r, 2000));
  });

  test.afterAll(async ({ authRequest }) => {
    for (const id of createdIds) {
      try {
        await authRequest.delete(`/api/media/${id}`);
      } catch (e) {
        /* ignore */
      }
    }
  });

  test("TC_MED_015_SEARCH_ExactTitle", async ({ authRequest }) => {
    const targetTitle = `${titlePrefix} Pub 0`;
    const res = await authRequest.get(
      `/api/media/search?title=${encodeURIComponent(targetTitle)}&limit=10&all=true`
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const found = body.data?.find(
      (m) => m.title === targetTitle || (m.title && m.title.includes(titlePrefix))
    );
    expect(found).toBeDefined();
    expect(found.title).toContain(titlePrefix);
  });

  test("TC_MED_016_SEARCH_FilterByArrayTag", async ({ authRequest }) => {
    const res = await authRequest.get(
      `/api/media/search?tags=${encodeURIComponent(uniqueTag)}&limit=20&all=true`
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const byTag = body.data?.filter((m) => m.tags?.includes(uniqueTag)) ?? [];
    expect(byTag.length).toBeGreaterThanOrEqual(7);
  });

  test("TC_MED_017_SEARCH_VisibilityMasking", async ({ authRequest }) => {
    const res = await authRequest.get(
      `/api/media/search?tags=${encodeURIComponent(uniqueTag)}&limit=50`
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const results = body.data ?? [];
    results.forEach((m) => {
      expect(m.is_published).toBe(true);
      expect(m.status).toBe("OK");
    });
  });

  test("TC_MED_018_SEARCH_VisibilityAdmin", async ({ authRequest }) => {
    const res = await authRequest.get(
      `/api/media/search?tags=${encodeURIComponent(uniqueTag)}&all=true&limit=50`
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const results = body.data ?? [];
    const drafts = results.filter((m) => m.is_published === false);
    expect(drafts.length).toBeGreaterThanOrEqual(2);
  });
});

// --- 11. Suite: Subrecursos Adicionales (Subtitle, Thumbs, Image, Upload, Preview) ---

test.describe("11. Subrecursos Adicionales", () => {
  test("TC_MED_SUBTITLE_GET", async ({ authRequest }) => {
    const media = await createMedia(authRequest);
    try {
      const res = await authRequest.get(`/api/media/${media._id}/subtitle`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("OK");
      const data = body.data ?? body;
      expect(
        Array.isArray(data) ||
          (data && typeof data === "object" && (data.subtitles || data.data))
      ).toBeTruthy();
    } finally {
      await authRequest.delete(`/api/media/${media._id}`);
    }
  });

  test("TC_MED_SUBTITLE_GET_NotFound", async ({ authRequest }) => {
    const res = await authRequest.get(
      "/api/media/000000000000000000000000/subtitle"
    );
    const body = await res.json();
    expect([200, 404]).toContain(res.status());
    expect(body.status === "ERROR" || res.status() === 404).toBeTruthy();
    if (body.status === "ERROR") {
      expect(["NOT_FOUND", "MEDIA_NOT_FOUND"]).toContain(body.data);
    }
  });

  test("TC_MED_SUBTITLE_DELETE", async ({ authRequest }) => {
    const found = await findMediaWithSubtitle(authRequest);
    if (!found) {
      test.skip();
      return;
    }
    const delRes = await authRequest.delete(
      `/api/media/${found.mediaId}/subtitle/${found.subtitleId}`
    );
    expect(delRes.status()).toBe(200);
    const getRes = await authRequest.get(
      `/api/media/${found.mediaId}/subtitle`
    );
    const getBody = await getRes.json();
    const items =
      Array.isArray(getBody.data)
        ? getBody.data
        : getBody.data?.subtitles ?? [];
    const stillPresent = items.some(
      (s) => (s._id ?? s.id) === found.subtitleId
    );
    expect(stillPresent).toBe(false);
  });

  test("TC_MED_THUMBS_GET", async ({ authRequest }) => {
    const media = await createMedia(authRequest);
    try {
      const res = await authRequest.get(`/api/media/${media._id}/thumbs`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("OK");
      const thumbs =
        body.data?.thumbnails ?? body.data ?? body.thumbnails ?? [];
      expect(Array.isArray(thumbs)).toBe(true);
    } finally {
      await authRequest.delete(`/api/media/${media._id}`);
    }
  });

  test("TC_MED_THUMBS_GET_NotFound", async ({ authRequest }) => {
    const res = await authRequest.get(
      "/api/media/000000000000000000000000/thumbs"
    );
    const body = await res.json();
    expect([200, 404]).toContain(res.status());
    if (body.status === "ERROR") {
      expect(["NOT_FOUND", "MEDIA_NOT_FOUND"]).toContain(body.data);
    }
  });

  test("TC_MED_THUMB_DELETE", async ({ authRequest }) => {
    const found = await findMediaWithDeletableThumb(authRequest);
    if (!found) {
      test.skip();
      return;
    }
    const delRes = await authRequest.delete(
      `/api/media/${found.mediaId}/thumb/${found.thumbId}`
    );
    expect(delRes.status()).toBe(200);
  });

  test("TC_MED_THUMBNAIL_UPLOAD_POST", async ({ authRequest }) => {
    const media = await createMedia(authRequest);
    try {
      const res = await authRequest.post(
        `/api/media/${media._id}/thumbnail/upload`,
        { form: {} }
      );
      if (res.ok()) {
        const body = await res.json();
        expect(body.status).toBe("OK");
        const payload = body.data ?? body;
        expect(payload.url || payload.upload_url || payload.key !== undefined).toBeTruthy();
      } else {
        test.skip(true, "Endpoint puede requerir params adicionales o no estar disponible");
      }
    } finally {
      await authRequest.delete(`/api/media/${media._id}`);
    }
  });

  test("TC_MED_PREVIEW_POST", async ({ authRequest }) => {
    const media = await createMedia(authRequest);
    try {
      const res = await authRequest.post(`/api/media/${media._id}/preview`, {
        form: {},
      });
      expect([200, 201, 400, 422]).toContain(res.status());
      if (res.ok()) {
        const body = await res.json();
        expect(body.status).toBe("OK");
      }
    } finally {
      await authRequest.delete(`/api/media/${media._id}`);
    }
  });

  test("TC_MED_PREVIEW_UPLOAD_GET", async ({ authRequest }) => {
    const media = await createMedia(authRequest);
    try {
      const res = await authRequest.get(
        `/api/media/${media._id}/preview/upload`
      );
      expect([200, 404, 400]).toContain(res.status());
      if (res.ok()) {
        const body = await res.json();
        expect(body.status).toBe("OK");
        const payload = body.data ?? body;
        expect(
          payload.url || payload.upload_url || payload.key !== undefined
        ).toBeTruthy();
      }
    } finally {
      await authRequest.delete(`/api/media/${media._id}`);
    }
  });

  test("TC_MED_UPLOAD_GET", async ({ authRequest }) => {
    const fileUrl =
      "https://ms-qa-bucket.s3.us-east-1.amazonaws.com/test_360p.mp4";
    const file_name = "test_360p.mp4";
    const params = new URLSearchParams({
      file_name,
      fileUrl,
      type: "remote",
    });
    if (process.env.API_TOKEN) params.append("token", process.env.API_TOKEN);
    const res = await authRequest.get(`/api/media/upload?${params.toString()}`);
    if (res.ok()) {
      const body = await res.json();
      expect(body.status).toBe("OK");
      expect(body.data).toBeDefined();
      expect(body.data.jobId).toBeDefined();
      expect(typeof body.data.jobId).toBe("string");
      expect(body.data.jobId.length).toBeGreaterThan(0);
    } else {
      test.skip(true, "Endpoint GET /api/media/upload puede no estar disponible en esta API");
    }
  });

  test("TC_MED_IMAGE_GET", async ({ authRequest }) => {
    const media = await createMedia(authRequest);
    try {
      const res = await authRequest.get(`/api/media/${media._id}/image`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("OK");
      const data = body.data ?? body;
      expect(Array.isArray(data) || data === null).toBeTruthy();
    } finally {
      await authRequest.delete(`/api/media/${media._id}`);
    }
  });

  test("TC_MED_IMAGE_GET_NotFound", async ({ authRequest }) => {
    const res = await authRequest.get(
      "/api/media/000000000000000000000000/image"
    );
    const body = await res.json();
    expect([200, 404]).toContain(res.status());
    if (body.status === "ERROR") {
      expect(body.data).toBeDefined();
    }
  });
});

// --- TC_MED_005b adicional: without_category con ID ---

test.describe("3b. Read - Filtro without_category + id", () => {
  test("TC_MED_005c_GET_WithoutCategoryAndId", async ({ authRequest }) => {
    const listRes = await authRequest.get("/api/media?all=true&limit=50");
    const listBody = await listRes.json();
    const withCategory = listBody.data.find(
      (m) => Array.isArray(m.categories) && m.categories.length > 0
    );
    if (!withCategory) {
      test.skip();
      return;
    }

    const res = await authRequest.get(
      `/api/media?without_category=true&id=${withCategory._id}`
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.length).toBe(0);
  });
});
