/**
 * Fixture personalizada para tests del módulo Show
 * Configura X-API-TOKEN (mayúsculas) solo para endpoints de Show
 */

const baseTest = require("@playwright/test");
require("dotenv").config();
const { faker } = require("@faker-js/faker");

const createShow = async (authRequest, attrs = {}) => {
  const payload = {
    title: `[QA-AUTO] Show ${faker.string.alphanumeric(6)} ${Date.now()}`,
    type: "tvshow",
    account: process.env.ACCOUNT_ID || "test-account",
    ...attrs,
  };

  const res = await authRequest.post("/api/show", { form: payload });
  if (!res.ok()) {
    const txt = await res.text().catch(() => "");
    throw new Error(`createShow failed: ${res.status()} ${txt}`);
  }

  const body = await res.json();
  // API returns: { data: show } | { status, data } | show at root | array
  const raw = body?.data ?? body;
  return Array.isArray(raw) ? raw[0] : raw;
};

const deleteShow = async (authRequest, showId) => {
  try {
    const res = await authRequest.delete(`/api/show/${showId}`);
    return res.ok();
  } catch (err) {
    console.error(`Error deleting show ${showId}:`, err.message);
    return false;
  }
};

exports.test = baseTest.test.extend({
  // -- authRequest con X-API-TOKEN (solo para Show) --
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

  // -- Información de contexto --
  accountId: async ({}, use) => {
    const accountId = process.env.ACCOUNT_ID || "test-account-id";
    await use(accountId);
  },

  tempShow: async ({ authRequest }, use) => {
    const show = await createShow(authRequest, {
      type: "tvshow",
      is_published: "true",
    });

    await use(show);

    // Cleanup
    await deleteShow(authRequest, show._id);
  },

  // -- Show para ser eliminado en el test --
  tempShowForDelete: async ({ authRequest }, use) => {
    const show = await createShow(authRequest, {
      type: "radioshow",
    });

    await use(show);

    // Intenta limpiar en caso de que el test no lo elimine completamente
    try {
      await deleteShow(authRequest, show._id);
    } catch (err) {
      // Ignore
    }
  },

  // -- Usuario restringido para pruebas de control de acceso --
  restrictedUser: async ({}, use) => {
    const restrictedUserId =
      process.env.RESTRICTED_USER_ID || "restricted-user-123";
    await use(restrictedUserId);
  },

  // -- Múltiples shows para pruebas de Search --
  tempShowsBatch: async ({ authRequest }, use) => {
    const shows = [];
    const types = ["tvshow", "radioshow", "podcast"];
    for (let i = 0; i < 3; i++) {
      const show = await createShow(authRequest, {
        title: `[QA-AUTO] Batch Show ${i} ${Date.now()}`,
        type: types[i % types.length],
        is_published: i === 0 ? "true" : "false",
      });
      shows.push(show);
    }

    await use(shows);

    // Cleanup
    for (const show of shows) {
      await deleteShow(authRequest, show._id);
    }
  },
});

exports.expect = baseTest.expect;

module.exports = exports;
