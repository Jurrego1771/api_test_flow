# Live Stream API Risk Register

**Scope:** API only
**Module:** `live-stream`
**Source baseline:** current platform Swagger and route layout
**Date:** 2026-04-19
**Owner:** QA

## 1. Module Summary

The `live-stream` module is the highest-complexity API area in this first pass. It combines live stream creation and update, recording control, schedule jobs, EPG sync, metadata, restreaming, ad insertion, DRM tokens, moments, thumbnails, quizzes, and multiple utility flows. It also touches external services and stateful infrastructure such as CDN, transcoders, AWS services, and scheduled jobs.

A failure here can break live operations, corrupt scheduling, stop recordings, misroute playback, or leave the system in a partially updated state.

## 2. Risk Scoring Model

Scale used for each dimension:
- **Impact:** 1 low, 5 critical
- **Likelihood:** 1 rare, 5 frequent
- **Detectability:** 1 easy to detect, 5 hard to detect
- **Risk Score:** `Impact x Likelihood x Detectability`

Priority bands:
- **P0:** 40-125
- **P1:** 24-39
- **P2:** 12-23
- **P3:** 1-11

## 3. Risk Register

| ID | Area | Risk | Impact | Likelihood | Detectability | Score | Priority | Why it matters | Main QA focus |
|---|---|---:|---:|---:|---:|---:|---|---|---|
| LIVE-RISK-001 | Create/update | Live stream is created or updated with invalid access, encoding, or CDN state | 5 | 4 | 4 | 80 | P0 | Core stream setup affects everything downstream | validation, allowed values, response contract, state persistence |
| LIVE-RISK-002 | Schedule jobs | Schedule job creation/update produces wrong time windows or recurrence | 5 | 4 | 4 | 80 | P0 | Wrong scheduling breaks live operations and recordings | timezone, recurrency, boundary dates, overlap cases |
| LIVE-RISK-003 | Recording control | Start/stop recording transitions are inconsistent or out of sync | 5 | 4 | 5 | 100 | P0 | Recording state errors are operationally severe and often subtle | lifecycle transitions, repeated calls, idempotency, failure mapping |
| LIVE-RISK-004 | MediaLive / transcoding | Cloud transcoding state flips incorrectly or gets stuck | 5 | 4 | 5 | 100 | P0 | This is one of the most fragile and expensive paths | jobEnabled, channel state, auto recording, rollback behavior |
| LIVE-RISK-005 | Playback access | Live access token logic authorizes or rejects the wrong viewer | 5 | 3 | 5 | 75 | P0 | Unauthorized viewing or blocked playback are critical | access token issuance, DRM, encryption, header/query parity |
| LIVE-RISK-006 | EPG sync | EPG reconciliation produces duplicate, missing, or misordered events | 5 | 3 | 5 | 75 | P0 | EPG is business-visible and data-loss prone | sync, reconciliation, range queries, duplicate suppression |
| LIVE-RISK-007 | Restream | Restream start/stop/update leaves streams in an invalid state | 5 | 3 | 4 | 60 | P0 | Restream failures affect live distribution immediately | lifecycle, state transitions, validation, cleanup |
| LIVE-RISK-008 | Ad insertion | Ad insertion or SGAI config corrupts live playback or monetization | 5 | 3 | 4 | 60 | P0 | Monetization and playback are both impacted | ad insertion create/update, sgai flags, invalid payloads |
| LIVE-RISK-009 | Publish token | Publish token validation allows wrong live source or blocks valid publishing | 5 | 3 | 4 | 60 | P0 | Live ingest must be tightly validated | publish token, tcurl parsing, invalid request shapes |
| LIVE-RISK-010 | Access rules | Geo, IP, ASN, referer, device, cellular, concurrency rules persist incorrectly | 5 | 3 | 4 | 60 | P0 | Access rules directly govern who can see the stream | rule persistence, allow/deny combinations, negative tests |
| LIVE-RISK-011 | State overwrite | Partial updates overwrite unrelated live-stream fields | 4 | 4 | 4 | 64 | P0 | Update endpoint is large and easy to regress | field whitelisting, unrelated field preservation, merge semantics |
| LIVE-RISK-012 | Delete | Deleting a live stream leaves orphaned jobs, assets, or cache state | 5 | 3 | 4 | 60 | P0 | Cleanup defects cause ghost entries and operational drift | cascade cleanup, missing child records, post-delete queries |
| LIVE-RISK-013 | List/search | Listing returns wrong scope, wrong filters, or wrong permissions | 4 | 4 | 3 | 48 | P1 | Support and admin workflows rely on accurate listing | account scope, query filters, pagination, permission branches |
| LIVE-RISK-014 | Entry points | Entry point generation returns stale or invalid URLs | 5 | 3 | 4 | 60 | P0 | Playback and ingest depend on generated URLs | URL contract, CDN zone, account data, returned structure |
| LIVE-RISK-015 | Thumbnails/logo | Thumbnail and logo endpoints fail or expose stale assets | 3 | 3 | 3 | 27 | P1 | Visual assets are important and easy to regress | create/delete/update, default asset behavior, cache busting |
| LIVE-RISK-016 | Moments | Moments lifecycle breaks under concurrent edits or deletes | 4 | 3 | 4 | 48 | P1 | Moments are content enrichment and operationally visible | create/update/delete, thumbnail lifecycle, relation integrity |
| LIVE-RISK-017 | Metadata | Live metadata create/update/delete stores wrong time windows or IDs | 4 | 3 | 4 | 48 | P1 | Metadata feeds UI and downstream integrations | dateStart/dateEnd validation, range overlap, ownership |
| LIVE-RISK-018 | Quiz flow | Quiz create/update/send/delete behavior diverges from the live event | 3 | 3 | 4 | 36 | P1 | Interactive live content is easy to break silently | lifecycle, event binding, send path, cleanup |
| LIVE-RISK-019 | Audio exclusion | Audio exclusion rules break playback or persist wrong zones | 4 | 3 | 4 | 48 | P1 | Audio routing is niche but high impact when used | create/update/delete, data integrity, retrieval |
| LIVE-RISK-020 | DRM token | Live DRM token issuance fails or weakens playback protection | 5 | 2 | 5 | 50 | P0 | Security-sensitive and usually hard to detect by eye | token creation, expiry, invalid device cases |
| LIVE-RISK-021 | AI transcription | Live transcription flags and state are saved incorrectly | 3 | 3 | 4 | 36 | P1 | Newer feature with likely drift and conditional behavior | enabled/language updates, account feature flags |
| LIVE-RISK-022 | Gracenote / third-party integrations | External integration data is stored inconsistently or triggers unsupported paths | 4 | 2 | 5 | 40 | P0 | External sync paths are fragile and hard to reproduce | module access, optional fields, failure handling |
| LIVE-RISK-023 | Rate-limited operations | Repeated toggles or schedule actions create race-like state flips | 4 | 3 | 4 | 48 | P1 | Live ops often involve rapid repeated actions | toggle endpoints, repeated calls, idempotency |

