const { z } = require('zod');

const accessRuleItemSchema = z.object({
    context: z.string(),
    access: z.boolean(),
    type: z.string().optional(),
    exclusive: z.boolean().optional(),
    allow_unknown: z.boolean().optional(),
    rules: z.array(z.string()).optional(),
}).passthrough();

const accessRestrictionSchema = z.object({
    _id: z.string(),
    name: z.string(),
    account: z.string().optional(),
    is_default: z.boolean().optional(),
    date_created: z.string(),
    closed_access: z.object({
        enabled: z.boolean(),
        allow: z.boolean(),
    }),
    aes: z.object({
        enabled: z.boolean(),
        allow: z.boolean(),
    }),
    drm: z.object({
        enabled: z.boolean(),
        allow: z.boolean(),
        allow_incompatible: z.boolean().optional(),
    }),
    access_rules: z.array(accessRuleItemSchema).optional(),
    apply_to_sub_categories: z.boolean().optional(),
    categories: z.array(z.string()).nullable().optional(),
    default_type: z.string().optional().nullable(),
}).passthrough();

const createAccessRestrictionResponseSchema = z.object({
    status: z.literal('OK'),
    data: accessRestrictionSchema,
});

const getAccessRestrictionResponseSchema = z.object({
    status: z.literal('OK'),
    data: accessRestrictionSchema,
});

const listAccessRestrictionResponseSchema = z.object({
    status: z.literal('OK'),
    data: z.array(accessRestrictionSchema),
});

module.exports = {
    accessRestrictionSchema,
    createAccessRestrictionResponseSchema,
    getAccessRestrictionResponseSchema,
    listAccessRestrictionResponseSchema,
};
