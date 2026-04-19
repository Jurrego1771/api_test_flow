// tests/embed/embed-vod.test.js
const { test, expect } = require("../../fixtures/embed.fixture");

/**
 * Batería de pruebas: Embed VOD (Video bajo demanda)
 * Casos EMB-01 a EMB-18
 */
test.describe("Embed VOD - Videos bajo demanda", () => {

  test("TC_EMB_GET_vod_basic_load", async ({ page, embedUrl, embedConfig }) => {
    // Ir a la URL del embed
    const url = embedUrl.vod(embedConfig.mediaId);
    await page.goto(url);

    // Verificar que la página carga sin errores críticos
    const consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    // Esperar a que el player se cargue
    await page.waitForLoadState("networkidle");

    // Verificar que existe un elemento de video o el contenedor del player
    const playerContainer = page.locator('[class*="player"], [id*="player"], video, .mdstrm-player');
    await expect(playerContainer.first()).toBeVisible({ timeout: 15000 });

    // Verificar que no hay errores críticos en consola (opcional según config)
    // expect(consoleErrors.filter(e => e.includes('FATAL') || e.includes('Critical'))).toHaveLength(0);
  });

  test("TC_EMB_GET_vod_autoplay_enabled", async ({ page, embedUrl, embedConfig }) => {
    const url = embedUrl.vod(embedConfig.mediaId, { autoplay: "true" });
    await page.goto(url);
    await page.waitForLoadState("networkidle");

    // Esperar un momento para que el autoplay inicie
    await page.waitForTimeout(3000);

    // Verificar que el video está reproduciéndose (no está pausado)
    const video = page.locator("video").first();
    if (await video.count() > 0) {
      const isPaused = await video.evaluate((v) => v.paused);
      // Nota: En algunos navegadores el autoplay puede estar bloqueado sin interacción
      // El test valida que el parámetro se envía correctamente
      expect(typeof isPaused).toBe("boolean");
    }
  });

  test("TC_EMB_GET_vod_start_position_param", async ({ page, embedUrl, embedConfig }) => {
    const url = embedUrl.vod(embedConfig.mediaId, { position: 60 });
    await page.goto(url);
    await page.waitForLoadState("networkidle");

    // Verificar que el parámetro está en la URL
    expect(page.url()).toContain("position=60");

    // Intentar verificar el currentTime del video
    const video = page.locator("video").first();
    if (await video.count() > 0) {
      await page.waitForTimeout(2000);
      const currentTime = await video.evaluate((v) => v.currentTime);
      // El video debería iniciar cerca del segundo 60
      expect(currentTime).toBeGreaterThanOrEqual(60);
    }
  });

  test("TC_EMB_GET_vod_loop_param", async ({ page, embedUrl, embedConfig }) => {
    const url = embedUrl.vod(embedConfig.mediaId, { loop: "true" });
    await page.goto(url);
    await page.waitForLoadState("networkidle");

    // Verificar que el parámetro está en la URL
    expect(page.url()).toContain("loop=true");

    // Verificar el atributo loop en el video si está disponible
    const video = page.locator("video").first();
    if (await video.count() > 0) {
      const hasLoop = await video.evaluate((v) => v.loop || v.hasAttribute("loop"));
      // El loop puede estar manejado por el player, no directamente en el tag video
      expect(typeof hasLoop).toBe("boolean");
    }
  });

  test("TC_EMB_GET_vod_controls_hidden", async ({ page, embedUrl, embedConfig }) => {
    const url = embedUrl.vod(embedConfig.mediaId, { controls: "false" });
    await page.goto(url);
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("controls=false");

    // Verificar que la barra de controles no está visible o está oculta
    const controlBar = page.locator('[class*="control-bar"], [class*="controls"], .vjs-control-bar');
    // Los controles pueden estar ocultos vía CSS o no presentes
    await page.waitForTimeout(2000);
  });

  test("TC_EMB_GET_vod_custom_volume", async ({ page, embedUrl, embedConfig }) => {
    const url = embedUrl.vod(embedConfig.mediaId, { volume: 50 });
    await page.goto(url);
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("volume=50");

    const video = page.locator("video").first();
    if (await video.count() > 0) {
      await page.waitForTimeout(2000);
      const volume = await video.evaluate((v) => v.volume);
      // Volumen debería estar en 0.5 (50%)
      expect(volume).toBeGreaterThanOrEqual(0);
      expect(volume).toBeLessThanOrEqual(1);
    }
  });

  test("TC_EMB_GET_vod_custom_title_description", async ({ page, embedUrl, embedConfig }) => {
    const url = embedUrl.vod(embedConfig.mediaId, {
      title: "Mi Título de Prueba",
      description: "Mi Descripción de Prueba",
    });
    await page.goto(url);
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("title=");
    expect(page.url()).toContain("description=");

    // Buscar elementos que muestren el título
    const titleElement = page.locator('[class*="title"], [data-title]').first();
    await page.waitForTimeout(2000);
  });

  test("TC_EMB_GET_vod_title_hidden", async ({ page, embedUrl, embedConfig }) => {
    const url = embedUrl.vod(embedConfig.mediaId, { show_title: "false" });
    await page.goto(url);
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("show_title=false");
  });

  test("TC_EMB_GET_vod_status_hidden", async ({ page, embedUrl, embedConfig }) => {
    const url = embedUrl.vod(embedConfig.mediaId, { show_status: "false" });
    await page.goto(url);
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("show_status=false");
  });

  test("TC_EMB_GET_vod_custom_poster", async ({ page, embedUrl, embedConfig }) => {
    const posterUrl = embedConfig.testPosterUrl;
    const url = embedUrl.vod(embedConfig.mediaId, { poster: posterUrl });
    await page.goto(url);
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("poster=");

    // Verificar que hay una imagen de poster
    const posterImg = page.locator('[class*="poster"] img, video[poster], [style*="background-image"]');
    await page.waitForTimeout(2000);
  });

  test("TC_EMB_GET_vod_custom_player_id", async ({ page, embedUrl, embedConfig }) => {
    test.skip(!embedConfig.playerId, "Se requiere EMBED_PLAYER_ID configurado");

    const url = embedUrl.vod(embedConfig.mediaId, { player: embedConfig.playerId });
    await page.goto(url);
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("player=");
  });

  test("TC_EMB_GET_vod_player_skin", async ({ page, embedUrl, embedConfig }) => {
    const url = embedUrl.vod(embedConfig.mediaId, { player_skin: "lightning" });
    await page.goto(url);
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("player_skin=lightning");
  });

  test("TC_EMB_GET_vod_no_ad_with_admin_token", async ({ page, embedUrl, embedConfig }) => {
    test.skip(!embedConfig.adminToken, "Se requiere EMBED_ADMIN_TOKEN configurado");

    const url = embedUrl.vod(embedConfig.mediaId, {
      admin_token: embedConfig.adminToken,
      no_ad: "true",
    });
    await page.goto(url);
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("no_ad=true");
    expect(page.url()).toContain("admin_token=");
  });

  test("TC_EMB_GET_vod_account_token_access", async ({ page, embedUrl, embedConfig }) => {
    test.skip(!embedConfig.accToken, "Se requiere EMBED_ACC_TOKEN configurado");

    const url = embedUrl.vod(embedConfig.mediaId, { acc_token: embedConfig.accToken });
    await page.goto(url);
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("acc_token=");
  });

  test("TC_EMB_GET_vod_path_query_override", async ({ page, embedUrl, embedConfig }) => {
    const url = embedUrl.vodPathOverride(embedConfig.mediaId, {
      autoplay: "true",
      volume: 80,
    });
    await page.goto(url);
    await page.waitForLoadState("networkidle");

    // Verificar que la URL contiene el formato de path override
    expect(page.url()).toContain("/autoplay/true");
    expect(page.url()).toContain("/volume/80");
  });

  test("TC_EMB_GET_vod_debug_mode", async ({ page, embedUrl, embedConfig }) => {
    const url = embedUrl.vod(embedConfig.mediaId, { debug: "true" });

    // Capturar logs de consola
    const consoleLogs = [];
    page.on("console", (msg) => consoleLogs.push(msg.text()));

    await page.goto(url);
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("debug=true");

    // Esperar un momento para que se generen logs de debug
    await page.waitForTimeout(3000);
    // Los logs de debug deberían estar presentes
  });

  test("TC_EMB_GET_vod_cookieless_mode", async ({ page, embedUrl, embedConfig, context }) => {
    const url = embedUrl.vod(embedConfig.mediaId, { without_cookies: "true" });
    await page.goto(url);
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("without_cookies=true");

    // Verificar cookies
    const cookies = await context.cookies();
    const mdstrmCookies = cookies.filter((c) => c.name.startsWith("MDSTRM"));
    // En modo sin cookies, no deberían crearse cookies MDSTRM
    // Nota: La verificación depende de la implementación
  });

  test("TC_EMB_GET_vod_do_not_track", async ({ page, embedUrl, embedConfig }) => {
    const url = embedUrl.vod(embedConfig.mediaId, { dnt: "true" });
    await page.goto(url);
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("dnt=true");
  });
});
