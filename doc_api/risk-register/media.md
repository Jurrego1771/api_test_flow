# Media API Risk Register

**Scope:** API only
**Module:** `media`
**Source baseline:** current platform Swagger and route layout
**Date:** 2026-04-19
**Owner:** QA

## 1. Module Summary

The `media` module is a core domain. It concentrates the highest-risk API paths for content creation, upload, processing, enrichment, and deletion. It also touches external dependencies such as storage, transcoding, CDN delivery, subtitles, DRM, and auxiliary media objects.

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
| MEDIA-RISK-001 | Create/Update/Delete | Invalid payloads or partial updates corrupt media state | 5 | 4 | 3 | 60 | P0 | Core CRUD affects publishing and downstream flows | validation, field whitelist, unauthorized fields, regression on response shape |
| MEDIA-RISK-002 | Upload | Upload session/token generation fails or returns bad URLs/keys | 5 | 4 | 4 | 80 | P0 | Upload is the entry point for new media | happy path, invalid size/name, remote/S3/chunked paths, expiration |
| MEDIA-RISK-003 | Upload | Large file/chunk handling breaks or leaves orphaned upload jobs | 5 | 4 | 4 | 80 | P0 | Can block ingestion and waste storage/processing resources | chunk boundaries, retry, cancel/delete-upload, idempotency |
| MEDIA-RISK-004 | Transcoding/meta | Meta creation/transcode state gets out of sync | 5 | 3 | 4 | 60 | P0 | Broken state impacts playback and publishing readiness | state transitions, original meta requirements, already-transcoded cases |
| MEDIA-RISK-005 | Preview | Preview generation fails for invalid position or file type | 4 | 3 | 4 | 48 | P1 | Preview is important for editor and QA validation | invalid position, async start, error codes, token/url generation |
| MEDIA-RISK-006 | Thumbnails | Thumbnail upload/update/delete returns inconsistent default image | 4 | 3 | 3 | 36 | P1 | Incorrect default thumb affects UI and delivery | default selection, delete default, crop, multiple thumbs |
| MEDIA-RISK-007 | Subtitles | Subtitle create/update/delete mismatches language or auto-generated flow | 4 | 3 | 4 | 48 | P1 | Subtitle correctness affects accessibility and content quality | main/secondary language validation, duration limits, delete paths |
| MEDIA-RISK-008 | Tracks | Audio/video track CRUD breaks track ordering or metadata linkage | 4 | 3 | 3 | 36 | P1 | Track issues are subtle and often regress silently | create/update/delete/index, response consistency |
| MEDIA-RISK-009 | Chapters | Chapter CRUD allows invalid ranges or duplicate markers | 3 | 3 | 3 | 27 | P1 | Chapter errors degrade playback navigation | validation, ordering, overlaps, delete behavior |
| MEDIA-RISK-010 | Highlights | Highlight lifecycle returns stale or broken references | 3 | 3 | 3 | 27 | P1 | Highlights are content enrichment, easy to regress quietly | create/update/delete, relation to media existence |
| MEDIA-RISK-011 | Ratings | Rating endpoints allow invalid ranges or cross-account contamination | 3 | 3 | 3 | 27 | P1 | User-facing quality signal must stay consistent | range validation, account isolation, update semantics |
| MEDIA-RISK-012 | Quizzes | Quiz configuration or update flow breaks content interaction | 3 | 2 | 4 | 24 | P1 | Less common but business-relevant for interactive content | create/update/delete, required fields, empty states |
| MEDIA-RISK-013 | DRM token | DRM token issuance fails or exposes content incorrectly | 5 | 2 | 5 | 50 | P0 | Security and playback protection are sensitive | auth, token claims, expiry, forbidden cases |
| MEDIA-RISK-014 | Search | Search endpoints return wrong scope, pagination, or slow queries | 4 | 4 | 3 | 48 | P1 | Search is heavily used and tends to regress with data growth | filters, pagination, account boundaries, performance smoke |
| MEDIA-RISK-015 | Metadata | Metadata creation/update/model mapping breaks downstream consumers | 4 | 3 | 4 | 48 | P1 | Metadata feeds UI, automation, and processing pipelines | schema validation, updateModels, relation integrity |
| MEDIA-RISK-016 | Import/RSS | Platform import or remote import produces malformed media records | 5 | 2 | 4 | 40 | P0 | Batch import failures can create large-scale bad data | import validation, duplicate handling, recovery path |
| MEDIA-RISK-017 | Access rules | Media access flags get persisted incorrectly | 5 | 3 | 4 | 60 | P0 | A wrong allow/deny state breaks playback or opens content | geo, cellular, referer, closed access, device flags |
| MEDIA-RISK-018 | Response contract | API shape changes unexpectedly and breaks clients | 4 | 4 | 4 | 64 | P0 | This repo depends on stable response contracts | contract tests, snapshot checks, required fields |
| MEDIA-RISK-019 | Deletion | Delete flows remove media but leave dependent assets orphaned | 5 | 3 | 4 | 60 | P0 | Leaves storage, metadata, and UI state inconsistent | cascade behavior, orphan checks, delete-upload cleanup |
| MEDIA-RISK-020 | Authorization | Unauthorized access to write endpoints or media ownership leakage | 5 | 3 | 5 | 75 | P0 | Security issue with direct business impact | authN/authZ, cross-account negative cases, role checks |

