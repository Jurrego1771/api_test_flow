const base = require("@playwright/test");
require("dotenv").config();

exports.test = base.test.extend({
  authRequest: async ({ playwright }, use, testInfo) => {
    const context = await playwright.request.newContext({
      baseURL: process.env.BASE_URL,
      extraHTTPHeaders: {
        "X-API-Token": process.env.API_TOKEN,
      },
    });

    // Proxy para interceptar llamadas y adjuntar evidencias en caso de error
    const proxyContext = new Proxy(context, {
      get(target, prop) {
        if (['get', 'post', 'put', 'delete', 'patch'].includes(prop)) {
          return async (...args) => {
            const response = await target[prop](...args);
            
            // Si la respuesta no es exitosa (>= 400), adjuntamos evidencia
            if (!response.ok()) {
              const url = args[0];
              const options = args[1] || {};
              const status = response.status();
              let responseBody;
              try {
                responseBody = await response.json();
              } catch (e) {
                responseBody = await response.text();
              }

              const logEntry = {
                method: prop.toUpperCase(),
                url: url,
                requestHeaders: options.headers || {},
                requestBody: options.data || options.form || options.multipart || 'N/A',
                responseStatus: status,
                responseBody: responseBody
              };

              // Adjuntar al reporte de Playwright (HTML y Allure)
              await testInfo.attach(`API-Error-${prop.toUpperCase()}`, {
                body: JSON.stringify(logEntry, null, 2),
                contentType: 'application/json'
              });
            }
            return response;
          };
        }
        return target[prop];
      }
    });

    await use(proxyContext);
    await context.dispose();
  },
});

exports.expect = base.expect;
