require("dotenv").config();
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 30_000,

  use: {
    baseURL: process.env.BASE_URL,
  },

  // Configuración para reportes HTML
  reporter: [["html", { outputFolder: "playwright-report" }], ["list"]],

  // Configuración de retry
  retries: process.env.CI ? 2 : 0,
});
