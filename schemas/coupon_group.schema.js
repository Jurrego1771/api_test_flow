/**
 * Zod schema for Coupon Group API responses
 * Ref: .agents/skills/mediastream-api/references/coupon.md
 */

const { z } = require("zod");

const couponGroupSchema = z
  .object({
    _id: z.string(),
    name: z.string(),
    account: z.string().optional(),
    coupon_used_total: z.number().optional(),
    coupon_total: z.number().optional(),
    coupon_valid_total: z.number().optional(),
    valid_from: z.string().nullable().optional(),
    valid_to: z.string().nullable().optional(),
    date_created: z.string().optional(),
    gateway: z.string().nullable().optional(),
  })
  .passthrough();

const couponGroupListResponseSchema = z.object({
  status: z.literal("OK"),
  data: z.array(couponGroupSchema),
});

const couponGroupCreateResponseSchema = z.object({
  status: z.literal("OK"),
  data: couponGroupSchema,
});

module.exports = {
  couponGroupSchema,
  couponGroupListResponseSchema,
  couponGroupCreateResponseSchema,
};
