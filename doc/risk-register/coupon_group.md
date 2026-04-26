# Coupon Group API Risk Register

**Scope:** API only
**Module:** `coupon_group`
**Source baseline:** `sm2` route and schema inspection
**Date:** 2026-04-19
**Owner:** QA

## 1. Module Summary

The `coupon_group` module is the control plane for coupon families. It creates coupon groups, lists them with counts and CSV export, and can disable coupons in bulk for a date window. It is coupled to coupon generation and to the `Coupon`/`CouponSubgroup` counters maintained by schema hooks.

This module is high risk because a group is the root object that controls coupon generation rules, gateway constraints, and bulk coupon disablement. A defect here can make entire campaigns invalid, skew totals, or mass-disable the wrong set of coupons.

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
| CG-RISK-001 | Group creation | Duplicate group names or gateway assignment rules break campaign setup | 4 | 4 | 4 | 64 | P0 | Group name uniqueness is used to avoid collisions | unique-name tests, admin-only gateway branch, account scope |
| CG-RISK-002 | Bulk disable | Disabling a group updates the wrong coupons or misses coupons in the target window | 5 | 4 | 5 | 100 | P0 | This endpoint bulk-mutates coupon validity across a date range | date window tests, bulk write verification, partial batch handling |
| CG-RISK-003 | Counter drift | `coupon_total`, `coupon_used_total`, and `coupon_valid_total` drift from reality | 5 | 4 | 5 | 100 | P0 | Group counters are used for admin visibility and reporting | count consistency, hook propagation, repeated create/use flows |
| CG-RISK-004 | List/export | Group list and CSV export disagree with the stored totals or filters | 3 | 4 | 3 | 36 | P1 | Admin exports are used for reconciliation | list/count parity, CSV header/row integrity |
| CG-RISK-005 | Account isolation | One account can read or modify another account's groups | 5 | 2 | 4 | 40 | P0 | Group access is account-scoped and highly sensitive | cross-account negative tests, not-found behavior |
| CG-RISK-006 | Gateway coupling | Gateway-specific group restrictions are applied inconsistently | 4 | 3 | 4 | 48 | P1 | `incomm` and other gateway rules alter coupon behavior | gateway branch tests, invalid gateway rejection |
| CG-RISK-007 | Disable side effects | Bulk disable emits the wrong websocket event or reports wrong totals | 3 | 3 | 4 | 36 | P1 | Operational tooling depends on accurate progress | websocket payload checks, zero-result and success cases |

## 4. Endpoint Clusters to Cover First

### P0 cluster
- `GET /api/coupon_group`
- `POST /api/coupon_group`
- `POST /api/coupon_group/{coupon_group_id}/disable`

### P1 cluster
- count/list filters, CSV export, and name/date search branches

## 5. Known Failure Modes

1. A group is created twice with the same logical name and the UI later cannot distinguish them.
2. The bulk disable job updates coupons outside the intended date window.
3. Counter fields drift after coupon generation or coupon usage and admin reporting becomes misleading.
4. CSV export omits rows or reports stale counts.
5. A non-admin user creates or mutates a group gateway they should not control.
6. The disable endpoint returns success, but the websocket event reports the wrong total or error state.

## 6. Recommended Test Strategy

### Automated first
- create tests for unique name enforcement and account isolation
- list/count tests with date filters, search, and CSV
- bulk disable tests with a narrow date range and a large set of coupons
- counter reconciliation tests after coupon creation and use
- websocket/event assertions for disable flows
- gateway branch tests for admin-only gateway selection

### Manual first
- one coupon group creation flow for a normal admin account
- one bulk disable run against a small controlled set
- one CSV export and reconciliation pass
- one non-admin attempt to set a restricted gateway

## 7. Test Data Requirements

- one account with at least two coupon groups
- one admin user and one non-admin user
- one group with coupons spanning the target disable window
- one group with coupons outside the target disable window
- one group with gateway `incomm`
- one group with multiple coupons already used

## 8. Exit Criteria for Coupon Group API

The module can be considered covered enough for the first pass when:
- group creation enforces uniqueness and account scope
- bulk disable only affects the intended coupons
- counters remain consistent after generation and usage
- list and CSV outputs are consistent enough for reporting
- websocket notifications reflect the actual disable outcome

## 9. Notes for QA Design

This module should be treated as a campaign control module. The highest-value tests are around bulk disable and counter drift, because those defects affect many coupons at once and are hard to recover from manually.

## 10. Next Update Needed

Revisit this register if group gateway policy changes, if bulk disable is moved to a background job, or if group counters are computed differently.
