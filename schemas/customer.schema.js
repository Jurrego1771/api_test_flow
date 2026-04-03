/**
 * Zod schema for Customer API responses
 * Ref: .agents/skills/mediastream-api/references/customer.md
 */

const { z } = require("zod");

const customerSchema = z
  .object({
    _id: z.string(),
    correlative_id: z.number().optional(),
    cid: z.number().optional(),
    email: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    payment_count: z.number().optional(),
    purchase_count: z.number().optional(),
    has_active_purchase: z.boolean().optional(),
    date_created: z.string().optional(),
  })
  .passthrough();

const customerListResponseSchema = z.object({
  status: z.literal("OK"),
  data: z.array(customerSchema),
});

module.exports = { customerSchema, customerListResponseSchema };
