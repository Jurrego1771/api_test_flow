require("dotenv").config();
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 1,

  use: {
    baseURL: process.env.BASE_URL,
    headless: true,
    viewport: { width: 1280, height: 720 },
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
