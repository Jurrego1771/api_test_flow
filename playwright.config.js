require("dotenv").config({ quiet: true });
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  // En CI se aumenta a 45s para dar margen a los tests de embed/live
  // que dependen de endpoints externos con latencia variable
  timeout: process.env.CI ? 45_000 : 30_000,

  // 2 workers: safe for API tests against shared account without starving CI
  workers: 2,

  // Retry only in CI to absorb transient network hiccups
  retries: process.env.CI ? 1 : 0,

  use: {
    baseURL: process.env.BASE_URL,
    headless: true,
    viewport: { width: 1280, height: 720 },
    channel: "chrome", // 🌐 Usar Google Chrome oficial (incluye todos los códecs)
    // 🔍 Evidencias en fallo
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Sin servidor web local; solo pruebas de API/endpoint

  // 🔹 Configuración de reportes
  reporter: [
    ["list"], // salida en consola
    ["json", { outputFile: "test-results/results.json" }], // 🧾 útil para Slack o CI
    ["html", { outputFolder: "playwright-report", open: "never" }], // 🌐 reporte Playwright (fallback)
    [
      "./reporters/allure-enhanced.js",
      {
        detail: true,              // incluye steps internos de Playwright
        outputFolder: "allure-results", // datos crudos; el HTML se genera en CI
        suiteTitle: true,          // usa el nombre del describe como Suite
        environmentInfo: {         // metadata visible en el panel Environment
          node_version: process.version,
          base_url: process.env.BASE_URL || "N/A",
        },
      },
    ],
  ],
});