## 4. Endpoint Clusters to Cover First

### P0 cluster
- `POST /api/live-stream`
- `POST /api/live-stream/{live_stream_id}`
- `DELETE /api/live-stream/{live_stream_id}`
- `GET /api/live-stream`
- `GET /api/live-stream/{live_stream_id}`
- `POST /api/live-stream/record/start`
- `POST /api/live-stream/record/stop`
- `POST /api/live-stream/start-record`
- `POST /api/live-stream/stop-record`
- `POST /api/live-stream/toggle-recording`
- `POST /api/live-stream/toggle-online`
- `POST /api/live-stream/schedule-job`
- `POST /api/live-stream/schedule-job/{schedule_job_id}`
- `DELETE /api/live-stream/schedule-job/{schedule_job_id}`
- `GET /api/live-stream/schedule`
- `GET /api/live-stream/schedule-job`
- `POST /api/live-stream/restream`
- `POST /api/live-stream/restream/{restream_id}`
- `POST /api/live-stream/restream/start`
- `POST /api/live-stream/restream/stop`
- `POST /api/live-stream/ad-insertion`
- `POST /api/live-stream/drm/token`
- `POST /api/live-stream/metadata`
- `POST /api/live-stream/epg/sync`
- `POST /api/live-stream/epg/runEpgReconciliation`
- `POST /api/live-stream/epg/epgReconcile`
- `POST /api/live-stream/moment`
- `POST /api/live-stream/quizzes`

### P1 cluster
- thumbnails, logo, audio exclusion, transcription, gracenote, ad-break, recording CRUD, schedule-job utilities, metadata detail/delete, moment thumbnail flows

## 5. Known Failure Modes

1. A live stream is created successfully, but the generated SMIL or entry points are invalid.
2. A schedule job is accepted with the wrong timezone or recurrence window and later executes incorrectly.
3. Recording starts twice or stops without the underlying state reflecting the transition.
4. A Medialive update flips `jobEnabled` or `channel.state` incorrectly and leaves the system stuck.
5. EPG sync creates duplicated or missing records because reconciliation and sync paths disagree.
6. Restream, ad insertion, or DRM token flows silently fail after a partial update.
7. Delete removes the parent event but child objects, caches, or generated files remain behind.
8. A partial update overwrites unrelated fields because the route accepts too much body input.

## 6. Recommended Test Strategy

### Automated first
- contract tests for create/update/detail/list/delete responses
- invalid input tests for time windows, recurrence, encoding profiles, and access rules
- state-transition tests for record start/stop, toggle online, and Medialive job state
- authorization tests for account scope and admin-only branches
- idempotency and repeat-action tests for toggle and schedule endpoints
- cleanup verification for delete and child resources
- integration-mocked tests for EPG, restream, DRM token, and ad insertion branches

### Manual first
- one full live stream create/update/publish flow
- one schedule job create/edit/run flow
- one start-record and stop-record sequence in a real or staged environment
- one EPG sync/reconcile check with actual data
- one restream scenario and one ad-insertion scenario if those features are enabled

## 7. Test Data Requirements

- one valid live stream fixture for video
- one valid live stream fixture for audio if supported
- one fixture with Medialive enabled
- one fixture with scheduling enabled
- one fixture with closed access and access rules enabled
- one fixture with transcription enabled
- one fixture with a DRM token path enabled
- one fixture with existing moments, thumbnails, and metadata
- one fixture with restream configured

## 8. Exit Criteria for Live Stream API

The module can be considered covered enough for the first pass when:
- all P0 endpoints have automated positive and negative coverage
- state transitions for recording and Medialive are explicitly asserted
- schedule job timezone and recurrence rules have boundary coverage
- EPG sync/reconciliation has at least one happy-path and one failure-path test
- delete paths verify cleanup of dependent state or explicitly confirm expected leftovers
- external integration branches are mocked and smoke-tested where enabled

## 9. Next Update Needed

This register should be revisited if live ingest architecture changes, if Medialive or EPG flows are reworked, or if new child resources are added under `live-stream`.

