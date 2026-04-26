# Schedule API Risk Register

**Scope:** API only
**Module:** `schedule` and `live-stream` schedule jobs
**Source baseline:** `sm2` route and model inspection
**Date:** 2026-04-19
**Owner:** QA

## 1. Module Summary

The `schedule` surface in `sm2` is not a simple CRUD module. It is split across `GET /api/schedule/search`, `GET /api/live-stream/{live_stream_id}/schedule`, `GET /api/live-stream/{live_stream_id}/schedule/{schedule_id}`, and the full schedule-job lifecycle under `live-stream`. The real source of risk is the materialization pipeline: `EventScheduleJob` is the source record, `EventSchedule` is the derived schedule, and both are updated by user-facing routes, gRPC handlers, EPG reconciliation, a timezone bulk updater, and an internal schedule refresh route.

This module is high risk because it is exposed to concurrent edits, overlap validation, transaction boundaries, background refreshes, and one-way cleanup paths. A failure here can create duplicate events, overlapping windows, wrong recurrence expansion, missed webhook signals, or stale schedule data that the UI and downstream services trust.

Current coverage note:
- there is now a dedicated schedule test file in `tests/api/regression/schedule`
- legacy indirect coverage remains in `tests/api/regression/live/live-advanced.regression.spec.js`
- `tests/api/regression/schedule/schedule-advanced.regression.spec.js` adds direct regression checks for schedule-job create, update, list reads, repeat-read stability, invalid payload handling, and not-found handling

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

