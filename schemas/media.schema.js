const { z } = require('zod');

const mediaSchema = z.object({
    _id: z.string(),
    title: z.string(),
    account: z.union([z.string(), z.object({}).passthrough()]).optional(),
    type: z.enum(['audio', 'video']),
    status: z.enum(['OK', 'TRASH', 'DELETE']),
    is_published: z.boolean(),
    duration: z.number(),
    tags: z.array(z.string()).nullable().optional(),
    slug: z.string(),
    uuid: z.string().optional(),
    date_created: z.string(),
    date_updated: z.string().optional(),
}).passthrough();

const createMediaResponseSchema = z.object({
    status: z.literal('OK'),
    data: mediaSchema,
});

const getMediaResponseSchema = z.object({
    status: z.literal('OK'),
    data: mediaSchema,
});

const listMediaResponseSchema = z.object({
    status: z.literal('OK'),
    data: z.array(mediaSchema),
});

module.exports = {
    mediaSchema,
    createMediaResponseSchema,
    getMediaResponseSchema,
    listMediaResponseSchema,
};
