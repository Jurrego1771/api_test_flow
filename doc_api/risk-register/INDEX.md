# API Risk Register Index

**Scope:** API only
**Repository:** `api_test_flow`
**Date:** 2026-04-19
**Purpose:** Central entry point for module risk registers.

## Modules

1. [Auth](./auth.md) - token issuance, validation, and revocation.
2. [Access](./access.md) - playback and publish authorization.
3. [Media](./media.md) - core content CRUD, upload, metadata, subtitles, thumbnails, and processing.
4. [Ad](./ad.md) - ad delivery configuration, insertion, inheritance, and MediaTailor side effects.
5. [Category](./category.md) - taxonomy hierarchy, propagation, media assignment, and dependent content cleanup.
6. [Coupon](./coupon.md) - coupon generation, validation, reuse limits, and group/subgroup counters.
7. [Coupon Group](./coupon_group.md) - group lifecycle, bulk disable, counts, and CSV export.
8. [Coupon Subgroup](./coupon_subgroup.md) - subgroup reporting, count enrichment, and filter accuracy.
9. [Payment](./payment.md) - purchases, payments, gateways, CSV export, reconciliation.
10. [Purchase](./purchase.md) - customer purchases, purchase payments, invoices, and gateway-driven state transitions.
11. [Live Stream](./live-stream.md) - live stream lifecycle, schedule jobs, recording, EPG, restream, and related flows.
12. [Schedule](./schedule.md) - schedule jobs, overlap control, recurrence, EPG reconciliation, and bulk timezone rewrites.
13. [Playlist](./playlist.md) - playlist CRUD, rules, access restrictions, tokens, and images.
14. [CDN](./cdn.md) - CDN distribution and certificate configuration.
15. [Webhooks](./webhooks.md) - provider event ingestion and billing side effects.

## Suggested Priority Order

- P0: `auth`, `access`, `payment`, `media`, `schedule`, `purchase`, `ad`, `category`, `coupon`, `coupon_group`
- P1: `coupon_subgroup`, `live-stream`, `playlist`
- P2: `cdn`, `webhooks`

## Notes

- These registers are intentionally API-focused.
- CDN edge delivery behavior is out of scope here; this repo covers only CDN configuration APIs.
- Webhooks are treated as integration handlers, not user-facing CRUD.
- Schedule is treated as a concurrency hotspot because the code materializes derived events and reconciles them from multiple entry points.
- Purchase is treated as a money-and-state module because payment hooks mutate purchase state and generate invoices/e-fact side effects.
- Ad is treated as a monetization and delivery-config module because model hooks rewrite inherited media references and remote ad configuration.
- Category is treated as a taxonomy and propagation module because it rewrites descendant filters and clears dependent content references.
- Coupon is treated as a pricing-control module because generation, usage, and counters can drift under load.
- Coupon group is treated as a campaign control module because bulk disable and counters affect many coupons at once.
- Coupon subgroup is treated as a reporting consistency module because counts and filters can drift without breaking the API.
- Update this index whenever a new module register is added.
