# Coupon API Risk Register

**Scope:** API only
**Module:** `coupon` family (`coupon`, `coupon_group`, `coupon_subgroup`)
**Source baseline:** `sm2` route and schema inspection
**Date:** 2026-04-19
**Owner:** QA

## 1. Module Summary

The coupon surface in `sm2` is a pricing and promotion subsystem. It includes coupon groups, subgroups, coupon generation, detail lookup, update/delete flows, and runtime usage checks that interact with payment and subscription flows.

This module is high risk because coupon generation is bulk-oriented, stateful, and tied to downstream billing behavior. The schema updates group and subgroup counters from post-save hooks, coupon validity can depend on gateway-specific rules, and coupon usage is applied with update conditions that are sensitive to timing and duplicate attempts.

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
| CUP-RISK-001 | Coupon generation | Bulk generation creates duplicate or malformed coupon codes | 5 | 4 | 4 | 80 | P0 | Coupons are generated in loops and retried on conflicts | generation retries, code format, uniqueness checks |
| CUP-RISK-002 | Reusable coupons | Reusable coupon limits per customer or max-use are not enforced correctly | 5 | 4 | 5 | 100 | P0 | Reuse limits directly control discount abuse | max_use, max_use_per_customer, repeated-use tests |
| CUP-RISK-003 | Gateway constraints | Incomm coupons accept unsupported discount types or invalid validity rules | 5 | 3 | 4 | 60 | P0 | Gateway-specific rules are strict and easy to break | incomm branch tests, percent-only enforcement, validity flags |
| CUP-RISK-004 | Usage atomics | Coupon use updates race and leave the coupon in the wrong used/valid state | 5 | 4 | 5 | 100 | P0 | `use()` relies on conditional update semantics | concurrent use tests, idempotency, active-state checks |
| CUP-RISK-005 | Group counters | CouponGroup totals become inconsistent with actual coupon documents | 4 | 4 | 5 | 80 | P0 | Post-save hooks recalculate totals asynchronously | count consistency, post-save recalculation, drift checks |
| CUP-RISK-006 | Subgroup counters | CouponSubgroup totals drift from the underlying coupons | 4 | 4 | 5 | 80 | P0 | Subgroup counters are used for operational visibility | subgroup count consistency, update after create/use |
| CUP-RISK-007 | Delete safety | Deleting a coupon that is used or partially used breaks billing history | 5 | 3 | 4 | 60 | P0 | Used coupons are blocked, but edge cases still matter | used vs unused delete tests, in-use negative cases |
| CUP-RISK-008 | Detail validation | Coupon detail returns the wrong validity state for used or gateway-validated coupons | 4 | 3 | 4 | 48 | P1 | Detail can consult payment/incomm state on read | used coupon lookup, incomm validation, customer linkage |
| CUP-RISK-009 | Update drift | Updating a coupon changes validity, type, or metadata without preserving business rules | 4 | 4 | 4 | 64 | P0 | Update can reclassify discount behavior after creation | update contract tests, metadata merge, type transitions |
| CUP-RISK-010 | List/export | Coupon list, count, and CSV export disagree with each other or the DB | 3 | 4 | 3 | 36 | P1 | Admin export is used for audit and campaign tracking | count/list parity, CSV row integrity, filters |
| CUP-RISK-011 | Account isolation | One account can read or mutate another account's coupons or groups | 5 | 2 | 4 | 40 | P0 | Coupons are account-scoped and often sensitive | cross-account negative tests, not-found behavior |
| CUP-RISK-012 | Naming/code reuse | Custom reusable codes collide or are accepted when they should not be | 4 | 3 | 4 | 48 | P1 | Human-readable codes are allowed for reusable coupons | custom code uniqueness, format validation, collision retry |

## 4. Endpoint Clusters to Cover First

### P0 cluster
- `GET /api/coupon`
- `POST /api/coupon`
- `GET /api/coupon/{coupon_id}`
- `GET /api/coupon/{coupon_code}/search`
- `POST /api/coupon/{coupon_id}`
- `DELETE /api/coupon/{coupon_id}`
- `GET /api/coupon_group`
- `POST /api/coupon_group`
- `GET /api/coupon_subgroup`

### P1 cluster
- count/CSV list modes, gateway-specific validation branches, and the detail route with payment lookup or gateway validation

## 5. Known Failure Modes

1. Bulk coupon generation retries and accidentally creates duplicate-looking codes under load.
2. Reusable coupons exceed per-customer usage limits because the check happens outside the final use update.
3. Incomm coupons are created with invalid discount types or inconsistent validity flags.
4. Group or subgroup totals drift away from the actual coupon set after create or usage updates.
5. Updating a coupon changes its business meaning without revalidating downstream assumptions.
6. Deleting a coupon that is still referenced by payment history causes audit confusion or broken detail lookups.
7. CSV exports and count queries disagree with the visible coupon list because filters differ.
8. A custom reusable coupon code is accepted even though it collides with an existing code in the account.

## 6. Recommended Test Strategy

### Automated first
- bulk generation tests with fixed code and auto-generated code paths
- duplicate code collision tests
- reusable coupon limit tests per customer and max-use
- gateway-specific validation tests, especially incomm
- use/update tests that assert atomic state changes
- group and subgroup counter reconciliation tests
- list/count/CSV parity tests
- delete tests for used vs unused coupons
- account isolation tests for all coupon routes

### Manual first
- one bulk coupon generation run with progress observation
- one reusable coupon flow with repeated customer usage
- one incomm coupon create/update/detail cycle
- one CSV export and reconciliation check
- one coupon deletion check for used vs unused states

## 7. Test Data Requirements

- one account with coupon groups and subgroups
- one coupon group with gateway `incomm`
- one normal coupon group
- one reusable coupon fixture with `max_use` and `max_use_per_customer`
- one non-reusable coupon fixture
- one coupon already used by a purchase payment
- one payment-linked coupon with incomm validation enabled
- one account with multiple coupon generations in progress

## 8. Exit Criteria for Coupon API

The module can be considered covered enough for the first pass when:
- bulk coupon generation produces unique codes and correct metadata
- reusable and non-reusable coupons enforce their limits correctly
- gateway-specific branches, especially incomm, are covered
- group and subgroup counters match the underlying coupon documents
- delete and detail branches behave correctly for used and unused coupons
- list/count/CSV outputs are consistent enough for audit

## 9. Notes for QA Design

This module should be treated as a pricing control module, not a simple CRUD surface. The highest-value tests are around generation, usage limits, and counter consistency, because those are the failures that directly affect discount abuse and billing accuracy.

## 10. Next Update Needed

Revisit this register if coupon generation becomes fully synchronous, if group/subgroup counters are moved out of hooks, or if new gateway-specific coupon rules are added.
