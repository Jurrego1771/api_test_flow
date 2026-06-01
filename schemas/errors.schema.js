const { z } = require('zod');

const errorResponseSchema = z.object({
    status: z.literal('ERROR'),
    data: z.union([z.string(), z.null(), z.record(z.unknown())]).optional(),
    message: z.string().optional(),
});

const notFoundResponseSchema = z.object({
    status: z.literal('ERROR'),
    data: z.literal('NOT_FOUND'),
});

const unauthorizedResponseSchema = z.object({
    status: z.literal('ERROR'),
    data: z.union([z.string(), z.null()]).optional(),
    message: z.string().optional(),
});

const validationErrorResponseSchema = z.object({
    status: z.literal('ERROR'),
    data: z.string(),
});

module.exports = {
    errorResponseSchema,
    notFoundResponseSchema,
    unauthorizedResponseSchema,
    validationErrorResponseSchema,
};
