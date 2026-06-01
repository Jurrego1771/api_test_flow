const { test, expect } = require('@playwright/test');
const { ApiClient } = require('../../helpers');
const { accessTokenIssuedSchema, accessTokenErrorSchema } = require('../../../../schemas/access_token.schema');
const { errorResponseSchema } = require('../../../../schemas/errors.schema');

/**
 * Contract tests for POST /api/access/issue
 * NOTE: Response format is non-standard: { status, message, access_token }
 *       NOT the usual { status, data }
 */

const ISSUE_ENDPOINT = '/api/access/issue';

let mediaId;
let liveId;

test.beforeAll(async ({ playwright }) => {
    const ctx = await playwright.request.newContext({
        baseURL: process.env.BASE_URL,
        extraHTTPHeaders: { 'X-API-Token': process.env.API_TOKEN },
    });
    const [mediaRes, liveRes] = await Promise.all([
        ctx.get('/api/media?limit=1'),
        ctx.get('/api/live-stream?limit=1'),
    ]);
    const mediaBody = await mediaRes.json();
    const liveBody = await liveRes.json();
    mediaId = mediaBody.data?.[0]?._id;
    liveId = liveBody.data?.[0]?._id;
    await ctx.dispose();
});

test.describe('Access Token — Contract', () => {
    let apiClient;

    test.beforeEach(async ({ request, baseURL }) => {
        apiClient = new ApiClient(request, baseURL);
    });

    test('TC_CON_AT_001 POST /api/access/issue media happy path schema', async () => {
        if (!mediaId) test.skip(true, 'No media available for token issuance');

        const res = await apiClient.post(`${ISSUE_ENDPOINT}?id=${mediaId}&type=media`, {});
        expect(res.ok, `Issue failed: ${res.status} ${JSON.stringify(res.body)}`).toBeTruthy();

        const parsed = accessTokenIssuedSchema.safeParse(res.body);
        expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    });

    test('TC_CON_AT_002 POST /api/access/issue live happy path schema', async () => {
        if (!liveId) test.skip(true, 'No live stream available for token issuance');

        const res = await apiClient.post(`${ISSUE_ENDPOINT}?id=${liveId}&type=live`, {});
        expect(res.ok, `Issue failed: ${res.status} ${JSON.stringify(res.body)}`).toBeTruthy();

        const parsed = accessTokenIssuedSchema.safeParse(res.body);
        expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    });

    test('TC_CON_AT_003 POST /api/access/issue missing type error schema @negative', async () => {
        if (!mediaId) test.skip(true, 'No media available');

        const res = await apiClient.post(`${ISSUE_ENDPOINT}?id=${mediaId}`, {});
        expect(res.status).toBe(400);

        const parsed = errorResponseSchema.safeParse(res.body);
        expect(parsed.success, `Error schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    });

    test('TC_CON_AT_004 POST /api/access/issue invalid type error schema @negative', async () => {
        if (!mediaId) test.skip(true, 'No media available');

        const res = await apiClient.post(`${ISSUE_ENDPOINT}?id=${mediaId}&type=podcast`, {});
        expect(res.status).toBe(400);

        const parsed = errorResponseSchema.safeParse(res.body);
        expect(parsed.success, `Error schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    });

    test('TC_CON_AT_005 Tokens are unique per request', async () => {
        if (!mediaId) test.skip(true, 'No media available');

        const [res1, res2] = await Promise.all([
            apiClient.post(`${ISSUE_ENDPOINT}?id=${mediaId}&type=media`, {}),
            apiClient.post(`${ISSUE_ENDPOINT}?id=${mediaId}&type=media`, {}),
        ]);
        expect(res1.ok && res2.ok).toBeTruthy();
        expect(res1.body.access_token).not.toBe(res2.body.access_token);

        accessTokenIssuedSchema.parse(res1.body);
        accessTokenIssuedSchema.parse(res2.body);
    });
});
