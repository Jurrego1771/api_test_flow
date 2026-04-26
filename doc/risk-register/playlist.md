# Playlist API Risk Register

**Scope:** API only
**Module:** `playlist`
**Source baseline:** current platform Swagger and route layout
**Date:** 2026-04-19
**Owner:** QA

## 1. Module Summary

The `playlist` module manages playlist CRUD, filtering, media association, access restrictions, custom HTML, access tokens, and image upload/delete. It supports several playlist types with different rule sets: `manual`, `smart`, `series`, and `playout`.

The main risk is not volume, but state integrity: it is easy to persist the wrong rule shape, return the wrong media set, or break access behavior in a way that only appears later in playback or consumption.

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
| PL-RISK-001 | Playlist type | Wrong type or rule shape is persisted for manual/smart/series/playout playlists | 5 | 4 | 4 | 80 | P0 | Type drives all downstream behavior | type-specific schema validation, response shape, mutation safety |
| PL-RISK-002 | Playlist create/update | Partial updates overwrite unrelated fields or reset rule blocks | 5 | 4 | 4 | 80 | P0 | Update route is large and permissive | field whitelisting, regression on unrelated fields, merge semantics |
| PL-RISK-003 | Media association | Manual playlist media list is stored incorrectly or in the wrong order | 4 | 4 | 3 | 48 | P1 | Manual playlists depend on exact ordering and membership | list integrity, duplicates, empty/null handling |
| PL-RISK-004 | Smart playlists | Smart filters are applied incorrectly and produce wrong media sets | 5 | 4 | 4 | 80 | P0 | Smart playlists must follow filter semantics precisely | title, categories, tags, date range, duration, views |
| PL-RISK-005 | Series playlists | Seasons/episodes are malformed or inconsistent with media references | 5 | 3 | 4 | 60 | P0 | Series structure is nested and easy to break | season numbering, episode refs, invalid media ids, empty states |
| PL-RISK-006 | Playout playlists | Playout rule ordering or aggregation returns the wrong media sequence | 5 | 3 | 4 | 60 | P0 | Playback flow can be wrong even if the object saves correctly | rule ordering, limit, sort, deterministic output |
| PL-RISK-007 | Access restrictions | Playlist access rules are persisted or interpreted incorrectly | 5 | 4 | 4 | 80 | P0 | This can expose or block content unexpectedly | geo, IP, referer, cellular, device, closed access, advanced restrictions |
| PL-RISK-008 | Access tokens | Access token creation, storage, or notification flow leaks or corrupts tokens | 5 | 3 | 5 | 75 | P0 | Tokens govern sharing and access to playlists | token shape, notify email path, duplicate tokens, revocation behavior |
| PL-RISK-009 | Category scoping | Category filters bypass user/account restrictions or return wrong playlists | 4 | 4 | 4 | 64 | P0 | Category scope is both a permission and query concern | account isolation, user categories, category_name/id filters |
| PL-RISK-010 | Image upload | Playlist image upload returns bad URLs or fails on file validation | 4 | 3 | 4 | 48 | P1 | Image failures affect UI and content presentation | file format, size, processing error, S3 upload error |
| PL-RISK-011 | Image delete | Playlist image deletion leaves stale references or fails silently | 3 | 3 | 3 | 27 | P1 | Stale images create UI inconsistency | delete path, null image_url state, post-delete response |
| PL-RISK-012 | Search/list | List endpoint returns wrong scope, wrong filters, or wrong pagination | 4 | 4 | 3 | 48 | P1 | Support and UI rely on correct list behavior | query, slug, featured, category, custom filters, pagination |
| PL-RISK-013 | Response contract | API response shape changes across playlist types or endpoints | 4 | 4 | 4 | 64 | P0 | Clients depend on consistent payload structure | contract/snapshot tests for all types and endpoints |
| PL-RISK-014 | Authorization | Cross-account or cross-user playlist access leakage | 5 | 3 | 5 | 75 | P0 | Content access must remain isolated | positive/negative authz, user playlist/category scoping |
| PL-RISK-015 | Validation | Invalid dates, IDs, slugs, or boolean strings are accepted incorrectly | 4 | 4 | 3 | 48 | P1 | Bad input should fail early and predictably | date parsing, null handling, slug trimming, enum checks |
| PL-RISK-016 | Smart keyword decoding | Encoded tags/categories/filters decode incorrectly and alter matching | 3 | 3 | 4 | 36 | P1 | Filter semantics can silently change | decodeURIComponent coverage, special-character cases |
| PL-RISK-017 | Delete | Delete removes playlist but leaves related state behind or returns misleading success | 4 | 3 | 4 | 48 | P1 | Delete must be deterministic for downstream consumers | post-delete 404, orphan checks, related token/image state |
| PL-RISK-018 | Email notification | Access token notification emails are sent with wrong URL/token or not sent when required | 3 | 3 | 4 | 36 | P1 | Sharing workflows depend on notification correctness | email parameters, notify flag, template contract |

## 4. Endpoint Clusters to Cover First

### P0 cluster
- `GET /api/playlist`
- `POST /api/playlist`
- `GET /api/playlist/{playlist_id}`
- `POST /api/playlist/{playlist_id}`
- `DELETE /api/playlist/{playlist_id}`
- `POST /api/playlist/{playlist_id}/image`
- `DELETE /api/playlist/{playlist_id}/image`

### P1 cluster
- category and custom filters on `GET /api/playlist`
- playlist type permutations on create/update
- access token create/update/list/remove flows if present elsewhere in the API surface

## 5. Known Failure Modes

1. A playlist saves successfully but the rule block is not coherent with its declared type.
2. A smart playlist returns the wrong media subset because filter semantics changed.
3. A series playlist persists seasons or episodes that are malformed or partially empty.
4. A playout playlist returns an unstable or wrong media order.
5. Category scoping leaks playlists across users or accounts.
6. Image upload succeeds but the returned URL or stored state is wrong.
7. Delete succeeds but follow-up reads still find stale state in associated flows.
8. Access tokens are created and emailed incorrectly, exposing bad links or missing notifications.

## 6. Recommended Test Strategy

### Automated first
- create/update/delete contract tests for each playlist type
- validation tests for null, empty, encoded, and malformed payloads
- list/filter tests for slug, featured, category, and custom fields
- access restriction tests for allowed/denied combinations
- authorization tests for account and user category scoping
- image upload/delete tests with valid and invalid files
- response snapshot tests for manual, smart, series, and playout payloads

### Manual first
- one manual playlist create/update flow
- one smart playlist filter verification against known media fixtures
- one series playlist verification with seasons and episodes
- one playout playlist verification with ordering expectations
- one image upload/delete sanity check

## 7. Test Data Requirements

- one valid account with categories and playlists
- one fixture for each playlist type
- media fixtures for smart and manual association tests
- one playlist with access restrictions enabled
- one playlist with access tokens enabled
- one valid image file and one invalid file
- one user with restricted category visibility

## 8. Exit Criteria for Playlist API

The module can be considered covered enough for the first pass when:
- each playlist type has at least one create/update test and one negative test
- list endpoint has coverage for the main filters and scoping rules
- image upload/delete has happy-path and failure-path tests
- access restriction payloads are validated per type
- response contract is asserted across the four playlist modes

## 9. Next Update Needed

This register should be revisited if playlist rule shapes change, if access token behavior moves to a different endpoint set, or if the media association logic is refactored.
