/**
 * Zod schema for Access Token API responses
 * Ref: .agents/skills/mediastream-api/references/access-token.md
 *
 * NOTE: This endpoint uses a non-standard response format:
 *   { status, message, access_token }  (not the usual { status, data })
 */

const { z } = require("zod");

const accessTokenIssuedSchema = z.object({
  status: z.literal("OK"),
  message: z.literal("ACCESS_TOKEN_ISSUED"),
  access_token: z.string().min(1),
});

const accessTokenErrorSchema = z.object({
  status: z.literal("ERROR"),
  message: z.string().optional(),
  access_token: z.null().optional(),
});

module.exports = { accessTokenIssuedSchema, accessTokenErrorSchema };
