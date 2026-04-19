# Bulk Media API Risk Register

**Scope:** API only
**Module:** `bulk/media`
**Source baseline:** current `src/server/routes/api/bulk/media` handlers and client call sites
**Date:** 2026-04-19
**Owner:** QA

## 1. Module Summary

The `bulk/media` module is a high-risk mutation surface for mass updates and bulk trashing of media records. It is not simple CRUD. It accepts arbitrary update payloads, applies them across many records, and runs with parallel cursor processing. That makes it sensitive to partial failure, race conditions, unexpected field writes, and misleading success counts.

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
| BM-RISK-001 | Bulk update | Arbitrary payload writes corrupt many media records at once | 5 | 4 | 4 | 80 | P0 | A bad request can change a large set of content records in a single call | field whitelist, schema drift, negative payloads |
| BM-RISK-002 | Bulk update | Add-to behavior for categories/tags duplicates or mutates relation state incorrectly | 4 | 4 | 3 | 48 | P1 | The special merge path is easy to regress and hard to notice in the UI | idempotency, duplicate suppression, repeated-run checks |
| BM-RISK-003 | Bulk update | Partial failure leaves mixed state across the selected ids | 5 | 4 | 4 | 80 | P0 | Cursor processing with parallel updates can fail halfway through | retry behavior, failure injection, partial commit visibility |
| BM-RISK-004 | Bulk update | Nested field paths overwrite unexpected object structure | 5 | 3 | 4 | 60 | P0 | The API accepts dotted paths and can create or replace nested objects | dotted-path validation, nested payload safety, contract checks |
| BM-RISK-005 | Bulk delete | Trash path marks items as TRASH but downstream hooks or cleanup may race | 5 | 3 | 4 | 60 | P0 | Bulk delete triggers hooks and can collide with publish/update flows | delete cleanup, hook side effects, repeat delete safety |
| BM-RISK-006 | Authorization | Cross-account ids are ignored or miscounted and hide access issues | 5 | 3 | 4 | 60 | P0 | Account scoping must be exact and the response must not imply success for foreign ids | authZ negative tests, scope isolation, count accuracy |
| BM-RISK-007 | Concurrency | Parallel processing at 30 workers causes state races in hooks or counters | 4 | 4 | 4 | 64 | P0 | High concurrency is useful for throughput but risky for shared side effects | stress runs, repeated batches, hook collision checks |
| BM-RISK-008 | Response contract | Success/failed/total numbers drift from actual mutated records | 3 | 4 | 3 | 36 | P1 | Operators need trustworthy batch results to know what really changed | response accuracy, mixed success/failure scenarios |
| BM-RISK-009 | Payload semantics | One route supports several actions through payload shape and can be misused | 4 | 3 | 4 | 48 | P1 | Category update, publish/unpublish, and recording date updates share the same endpoint | action-specific contract tests, payload disambiguation |
| BM-RISK-010 | Batch size | Large selections or slow saves time out and leave stale state | 4 | 3 | 4 | 48 | P1 | Bigger batches increase the chance of slow or aborted processing | large-batch smoke, timeout handling, retry observations |
| BM-RISK-011 | Auditability | Bulk changes are hard to trace record by record after execution | 4 | 3 | 4 | 48 | P1 | When a batch goes wrong, diagnosis becomes expensive without per-item traceability | log coverage, event correlation, change sampling |
| BM-RISK-012 | Contract drift | Client actions using `/api/bulk/media` break when request body expectations change | 4 | 3 | 3 | 36 | P1 | The client uses the endpoint for category add, publish, and recording dates | request body shape checks, regression against UI call sites |

## 4. Endpoint Clusters to Cover First

### P0 cluster
- `POST /api/bulk/media`
- `DELETE /api/bulk/media`

### P1 cluster
- POST payload variants for:
  - `categories`
  - `is_published`
  - `date_recorded`
- mixed-id batches with valid and invalid ids
- cross-account negative cases

## 5. Known Failure Modes

1. A batch reports success but only some media were changed.
2. Re-running the same add-to-categories batch creates duplicate or inconsistent relations.
3. Bulk delete marks items as trash while another process updates them at the same time.
4. A dotted-path update creates an unexpected nested shape and breaks downstream consumers.
5. Foreign-account ids are silently skipped, which makes the response misleading.
6. A large batch times out after some records were already modified.
7. Client-side bulk actions succeed in the UI but the API payload semantics are not stable.

## 6. Recommended Test Strategy

### Automated first
- contract tests for request and response shape
- negative validation tests for missing ids and missing update payloads
- authZ tests for foreign-account ids
- idempotency tests for repeat add-to-categories and repeat trash requests
- concurrency smoke tests with repeated bulk runs
- count verification for partial success and failure scenarios

### Manual first
- bulk category add on a representative media set
- bulk publish/unpublish with mixed states
- bulk trash and restore sanity check
- repeated execution of the same batch to confirm stable outcomes

## 7. Test Data Requirements

- at least 50 media records
- a mix of video, audio, and image media
- media with and without categories and tags
- at least one foreign-account fixture
- at least one already trashed media item
- at least one published and one unpublished media item

## 8. Exit Criteria for Bulk Media API

The module can be considered covered enough for the first pass when:
- bulk update and delete have automated smoke coverage
- negative input and authZ tests exist
- response counts are verified against expected partial success cases
- repeated bulk runs are proven safe for categories and trash operations
- at least one stress run confirms the cursor and parallel processing path is stable

## 9. Next Update Needed

This register should be revisited after the first real batch test, especially if parallel processing, dotted paths, or response counts show drift.
