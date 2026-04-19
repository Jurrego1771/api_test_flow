/**
 * Zod schema for Show Season API responses
 * Ref: .agents/skills/mediastream-api/references/show-season-episode.md
 */

const { z } = require("zod");

const seasonSchema = z
  .object({
    _id: z.string(),
    title: z.string(),
    show: z.string(),
    order: z.number().optional(),
    description: z.string().optional(),
    first_emision: z.string().optional(),
    featuring: z.array(z.unknown()).optional(),
    hosts: z.array(z.unknown()).optional(),
    episodes: z.array(z.unknown()).optional(),
    images: z.array(z.unknown()).optional(),
    account: z.string().optional(),
    version: z.string().optional(),
  })
  .passthrough();

module.exports = { seasonSchema };
