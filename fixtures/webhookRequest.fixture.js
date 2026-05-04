/**
 * Fixture: webhookRequest
 *
 * Los endpoints /api/settings/webhooks requieren autenticación via JWT Bearer token,
 * a diferencia del resto de la API que usa X-API-Token hex.
 *
 * Variable de entorno requerida:
 *   WEBHOOK_JWT   JWT obtenido del browser (DevTools > Network > Authorization header).
 *                 Si no se define, se usa SHOW_API_TOKEN como fallback.
 *                 El token expira en ~24 horas — actualizar en .env cuando sea necesario.
 */

const base = require("@playwright/test");
require("dotenv").config();

exports.test = base.test.extend({
  webhookRequest: async ({ playwright }, use) => {
    const jwt = process.env.WEBHOOK_JWT || process.env.SHOW_API_TOKEN;

    if (!jwt) {
      throw new Error(
        "WEBHOOK_JWT no está definido en .env. " +
          "Obtén el JWT del browser (DevTools > Network) y agrégalo a .env como WEBHOOK_JWT=<token>"
      );
    }

    const context = await playwright.request.newContext({
      baseURL: process.env.BASE_URL,
      extraHTTPHeaders: {
        Authorization: `Bearer ${jwt}`,
      },
    });

    await use(context);
    await context.dispose();
  },
});

exports.expect = base.expect;
