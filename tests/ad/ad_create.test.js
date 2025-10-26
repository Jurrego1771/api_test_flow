const { test, expect } = require("../../fixtures/ad.fixture");
const { logApiResult } = require("../utils/logger");

test.describe("💵 Ad - Creación )", () => {
  test("Crear Ad mínimo (name, type, flags)", async ({ tempAd }) => {
    expect(tempAd).toBeDefined();
    expect(tempAd).toHaveProperty("_id");
    expect(tempAd).toHaveProperty("name");
    expect(tempAd).toHaveProperty("type");
    expect([
      "vast",
      "vmap",
      "googleima",
      "local",
      "ad-insertion",
      "adswizz",
    ]).toContain(tempAd.type);
    expect(tempAd).toHaveProperty("is_enabled");
    expect(tempAd).toHaveProperty("preroll_skip_at");
    expect(tempAd).toHaveProperty("min_media_time_length");

    // Estructura opcional esperada
    expect(tempAd).toHaveProperty("schedule");
    expect(tempAd).toHaveProperty("adswizz");
    expect(tempAd).toHaveProperty("insertion");
    expect(tempAd).toHaveProperty("categories");
    expect(tempAd).toHaveProperty("tags");
    expect(tempAd).toHaveProperty("referers");
  });
});
