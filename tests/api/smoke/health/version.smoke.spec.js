const { test, expect } = require('@playwright/test');

/**
 * Health-check / canario de ambiente.
 *
 * GET /api/version es público (sin auth), read-only, y devuelve la versión del
 * backend en texto plano (ej. "7.0.65"). Sirve como prueba @prod-safe: confirma
 * que el ambiente (dev/US/EU) está vivo y responde antes de correr la suite
 * pesada. NO escribe nada — seguro en cualquier ambiente.
 */

test.describe('Health — Backend version', () => {
    test('TC_HEALTH_001_GET_Version_Alive @prod-safe @critical', async ({ request, baseURL }) => {
        const res = await request.get(`${baseURL}/api/version`);

        expect(res.status(), 'el ambiente debe responder 200 en /api/version').toBe(200);

        const body = (await res.text()).trim();
        // semver: 7.0.65
        expect(body, `versión inesperada: "${body}"`).toMatch(/^\d+\.\d+\.\d+$/);

        console.log(`✅ ${baseURL} vivo — backend v${body}`);
    });
});
