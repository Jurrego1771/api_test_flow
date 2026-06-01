const { test, expect } = require('@playwright/test');
const { ApiClient } = require('../../helpers');
const { z } = require('zod');

/**
 * Contract tests for GET /api/access/check/* endpoints
 * These endpoints validate issued access tokens for playback authorization.
 * Response shape: { status: 'OK'|'ERROR', message: string } (no data wrapper)
 */

const CHECK_BASE = '/api/access/check';
const ISSUE_ENDPOINT = '/api/access/issue';

// Real response: { status: string } — message is optional (absent on EXPIRED)
const accessCheckResponseSchema = z.object({
    status: z.string().min(1),
    message: z.string().optional(),
}).passthrough();

let apiClient;
let mediaId;
let liveId;
let mediaToken;
let liveToken;

test.beforeAll(async ({ playwright }) => {
    const ctx = await playwright.request.newContext({
        baseURL: process.env.BASE_URL,
        extraHTTPHeaders: { 'X-API-Token': process.env.API_TOKEN },
    });

    const [mediaRes, liveRes] = await Promise.all([
        ctx.get('/api/media?limit=1&is_published=true'),
        ctx.get('/api/live-stream?limit=1'),
    ]);
    const mediaBody = await mediaRes.json();
    const liveBody = await liveRes.json();
    mediaId = mediaBody.data?.[0]?._id ?? null;
    liveId = liveBody.data?.[0]?._id ?? null;

    // Issue tokens for use in check tests
    if (mediaId) {
        const tokenRes = await ctx.post(`${process.env.BASE_URL}${ISSUE_ENDPOINT}?id=${mediaId}&type=media`);
        if (tokenRes.ok()) {
            const body = await tokenRes.json();
            mediaToken = body.access_token;
        }
    }
    if (liveId) {
        const tokenRes = await ctx.post(`${process.env.BASE_URL}${ISSUE_ENDPOINT}?id=${liveId}&type=live`);
        if (tokenRes.ok()) {
            const body = await tokenRes.json();
            liveToken = body.access_token;
        }
    }

    await ctx.dispose();
});

test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
});

test.describe('Access Check — Contract', () => {

    test('TC_CON_ACK_001 GET /api/access/check/play schema — with valid token', async () => {
        if (!mediaToken) { test.skip(true, 'No media token available'); return; }

        const res = await apiClient.get(`${CHECK_BASE}/play?token=${mediaToken}&id=${mediaId}&type=media`);
        // Response must always be JSON with status field — never 500
        expect(res.status).not.toBe(500);
        expect(res.body).toHaveProperty('status');
        // message is optional — EXPIRED responses omit it
        expect(['OK', 'ERROR', 'EXPIRED']).toContain(res.body.status);

        const parsed = accessCheckResponseSchema.safeParse(res.body);
        expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    });

    test('TC_CON_ACK_002 GET /api/access/check/start schema — with valid token', async () => {
        if (!mediaToken) { test.skip(true, 'No media token available'); return; }

        const res = await apiClient.get(`${CHECK_BASE}/start?token=${mediaToken}&id=${mediaId}&type=media`);
        expect(res.status).not.toBe(500);
        expect(res.body).toHaveProperty('status');
        expect(['OK', 'ERROR', 'EXPIRED']).toContain(res.body.status);

        const parsed = accessCheckResponseSchema.safeParse(res.body);
        expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    });

    test('TC_CON_ACK_003 GET /api/access/check/play schema — no token @negative', async () => {
        if (!mediaId) { test.skip(true, 'No media available'); return; }

        const res = await apiClient.get(`${CHECK_BASE}/play?id=${mediaId}&type=media`);
        expect(res.status).not.toBe(500);
        // Should return error shape
        expect(res.body).toHaveProperty('status');
        if (res.body.status === 'ERROR') {
            expect(res.body).toHaveProperty('message');
        }
    });

    test('TC_CON_ACK_004 GET /api/access/check/play schema — invalid token @negative', async () => {
        if (!mediaId) { test.skip(true, 'No media available'); return; }

        const res = await apiClient.get(`${CHECK_BASE}/play?token=invalid_token_xyz&id=${mediaId}&type=media`);
        expect(res.status).not.toBe(500);
        expect(res.body).toHaveProperty('status');
        // Invalid token → ERROR or EXPIRED (API may classify differently)
        expect(['ERROR', 'EXPIRED']).toContain(res.body.status);

        const parsed = accessCheckResponseSchema.safeParse(res.body);
        expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    });

    test('TC_CON_ACK_005 GET /api/access/check/play schema — live token', async () => {
        if (!liveToken) { test.skip(true, 'No live token available'); return; }

        const res = await apiClient.get(`${CHECK_BASE}/play?token=${liveToken}&id=${liveId}&type=live`);
        expect(res.status).not.toBe(500);
        expect(res.body).toHaveProperty('status');
        expect(['OK', 'ERROR', 'EXPIRED']).toContain(res.body.status);

        const parsed = accessCheckResponseSchema.safeParse(res.body);
        expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    });
});
