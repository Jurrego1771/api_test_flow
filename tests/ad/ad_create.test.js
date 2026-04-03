const { test, expect } = require("../../fixtures/ad.fixture");
const { adSchema } = require("../../schemas/ad.schema");

test.describe("Ad API — Creación", () => {
  test("TC_AD_POST_create_ad_valid", async ({ tempAd }) => {
    expect(tempAd).toBeDefined();

    // Validación estructural con Zod
    adSchema.parse(tempAd);

    expect(tempAd).toHaveProperty("_id");
    expect(tempAd).toHaveProperty("name");
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
    expect(tempAd).toHaveProperty("schedule");
    expect(tempAd).toHaveProperty("adswizz");
    expect(tempAd).toHaveProperty("insertion");
    expect(tempAd).toHaveProperty("categories");
    expect(tempAd).toHaveProperty("tags");
    expect(tempAd).toHaveProperty("referers");
  });
});
