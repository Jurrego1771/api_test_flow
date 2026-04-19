const { z } = require('zod');

// Show API returns object directly, NOT wrapped in {status, data}
const showSchema = z.object({
    _id: z.string(),
    title: z.string(),
    type: z.enum(['tvshow', 'radioshow', 'podcast', 'movie', 'mixed']),
    account: z.string(),
    is_published: z.boolean(),
    status: z.enum(['OK', 'DELETE']).optional(),
    date_created: z.string(),
    date_updated: z.string(),
    genres: z.array(z.string()),
    iab_genres: z.array(z.string()),
    distributors: z.array(z.unknown()),
    producers: z.array(z.unknown()),
    featuring: z.array(z.unknown()),
    hosts: z.array(z.unknown()),
    slug: z.string().optional(),
    description: z.string().optional().nullable(),
    short_title: z.string().optional().nullable(),
    rating: z.number().optional(),
    next_episode: z.number().optional(),
    free_episodes_count: z.number().optional(),
    is_vertical: z.boolean().optional(),
}).passthrough();

module.exports = { showSchema };
