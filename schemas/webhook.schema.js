const { z } = require("zod");

const webhookSchema = z
  .object({
    _id: z.string(),
    account: z.string(),
    name: z.string().optional(),
    url: z.string().optional(),
    enabled: z.boolean(),
    notify_on: z.array(z.string()),
    secret: z.string().nullable().optional(),
    date_created: z.string().optional(),
  })
  .passthrough();

const webhookListResponseSchema = z.object({
  status: z.literal("OK"),
  data: z.array(webhookSchema.passthrough()),
});

const webhookLogObjSchema = z
  .object({
    model: z.string().optional(),
    id: z.string().optional(),
    jobId: z.string().optional(),
  })
  .passthrough();

const webhookLogSchema = z
  .object({
    _id: z.string(),
    type: z.literal("request"),
    event: z.string(),
    obj: webhookLogObjSchema.optional(),
    url: z.string().optional(),
    is_success: z.boolean(),
    date_created: z.string(),
    request: z
      .object({ payload: z.any().optional() })
      .passthrough()
      .optional(),
    response: z
      .object({
        code: z.number().optional(),
        body: z.string().optional(),
        time: z.number().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const webhookHistoryResponseSchema = z.object({
  status: z.literal("OK"),
  data: z.object({
    logs: z.array(webhookLogSchema),
    has_more: z.boolean(),
  }),
});

module.exports = {
  webhookSchema,
  webhookListResponseSchema,
  webhookLogSchema,
  webhookHistoryResponseSchema,
};
