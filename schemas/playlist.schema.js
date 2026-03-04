const { z } = require('zod');

// Esquema base de Playlist (simplificado para validación de respuesta)
const playlistSchema = z.object({
    _id: z.string(),
    name: z.string(),
    description: z.string().optional().nullable(),
    type: z.enum(['manual', 'smart', 'series', 'playout']),
    featured: z.boolean().optional(),
    account: z.string().optional(),
    date_created: z.string().optional(),
    medias: z.array(z.string()).optional(), // En algunas respuestas devuelve array de IDs
    // Otros campos pueden ser añadidos según necesidad estricta
});

const createPlaylistResponseSchema = z.object({
    status: z.literal('OK'),
    data: playlistSchema
});

const getPlaylistResponseSchema = z.object({
    status: z.literal('OK'),
    data: playlistSchema
});

const listPlaylistResponseSchema = z.object({
    status: z.literal('OK'),
    data: z.array(playlistSchema)
});

module.exports = {
    createPlaylistResponseSchema,
    getPlaylistResponseSchema,
    listPlaylistResponseSchema
};
