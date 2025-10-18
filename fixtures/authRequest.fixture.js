const base = require("@playwright/test");
require("dotenv").config();

exports.test = base.test.extend({
  authRequest: async ({ playwright }, use) => {
    // ✅ Creamos un nuevo contexto de API usando playwright.request
    const context = await playwright.request.newContext({
      baseURL: process.env.BASE_URL,
      extraHTTPHeaders: {
        "X-API-Token": process.env.API_TOKEN,
      },
    });

    // Exponemos este contexto al test
    await use(context);

    // Cerramos después del test
    await context.dispose();
  },
});

exports.expect = base.expect;
