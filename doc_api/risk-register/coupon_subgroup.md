# Coupon Subgroup API Risk Register

**Scope:** API only
**Module:** `coupon_subgroup`
**Source baseline:** `sm2` route and schema inspection
**Date:** 2026-04-19
**Owner:** QA

## 1. Module Summary

The `coupon_subgroup` module is the detailed reporting surface for coupon batches within a group. It returns coupon subgroups with enriched totals, supports search and date filters, and can also export coupons in CSV form. Unlike the group module, it does not create or mutate the core object; its risk is mainly in reporting accuracy and cross-entity consistency.

This module is risky because it depends on coupon-level counts, filters by coupon code and type code, and merges counts from live coupon documents into subgroup responses. If those counts drift or the filters are wrong, campaign reporting becomes misleading.

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
| CSG-RISK-001 | Count enrichment | Subgroup totals do not match the underlying coupons | 5 | 4 | 5 | 100 | P0 | The endpoint enriches subgroups with live counts | count reconciliation, repeated use/create flows |
| CSG-RISK-002 | Search filters | Code or type-code search returns the wrong subgroups | 4 | 4 | 4 | 64 | P0 | Campaign lookup depends on exact subgroup targeting | regex search tests, limit handling, empty-result checks |
| CSG-RISK-003 | CSV export | CSV coupon export from subgroup context misses or misorders fields | 3 | 4 | 3 | 36 | P1 | Export is used for audit and support | CSV integrity, filter parity, row count checks |
| CSG-RISK-004 | Group scoping | Subgroups from another group or account leak into the response | 5 | 2 | 4 | 40 | P0 | Subgroups are group-scoped and account-scoped | cross-account and cross-group negative tests |
| CSG-RISK-005 | Date filtering | created/available date filters include or exclude the wrong subgroups | 3 | 4 | 3 | 36 | P1 | Filtering is used for operational reporting | boundary dates, timezone consistency, inclusive/exclusive edges |
| CSG-RISK-006 | Pagination | Limit/skip and count behavior drift from the visible subgroup set | 3 | 3 | 3 | 27 | P1 | Pagination affects admin review and exports | pagination parity, count endpoint checks |

## 4. Endpoint Clusters to Cover First

### P0 cluster
- `GET /api/coupon_subgroup/{coupon_group_id}`
- `GET /api/coupon_subgroup/{coupon_group_id}` with code/type-code filters

### P1 cluster
- CSV export branch, date filters, pagination, and count branch

## 5. Known Failure Modes

1. A subgroup is returned with totals that do not match the coupons underneath it.
2. Searching by code or type code returns empty results even though coupons exist.
3. CSV export reports a different number of coupons than the JSON list.
4. A subgroup from another account or group appears in the response because scoping is too broad.
5. Date filters include coupons that are outside the requested window.
6. Count and list endpoints disagree when pagination or search filters are combined.

## 6. Recommended Test Strategy

### Automated first
- count reconciliation tests for subgroup totals
- code and type-code search tests
- cross-group and cross-account scoping tests
- CSV export tests for subgroup and coupon views
- date filter boundary tests
- count/list parity tests with pagination enabled

### Manual first
- one subgroup drill-down from a known coupon batch
- one code search and one type-code search scenario
- one CSV export from a real campaign window
- one cross-account negative lookup

## 7. Test Data Requirements

- one account with multiple coupon groups
- one group with several coupon subgroups
- one subgroup with coupons already used and unused
- one subgroup with a known code and type code
- one subgroup outside the requested date window
- one non-admin user with restricted access

## 8. Exit Criteria for Coupon Subgroup API

The module can be considered covered enough for the first pass when:
- subgroup counts match coupon documents after create and use flows
- search filters return the intended subgroup set
- CSV export matches JSON totals and ordering expectations
- account and group isolation is verified
- pagination does not distort counts or response composition

## 9. Notes for QA Design

This module should be treated as a reporting consistency module. The highest-value tests are around count enrichment and filter accuracy, because those are the issues that erode trust in campaign reporting without necessarily breaking the API outright.

## 10. Next Update Needed

Revisit this register if subgroup counting moves to a different source of truth or if subgroup search/filter semantics are changed.