| ID | Area | Risk | Impact | Likelihood | Detectability | Score | Priority | Coverage | Evidence | Why it matters | Main QA focus |
|---|---|---:|---:|---:|---:|---:|---|---|---|---|---|
| SCHED-RISK-001 | Overlap validation | Two concurrent requests pass conflict checks and create overlapping schedule jobs | 5 | 4 | 5 | 100 | P0 | Missing | None found | There is no database uniqueness guarantee and conflict detection is application-side | concurrent create tests, duplicate-window tests, transaction boundaries |
| SCHED-RISK-002 | Update flow | Update recreates or mutates derived schedules while another writer is touching the same job | 5 | 4 | 5 | 100 | P0 | Partial | `TC_SCH_007_POST_UpdateScheduleJob_HappyPath` in `tests/api/regression/schedule/schedule-advanced.regression.spec.js` | `updateScheduleJob` can delete and recreate schedule materialization | concurrent update tests, partial-update preservation, rollback behavior |
| SCHED-RISK-003 | Bulk timezone fix | `fix-tz-offset` rewrites many jobs with `__dagerous_force_create__`, bypassing normal conflict protection | 5 | 4 | 5 | 100 | P0 | Missing | None found | This is a deliberate bypass that can generate overlaps if the source data is dirty | bulk update tests, forced-create behavior, post-mutation verification |
| SCHED-RISK-004 | EPG reconciliation | EPG sync inserts, updates, or deletes the wrong jobs when source data drifts | 5 | 4 | 5 | 100 | P0 | Missing | None found | External EPG reconciliation can replace manual edits and create silent data drift | sync diff tests, insert/update/delete matching, idempotency |
| SCHED-RISK-005 | Derived schedule materialization | `EventScheduleJob` and `EventSchedule` get out of sync after save/remove hooks | 5 | 4 | 5 | 100 | P0 | Partial | `TC_LIV_044_GET_Schedule` in `tests/api/regression/live/live-advanced.regression.spec.js`, `TC_SCH_001_GET_LiveStreamScheduleJobList`, `TC_SCH_002_GET_LiveStreamScheduleJobList_StableOnRepeat` in `tests/api/regression/schedule/schedule-advanced.regression.spec.js` | `postCommit('save')` propagates fields asynchronously to all derived schedules | propagation tests, save/remove hook behavior, stale read checks |
| SCHED-RISK-006 | Background refresh | Internal schedule updater sends webhook flags, updates files, and restreams outside a transaction | 5 | 3 | 5 | 75 | P0 | Partial | `TC_LIV_045_GET_RestreamList` in `tests/api/regression/live/live-advanced.regression.spec.js`, `TC_SCH_003_GET_RestreamList_StableOnRepeat` in `tests/api/regression/schedule/schedule-advanced.regression.spec.js` | Re-running it or overlapping it can double-send or partially update state | repeat-run tests, webhook flag tests, file update side effects |
| SCHED-RISK-007 | Recurrence expansion | Recurrent schedules expand to the wrong set of dates around day and timezone boundaries | 5 | 4 | 4 | 80 | P0 | Missing | None found | Recurrence is the main source of hidden scheduling bugs | day-of-week, DST-like boundary, duration, tz_offset tests |
| SCHED-RISK-008 | Delete cleanup | Deleting a schedule job leaves orphaned `EventSchedule` rows or custom files behind | 4 | 4 | 4 | 64 | P0 | Missing | None found | Cleanup is split between transactional remove and async filesystem cleanup | cascade deletion tests, filesystem cleanup verification |
| SCHED-RISK-009 | Fast channel cleanup | Fast-channel schedule deletion can resolve before all cleanup promises finish | 5 | 3 | 5 | 75 | P0 | Missing | None found | The delete path in `deleteFastScheduleJob` is easy to under-wait and can race | cleanup ordering tests, awaited promise tests, orphan verification |
| SCHED-RISK-010 | Auth scope | Schedule queries or mutations leak across accounts or events | 5 | 3 | 4 | 60 | P0 | Missing | None found | These routes guard by account and event, so scope regressions are security-relevant | cross-account negative tests, not-found vs forbidden behavior |
| SCHED-RISK-011 | Validation gaps | Invalid name, date, recurrence, or recording duration slips through partial validation | 4 | 4 | 3 | 48 | P1 | Partial | `TC_SCH_005_POST_CreateScheduleJob_HappyPath`, `TC_SCH_006_POST_CreateScheduleJob_InvalidPayload` in `tests/api/regression/schedule/schedule-advanced.regression.spec.js` | The module accepts many branches and time calculations | boundary tests, null/empty cases, duration ceilings |
| SCHED-RISK-012 | Search/list consistency | Search and list endpoints return stale or misleading data because they read different collections | 4 | 3 | 4 | 48 | P1 | Missing | None found | `EventScheduleJob` and `EventSchedule` are both exposed in different routes | contract tests, collection consistency, query filters |
| SCHED-RISK-013 | Custom attributes | Custom schedule attributes are saved or removed inconsistently during create, update, or EPG sync | 4 | 3 | 4 | 48 | P1 | Missing | None found | Custom file processing is asynchronous and can fail independently | custom field round-trip, file cleanup, failure isolation |
| SCHED-RISK-014 | Show linkage | Show/season/episode references are corrupted or partially updated during schedule changes | 4 | 3 | 4 | 48 | P1 | Missing | None found | `show_info` is propagated across derived schedules and EPG reconciliation | linkage tests, nulling behavior, post-save propagation |
| SCHED-RISK-015 | Idempotency | Repeated create/update/delete requests produce duplicate side effects | 4 | 3 | 4 | 48 | P1 | Missing | None found | Several paths trigger create, delete, save, and webhook-like side effects | repeated-request tests, retry behavior, duplicate suppression |

## 4. Endpoint Clusters to Cover First

### P0 cluster
- `GET /api/schedule/search`
- `GET /api/live-stream/{live_stream_id}/schedule`
- `GET /api/live-stream/{live_stream_id}/schedule/{schedule_id}`
- `GET /api/live-stream/{live_stream_id}/schedule-job`
- `POST /api/live-stream/{live_stream_id}/schedule-job`
- `POST /api/live-stream/{live_stream_id}/schedule-job/{schedule_job_id}`
- `DELETE /api/live-stream/{live_stream_id}/schedule-job/{schedule_job_id}`
- `POST /api/live-stream/schedule-job/fix-tz-offset`
- `POST /api/live-stream/epg/sync`
- `POST /api/live-stream/epg/runEpgReconciliation`
- internal `GET /api/-schedule/update` style refresh route used by cron/ops
- gRPC schedule job create/delete/delete-fast flow in `liveService`

