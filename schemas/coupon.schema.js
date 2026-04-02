const { z } = require("zod");

const discountTypeEnum = z.enum(["percent", "fixed", "free"]).or(z.string());

const couponSchema = z
  .object({
    _id: z.string(),
    code: z.string(),
    group: z.string(),
    date_created: z.string().optional(),
    custom_code: z.string().optional(),
    is_reusable: z.boolean().optional(),
    discount_type: discountTypeEnum.optional(),
    max_use: z.number().optional(),
    customer_max_use: z.number().optional(),
    detail: z.string().optional(),
    quantity: z.number().optional(),
    percent: z.number().optional(),
    payment_required: z.boolean().optional(),
    times_used: z.number().optional(),
    active: z.boolean().optional(),
  })
  .passthrough();

const createCouponResponseSchema = z.object({
  status: z.literal("OK"),
  data: z.array(couponSchema),
});

const getCouponResponseSchema = z.object({
  status: z.literal("OK"),
  data: couponSchema,
});

const listCouponResponseSchema = z.object({
  status: z.literal("OK"),
  data: z.array(couponSchema),
});

module.exports = {
  couponSchema,
  createCouponResponseSchema,
  getCouponResponseSchema,
  listCouponResponseSchema,
};
