// SKIP: estos tests usan embed.fixture (embedRequest, embedUrl, embedConfig) que requieren
// configuración de URLs de embed y credenciales adicionales no disponibles en el runner API estándar.
// Pendiente: migrar a un proyecto Playwright separado con fixture de embed cuando se habilite.

const { test, expect } = require('@playwright/test');
const { ApiClient } = require('../../helpers');

let apiClient;

test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
});

test.describe('Embed API - Endpoints de metadata', () => {
    test.skip('TC_EMB_GET_api_video_detail_json — requiere embed.fixture', async () => {});
    test.skip('TC_EMB_GET_api_related_media — requiere embed.fixture', async () => {});
    test.skip('TC_EMB_GET_api_playlist_content — requiere embed.fixture', async () => {});
    test.skip('TC_EMB_GET_api_access_restrictions — requiere embed.fixture', async () => {});
});
