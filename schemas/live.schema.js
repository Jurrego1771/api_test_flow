const { z } = require('zod');

const liveStreamSchema = z.object({
    _id: z.string(),
    name: z.string(),
    account: z.string(),
    online: z.boolean(),
    dvr: z.boolean(),
    recording: z.boolean(),
    closed_access: z.boolean().optional(),
    type: z.string(),
    date_created: z.string(),
    slug: z.string().optional(),
    stream_id: z.string().optional(),
    views: z.number().optional(),
    priority: z.number().optional(),
    is_adswizz: z.boolean().optional(),
    preferred_protocol: z.string().optional(),
    nowplaying: z.boolean().optional(),
    multiple_clips: z.boolean().optional(),
}).passthrough();

const createLiveStreamResponseSchema = z.object({
    status: z.literal('OK'),
    data: liveStreamSchema,
});

const getLiveStreamResponseSchema = z.object({
    status: z.literal('OK'),
    data: liveStreamSchema,
});

const listLiveStreamResponseSchema = z.object({
    status: z.literal('OK'),
    data: z.array(liveStreamSchema),
});

module.exports = {
    liveStreamSchema,
    createLiveStreamResponseSchema,
    getLiveStreamResponseSchema,
    listLiveStreamResponseSchema,
};
