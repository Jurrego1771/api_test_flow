/**
 * Zod schemas para el endpoint schedule-job del Live Stream.
 * Ref: /api/live-stream/:id/schedule-job
 */
const { z } = require("zod");

// Un job individual puede tener distintas formas según la plataforma;
// usamos passthrough() para no romper en campos inesperados.
const scheduleJobSchema = z
  .object({
    _id:      z.string().optional(),
    name:     z.string().optional(),
    type:     z.enum(["onetime", "recurring"]).optional(),
    date_start: z.string().optional(),
    date_end:   z.string().optional(),
    date_start_hour: z.string().optional(),
    date_start_minute: z.string().optional(),
    date_end_hour: z.string().optional(),
    date_end_minute: z.string().optional(),
    tz_offset:  z.number().optional(),
    status:     z.string().optional(),
  })
  .passthrough();

// Respuesta al obtener el schedule de un live-stream
const getScheduleResponseSchema = z.object({
  status: z.literal("OK"),
  data:   z.union([
    scheduleJobSchema,
    z.array(scheduleJobSchema),
    z.null(),
  ]),
});

// Respuesta al crear / actualizar un schedule-job
const createScheduleResponseSchema = z.object({
  status: z.literal("OK"),
  data:   scheduleJobSchema,
});

module.exports = {
  scheduleJobSchema,
  getScheduleResponseSchema,
  createScheduleResponseSchema,
};
