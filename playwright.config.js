require("dotenv").config({ quiet: true });
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  globalSetup: require.resolve("./tests/prod-guard.js"),
  // Exclusión de módulos por ambiente (CSV de globs). Ej. en EU prod, módulos no
  // habilitados o con contrato distinto: IGNORE_GLOB="**/article/**,**/epg/**,**/show/**".
  testIgnore: process.env.IGNORE_GLOB
    ? process.env.IGNORE_GLOB.split(",").map((g) => g.trim()).filter(Boolean)
    : undefined,
  timeout: process.env.CI ? 45_000 : 30_000,
  workers: 2,
  retries: process.env.CI ? 2 : 1,

  use: {
    baseURL: process.env.BASE_URL,
    headless: true,
    viewport: { width: 1280, height: 720 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: "smoke",
      testMatch: "**/api/smoke/**/*.spec.js",
    },
    {
      name: "regression",
      testMatch: "**/api/regression/**/*.spec.js",
    },
    {
      name: "integration",
      testMatch: "**/api/integration/**/*.spec.js",
      timeout: 60_000,
    },
    {
      name: "contract",
      testMatch: "**/api/contract/**/*.spec.js",
    },
  ],

  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/results.json" }],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    [
      "allure-playwright",
      {
        detail: true,
        outputFolder: "allure-results",
        suiteTitle: true,
        environmentInfo: {
          node_version: process.version,
          base_url: process.env.BASE_URL || "N/A",
          ci: process.env.CI ? "true" : "false",
        },
      },
    ],
  ],
});
