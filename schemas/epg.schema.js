const { z } = require('zod');

const fieldMappingFrontendSchema = z.object({
    fieldType: z.string(),
    fieldName: z.string(),
    jsonPath: z.string(),
    autoMapped: z.boolean().optional(),
    dataType: z.string().optional(),
    dateFormat: z.string().optional(),
    confidence: z.number().min(0).max(100).optional(),
}).passthrough();

// buildEpgMaskResponse shape: { id, name, epg_url, is_analyzed, enabled, programs_path, programs_path_options, timezone, field_mappings }
const epgInputDataSchema = z.object({
    id: z.union([z.string(), z.unknown()]),
    name: z.string(),
    epg_url: z.string().optional(),
    enabled: z.boolean(),
    timezone: z.number().optional(),
    is_analyzed: z.boolean().optional(),
    programs_path: z.string().optional(),
    programs_path_options: z.array(z.unknown()).optional(),
    field_mappings: z.array(fieldMappingFrontendSchema).optional(),
}).passthrough();

const createEpgInputResponseSchema = z.object({
    status: z.literal('OK'),
    data: epgInputDataSchema,
});

const epgSyncResponseSchema = z.object({
    status: z.literal('OK'),
    data: z.literal('EPG_SYNCED'),
});

module.exports = {
    createEpgInputResponseSchema,
    epgSyncResponseSchema,
};
