# Ad API Risk Register

**Scope:** API only
**Module:** `ad`
**Source baseline:** `sm2` route and schema inspection
**Date:** 2026-04-19
**Owner:** QA

## 1. Module Summary

The `ad` module is a configuration surface for ad delivery and monetization. It supports multiple ad modes (`vast`, `vmap`, `googleima`, `local`, `ad-insertion`, `adswizz`, `ad-insertion-google`, `ad-prebid`) and has strong side effects on `Media` and `Event` documents through save and remove hooks.

This module is risky because changing one ad definition can rewrite inherited ad references across media, clear existing event bindings, delete media-tailer configurations, or trigger transcode paths. The API also accepts deeply nested payloads for schedule, overlay, pause ads, insertion, and custom params, which makes partial-update drift easy.

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
| AD-RISK-001 | Type switching | Switching ad type leaves stale nested config behind or deletes the wrong branch | 5 | 4 | 4 | 80 | P0 | The route rewires fields heavily based on `type` | type-transition tests, stale-field cleanup, branch coverage |
| AD-RISK-002 | Insertion ads | Ad-insertion config writes the wrong tag, loop, or duration and breaks delivery | 5 | 4 | 4 | 80 | P0 | Insertion drives live monetization and playback behavior | tag/loop validation, default duration, required fields |
| AD-RISK-003 | Save hooks | Ad save propagates incorrect inherited ads or inherited adswizz into Media | 5 | 4 | 5 | 100 | P0 | The post-save hook mutates many media records | inheritance propagation, category/tag matching, rollback tests |
| AD-RISK-004 | Remove hooks | Deleting an ad leaves orphaned references or removes too much from Media/Event | 5 | 4 | 5 | 100 | P0 | Remove is cascading and asynchronous | cascade deletion, orphan checks, account scoping |
| AD-RISK-005 | MediaTailor sync | Ad-insertion save creates or deletes MediaTailor config incorrectly | 5 | 3 | 5 | 75 | P0 | Wrong MediaTailor config breaks playback at runtime | create/update/delete config paths, error handling |
| AD-RISK-006 | Overlay/pause ad config | Overlay and pause-ad fields are persisted inconsistently or partially overwritten | 4 | 4 | 4 | 64 | P0 | These nested fields are easy to corrupt with partial updates | nested field round-trip, null clearing, custom params |
| AD-RISK-007 | Local ad schedule | Local ad schedules store mid-roll/pre-roll/post-roll media incorrectly | 4 | 4 | 4 | 64 | P0 | Local mode mixes tag and media based config | mid-roll validation, media refs, schedule branch tests |
| AD-RISK-008 | Google DAI / VMAP | Switching to or from DAI/VMAP leaves conflicting state and invalid playback config | 5 | 3 | 4 | 60 | P0 | These modes are mutually exclusive with other branches | exclusivity tests, field nulling, payload shape checks |
| AD-RISK-009 | Prebid / adswizz | Prebid or adswizz settings persist incorrectly and affect monetization or targeting | 4 | 3 | 4 | 48 | P1 | These are narrower but still revenue-sensitive | zone/custom config, tag matching, negative inputs |
| AD-RISK-010 | Search/list | Ad listing returns the wrong account scope, filters, or pagination | 3 | 4 | 3 | 36 | P1 | Admin workflows need reliable selection and filtering | account scope, name search, count/list parity |
| AD-RISK-011 | Media references | Ad create/update leaves dangling `Media` references or wrong populated media | 4 | 3 | 4 | 48 | P1 | `schedule.mid`, pre, post, and loop all reference media | reference integrity, populate checks, delete cleanup |
| AD-RISK-012 | Validation gaps | Invalid min media time, category, tag, or referer payload slips through | 3 | 4 | 3 | 36 | P1 | The route accepts many nested branches | payload validation, boundary values, null handling |
| AD-RISK-013 | Account isolation | One account can read or mutate another account's ad configuration | 5 | 2 | 4 | 40 | P0 | The module is account-scoped and used across monetization | cross-account negative tests, not-found behavior |
| AD-RISK-014 | Transcode trigger | Ad transcode endpoint runs on incomplete insertion data or wrong assets | 4 | 3 | 4 | 48 | P1 | Transcode is a side effect that is not always obvious to the caller | trigger conditions, missing insertion, loop asset cases |

## 4. Endpoint Clusters to Cover First

### P0 cluster
- `GET /api/ad`
- `POST /api/ad`
- `GET /api/ad/{ad_id}`
- `POST /api/ad/{ad_id}`
- `DELETE /api/ad/{ad_id}`
- `POST /api/ad/{ad_id}/transcode`

### P1 cluster
- search/count branches, nested schedule modes, adswizz and prebid payload branches, and populated detail reads

## 5. Known Failure Modes

1. Changing `type` from `ad-insertion` to another mode leaves stale nested config behind.
2. An `ad-insertion` save updates MediaTailor config and then fails to remove old Event or Media links.
3. Inherited ad references are added or removed on the wrong `Media` documents after save.
4. Removing an ad clears the ad record but leaves stale references or remote config behind.
5. Nested schedule payloads for overlay or pause ad are partially overwritten and the UI later reads a mixed state.
6. Local ad schedules store invalid media IDs or malformed mid-roll positions.
7. DAI/VMAP branches null out the wrong fields and a later read returns contradictory configuration.
8. Transcode is triggered with incomplete insertion config and returns a false sense of success.

## 6. Recommended Test Strategy

### Automated first
- create/update/delete contract tests for each `type` branch
- type-switch tests that confirm stale nested config is removed
- propagation tests for inherited ads and adswizz on `Media`
- deletion tests that confirm `Media` and `Event` references are cleaned up
- nested payload tests for schedule, overlay, pausead, vmap, insertion, and prebid
- account isolation tests for all read/write routes
- transcode endpoint tests for insertion-ready and insertion-missing cases

### Manual first
- one ad-insertion create/update/delete flow in a staging account
- one inherited ad propagation check on media with matching categories/tags
- one local ad schedule with pre, mid, and post entries
- one DAI or VMAP switch scenario
- one transcode trigger scenario on real assets

## 7. Test Data Requirements

- one account with media and category data
- one ad-insertion fixture with active MediaTailor-bound events
- one local ad fixture with pre, mid, and post media references
- one VMAP fixture
- one Google DAI fixture
- one adswizz fixture
- one media set that matches categories and tags for inheritance
- one media set that should not inherit the ad
- one event bound to ad insertion for cleanup verification

## 8. Exit Criteria for Ad API

The module can be considered covered enough for the first pass when:
- each ad type branch has create/update/delete coverage
- type-switching cleans up stale configuration correctly
- inherited media references are updated and removed correctly
- deletion cleans up Media and Event side effects
- transcode and MediaTailor side effects are smoke-tested or mocked
- account isolation is verified for every route

## 9. Notes for QA Design

This module should be treated as a monetization and delivery-config module, not as a simple CRUD surface. The highest-value tests are around type transitions, nested config persistence, and post-save/post-remove side effects because those are the failures that break ad delivery while still returning 200-level responses.

## 10. Next Update Needed

Revisit this register if ad delivery modes are simplified, if MediaTailor integration changes, or if inherited ad propagation moves out of model hooks.
