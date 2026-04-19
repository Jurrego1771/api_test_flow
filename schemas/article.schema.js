const { z } = require("zod");

const articleSchema = z.object({
  _id: z.string(),
  title: z.string(),
  synopsis: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  slug: z.string().optional(),
  is_published: z.boolean().optional(),
  date_created: z.string().optional(),
  author: z.union([
    z.string(),
    z.object({
      _id: z.string(),
      name: z.string()
    }),
    z.array(z.any())
  ]).optional().nullable(),
  categories: z.array(z.string()).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  keywords: z.array(z.string()).optional().nullable(),
  medias: z.array(z.any()).optional().nullable(),
  images: z.array(z.any()).optional().nullable(),
});

const createArticleResponseSchema = z.object({
  status: z.string(),
  data: articleSchema,
});

const listArticleResponseSchema = z.object({
  status: z.string(),
  data: z.array(articleSchema),
});

module.exports = {
  articleSchema,
  createArticleResponseSchema,
  listArticleResponseSchema,
};
