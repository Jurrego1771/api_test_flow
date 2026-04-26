const { z } = require("zod");

const drmSchema = z
  .object({
    enabled: z.boolean().optional(),
    allow: z.boolean().optional(),
    allow_incompatible_devices: z.boolean().optional(),
  })
  .passthrough();

const categorySchema = z
  .object({
    _id: z.string(),
    name: z.string(),
    _name: z.string().optional(),
    slug: z.string().optional(),
    description: z.string().optional(),
    parent: z
      .union([
        z.string(),
        z
          .object({
            _id: z.string(),
            name: z.string().optional(),
            date_created: z.string().optional(),
          })
          .passthrough(),
      ])
      .nullable()
      .optional(),
    track: z.boolean().optional(),
    visible: z.boolean().optional(),
    drm: drmSchema.optional(),
    image_url: z.string().nullable().optional(),
    app_feed: z.any().optional(),
    custom: z.any().optional(),
    filter_categories: z.array(z.string()).optional(),
    date_created: z.string().optional(),
    account: z.string().optional(),
    __v: z.number().optional(),
    // con with_count=true
    count_children: z.number().optional(),
    has_children: z.boolean().optional(),
  })
  .passthrough();

const createCategoryResponseSchema = z.object({
  status: z.literal("OK"),
  data: categorySchema,
});

const getCategoryResponseSchema = z.object({
  status: z.literal("OK"),
  data: categorySchema,
});

const listCategoryResponseSchema = z.object({
  status: z.literal("OK"),
  data: z.array(categorySchema),
});

module.exports = {
  drmSchema,
  categorySchema,
  createCategoryResponseSchema,
  getCategoryResponseSchema,
  listCategoryResponseSchema,
};
