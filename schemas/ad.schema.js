const { z } = require('zod');

const adSchema = z.object({
    _id: z.string(),
    name: z.string(),
    account: z.string().optional(),
    is_enabled: z.boolean(),
    type: z.string(),
    date_created: z.string(),
    tags: z.array(z.string()).optional(),
    preroll_skip_at: z.number().optional(),
    referers: z.array(z.string()).optional(),
    min_media_time_length: z.number().optional(),
}).passthrough();

const createAdResponseSchema = z.object({
    status: z.literal('OK'),
    data: adSchema,
});

const getAdResponseSchema = z.object({
    status: z.literal('OK'),
    data: adSchema,
});

const listAdResponseSchema = z.object({
    status: z.literal('OK'),
    data: z.array(adSchema),
});

module.exports = {
    adSchema,
    createAdResponseSchema,
    getAdResponseSchema,
    listAdResponseSchema,
};
