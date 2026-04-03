/**
 * Zod schema for Show Episode API responses
 * Ref: .agents/skills/mediastream-api/references/show-season-episode.md
 *
 * NOTE: Episode is returned at root level (no { status, data } wrapper)
 */

const { z } = require("zod");

const episodeContentSchema = z
  .object({
    _id: z.string().optional(),
    content_type: z.string(),
    type: z.string().optional(),
    value: z.union([z.string(), z.object({}).passthrough()]),
  })
  .passthrough();

const episodeSchema = z
  .object({
    _id: z.string(),
    title: z.string(),
    show: z.string().optional(),
    season: z.string().optional(),
    order: z.number().optional(),
    description: z.string().optional(),
    first_emision: z.string().optional(),
    content: z.array(episodeContentSchema).optional(),
    featuring: z.array(z.unknown()).optional(),
    hosts: z.array(z.unknown()).optional(),
    images: z.array(z.unknown()).optional(),
    account: z.string().optional(),
    version: z.string().optional(),
  })
  .passthrough();

module.exports = { episodeSchema, episodeContentSchema };
