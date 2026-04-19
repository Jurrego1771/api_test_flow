const { z } = require("zod");

const availableDateSchema = z.object({
    date: z.string().optional(),
    short_date: z.string().optional(),
    hour: z.number().optional(),
    offset: z.number().optional(),
}).passthrough();

const previewSchema = z.object({
    mp4: z.string().optional(),
    webm: z.string().optional(),
    position: z.number().optional(),
    duration: z.number().optional(),
}).passthrough();

const showInfoSchema = z.object({
    showId: z.string().nullable().optional(),
    seasonId: z.string().nullable().optional(),
    episodeId: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    title: z.string().optional(),
    first_emision: z.string().optional(),
    hosts: z.array(z.string()).optional(),
    featuring: z.array(z.string()).optional(),
}).passthrough();

const zoomSchema = z.object({
    recorded: z.boolean().optional(),
    meet_id: z.string().optional(),
}).passthrough();

const companionMediaSchema = z.object({
    is_enabled: z.boolean().optional(),
    media: z.array(z.union([z.string(), z.any()])).optional(),
}).passthrough();

const editorSchema = z.object({
    status: z.enum(["PENDING", "SUCCESS", "ERROR"]).optional(),
    action: z.enum(["REPLACE", "CREATE"]).optional(),
    original_media: z.string().optional(),
}).passthrough();

const codecSchema = z.object({
    name: z.string().optional(),
    bitrate: z.number().optional(),
    codec: z.string().optional(),
}).passthrough();

const resolutionSchema = z.object({
    width: z.number().optional(),
    height: z.number().optional(),
}).passthrough();

const mediaMetaSchema = z.object({
    _id: z.string(),
    url: z.string().optional(),
    is_original: z.boolean().optional(),
    label: z.string().optional(),
    status: z.string().optional(),
    transcoding_progress: z.number().optional(),
    codec: z.object({ audio: codecSchema.optional(), video: codecSchema.optional() }).optional(),
    resolution: resolutionSchema.optional(),
    aspect: z.string().optional(),
    process_time: z.number().optional(),
    cdn_zone: z.string().optional(),
}).passthrough();

const thumbnailSchema = z.object({
    _id: z.string(),
    is_default: z.boolean().optional(),
    name: z.string().optional(),
    url: z.string().optional(),
    cdn_zone: z.string().optional(),
    size: z.string().optional(),
}).passthrough();

const trackSchema = z.object({
    _id: z.string().optional(),
    name: z.string().optional(),
    position: z.number().optional(),
    thumbnail: z.string().optional(),
}).passthrough();

const categorySchema = z.object({
    _id: z.string(),
    name: z.string().optional(),
    image_url: z.string().optional(),
    custom: z.record(z.unknown()).optional(),
}).passthrough();

const accessRulesSchema = z.object({
    closed_access: z.object({ enabled: z.boolean().optional(), allow: z.boolean().optional() }).optional(),
    drm: z.object({
        enabled: z.boolean().optional(),
        allow: z.boolean().optional(),
        allow_incompatible_devices: z.boolean().optional(),
    }).optional(),
    geo: z.object({
        enabled: z.boolean().optional(),
        allow: z.boolean().optional(),
        countries: z.array(z.string()).optional(),
    }).optional(),
    cellular: z.object({ enabled: z.boolean().optional(), allow: z.boolean().optional() }).optional(),
    devices: z.object({
        deny_mobile: z.boolean().optional(),
        deny_desktop: z.boolean().optional(),
        deny_tv: z.boolean().optional(),
    }).optional(),
}).passthrough();

const s3BackupSchema = z.object({
    path: z.string().optional(),
    created: z.boolean().optional(),
}).passthrough();

const mediaSchema = z.object({
    _id: z.string(),
    title: z.string().optional(),
    slug: z.string().optional(),
    description: z.string().optional(),
    status: z.string().optional(),
    is_published: z.boolean().optional(),
    is_pre_published: z.boolean().optional(),
    is_initialized: z.boolean().optional(),
    duration: z.number().optional(),
    views: z.number().optional(),
    views_stream_metrics: z.number().optional(),
    tags: z.array(z.string()).nullable().optional(),
    uuid: z.string().optional(),
    categories: z.array(categorySchema).optional(),
    meta: z.array(z.string()).optional(),
    thumbnails: z.array(thumbnailSchema).optional(),
    thumbDefault: z.string().optional(),
    max_quality: z.string().optional(),
    tracks: z.array(trackSchema).optional(),
    available_from: availableDateSchema.optional(),
    available_until: availableDateSchema.optional(),
    date_created: z.union([z.string(), z.date()]).optional(),
    date_recorded: z.union([z.string(), z.date()]).optional(),
    date_updated: z.union([z.string(), z.date()]).optional(),
    account: z.union([z.string(), z.object({}).passthrough()]).optional(),
    custom: z.record(z.string(), z.unknown()).optional(),
    access_rules: accessRulesSchema.optional(),
    access_restrictions: z.object({ enabled: z.boolean().optional(), rule: z.string().optional() }).optional(),
    playlist: z.array(z.any()).optional(),
    editor: editorSchema.optional(),
    preview: previewSchema.optional(),
    type: z.enum(["audio", "video"]).optional(),
    url: z.string().optional(),
    s3_backup: s3BackupSchema.optional(),
    show_info: showInfoSchema.optional(),
    zoom: zoomSchema.optional(),
    media_ready_notified: z.boolean().optional(),
    companion_media: companionMediaSchema.optional(),
    next_episode: z.number().optional(),
    assisted_by_assistant: z.boolean().optional(),
    assisted_by_ai: z.boolean().optional(),
}).passthrough();

const getMediaListResponseSchema = z.object({
    status: z.literal("OK"),
    data: z.union([z.array(mediaSchema), z.number()]),
});

const createMediaResponseSchema = z.object({
    status: z.literal("OK"),
    data: mediaSchema,
});

const getMediaResponseSchema = z.object({
    status: z.literal("OK"),
    data: mediaSchema,
});

const listMediaResponseSchema = z.object({
    status: z.literal("OK"),
    data: z.array(mediaSchema),
});

module.exports = {
    mediaSchema,
    getMediaListResponseSchema,
    createMediaResponseSchema,
    getMediaResponseSchema,
    listMediaResponseSchema,
    availableDateSchema,
    previewSchema,
    showInfoSchema,
    zoomSchema,
    companionMediaSchema,
    editorSchema,
    codecSchema,
    resolutionSchema,
    mediaMetaSchema,
    thumbnailSchema,
    trackSchema,
    categorySchema,
    accessRulesSchema,
    s3BackupSchema,
};
