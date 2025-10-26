const { test, expect } = require("../../fixtures/ad.fixture");

test.describe("💵 Ad - VMAP )", () => {
  test("Crear Ad VMAP con payload de ejemplo", async ({ createAd }) => {
    const vmapTag =
      "https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/vmap_ad_samples&sz=640x480&cust_params=sample_ar%3Dpremidpostpod&ciu_szs=300x250&gdfp_req=1&ad_rule=1&output=vmap&unviewed_position_start=1&env=vp&cmsid=496&vid=short_onecue&correlator=";

    const { ad } = await createAd({
      name: "prueba vmap",
      type: "vmap",
      is_enabled: "false",
      "vmap[tag]": vmapTag,
      "vmap[tag_mobile]": vmapTag,
      // opcionales
      "adswizz[zone]": "",
      categories: "",
      tags: "",
      referers: "",
    });

    expect(ad).toBeDefined();
    expect(ad).toHaveProperty("_id");
    expect(ad.type).toBe("vmap");
    expect(ad.name).toContain("prueba");
  });
});
