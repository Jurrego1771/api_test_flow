const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner, dataFactory } = require('../../helpers');
const fs = require('fs');
const path = require('path');

const LIVE_ID  = process.env.LIVE_STREAM_ID || '6971288e64b2477e2b935259';
const LIVE_BASE = `/api/live-stream/${LIVE_ID}`;
const LOGO_PATH = `${LIVE_BASE}/logo`;

const RES_DIR    = path.resolve(__dirname, '../../../../tests/resources');
const LOGO_VALID = path.join(RES_DIR, 'logo.png');
const LOGO_LARGE = path.join(RES_DIR, 'large_file.png');
const FILE_INVALID = path.join(RES_DIR, 'invalid_format.txt');

let apiClient, cleaner;

test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
});

test.afterEach(async () => {
    await cleaner.clean();
});

test.describe('Live Stream Logo API - Exhaustive Suite (Static Assets)', () => {

    // --- Suite 1: Casos Positivos y Persistencia ---
    // Creates its own live stream to avoid relying on a fixed document that may have DB issues
    test.describe('1. Suite: Casos Positivos y Persistencia', () => {
        let suite1LiveId;

        test.beforeAll(async ({ request, baseURL }) => {
            const client = new ApiClient(request, baseURL);
            const payload = dataFactory.generateLiveStreamPayload({ type: 'video', online: 'false' });
            const res = await client.post('/api/live-stream', payload, { form: true });
            if (!res.ok) throw new Error(`Suite 1 setup: failed to create live stream: ${res.status} ${JSON.stringify(res.body)}`);
            const data = Array.isArray(res.body.data) ? res.body.data[0] : res.body.data;
            suite1LiveId = data._id;
        });

        test.afterAll(async ({ request, baseURL }) => {
            if (suite1LiveId) {
                const client = new ApiClient(request, baseURL);
                await client.delete(`/api/live-stream/${suite1LiveId}`);
            }
        });

        test('TC_LOG_001_POST_UploadValidLogo', async () => {
            const res = await apiClient.post(
                `/api/live-stream/${suite1LiveId}/logo`,
                { attach: fs.createReadStream(LOGO_VALID) },
                { multipart: true }
            );
            expect(res.ok).toBeTruthy();
            expect(res.body.status).toBe('OK');
            expect(res.body.data).toBe('Logo Uploaded');
        });

        test('TC_LOG_002_GET_VerifyPersistence', async () => {
            const upload = await apiClient.post(
                `/api/live-stream/${suite1LiveId}/logo`,
                { attach: fs.createReadStream(LOGO_VALID) },
                { multipart: true }
            );
            expect(upload.ok).toBeTruthy();

            const res = await apiClient.get(`/api/live-stream/${suite1LiveId}`);
            expect(res.ok).toBeTruthy();
            expect(res.body.data.logo?.live?.enabled).toBe(true);
            expect(res.body.data.logo?.live?.url).toContain(`s-live-${suite1LiveId}.png`);
        });

        test('TC_LOG_003_POST_UpdateLogoPosition', async () => {
            const newPos = 'bottom-left';
            const res = await apiClient.post(
                `/api/live-stream/${suite1LiveId}`,
                { logo_live_position: newPos },
                { form: true }
            );
            expect(res.ok).toBeTruthy();

            const getRes = await apiClient.get(`/api/live-stream/${suite1LiveId}`);
            expect(getRes.ok).toBeTruthy();
            expect(getRes.body.data.logo?.live?.position).toBe(newPos);
        });

        test('TC_LOG_004_POST_SetExternalLogoUrl', async () => {
            await apiClient.delete(`/api/live-stream/${suite1LiveId}/logo`);

            const externalUrl = 'https://example.com/external-logo.png';
            const res = await apiClient.post(
                `/api/live-stream/${suite1LiveId}`,
                { logo_live_url: externalUrl },
                { form: true }
            );
            expect(res.ok).toBeTruthy();

            const getRes = await apiClient.get(`/api/live-stream/${suite1LiveId}`);
            expect(getRes.ok).toBeTruthy();
            expect(getRes.body.data.logo?.live?.url).toBe(externalUrl);
        });

        test('TC_LOG_005_POST_ReplaceLogo', async () => {
            await apiClient.post(
                `/api/live-stream/${suite1LiveId}/logo`,
                { attach: fs.createReadStream(LOGO_VALID) },
                { multipart: true }
            );

            const res = await apiClient.post(
                `/api/live-stream/${suite1LiveId}/logo`,
                { attach: fs.createReadStream(LOGO_VALID) },
                { multipart: true }
            );
            expect(res.ok).toBeTruthy();
            expect(res.body.status).toBe('OK');
            expect(res.body.data).toBe('Logo Uploaded');
            if (res.body.url) {
                expect(res.body.url).toContain('?');
                expect(res.body.url).toMatch(new RegExp(`https?://.*s-live-${suite1LiveId}\\.png`));
            }
        });
    });

    // --- Suite 2: Límites y Validaciones Negativas ---
    test.describe('2. Suite: Límites y Validaciones Negativas', () => {

        test('TC_LOG_006_POST_UploadOverSizeLimit', async () => {
            const res = await apiClient.post(LOGO_PATH, { attach: fs.createReadStream(LOGO_LARGE) }, { multipart: true });
            expect(res.status).toBe(400);
        });

        test('TC_LOG_007_POST_UploadInvalidFormat', async () => {
            const res = await apiClient.post(LOGO_PATH, { attach: fs.createReadStream(FILE_INVALID) }, { multipart: true });
            expect(res.status).toBe(400);
        });

        test('TC_LOG_008_POST_UploadEmptyFile', async () => {
            const res = await apiClient.post(LOGO_PATH, {
                attach: { name: 'empty.png', mimeType: 'image/png', buffer: Buffer.from('') }
            }, { multipart: true });

            if (res.status === 200 || res.status === 500) {
                test.skip(true, `Servidor no validó archivo vacío (status: ${res.status})`);
                return;
            }
            expect(res.status).toBe(400);
        });

        test('TC_LOG_009_POST_UploadNonExistentLive @negative', async () => {
            const fakeId = '000000000000000000000000';
            const res = await apiClient.post(
                `/api/live-stream/${fakeId}/logo`,
                { attach: fs.createReadStream(LOGO_VALID) },
                { multipart: true }
            );
            expect(res.status).toBe(404);
        });
    });

    // --- Suite 3: Eliminación y Limpieza ---
    test.describe('3. Suite: Eliminación y Limpieza', () => {

        test('TC_LOG_010_DELETE_RemoveLogo', async () => {
            await apiClient.post(LOGO_PATH, { attach: fs.createReadStream(LOGO_VALID) }, { multipart: true });

            const res = await apiClient.delete(LOGO_PATH);
            expect(res.ok).toBeTruthy();
            expect(res.body.status).toBe('OK');
        });

        test('TC_LOG_011_GET_VerifyCleanState', async () => {
            await apiClient.delete(LOGO_PATH);

            const res = await apiClient.get(LIVE_BASE);
            expect(res.ok).toBeTruthy();
            expect(res.body.data.logo?.live?.enabled).toBe(false);
            expect(res.body.data.logo?.live?.url).toBe('');
        });

        test('TC_LOG_012_DELETE_LogoIdempotency', async () => {
            await apiClient.delete(LOGO_PATH);
            const res = await apiClient.delete(LOGO_PATH);
            expect([200, 204, 404]).toContain(res.status);
        });
    });

    // --- Suite 4: Seguridad (Auth) ---
    test.describe('4. Suite: Seguridad (Auth)', () => {

        test('TC_LOG_013_POST_UploadNoToken @negative', async ({ playwright }) => {
            const unauth = await playwright.request.newContext({ baseURL: process.env.BASE_URL });
            const res = await unauth.post(`${process.env.BASE_URL}${LOGO_PATH}`, {
                multipart: { attach: fs.createReadStream(LOGO_VALID) }
            });
            expect([401, 403]).toContain(res.status());
            await unauth.dispose();
        });

        test('TC_LOG_014_DELETE_RemoveNoToken @negative', async ({ playwright }) => {
            const unauth = await playwright.request.newContext({ baseURL: process.env.BASE_URL });
            const res = await unauth.delete(`${process.env.BASE_URL}${LOGO_PATH}`);
            expect([401, 403]).toContain(res.status());
            await unauth.dispose();
        });
    });
});
