const { z } = require('zod');

const categorySchema = z.object({
    _id: z.string(),
    name: z.string(),
    account: z.string().optional(),
    visible: z.boolean().optional(),
    track: z.boolean().optional(),
    date_created: z.string().optional(),
    slug: z.string().optional(),
    description: z.string().optional().nullable(),
    image_url: z.string().optional().nullable(),
    parent: z.string().optional().nullable(),
}).passthrough();

const createCategoryResponseSchema = z.object({
    status: z.literal('OK'),
    data: categorySchema,
});

const getCategoryResponseSchema = z.object({
    status: z.literal('OK'),
    data: categorySchema,
});

const listCategoryResponseSchema = z.object({
    status: z.literal('OK'),
    data: z.array(categorySchema),
});

module.exports = {
    categorySchema,
    createCategoryResponseSchema,
    getCategoryResponseSchema,
    listCategoryResponseSchema,
};
