const { z } = require('zod');

const accessRuleItemSchema = z.object({
    _id: z.string().optional(),
    context: z.string(),
    access: z.boolean().optional(),
    type: z.string().optional(),
    exclusive: z.boolean().optional(),
    client_validation: z.boolean().optional(),
    allow_unknown: z.boolean().optional(),
    rules: z.array(z.string()).optional(),
}).passthrough();

const accessRestrictionSchema = z.object({
    _id: z.string(),
    name: z.string(),
    account: z.string().optional(),
    is_default: z.boolean().optional(),
    default_type: z.string().optional().nullable(),
    categories: z.array(z.any()).nullable().optional(),
    apply_to_sub_categories: z.boolean().optional(),
    date_created: z.string().optional(),
    closed_access: z.object({ enabled: z.boolean(), allow: z.boolean() }).passthrough().optional(),
    aes: z.object({ enabled: z.boolean(), allow: z.boolean() }).passthrough().optional(),
    drm: z.object({
        enabled: z.boolean(),
        allow: z.boolean(),
        allow_incompatible: z.boolean().optional(),
    }).passthrough().optional(),
    access_rules: z.array(accessRuleItemSchema).optional(),
    __v: z.number().optional(),
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
    accessRuleItemSchema,
    accessRestrictionSchema,
    createAccessRestrictionResponseSchema,
    getAccessRestrictionResponseSchema,
    listAccessRestrictionResponseSchema,
};
