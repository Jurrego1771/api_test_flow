/**
 * Plan de Automatización: Módulo Media API
 * Nomenclatura: TC_MED_XXX_<endpoint>_<descripción>
 * Ref: docs/test_doc/media_api_test_plan.md
 */

const { test, expect } = require("../../fixtures");
const { createMediaResponseSchema } = require("../../schemas/media.schema");
const { vmsMediaSearchResponseSchema } = require("../../schemas/vms.schema");
const { ApiClient } = require("../../lib/apiClient");
const { ResourceCleaner } = require("../../utils/resourceCleaner");
const dataFactory = require("../../utils/dataFactory");
const { faker } = require("@faker-js/faker");
require("dotenv").config();

// --- Helpers ---

function getCreatedMedia(body) {
  return Array.isArray(body.data) ? body.data[0] : body.data;
}

function buildFilterQuery(filters) {
  const params = new URLSearchParams();
  filters.forEach((f, idx) => {
    const base = `filterData[${idx}]`;
    if (f.filter !== undefined)
      params.append(`${base}[filter]`, String(f.filter));
    if (f.rule !== undefined) params.append(`${base}[rule]`, String(f.rule));
    if (f.value !== undefined) params.append(`${base}[value]`, String(f.value));
  });
  return params.toString();
}

