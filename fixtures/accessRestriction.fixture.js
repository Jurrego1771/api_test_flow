/**
 * Fixture para tests del módulo Access Restrictions (Advanced)
 * Endpoints: /api/settings/advanced-access-restrictions
 *
 * Expone authRequest (X-API-Token) para operaciones de lectura (GET).
 *
 * Nota: Las operaciones de escritura requieren sesión de navegador y están
 * pendientes de integración.
 */

const baseTest = require("@playwright/test");
require("dotenv").config();

exports.test = baseTest.test.extend({
  authRequest: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({
      baseURL: process.env.BASE_URL,
      extraHTTPHeaders: {
        "X-API-Token": process.env.API_TOKEN,
      },
    });
    await use(context);
    await context.dispose();
  },
});

exports.expect = baseTest.expect;
module.exports = exports;
