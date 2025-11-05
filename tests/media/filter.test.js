const { test, expect } = require("../../fixtures");
const logger = require("../utils/logger");

// Helper para crear una media y asegurar su eliminación
async function createMedia(authRequest, attrs = {}) {
  const payload = Object.assign(
    {
      title: `qa_filter_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type: "video",
      visible: "true",
      is_published: "false",
    },
    attrs
  );

  const res = await authRequest.post("/api/media", { form: payload });
  if (!res.ok()) {
    const txt = await res.text().catch(() => "");
    throw new Error(`createMedia failed: ${res.status()} ${txt}`);
  }
  const body = await res.json();
  const created = Array.isArray(body.data) ? body.data[0] : body.data;
  return created;
}

// Helper para construir query string for filterData
function buildFilterQuery(filters) {
  // filters: array of { filter, rule, value }
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

// Attach small evidence on failure
async function attachShort(info, title, obj) {
  try {
    await info.attach(title, {
      body: JSON.stringify(obj, null, 2).slice(0, 20000),
      contentType: "application/json",
    });
  } catch (e) {
    // ignore
  }
}

test.describe("Media - Filter parameters", () => {
  test("FILTER-TITLE-IS - filter by exact title (filterData[0][filter]=title)", async ({
    authRequest,
  }) => {
    const info = test.info();
    const media = await createMedia(authRequest, {
      title: `qa_filter_exact_${Date.now()}`,
    });
    try {
      const filters = [{ filter: "title", rule: "is", value: media.title }];
      const qs = buildFilterQuery(filters);
      const url = `/api/media?${qs}&all=true`;
      const res = await authRequest.get(url);
      const body = await res.json();

      if (!res.ok() || !Array.isArray(body.data)) {
        await attachShort(info, "FILTER-TITLE-IS - Response", {
          url,
          status: res.status(),
          body,
        });
      }

      expect(res.ok()).toBeTruthy();
      expect(body.status).toBe("OK");
      // expect to find created media in results
      const ids = (body.data || []).map((m) => m._id ?? m.id ?? m);
      expect(ids).toContain(media._id);
    } finally {
      // cleanup
      if (media && media._id)
        await authRequest.delete(`/api/media/${media._id}`);
    }
  });

  test("FILTER-TITLE-CONTAINS - filter by substring", async ({
    authRequest,
  }) => {
    const info = test.info();
    const unique = `qa_filter_contain_${Date.now()}`;
    const media = await createMedia(authRequest, {
      title: `prefix_${unique}_suffix`,
    });
    try {
      const filters = [{ filter: "title", rule: "contains", value: unique }];
      const qs = buildFilterQuery(filters);
      const url = `/api/media?${qs}&all=true`;
      const res = await authRequest.get(url);
      const body = await res.json();

      if (!res.ok() || !Array.isArray(body.data)) {
        await attachShort(info, "FILTER-TITLE-CONTAINS - Response", {
          url,
          status: res.status(),
          body,
        });
      }

      expect(res.ok()).toBeTruthy();
      expect(body.status).toBe("OK");
      const ids = (body.data || []).map((m) => m._id ?? m.id ?? m);
      expect(ids).toContain(media._id);
    } finally {
      if (media && media._id)
        await authRequest.delete(`/api/media/${media._id}`);
    }
  });

  test("FILTER-TITLE-STARTS_WITH - filter by prefix", async ({
    authRequest,
  }) => {
    const info = test.info();
    const prefix = `qa_prefix_${Date.now()}`;
    const media = await createMedia(authRequest, { title: `${prefix}_rest` });
    try {
      const filters = [{ filter: "title", rule: "starts_with", value: prefix }];
      const qs = buildFilterQuery(filters);
      const url = `/api/media?${qs}&all=true`;
      const res = await authRequest.get(url);
      const body = await res.json();

      if (!res.ok() || !Array.isArray(body.data)) {
        await attachShort(info, "FILTER-TITLE-STARTS_WITH - Response", {
          url,
          status: res.status(),
          body,
        });
      }

      expect(res.ok()).toBeTruthy();
      expect(body.status).toBe("OK");
      const ids = (body.data || []).map((m) => m._id ?? m.id ?? m);
      expect(ids).toContain(media._id);
    } finally {
      if (media && media._id)
        await authRequest.delete(`/api/media/${media._id}`);
    }
  });

  test("FILTER-TITLE-ENDS_WITH - filter by suffix", async ({ authRequest }) => {
    const info = test.info();
    const suffix = `qa_suffix_${Date.now()}`;
    const media = await createMedia(authRequest, { title: `start_${suffix}` });
    try {
      const filters = [{ filter: "title", rule: "ends_with", value: suffix }];
      const qs = buildFilterQuery(filters);
      const url = `/api/media?${qs}&all=true`;
      const res = await authRequest.get(url);
      const body = await res.json();

      if (!res.ok() || !Array.isArray(body.data)) {
        await attachShort(info, "FILTER-TITLE-ENDS_WITH - Response", {
          url,
          status: res.status(),
          body,
        });
      }

      expect(res.ok()).toBeTruthy();
      expect(body.status).toBe("OK");
      const ids = (body.data || []).map((m) => m._id ?? m.id ?? m);
      expect(ids).toContain(media._id);
    } finally {
      if (media && media._id)
        await authRequest.delete(`/api/media/${media._id}`);
    }
  });

  test("FILTER-PUBLISHED-TRUE - filter by published true", async ({
    authRequest,
  }) => {
    const info = test.info();

    // Primero buscamos una media que ya esté publicada
    const searchRes = await authRequest.get("/api/media?all=true&limit=50");
    const searchBody = await searchRes.json();
    expect(searchRes.ok()).toBeTruthy();

    const publishedMedia = searchBody.data.find((m) => m.is_published === true);
    expect(
      publishedMedia,
      "No se encontró una media publicada para probar"
    ).toBeTruthy();

    // Ahora probamos el filtro de published
    const filters = [{ filter: "published", rule: "true" }];
    const qs = buildFilterQuery(filters);
    const url = `/api/media?${qs}`;
    const res = await authRequest.get(url);
    const body = await res.json();

    if (!res.ok() || !Array.isArray(body.data)) {
      await attachShort(info, "FILTER-PUBLISHED-TRUE - Response", {
        url,
        status: res.status(),
        body,
      });
    }

    expect(res.ok()).toBeTruthy();
    expect(body.status).toBe("OK");
    const ids = (body.data || []).map((m) => m._id ?? m.id ?? m);
    expect(ids).toContain(publishedMedia._id);
  });

  test("FILTER-TYPE-VIDEO - filter by type video", async ({ authRequest }) => {
    const info = test.info();
    const media = await createMedia(authRequest, {
      title: `qa_type_${Date.now()}`,
      type: "video",
    });
    try {
      const filters = [{ filter: "type", rule: "video" }];
      const qs = buildFilterQuery(filters);
      const url = `/api/media?${qs}&all=true`;
      const res = await authRequest.get(url);
      const body = await res.json();

      if (!res.ok() || !Array.isArray(body.data)) {
        await attachShort(info, "FILTER-TYPE-VIDEO - Response", {
          url,
          status: res.status(),
          body,
        });
      }

      expect(res.ok()).toBeTruthy();
      expect(body.status).toBe("OK");
      const ids = (body.data || []).map((m) => m._id ?? m.id ?? m);
      expect(ids).toContain(media._id);
    } finally {
      if (media && media._id)
        await authRequest.delete(`/api/media/${media._id}`);
    }
  });
});
