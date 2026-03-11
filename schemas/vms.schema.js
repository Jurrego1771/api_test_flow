const { z } = require("zod");

// --- VMS Job Schema ---

// Schema para un job individual del VMS
const vmsJobSchema = z
  .object({
    job_type: z
      .enum([
        "Transcode",
        "MediaInit",
        "ExtractMetadata",
        "GenerateThumbnail",
        "GenerateSubtitle",
      ])
      .optional(),
    job_id: z.string().uuid().optional(),
    account_id: z.string().optional(),
    media_id: z.string().optional(),
    zone: z.string().optional(),
    status: z
      .enum(["STARTED", "DONE", "ERROR", "PENDING", "IN_PROGRESS"])
      .optional(),
    progress: z.number().optional(),
    start_time: z.string().datetime().optional(),
    end_time: z.string().datetime().optional(),
    total_time: z.string().optional(),
    account_name: z.string().optional(),
    clip_duration: z.string().optional(),
  })
  .passthrough();

// Schema para la respuesta completa del endpoint VMS
const vmsMediaSearchResponseSchema = z
  .object({
    jobs: z.array(vmsJobSchema).optional(),
    apiVersion: z.string().optional(),
  })
  .passthrough();

module.exports = {
  vmsJobSchema,
  vmsMediaSearchResponseSchema,
};
