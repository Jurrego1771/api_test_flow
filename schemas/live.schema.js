const { z } = require("zod");

const liveStreamSchema = z.object({
  _id: z.string(),
  title: z.string().optional(),
  name: z.string().optional(),
  type: z.string().optional(),
  online: z.boolean().optional(),
  is_published: z.union([z.boolean(), z.string()]).optional(),
  favorite: z.boolean().optional(),
  status: z.string().optional(),
  date_created: z.string().optional(),
  created_at: z.string().optional(),
}).passthrough();

const createLiveStreamResponseSchema = z.object({
  status: z.literal("OK"),
  data: liveStreamSchema,
});

const listLiveStreamResponseSchema = z.object({
  status: z.literal("OK"),
  data: z.array(liveStreamSchema),
});

module.exports = {
  createLiveStreamResponseSchema,
  listLiveStreamResponseSchema,
  liveStreamSchema,
};