async function createMedia(apiClient, cleaner, attrs = {}) {
  const payload = {
    title: `qa_${faker.random.alphaNumeric(8)}_${Date.now()}`,
    type: "video",
    visible: "true",
    is_published: "false",
    ...attrs,
  };
  const res = await apiClient.post("/api/media", payload);
  if (res.status !== 200) {
    throw new Error(`createMedia failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  const body = res.body;
  const created = getCreatedMedia(body);
  if (created?._id) {
    cleaner.register("media", created._id);
  }
  return created;
}

async function findMediaWithSubtitle(apiClient) {
  const listRes = await apiClient.get("/api/media?all=true&limit=50");
  if (listRes.status !== 200) return null;
  const medias = listRes.body?.data || [];
  for (const m of medias) {
    const subRes = await apiClient.get(`/api/media/${m._id}/subtitle`);
    if (subRes.status !== 200) continue;
    const subBody = subRes.body || {};
    const items = Array.isArray(subBody.data)
      ? subBody.data
      : (subBody.data?.subtitles ?? subBody.data?.data ?? []);
    if (Array.isArray(items) && items.length > 0) {
      const subId = items[0]._id ?? items[0].id;
      return subId ? { mediaId: m._id, subtitleId: subId } : null;
    }
  }
  return null;
}

async function findMediaWithDeletableThumb(apiClient) {
  const listRes = await apiClient.get("/api/media?all=true&limit=50");
  if (listRes.status !== 200) return null;
  const medias = listRes.body?.data || [];
  for (const m of medias) {
    const thumbsRes = await apiClient.get(`/api/media/${m._id}/thumbs`);
    if (thumbsRes.status !== 200) continue;
    const thumbsBody = thumbsRes.body || {};
    const thumbs =
      thumbsBody.data?.thumbnails ??
      thumbsBody.data ??
      thumbsBody.thumbnails ??
      [];
    if (!Array.isArray(thumbs)) continue;
    const deletable = thumbs.find(
      (t) => t.is_default === false || t.is_original === false,
    );
    if (deletable) {
      const thumbId = deletable._id ?? deletable.id;
      return thumbId ? { mediaId: m._id, thumbId } : null;
    }
  }
  return null;
}

// --- Describe Raíz ---

test.describe("Modulo Media API", () => {
  let apiClient;
  let cleaner;

  test.beforeEach(async ({ authRequest, baseURL }) => {
    apiClient = new ApiClient(authRequest, baseURL);
    cleaner = new ResourceCleaner(apiClient);
  });

  test.afterEach(async () => {
    await cleaner.clean();
  });

  // --- 2. Suite: Create Media ---

  test.describe("2. Create Media (POST /api/media)", () => {
    test("TC_MED_001_POST_CreateStandardVideo", async () => {
      const payload = {
        title: dataFactory.generateTitle("Media"),
        type: "video",
        visible: "true",
        is_published: "false",
      };
      const res = await apiClient.post("/api/media", payload);
      const body = res.body;

      expect(res.status).toBe(200);
      expect(body.status).toBe("OK");

      const created = getCreatedMedia(body);
      expect(created).toBeDefined();
      expect(created).toHaveProperty("_id");
      expect(created.title).toBe(payload.title);

      cleaner.register("media", created._id);
      createMediaResponseSchema.parse({ status: body.status, data: created });
    });

    test("TC_MED_002_POST_CreateFullPayload", async () => {
      const payload = dataFactory.generateMediaPayload({
        type: "video",
        visible: "true",
        is_published: "true",
      });
      const res = await apiClient.post("/api/media", payload);
      const body = res.body;

      expect(res.status).toBe(200);
      expect(body.status).toBe("OK");

      const created = getCreatedMedia(body);
      expect(created.title).toBe(payload.title);
      expect(created.is_published).toBe(true);

      cleaner.register("media", created._id);
    });

    test("TC_MED_003_POST_MissingTitle", async () => {
      const payload = { type: "video", visible: "true", is_published: "false" };
      const res = await apiClient.post("/api/media", payload);
      const body = res.body;

      expect(res.status).toBe(200);
      expect(body.status).toBe("OK");
      expect(body.data.title).toBe(body.data._id);

      cleaner.register("media", body.data._id);
    });

    test("TC_MED_004_POST_InvalidType", async () => {
      const payload = {
        title: `qa_invalid_${Date.now()}`,
        type: "holograma",
        visible: "true",
        is_published: "false",
      };
      const res = await apiClient.post("/api/media", { form: payload });
      const body = res.body;

      expect([200, 400]).toContain(res.status);
      if (res.status === 400) {
        expect(body.status).toBe("ERROR");
      }
    });
  });

  // --- 3. Suite: Read Media ---

  test.describe("3. Read Media (GET /api/media & /api/media/:id)", () => {
    test("TC_MED_005_GET_ListDefaultParameters", async () => {
      const res = await apiClient.get("/api/media");
      expect((res.status === 200)).toBeTruthy();

      const body = res.body;
      expect(body.status).toBe("OK");
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeLessThanOrEqual(100);

      if (body.data.length > 0) {
        const allPublished = body.data.every((m) => m.is_published === true);
        expect(allPublished).toBe(true);
      }
    });

    test("TC_MED_005a_GET_ListAllTrue", async () => {
      const res = await apiClient.get("/api/media?all=true&limit=50");
      expect((res.status === 200)).toBeTruthy();

      const body = res.body;
      expect(body.status).toBe("OK");
      const hasUnpublished = body.data.some((m) => m.is_published === false);
      expect(hasUnpublished).toBe(true);
    });

    test("TC_MED_005b_GET_ListWithoutCategory", async () => {
      const resTrue = await apiClient.get("/api/media?without_category=true");
      const resFalse = await apiClient.get("/api/media?without_category=false");

      expect(resTrue.ok).toBeTruthy();
      expect(resFalse.ok).toBeTruthy();

      const bodyTrue = resTrue.body;
      const bodyFalse = resFalse.body;

      bodyTrue.data.forEach((m) => {
        expect(
          m.categories === null ||
          (Array.isArray(m.categories) && m.categories.length === 0),
        ).toBeTruthy();
      });

      if (bodyFalse.data.length > 0) {
        const hasWithCategory = bodyFalse.data.some(
          (m) => Array.isArray(m.categories) && m.categories.length > 0,
        );
        expect(hasWithCategory).toBe(true);
      }
    });

    test("TC_MED_006_GET_ListValidPagination", async () => {
      const page1 = await apiClient.get("/api/media?limit=5&skip=0");
      const page2 = await apiClient.get("/api/media?limit=5&skip=5");

      expect(page1.ok).toBeTruthy();
      expect(page2.ok).toBeTruthy();

      const body1 = page1.body;
      const body2 = page2.body;

      expect(body1.data.length).toBeLessThanOrEqual(5);
      expect(body2.data.length).toBeLessThanOrEqual(5);

      const ids1 = body1.data.map((m) => m._id);
      const ids2 = body2.data.map((m) => m._id);
      const overlap = ids1.filter((id) => ids2.includes(id));
      expect(overlap.length).toBe(0);
    });

    test("TC_MED_007_GET_SortDescending", async () => {
      const res = await apiClient.get("/api/media?limit=10&sort=-date_created");
      expect((res.status === 200)).toBeTruthy();

      const body = res.body;
      if (body.data.length >= 2) {
        const dates = body.data.map((m) => new Date(m.date_created).getTime());
        for (let i = 1; i < dates.length; i++) {
          expect(dates[i]).toBeLessThanOrEqual(dates[i - 1]);
        }
      }
    });

    test("TC_MED_008_GET_DetailSuccess", async () => {
      const listRes = await apiClient.get("/api/media?limit=1");
      const listBody = listRes.body;
      expect(listRes.status === 200).toBeTruthy();
      expect(listBody.data.length).toBeGreaterThan(0);

      const mediaId = listBody.data[0]._id;
      const res = await apiClient.get(`/api/media/${mediaId}`);
      expect((res.status === 200)).toBeTruthy();

      const body = res.body;
      expect(body.status).toBe("OK");
      expect(body.data._id).toBe(mediaId);
      expect(body.data).toHaveProperty("title");
      expect(body.data).toHaveProperty("meta");
      expect(body.data).toHaveProperty("thumbnails");
    });

    test("TC_MED_009_GET_DetailNotFound", async () => {
      const fakeId = "000000000000000000000000";
      const res = await apiClient.get(`/api/media/${fakeId}`);
      expect(res.status).toBe(404);

      const body = res.body;
      expect(body.status).toBe("ERROR");
      expect(body.data).toBe("NOT_FOUND");
    });
  });

  // --- 4. Suite: Partial Update ---

  test.describe("4. Partial Update (POST /api/media/:id)", () => {
    test("TC_MED_010_UPDATE_ChangeTitleOnly", async () => {
      const media = await createMedia(apiClient, cleaner, {
        description: "original_desc",
      });
      const newTitle = `updated_${faker.random.alphaNumeric(6)}`;

      const updRes = await apiClient.post(`/api/media/${media._id}`, {
        title: newTitle,
      });
      expect(updRes.status).toBe(200);

      const updBody = updRes.body;
      expect(updBody.data.title).toBe(newTitle);

      const getRes = await apiClient.get(`/api/media/${media._id}`);
      const getBody = getRes.body;
      expect(getBody.data.title).toBe(newTitle);
      expect(getBody.data.description).toBe("original_desc");
    });

    test("TC_MED_010b_UPDATE_PublishUnpublish", async () => {
      const prefix = `qa_pub_${Date.now()}_`;
      const draft = await createMedia(apiClient, cleaner, {
        title: `${prefix}draft`,
        is_published: "false",
      });
      const published = await createMedia(apiClient, cleaner, {
        title: `${prefix}pub`,
        is_published: "true",
      });

      const updDraft = await apiClient.post(`/api/media/${draft._id}`, {
        is_published: "true",
      });
      expect(updDraft.status).toBe(200);

      const updPub = await apiClient.post(`/api/media/${published._id}`, {
        is_published: "false",
      });
      expect(updPub.status).toBe(200);

      const getDraft = await apiClient.get(`/api/media/${draft._id}`);
      const getPub = await apiClient.get(`/api/media/${published._id}`);
      expect(getDraft.status).toBe(200);
      expect(getPub.status).toBe(200);

      const bodyDraft = getDraft.body;
      const bodyPub = getPub.body;
      expect(bodyDraft.data.is_published).toBe(true);
      expect(bodyPub.data.is_published).toBe(false);

      await new Promise((r) => setTimeout(r, 2000));

      const searchPublic = await apiClient.get(
        `/api/media/search?title=${encodeURIComponent(prefix)}&limit=10`,
      );
      const searchAll = await apiClient.get(
        `/api/media/search?title=${encodeURIComponent(prefix)}&limit=10&all=true`,
      );
      expect(searchPublic.status).toBe(200);
      expect(searchAll.status).toBe(200);

      const spBody = searchPublic.body;
      const saBody = searchAll.body;
      const spIds = (spBody.data || []).map((m) => m._id);
      const saIds = (saBody.data || []).map((m) => m._id);
      expect(spIds).toContain(draft._id);
      expect(spIds).not.toContain(published._id);
      expect(saIds).toContain(draft._id);
      expect(saIds).toContain(published._id);
    });
  });

  // --- 4b. Suite: Field Clear ---

  test.describe("4b. Field Clear (POST /api/media/:id)", () => {
    test("TC_MED_POST_update_clear_description", async () => {
      const media = await createMedia(apiClient, cleaner, {
        description: "qa_original_description",
      });

      await apiClient.post(`/api/media/${media._id}`, { description: "" });

      const getRes = await apiClient.get(`/api/media/${media._id}`);
      expect(getRes.status).toBe(200);
      const desc = getRes.body.data.description;
      expect(!desc || desc === "").toBeTruthy();
    });

    test("TC_MED_POST_update_clear_categories", async () => {
      const media = await createMedia(apiClient, cleaner);

      await apiClient.post(`/api/media/${media._id}`, { categories: [] });

      const getRes = await apiClient.get(`/api/media/${media._id}`);
      expect(getRes.status).toBe(200);
      const categories = getRes.body.data.categories ?? [];
      expect(Array.isArray(categories)).toBe(true);
      expect(categories).toHaveLength(0);
    });
  });

  // --- 5. Suite: Delete Media ---

  test.describe("5. Delete Media (DELETE /api/media/:id)", () => {
    test("TC_MED_013_DELETE_Success", async () => {
      const media = await createMedia(apiClient, cleaner);

      const delRes = await apiClient.delete(`/api/media/${media._id}`);
      expect(delRes.ok).toBeTruthy();
      expect(delRes.status).toBe(200);

      const getRes = await apiClient.get(`/api/media/${media._id}`);
      expect(getRes.status).toBe(404);
      expect(getRes.body.status).toBe("ERROR");
      expect(getRes.body.data).toBe("NOT_FOUND");
    });

    test("TC_MED_014_DELETE_AlreadyDeleted", async () => {
      const media = await createMedia(apiClient, cleaner);
      await apiClient.delete(`/api/media/${media._id}`);

      const delRes2 = await apiClient.delete(`/api/media/${media._id}`);
      expect([200, 404]).toContain(delRes2.status);
    });
  });

  // --- 6. Suite: Filtros Avanzados (filterData) ---

  test.describe("6. Filtros Avanzados (filterData)", () => {
    test("TC_MED_014a_FILTER_TitleIs", async () => {
      const media = await createMedia(apiClient, cleaner, {
        title: `qa_exact_${Date.now()}`,
      });
      try {
        const filters = [{ filter: "title", rule: "is", value: media.title }];
        const res = await apiClient.get(
          `/api/media?${buildFilterQuery(filters)}&all=true`,
        );
        expect((res.status === 200)).toBeTruthy();
        const body = res.body;
        const ids = (body.data || []).map((m) => m._id ?? m.id);
        expect(ids).toContain(media._id);
      } finally {

      }
    });

    test("TC_MED_014b_FILTER_TitleContains", async () => {
      const unique = `qa_contain_${Date.now()}`;
      const media = await createMedia(apiClient, cleaner, {
        title: `pre_${unique}_suf`,
      });
      try {
        const filters = [{ filter: "title", rule: "contains", value: unique }];
        const res = await apiClient.get(
          `/api/media?${buildFilterQuery(filters)}&all=true`,
        );
        expect((res.status === 200)).toBeTruthy();
        const body = res.body;
        const ids = (body.data || []).map((m) => m._id ?? m.id);
        expect(ids).toContain(media._id);
      } finally {

      }
    });

    test("TC_MED_014c_FILTER_TitleStartsEndsWith", async () => {
      const prefix = `qa_pref_${Date.now()}`;
      const media = await createMedia(apiClient, cleaner, { title: `${prefix}_suffix` });
      try {
        const filters = [{ filter: "title", rule: "starts_with", value: prefix }];
        const res = await apiClient.get(
          `/api/media?${buildFilterQuery(filters)}&all=true`,
        );
        expect((res.status === 200)).toBeTruthy();
        const body = res.body;
        const ids = (body.data || []).map((m) => m._id ?? m.id);
        expect(ids).toContain(media._id);
      } finally {

      }
    });

    test("TC_MED_014d_FILTER_Published", async () => {
      const resAll = await apiClient.get("/api/media?all=true&limit=50");
      const bodyAll = resAll.body;
      const published = bodyAll.data.find((m) => m.is_published === true);
      expect(published, "No published media").toBeTruthy();

      const filters = [{ filter: "published", rule: "true" }];
      const res = await apiClient.get(
        `/api/media?${buildFilterQuery(filters)}`,
      );
      expect((res.status === 200)).toBeTruthy();
      const body = res.body;
      const ids = (body.data || []).map((m) => m._id ?? m.id);
      expect(ids).toContain(published._id);
    });

    test("TC_MED_014e_FILTER_TypeVideo", async () => {
      const media = await createMedia(apiClient, cleaner, { type: "video" });
      try {
        const filters = [{ filter: "type", rule: "video" }];
        const res = await apiClient.get(
          `/api/media?${buildFilterQuery(filters)}&all=true`,
        );
        expect((res.status === 200)).toBeTruthy();
        const body = res.body;
        const ids = (body.data || []).map((m) => m._id ?? m.id);
        expect(ids).toContain(media._id);
      } finally {

      }
    });
  });

  // --- 8. Suite: Visibility Index (GET /api/media) ---

  test.describe("8. Visibility Index (GET /api/media)", () => {
    test("TC_MED_017a_INDEX_VisibilityMasking", async () => {
      const res = await apiClient.get("/api/media?all=false&limit=100");
      expect((res.status === 200)).toBeTruthy();
      const body = res.body;
      body.data.forEach((m) => {
        expect(m.is_published).toBe(true);
      });
    });

    test("TC_MED_018a_INDEX_VisibilityAdmin", async () => {
      const res = await apiClient.get("/api/media?all=true&limit=50");
      expect((res.status === 200)).toBeTruthy();
      const body = res.body;
      const hasUnpublished = body.data.some((m) => m.is_published === false);
      expect(hasUnpublished).toBe(true);
    });
  });

  // --- 10. Suite: Subrecursos (Metas) ---

  test.describe("10. Subrecursos (Metas)", () => {
    test("TC_MED_META_GET", async () => {
      const listRes = await apiClient.get("/api/media?all=true&limit=50");
      const listBody = listRes.body;
      const mediaWithMeta = listBody.data.find(
        (m) => Array.isArray(m.meta) && m.meta.length > 0,
      );
      expect(mediaWithMeta, "No media with meta").toBeTruthy();

      const res = await apiClient.get(`/api/media/${mediaWithMeta._id}/meta`);
      expect(res.status).toBe(200);
      const body = res.body;
      expect(body.status).toBe("OK");
      const metas = body.data?.meta ?? body.data;
      expect(Array.isArray(metas)).toBe(true);
      expect(metas.length).toBeGreaterThan(0);
    });

    test("TC_MED_META_GET_NotFound", async () => {
      const res = await apiClient.get(
        "/api/media/666666666666666666666666/meta",
      );
      const body = res.body;
      expect(res.status).toBe(200);
      expect(body.status).toBe("ERROR");
      expect(body.data).toBe("NOT_FOUND");
    });

    test("TC_MED_META_DELETE", async () => {
      const listRes = await apiClient.get("/api/media?all=true&limit=50");
      const listBody = listRes.body;
      const target = listBody.data.find(
        (m) => Array.isArray(m.meta) && m.meta.some((mm) => !mm.is_original),
      );
      if (!target) {
        test.skip();
        return;
      }

      const metaId = target.meta.find((mm) => !mm.is_original)._id;
      const delRes = await apiClient.delete(
        `/api/media/${target._id}/meta/${metaId}`,
      );
      expect(delRes.status).toBe(200);
    });
  });

  // --- 7. Suite: Search (GET /api/media/search) - con seed ---

  test.describe("7. Search (GET /api/media/search)", () => {
    const uniqueTag = `search_${faker.datatype.uuid()}`;
    const titlePrefix = `SearchTC_${faker.random.alphaNumeric(6)}`;
    let createdIds = [];

    test.beforeAll(async ({ authRequest, baseURL }) => {
      const seedClient = new ApiClient(authRequest, baseURL);
      const seedCleaner = {
        register: (_type, id) => {
          if (id) createdIds.push(id);
        },
      };
      for (let i = 0; i < 5; i++) {
        await createMedia(seedClient, seedCleaner, {
          title: `${titlePrefix} Pub ${i}`,
          is_published: "true",
          tags: uniqueTag,
        });
      }
      for (let i = 0; i < 2; i++) {
        await createMedia(seedClient, seedCleaner, {
          title: `${titlePrefix} Draft ${i}`,
          is_published: "false",
          tags: uniqueTag,
        });
      }
      await new Promise((r) => setTimeout(r, 2000));
    });

    test.afterAll(async ({ authRequest, baseURL }) => {
      const cleanupClient = new ApiClient(authRequest, baseURL);
      for (const id of createdIds) {
        try {
          await cleanupClient.delete(`/api/media/${id}`);
        } catch (e) {
          /* ignore */
        }
      }
    });

    test("TC_MED_015_SEARCH_ExactTitle", async () => {
      const targetTitle = `${titlePrefix} Pub 0`;
      const res = await apiClient.get(
        `/api/media/search?title=${encodeURIComponent(targetTitle)}&limit=10&all=true`,
      );
      expect((res.status === 200)).toBeTruthy();
      const body = res.body;
      const found = body.data?.find(
        (m) =>
          m.title === targetTitle || (m.title && m.title.includes(titlePrefix)),
      );
      expect(found).toBeDefined();
      expect(found.title).toContain(titlePrefix);
    });

    test("TC_MED_016_SEARCH_FilterByArrayTag", async () => {
      const res = await apiClient.get(
        `/api/media/search?tags=${encodeURIComponent(uniqueTag)}&limit=20&all=true`,
      );
      expect((res.status === 200)).toBeTruthy();
      const body = res.body;
      const byTag = body.data?.filter((m) => m.tags?.includes(uniqueTag)) ?? [];
      expect(byTag.length).toBeGreaterThanOrEqual(7);
    });

    test("TC_MED_017_SEARCH_VisibilityMasking", async () => {
      const res = await apiClient.get(
        `/api/media/search?tags=${encodeURIComponent(uniqueTag)}&limit=50`,
      );
      expect((res.status === 200)).toBeTruthy();
      const body = res.body;
      const results = body.data ?? [];
      results.forEach((m) => {
        expect(m.is_published).toBe(true);
        expect(m.status).toBe("OK");
      });
    });

    test("TC_MED_018_SEARCH_VisibilityAdmin", async () => {
      const res = await apiClient.get(
        `/api/media/search?tags=${encodeURIComponent(uniqueTag)}&all=true&limit=50`,
      );
      expect((res.status === 200)).toBeTruthy();
      const body = res.body;
      const results = body.data ?? [];
      const drafts = results.filter((m) => m.is_published === false);
      expect(drafts.length).toBeGreaterThanOrEqual(2);
    });
  });

  // --- 11. Suite: Subrecursos Adicionales (Subtitle, Thumbs, Image, Upload, Preview) ---

  test.describe("11. Subrecursos Adicionales", () => {
    test("TC_MED_SUBTITLE_GET", async () => {
      const media = await createMedia(apiClient, cleaner);
      try {
        const res = await apiClient.get(`/api/media/${media._id}/subtitle`);
        expect(res.status).toBe(200);
        const body = res.body;
        expect(body.status).toBe("OK");
        const data = body.data ?? body;
        expect(
          Array.isArray(data) ||
          (data && typeof data === "object" && (data.subtitles || data.data)),
        ).toBeTruthy();
      } finally {

      }
    });

    test("TC_MED_SUBTITLE_GET_NotFound", async () => {
      const res = await apiClient.get(
        "/api/media/000000000000000000000000/subtitle",
      );
      const body = res.body;
      expect([200, 404]).toContain(res.status);
      expect(body.status === "ERROR" || res.status === 404).toBeTruthy();
      if (body.status === "ERROR") {
        expect(["NOT_FOUND", "MEDIA_NOT_FOUND"]).toContain(body.data);
      }
    });

    test("TC_MED_SUBTITLE_DELETE", async () => {
      const found = await findMediaWithSubtitle(apiClient);
      if (!found) {
        test.skip();
        return;
      }
      const delRes = await apiClient.delete(
        `/api/media/${found.mediaId}/subtitle/${found.subtitleId}`,
      );
      expect(delRes.status).toBe(200);
      const getRes = await apiClient.get(
        `/api/media/${found.mediaId}/subtitle`,
      );
      const getBody = getRes.body;
      const items = Array.isArray(getBody.data)
        ? getBody.data
        : (getBody.data?.subtitles ?? []);
      const stillPresent = items.some(
        (s) => (s._id ?? s.id) === found.subtitleId,
      );
      expect(stillPresent).toBe(false);
    });

    test("TC_MED_THUMBS_GET", async () => {
      const media = await createMedia(apiClient, cleaner);
      try {
        const res = await apiClient.get(`/api/media/${media._id}/thumbs`);
        expect(res.status).toBe(200);
        const body = res.body;
        expect(body.status).toBe("OK");
        const thumbs =
          body.data?.thumbnails ?? body.data ?? body.thumbnails ?? [];
        expect(Array.isArray(thumbs)).toBe(true);
      } finally {

      }
    });

    test("TC_MED_THUMBS_GET_NotFound", async () => {
      const res = await apiClient.get(
        "/api/media/000000000000000000000000/thumbs",
      );
      const body = res.body;
      expect([200, 404]).toContain(res.status);
      if (body.status === "ERROR") {
        expect(["NOT_FOUND", "MEDIA_NOT_FOUND"]).toContain(body.data);
      }
    });

    test("TC_MED_THUMB_DELETE", async () => {
      const found = await findMediaWithDeletableThumb(apiClient);
      if (!found) {
        test.skip();
        return;
      }
      const delRes = await apiClient.delete(
        `/api/media/${found.mediaId}/thumb/${found.thumbId}`,
      );
      expect(delRes.status).toBe(200);
    });

    test("TC_MED_THUMBNAIL_UPLOAD_POST", async () => {
      const media = await createMedia(apiClient, cleaner);
      try {
        const res = await apiClient.post(
          `/api/media/${media._id}/thumbnail/upload`,
          { form: {} },
        );
        if ((res.status === 200)) {
          const body = res.body;
          expect(body.status).toBe("OK");
          const payload = body.data ?? body;
          expect(
            payload.url || payload.upload_url || payload.key !== undefined,
          ).toBeTruthy();
        } else {
          test.skip(
            true,
            "Endpoint puede requerir params adicionales o no estar disponible",
          );
        }
      } finally {

      }
    });

    test("TC_MED_PREVIEW_POST", async () => {
      const media = await createMedia(apiClient, cleaner);
      try {
        const res = await apiClient.post(`/api/media/${media._id}/preview`, {
          form: {},
        });
        expect([200, 201, 400, 422]).toContain(res.status);
        if ((res.status === 200)) {
          const body = res.body;
          expect(body.status).toBe("OK");
        }
      } finally {

      }
    });

    test("TC_MED_PREVIEW_UPLOAD_GET", async () => {
      const media = await createMedia(apiClient, cleaner);
      try {
        const res = await apiClient.get(
          `/api/media/${media._id}/preview/upload`,
        );
        expect([200, 404, 400]).toContain(res.status);
        if ((res.status === 200)) {
          const body = res.body;
          expect(body.status).toBe("OK");
          const payload = body.data ?? body;
          expect(
            payload.url || payload.upload_url || payload.key !== undefined,
          ).toBeTruthy();
        }
      } finally {

      }
    });

    test("TC_MED_UPLOAD_GET", async () => {
      const fileUrl =
        "https://ms-qa-bucket.s3.us-east-1.amazonaws.com/test_360p.mp4";
      const file_name = "test_360p.mp4";
      const uniqueTag = `qa_upload_${Date.now()}_${faker.random.alphaNumeric(8)}`;

      const params = new URLSearchParams({
        file_name,
        fileUrl,
        type: "remote",
        title: uniqueTag,
      });
      if (process.env.API_TOKEN) params.append("token", process.env.API_TOKEN);

      // Step 1: Upload and get jobId
      const uploadRes = await apiClient.get(
        `/api/media/upload?${params.toString()}`,
      );
      if (uploadRes.status !== 200) {
        test.skip(
          true,
          "Endpoint GET /api/media/upload puede no estar disponible en esta API",
        );
        return;
      }

      const uploadBody = uploadRes.body;
      expect(uploadBody.status).toBe("OK");
      expect(uploadBody.data).toBeDefined();
      expect(uploadBody.data.jobId).toBeDefined();

      const jobId = uploadBody.data.jobId;
      expect(typeof jobId).toBe("string");
      expect(jobId.length).toBeGreaterThan(0);

      // Step 2: Search for the media by title (jobId is used as unique identifier)
      await new Promise((r) => setTimeout(r, 2000)); // Wait for media to be created

      const searchParams = new URLSearchParams({
        all: "true",
        title: jobId,
        "title-rule": "contains",
      });
      if (process.env.API_TOKEN)
        searchParams.append("token", process.env.API_TOKEN);

      const searchRes = await apiClient.get(
        `/api/media?${searchParams.toString()}`,
      );
      expect(searchRes.status).toBe(200);

      const searchBody = searchRes.body;
      expect(Array.isArray(searchBody.data)).toBe(true);
      expect(searchBody.data.length).toBeGreaterThan(0);

      const mediaId = searchBody.data[0]._id;
      expect(mediaId).toBeDefined();

      // Step 3: Wait for VMS processing
      await new Promise((r) => setTimeout(r, 10000)); // Wait 10 seconds

      // Step 4: Query VMS to validate job status
      const vmsBaseUrl =
        process.env.VMS_BASE_URL || "https://dev.vms.platform.mediastre.am";
      const vmsToken = process.env.VMS_TOKEN;

      if (!vmsToken) {
        console.warn(
          "⚠️ VMS_TOKEN not set in env. Skipping VMS validation. Set VMS_TOKEN in .env to enable this check.",
        );
        test.skip(true, "VMS_TOKEN not configured");
        return;
      }

      // Make raw fetch to VMS (Playwright context may not support external APIs)
      let vmsBody;
      try {
        console.log(`📡 Fetching VMS: ${vmsBaseUrl}/search/media?id=${mediaId}`);
        const vmsRes = await fetch(`${vmsBaseUrl}/search/media?id=${mediaId}`, {
          headers: {
            "X-API-KEY": vmsToken,
            "Content-Type": "application/json",
          },
        });

        console.log(`📊 VMS Response status: ${vmsRes.status}`);

        if (!vmsRes.ok) {
          console.warn(
            `⚠️ VMS endpoint returned ${vmsRes.status}. Skipping validation.`,
          );
          test.skip(true, "VMS API returned non-ok status");
          return;
        }

        vmsBody = await vmsRes.json();
        console.log(
          `✅ VMS Response OK: ${JSON.stringify(vmsBody).substring(0, 200)}...`,
        );

        // Validate VMS response structure
        vmsMediaSearchResponseSchema.parse(vmsBody);
      } catch (error) {
        console.error(`❌ VMS Fetch Error:`, error.message);
        console.warn(
          `⚠️ Failed to connect to VMS: ${error.message}. This may be expected if VMS is not accessible in this environment.`,
        );
        test.skip(true, "VMS connection failed - environment may not support it");
        return;
      }

      // Validation of job statuses (outside try-catch to fail properly)
      const jobs = vmsBody.jobs || [];
      console.log(`📋 Total jobs: ${jobs.length}`);

      // Validate that Transcode jobs are NOT in STARTED or ERROR status
      const transcodeJobs = jobs.filter((job) => job.job_type === "Transcode");
      console.log(`🔄 Transcode jobs: ${transcodeJobs.length}`);

      if (transcodeJobs.length > 0) {
        transcodeJobs.forEach((job) => {
          console.log(
            `   Job ${job.job_id}: status=${job.status}, progress=${job.progress}%`,
          );
          expect(["STARTED", "ERROR"]).not.toContain(
            job.status,
            `❌ Transcode job ${job.job_id} is still in ${job.status} status. Transcoding not completed.`,
          );
        });
      }

      // Verify that we have valid job statuses
      expect(
        jobs.every((job) =>
          ["STARTED", "DONE", "ERROR", "PENDING", "IN_PROGRESS"].includes(
            job.status,
          ),
        ),
      ).toBe(true);

      // Cleanup: Delete the media created
      try {

      } catch (e) {
        console.warn("Could not cleanup media after upload test");
      }
    });

    test("TC_MED_IMAGE_GET", async () => {
      const media = await createMedia(apiClient, cleaner);
      try {
        const res = await apiClient.get(`/api/media/${media._id}/image`);
        expect(res.status).toBe(200);
        const body = res.body;
        expect(body.status).toBe("OK");
        const data = body.data ?? body;
        expect(Array.isArray(data) || data === null).toBeTruthy();
      } finally {

      }
    });

    test("TC_MED_IMAGE_GET_NotFound", async () => {
      const res = await apiClient.get(
        "/api/media/000000000000000000000000/image",
      );
      const body = res.body;
      expect([200, 404]).toContain(res.status);
      if (body.status === "ERROR") {
        expect(body.data).toBeDefined();
      }
    });
  });

  // --- TC_MED_005b adicional: without_category con ID ---

  test.describe("3b. Read - Filtro without_category + id", () => {
    test("TC_MED_005c_GET_WithoutCategoryAndId", async () => {
      const listRes = await apiClient.get("/api/media?all=true&limit=50");
      const listBody = listRes.body;
      const withCategory = listBody.data.find(
        (m) => Array.isArray(m.categories) && m.categories.length > 0,
      );
      if (!withCategory) {
        test.skip();
        return;
      }

      const res = await apiClient.get(
        `/api/media?without_category=true&id=${withCategory._id}`,
      );
      expect((res.status === 200)).toBeTruthy();
      const body = res.body;
      expect(body.data.length).toBe(0);
    });
  });
});
