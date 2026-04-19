# API Risk Register Index

**Scope:** API only
**Repository:** `api_test_flow`
**Date:** 2026-04-19
**Purpose:** Central entry point for module risk registers.

## Modules

1. [Auth](./auth.md) - token issuance, validation, and revocation.
2. [Access](./access.md) - playback and publish authorization.
3. [Media](./media.md) - core content CRUD, upload, metadata, subtitles, thumbnails, and processing.
4. [Bulk Media](./bulk_media.md) - mass media updates, bulk trashing, and response consistency.
5. [Thumbnail](./thumbnail.md) - thumbnail upload, default selection, delete, and live reload events.
6. [Ad](./ad.md) - ad delivery configuration, insertion, inheritance, and MediaTailor side effects.
7. [Category](./category.md) - taxonomy hierarchy, propagation, media assignment, and dependent content cleanup.
8. [Coupon](./coupon.md) - coupon generation, validation, reuse limits, and group/subgroup counters.
9. [Coupon Group](./coupon_group.md) - group lifecycle, bulk disable, counts, and CSV export.
10. [Coupon Subgroup](./coupon_subgroup.md) - subgroup reporting, count enrichment, and filter accuracy.
11. [Audit](./audit.md) - audit traceability, access scope, redaction, and query accuracy.
12. [Payment](./payment.md) - purchases, payments, gateways, CSV export, reconciliation.
13. [Purchase](./purchase.md) - customer purchases, purchase payments, invoices, and gateway-driven state transitions.
14. [Live Stream](./live-stream.md) - live stream lifecycle, schedule jobs, recording, EPG, restream, and related flows.
15. [Schedule](./schedule.md) - schedule jobs, overlap control, recurrence, EPG reconciliation, and bulk timezone rewrites.
16. [Playlist](./playlist.md) - playlist CRUD, rules, access restrictions, tokens, and images.
17. [CDN](./cdn.md) - CDN distribution and certificate configuration.
18. [Webhooks](./webhooks.md) - provider event ingestion and billing side effects.

## Suggested Priority Order

- P0: `auth`, `access`, `media`, `bulk/media`, `thumbnail`, `schedule`, `purchase`, `ad`, `category`, `coupon`, `coupon_group`, `audit`
- P1: `coupon_subgroup`, `live-stream`, `playlist`
- P2: `cdn`, `webhooks`

## Notes

- These registers are intentionally API-focused.
- Bulk Media is treated as a high-risk mutation surface because it can write arbitrary fields across many records and trash content at scale.
- Thumbnail is treated as a cross-cutting asset surface because it mutates media and live-stream thumbnails and must keep default selection and reload events consistent.
- CDN edge delivery behavior is out of scope here; this repo covers only CDN configuration APIs.
- Webhooks are treated as integration handlers, not user-facing CRUD.
- Schedule is treated as a concurrency hotspot because the code materializes derived events and reconciles them from multiple entry points.
- Purchase is treated as a money-and-state module because payment hooks mutate purchase state and generate invoices/e-fact side effects.
- Ad is treated as a monetization and delivery-config module because model hooks rewrite inherited media references and remote ad configuration.
- Category is treated as a taxonomy and propagation module because it rewrites descendant filters and clears dependent content references.
- Coupon is treated as a pricing-control module because generation, usage, and counters can drift under load.
- Coupon group is treated as a campaign control module because bulk disable and counters affect many coupons at once.
- Coupon subgroup is treated as a reporting consistency module because counts and filters can drift without breaking the API.
- Audit is treated as a security-sensitive read surface because access scope and redaction must be exact.
- Update this index whenever a new module register is added.
