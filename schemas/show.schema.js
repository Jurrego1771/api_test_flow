/**
 * Esquemas Zod para validación de respuestas del módulo Show
 * Nota: La API retorna el objeto Show directamente, no envuelto en {status, data}
 */

const { z } = require("zod");

// -- Schema base para un Show --
const showSchema = z
  .object({
    _id: z.string(),
    account: z.string().optional(),
    title: z.string(),
    version: z.string().optional(),
    description: z.string().optional(),
    type: z.enum(["tvshow", "radioshow", "podcast", "movie", "mixed"]),
    genres: z.array(z.string()).optional(),
    iab_genres: z.array(z.string()).optional(),
    is_published: z.union([z.boolean(), z.string()]).optional(),
    first_emision: z.string().optional(),
    next_episode: z.union([z.number(), z.string()]).optional(),
    status: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    distributors: z.array(z.unknown()).optional(),
    producers: z.array(z.unknown()).optional(),
    featuring: z.array(z.unknown()).optional(),
    hosts: z.array(z.unknown()).optional(),
    ads: z.array(z.unknown()).optional(),
    ad_map_url: z.string().optional(),
    rss: z.object({}).passthrough().optional(),
    gracenote: z.object({}).passthrough().optional(),
  })
  .passthrough();

module.exports = {
  showSchema,
};