## 4. Endpoint Clusters to Cover First

### P0 cluster
- `POST /api/media`
- `GET /api/media/upload`
- `GET /api/media/{media_id}/upload` style flows if present in the suite
- `POST /api/media/{media_id}/meta/{meta_id}/transcode`
- `POST /api/media/{media_id}/drm/token`
- `POST /api/media/rss/importPlatform`
- `DELETE /api/media/{media_id}`
- `DELETE /api/media/delete-upload`
- access-related fields on create/update

### P1 cluster
- `GET /api/media/{media_id}`
- `POST /api/media/{media_id}`
- `GET /api/media/{media_id}/subtitle`
- `POST /api/media/{media_id}/subtitle`
- `GET /api/media/{media_id}/thumbs`
- `POST /api/media/{media_id}/thumbnail/upload`
- `POST /api/media/{media_id}/preview`
- `GET /api/media/search`
- `GET /api/media/searchMedias`
- `GET /api/media/searchMediasAdmin`

### P2 cluster
- chapters, highlights, ratings, quizzes, tracks, images, metadata helpers

## 5. Known Failure Modes

1. Upload returns success but asset is unusable later.
2. Create/update succeeds but access flags are persisted wrong.
3. Transcode starts but meta state never reaches the expected terminal state.
4. Delete removes the record but leaves uploads, thumbs, or meta behind.
5. Search returns the right media but wrong account scope.
6. Subtitle or thumbnail flows accept invalid inputs and fail only downstream.
7. Contract drift breaks consumers even though the endpoint still returns 200.

## 6. Recommended Test Strategy

### Automated first
- contract tests for request/response shape
- validation tests for bad inputs and boundary values
- auth tests for cross-account access
- state-transition tests for upload/meta/transcode/delete
- smoke tests for search and CRUD

### Manual first
- end-to-end upload flow with real file
- playback/preview sanity after media creation
- CDN delivery verification for uploaded and processed assets
- negative validation around edge cases that are hard to automate initially

## 7. Test Data Requirements

- one small valid video file
- one larger file for chunked upload
- one invalid file type
- one remote URL for import path testing
- at least one media in each state: draft, uploaded, processed, published, deleted
- at least one cross-account negative fixture

## 8. Exit Criteria for Media API

The module can be considered covered enough for the first pass when:
- all P0 endpoints have automated smoke coverage
- all write endpoints have negative validation coverage
- contract checks exist for the main CRUD and upload responses
- delete paths verify cleanup or expected leftovers explicitly
- at least one manual run confirms upload-to-ready flow end to end

## 9. Next Update Needed

This register should be revisited after the first real API run, especially if new failures appear in upload, transcode, DRM, or response contracts.
