const { z } = require("zod");

const adTypeEnum = z.enum([
  "vast",
  "vmap",
  "googleima",
  "local",
  "ad-insertion",
  "ad-insertion-google",
  "adswizz",
  "ad-prebid",
]);

const adScheduleSchema = z
  .object({
    enabled: z.boolean().optional(),
    days: z.array(z.number()).optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  })
  .passthrough();

const adAdswizzSchema = z
  .object({
    enabled: z.boolean().optional(),
    zone_id: z.string().optional(),
    base_url: z.string().optional(),
  })
  .passthrough();

const adInsertionSchema = z
  .object({
    enabled: z.boolean().optional(),
    url: z.string().optional(),
  })
  .passthrough();

const adSchema = z
  .object({
    _id: z.string(),
    name: z.string(),
    type: adTypeEnum,
    is_enabled: z.boolean().optional(),
    preroll_skip_at: z.number().optional(),
    min_media_time_length: z.number().optional(),
    schedule: adScheduleSchema.optional(),
    adswizz: adAdswizzSchema.optional(),
    insertion: z.union([adInsertionSchema, z.null()]).optional(),
    categories: z.union([z.array(z.any()), z.null()]).optional(),
    tags: z.union([z.array(z.string()), z.null()]).optional(),
    referers: z.union([z.array(z.any()), z.null()]).optional(),
    date_created: z.string().optional(),
    account: z.string().optional(),
  })
  .passthrough();

const createAdResponseSchema = z.object({
  status: z.literal("OK"),
  data: z.union([adSchema, z.array(adSchema)]),
});

const getAdResponseSchema = z.object({
  status: z.literal("OK"),
  data: adSchema,
});

const listAdResponseSchema = z.object({
  status: z.literal("OK"),
  data: z.array(adSchema),
});

module.exports = {
  adTypeEnum,
  adSchema,
  createAdResponseSchema,
  getAdResponseSchema,
  listAdResponseSchema,
};
