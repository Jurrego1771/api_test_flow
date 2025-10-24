const { test, expect } = require("@playwright/test");

test.describe("Player Tests", () => {
  test("Test Player in Live Audio Mode", async ({ page }) => {
    const mode = "live";
    const type = "audio";
    const sourceUrl = "tu_url_de_fuente";

    await page.goto(`${type}_${mode}.html?src=${sourceUrl}&autoplay=true`);

    // Aquí puedes agregar las expectativas para verificar funcionalidades específicas
    expect(await page.isVisible("#player-div")).toBeTruthy();
  });
});
