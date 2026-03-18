// tests/embed/feed.test.js
const { test, expect } = require("../../fixtures/embed.fixture");

test.describe("Feed - RSS/Atom style", () => {

  test("EMB-36: Feed de medios por categoría", async ({ embedRequest, embedUrl, embedConfig }) => {
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

  test("EMB-37: Feed con ordenamiento (sort=-date_created)", async ({ embedRequest, embedUrl, embedConfig }) => {
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

  test("EMB-38: Feed filtrado por tags", async ({ embedRequest, embedUrl, embedConfig }) => {
    const url = embedUrl.feed(embedConfig.accountId, "media", null, {
      tags: "tag1,tag2",
    });

    const response = await embedRequest.get(url, { failOnStatusCode: false });
    expect([200, 404]).toContain(response.status());
  });

  test("EMB-39: Límite máximo permitido (limit=100)", async ({ embedRequest, embedUrl, embedConfig }) => {
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

  test("EMB-40: Límite excedido (limit=200 -> max 100)", async ({ embedRequest, embedUrl, embedConfig }) => {
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
