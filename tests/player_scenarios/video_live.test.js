const { test, expect } = require("@playwright/test");

test.describe("Video Live Page Tests", () => {
  test("Open Video Page and Verify Elements", async ({ page }) => {
    await page.goto("http://localhost:3000/player_pages/video_live.html");

    // Verificar que el elemento de video está visible
    expect(await page.isVisible("#video-player")).toBeTruthy();

    // Identificar un botón y simular un clic
    await page.click("#play-button");
    console.log("Play button clicked");

    // Verificar que el video ha empezado a reproducirse
    const isPlaying = await page.evaluate(() => {
      const video = document.querySelector("#video-player");
      return !video.paused;
    });
    expect(isPlaying).toBeTruthy();
  });

  test("Track Network Requests", async ({ page }) => {
    // Configurar para escuchar las peticiones de red
    page.on("request", (request) => {
      console.log("Request:", request.url());
    });

    await page.goto("http://localhost:3000/player_pages/video_live.html");

    // Simular otras interacciones y verificar peticiones de red
    await page.click("#load-data");
    const networkResponses = [];
    page.on("response", (response) => {
      networkResponses.push(response.url());
    });

    // Verificar que ciertas peticiones se realizaron
    expect(networkResponses).toContain("expected-network-call-url");
  });
});
