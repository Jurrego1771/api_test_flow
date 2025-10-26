require("dotenv").config();
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 30_000,

  use: {
    baseURL: process.env.BASE_URL, // solo API; sin fallback local a server
    headless: true,
    viewport: { width: 1280, height: 720 },
  },

  // Sin servidor web local; solo pruebas de API/endpoint

  // 🔹 Configuración de reportes
  reporter: [
    ["list"], // salida en consola
    ["json", { outputFile: "test-results/results.json" }], // 🧾 útil para Slack o CI
    ["html", { outputFolder: "playwright-report", open: "never" }], // 🌐 reporte para Pages
  ],
});
