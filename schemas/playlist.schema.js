const { z } = require('zod');

const accessTokenSchema = z.object({
    name: z.string(),
    token: z.string(),
});

const mediaItemSchema = z.object({
    _id: z.string(),
    title: z.string().optional(),
    slug: z.string().optional(),
    duration: z.number().optional(),
}).passthrough();

const playlistSchema = z.object({
    _id: z.string(),
    name: z.string(),
    type: z.enum(['manual', 'smart', 'series', 'playout']),
    account: z.string(),
    date_created: z.string(),
    no_ad: z.boolean(),
    access_restrictions: z.object({
        enabled: z.boolean(),
        rule: z.string().nullable().optional(),
    }),
    access_rules: z.object({
        closed_access: z.object({ enabled: z.boolean(), allow: z.boolean() }).optional(),
        geo: z.object({ enabled: z.boolean(), allow: z.boolean(), countries: z.array(z.string()).optional() }).optional(),
        cellular: z.object({ enabled: z.boolean(), allow: z.boolean() }).optional(),
        devices: z.object({ deny_mobile: z.boolean(), deny_desktop: z.boolean().optional(), deny_tv: z.boolean() }).optional(),
        referer: z.object({ enabled: z.boolean(), allow: z.boolean(), referers: z.array(z.string()).optional() }).optional(),
        ip: z.object({ enabled: z.boolean(), allow: z.boolean(), ips: z.array(z.string()).optional() }).optional(),
    }),
    slug: z.string().optional(),
    description: z.string().optional().nullable(),
    featured: z.boolean().optional(),
    medias: z.array(z.string()).optional(),
    access_tokens: z.array(accessTokenSchema).optional(),
}).passthrough();

const createPlaylistResponseSchema = z.object({
    status: z.literal('OK'),
    data: playlistSchema,
});

const getPlaylistResponseSchema = z.object({
    status: z.literal('OK'),
    data: playlistSchema,
});

const listPlaylistResponseSchema = z.object({
    status: z.literal('OK'),
    data: z.array(playlistSchema),
});

const mediaListResponseSchema = z.object({
    status: z.literal('OK'),
    data: z.array(mediaItemSchema),
});

const accessTokenResponseSchema = z.object({
    status: z.literal('OK'),
    data: z.object({
        name: z.string(),
        token: z.string(),
        playlist_id: z.string().optional(),
        embed_url: z.string().optional(),
    }),
});

module.exports = {
    playlistSchema,
    createPlaylistResponseSchema,
    getPlaylistResponseSchema,
    listPlaylistResponseSchema,
    mediaListResponseSchema,
    accessTokenResponseSchema,
};
