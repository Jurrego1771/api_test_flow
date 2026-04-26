# Thumbnail API Risk Register

**Scope:** API only
**Module:** `thumbnail`
**Source baseline:** current thumbnail upload/update/delete handlers for media and live-stream assets
**Date:** 2026-04-19
**Owner:** QA

## 1. Module Summary

The `thumbnail` module is a cross-cutting API surface for image upload and thumbnail state management. It is not a simple asset upload endpoint. It creates, updates, deletes, and promotes thumbnails for media and live-stream items, and it also publishes reload events to the client. That makes it sensitive to file validation, default-selection drift, orphaned files, and scope confusion between media and live-stream flows.

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
| TH-RISK-001 | Upload token | Upload token generation fails or returns unusable upload targets | 5 | 4 | 4 | 80 | P0 | Without a valid token, thumbnail creation breaks at the entry point | token payload, invalid file names, expired target, provider failures |
| TH-RISK-002 | File validation | Invalid file type/size slips through or rejects valid images | 4 | 4 | 3 | 48 | P1 | Validation differs by target type and can regress quietly | mime type, size boundaries, empty file, malformed request |
| TH-RISK-003 | Scope routing | Media and live-stream thumbnail flows are mixed up or routed to the wrong model | 5 | 3 | 4 | 60 | P0 | Wrong target means the thumbnail exists in the wrong domain or fails entirely | route selection, target model, account isolation |
| TH-RISK-004 | Default selection | Default thumbnail flag is set incorrectly or left inconsistent | 5 | 4 | 4 | 80 | P0 | A wrong default thumbnail affects playback posters and UI previews | default promotion, revert, one-default invariant |
| TH-RISK-005 | State drift | `thumbnails` array and stored file state diverge after upload/update/delete | 4 | 4 | 4 | 64 | P0 | The API updates DB records and files separately, so drift is easy to create | DB/file parity, update hooks, orphan checks |
| TH-RISK-006 | Delete | Thumbnail deletion removes or hides the wrong asset | 4 | 4 | 4 | 64 | P0 | The wrong delete can break a live page or media preview | delete-by-id, regex matching, boundary cases |
| TH-RISK-007 | Concurrency | Concurrent thumbnail uploads or default changes race and leave mixed state | 4 | 4 | 4 | 64 | P0 | Thumbnail operations often happen close together during editing | repeat upload, simultaneous default change, stress smoke |
| TH-RISK-008 | Live-stream reload | Thumbnail changes do not publish reload events to clients | 4 | 3 | 4 | 48 | P1 | The UI may keep showing stale posters even when the API succeeded | websocket/event publish, reload signal, stale UI detection |
| TH-RISK-009 | Media integration | Media thumbnail creation breaks meta-dependent thumbnail generation | 4 | 3 | 4 | 48 | P1 | Media thumbnails depend on meta selection and VMS job creation | meta selection, size inference, original/non-original paths |
| TH-RISK-010 | Response contract | API response shape changes and breaks the client upload flow | 3 | 4 | 3 | 36 | P1 | The UI expects a specific OK/error structure and upload payload | contract tests, error mapping, success payload shape |
| TH-RISK-011 | Authorization | Cross-account access is not blocked consistently | 5 | 3 | 4 | 60 | P0 | Thumbnail assets are account-scoped and leaks are a security issue | authZ negative cases, foreign id handling |
| TH-RISK-012 | Cleanup | Deleted thumbnail files or records remain orphaned | 4 | 3 | 4 | 48 | P1 | Orphans consume storage and create stale references in the UI | delete cleanup, filesystem parity, missing file handling |

## 4. Endpoint Clusters to Cover First

### P0 cluster
- `POST /api/thumbnail/{type}/{item_id}` style upload entry point
- `POST /api/media/{media_id}/thumb`
- `PUT /api/media/{media_id}/thumb/{thumb_id}`
- `DELETE /api/media/{media_id}/thumb/{thumb_id}`
- `POST /api/live-stream/{live_stream_id}/thumb`
- `POST /api/live-stream/{live_stream_id}/thumbnail/upload`
- `DELETE /api/live-stream/{live_stream_id}/thumb/{thumb_id}`

### P1 cluster
- `POST /api/media/{media_id}/thumb/crop`
- any thumbnail reload publish event expected by the client
- error paths for invalid file, invalid size, and invalid target id

## 5. Known Failure Modes

1. Upload succeeds but the thumbnail is not linked to the item.
2. Default thumbnail changes and the UI still shows the old poster.
3. A delete removes a thumbnail that another flow still references.
4. Media and live-stream thumbnail routes behave differently for the same file and id.
5. The response says OK but the upload provider never got a valid job or token.
6. Orphaned thumbnail files remain after deletion or replacement.
7. Client reload events are not published, so the UI stays stale after a successful API call.

## 6. Recommended Test Strategy

### Automated first
- contract tests for upload and delete responses
- validation tests for file type and file size
- authZ tests for foreign ids and cross-account access
- default-selection tests for one-default invariants
- state-parity tests between DB records and file operations
- event publish checks for live-stream reloads

### Manual first
- upload a valid thumbnail for media
- upload a valid thumbnail for live-stream
- switch default thumbnail and verify the UI refreshes
- delete a thumbnail and confirm the preview updates

## 7. Test Data Requirements

- one valid image under the size limit
- one oversized image for media and one for live-stream
- one invalid file type
- one media item with several thumbnails
- one live-stream item with several thumbnails
- at least one cross-account negative fixture

## 8. Exit Criteria for Thumbnail API

The module can be considered covered enough for the first pass when:
- upload, update, and delete have automated smoke coverage
- validation and authZ negative tests exist
- default selection is verified for media and live-stream
- event reload behavior is checked for live-stream changes
- at least one manual run confirms file, DB, and UI state stay aligned

## 9. Next Update Needed

This register should be revisited after the first real thumbnail upload run, especially if default handling, file cleanup, or model routing shows drift.