### P1 cluster
- schedule-job detail, timezone adjustments, autocomplete schedule search, internal helper routes, custom attribute flows, and derived schedule reads after updates

## 5. Known Failure Modes

1. Two users create the same time window at the same time and both requests succeed.
2. An update changes recurrence or timezone and the derived schedules are recreated with the wrong boundaries.
3. `fix-tz-offset` rewrites schedules in bulk and bypasses the normal overlap checks, creating inconsistent windows.
4. EPG reconciliation deletes a manually curated job because the logical key matches poorly or the source feed changed.
5. Background refresh sends start or end webhook updates twice, or not at all, because `_webhook_sent_*` flags are updated out of band.
6. A schedule job is removed, but derived `EventSchedule` rows or custom files remain behind.
7. A fast-channel cleanup resolves early and leaves orphaned state because the deletion promises are not coordinated tightly enough.
8. Search and list endpoints disagree because one reads `EventScheduleJob` and the other reads `EventSchedule`.

## 6. Recommended Test Strategy

### Automated first
- concurrent create tests for the same event and overlapping date windows
- concurrent update tests where two writers touch the same schedule job
- timezone and recurrence boundary tests, including midnight, day wrap, and offset changes
- negative tests for invalid date ranges, invalid recurrence days, empty names, and duration ceilings
- idempotency tests for repeated create/update/delete calls
- EPG reconciliation tests with insert, update, and delete diffs
- bulk timezone migration tests with forced-create paths
- delete cleanup tests that assert both DB state and custom-file cleanup behavior
- scope tests for account isolation and not-found behavior

### Current evidence
- `tests/api/regression/schedule/schedule-advanced.regression.spec.js`
  - `TC_SCH_005_POST_CreateScheduleJob_HappyPath`
  - `TC_SCH_006_POST_CreateScheduleJob_InvalidPayload`
  - `TC_SCH_007_POST_UpdateScheduleJob_HappyPath`
  - `TC_SCH_001_GET_LiveStreamScheduleJobList`
  - `TC_SCH_002_GET_LiveStreamScheduleJobList_StableOnRepeat`
  - `TC_SCH_003_GET_RestreamList_StableOnRepeat`
  - `TC_SCH_004_GET_ScheduleJobList_NotFound`
- `tests/api/regression/live/live-advanced.regression.spec.js`
  - `TC_LIV_044_GET_Schedule`
  - `TC_LIV_045_GET_RestreamList`

### Manual first
- one recurrent schedule overlap reproduction with two parallel edits
- one timezone migration scenario on a live-like fixture set
- one EPG reconciliation run against a controlled feed
- one delete flow on a schedule with custom attributes and derived entries
- one cron-style refresh execution to confirm webhook and restream side effects are stable

## 7. Test Data Requirements

- one event with no schedules
- one event with a one-time schedule already recorded
- one event with several overlapping candidate windows
- one event with recurrent schedule jobs in multiple weekdays
- one event with a non-zero `tz_offset`
- one schedule job with custom attributes and generated files
- one event bound to EPG origin data
- one event with fast-channel related schedule data
- one fixture with a manually edited schedule that EPG should not silently replace

## 8. Exit Criteria for Schedule API

The module can be considered covered enough for the first pass when:
- concurrent create and update overlap cases are explicitly tested and fail or pass as expected
- timezone bulk updates are validated against a real fixture set
- EPG reconciliation has coverage for insert, update, delete, and no-op outcomes
- delete paths prove DB cleanup and custom-file cleanup behavior
- background refresh is tested for repeated execution and side-effect stability
- account-scoping negative tests are in place for all exposed schedule routes
- one-time and recurrent schedule boundary cases are covered around midnight and offset changes

## 9. Notes for QA Design

This module should be treated as a concurrency and consistency hotspot, not just a CRUD surface. The highest-value automation is not broad endpoint coverage; it is race-focused coverage around creation, update, delete, EPG sync, and bulk timezone rewrites.

## 10. Next Update Needed

Revisit this register if the schedule materialization model changes, if a unique index or lock strategy is added, or if new schedule sources are introduced beyond HTTP and EPG reconciliation.
