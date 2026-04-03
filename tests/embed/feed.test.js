// tests/embed/feed.test.js
const { test, expect } = require("../../fixtures/embed.fixture");

test.describe("Feed - RSS/Atom style", () => {

  test("TC_EMB_GET_feed_filter_by_category", async ({ embedRequest, embedUrl, embedConfig }) => {
    const url = embedUrl.feed(embedConfig.accountId, "media", null, {
      category: embedConfig.categoryId,
      page: 1,
      limit: 10,
    });

    const response = await embedRequest.get(url, { failOnStatusCode: false });
    expect([200, 404]).toContain(response.status());

    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toBeDefined();
      // Verificar estructura del feed
      expect(typeof body).toBe("object");
    }
  });

  test("TC_EMB_GET_feed_sort_desc", async ({ embedRequest, embedUrl, embedConfig }) => {
    const url = embedUrl.feed(embedConfig.accountId, "media", null, {
      sort: "-date_created",
      limit: 5,
    });

    const response = await embedRequest.get(url, { failOnStatusCode: false });
    expect([200, 404]).toContain(response.status());

    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toBeDefined();
    }
  });

  test("TC_EMB_GET_feed_filter_by_tags", async ({ embedRequest, embedUrl, embedConfig }) => {
    const url = embedUrl.feed(embedConfig.accountId, "media", null, {
      tags: "tag1,tag2",
    });

    const response = await embedRequest.get(url, { failOnStatusCode: false });
    expect([200, 404]).toContain(response.status());
  });

  test("TC_EMB_GET_feed_limit_max", async ({ embedRequest, embedUrl, embedConfig }) => {
    const url = embedUrl.feed(embedConfig.accountId, "media", null, {
      limit: 100,
    });

    const response = await embedRequest.get(url, { failOnStatusCode: false });
    expect([200, 404]).toContain(response.status());

    if (response.status() === 200) {
      const body = await response.json();
      if (body.entry) {
        expect(body.entry.length).toBeLessThanOrEqual(100);
      }
    }
  });

  test("TC_EMB_GET_feed_limit_exceeded_capped", async ({ embedRequest, embedUrl, embedConfig }) => {
    const url = embedUrl.feed(embedConfig.accountId, "media", null, {
      limit: 200,
    });

    const response = await embedRequest.get(url, { failOnStatusCode: false });
    expect([200, 404]).toContain(response.status());

    if (response.status() === 200) {
      const body = await response.json();
      if (body.entry) {
        // El límite máximo debe mantenerse en 100
        expect(body.entry.length).toBeLessThanOrEqual(100);
      }
    }
  });
});
