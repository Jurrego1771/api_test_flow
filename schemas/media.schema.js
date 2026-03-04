const { z } = require('zod');

const mediaSchema = z.object({
    _id: z.string(),
    title: z.string(),
    status: z.string().optional(),
    is_published: z.union([z.boolean(), z.string()]).optional(),
    created_at: z.string().optional(),
    date_created: z.string().optional(),
}).passthrough();

const createMediaResponseSchema = z.object({
    status: z.literal('OK'),
    data: mediaSchema
});

module.exports = { createMediaResponseSchema };
