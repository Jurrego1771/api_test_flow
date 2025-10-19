require("dotenv").config();
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 30_000,

  use: {
    baseURL: process.env.BASE_URL,
  },

  // Configuración para reportes HTML
  reporter: [
    ["list"], // salida en consola
    ["json", { outputFile: "test-results/results.json" }], // 🧾 para Slack
    ["html", { outputFolder: "playwright-report" }], // 🌐 para GitHub Pages
  ],

  // Configuración de retry
  retries: process.env.CI ? 2 : 0,
});
