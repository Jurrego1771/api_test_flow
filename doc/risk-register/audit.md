# Audit API Risk Register

**Scope:** API only
**Module:** `audit`
**Source baseline:** `sm2` route and schema inspection
**Date:** 2026-04-19
**Owner:** QA

## 1. Module Summary

The `audit` module is a read-only traceability surface. It aggregates audit records by time, module, user, account, event, and media references, and redacts sensitive fields from the returned payload. It is used for support, troubleshooting, and operational review.

This module is risky because it can expose sensitive operational data if filters or redaction fail, and because its scope rules differ for admins and non-admins. It also extends some modules semantically, such as `coupon` including `coupon-group`, so incorrect module mapping can hide or inflate audit results.

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
| AUD-RISK-001 | Access control | Non-admin users see audits outside their account scope | 5 | 3 | 4 | 60 | P0 | Audit data can reveal sensitive operational details | account scoping, non-admin filters, negative tests |
| AUD-RISK-002 | Redaction | Sensitive fields are not removed from returned audit payloads | 5 | 3 | 5 | 75 | P0 | The endpoint intentionally strips sensitive data from `data` | redaction checks, password masking, nested payloads |
| AUD-RISK-003 | Module filters | Module filtering misses or over-includes related audit entries | 4 | 4 | 4 | 64 | P0 | Incorrect module grouping misleads support workflows | coupon extent, module match, all-module behavior |
| AUD-RISK-004 | Time window | Time filters return the wrong audit window or exclude valid records | 4 | 4 | 3 | 48 | P1 | Audits are often investigated by date range | start/end boundaries, timezone behavior, inclusive edges |
| AUD-RISK-005 | Media/event matching | Media-based or event-based audit lookup misses relevant records | 4 | 3 | 4 | 48 | P1 | Search by media/event is a primary support use case | regex match behavior, live vs media branch |
| AUD-RISK-006 | Admin scope | Admin account filtering returns the wrong account set or leaks data | 5 | 2 | 4 | 40 | P0 | Admins can query multiple accounts, so scope must be exact | account list filtering, admin-only branches |
| AUD-RISK-007 | Sorting/pagination | Sorting, skip, or limit produce unstable or incomplete audit views | 3 | 4 | 3 | 36 | P1 | Audit review depends on stable pagination | sort mapping, limit caps, page traversal |
| AUD-RISK-008 | Count parity | Count mode disagrees with list mode for the same query filters | 3 | 4 | 3 | 36 | P1 | Support often compares counts to list results | count/list parity, query reuse |
| AUD-RISK-009 | Parse stability | Serialization or redaction throws on unusual audit documents | 4 | 2 | 4 | 32 | P1 | The response rewrites each document with JSON parsing | malformed data handling, error path coverage |

## 4. Endpoint Clusters to Cover First

### P0 cluster
- `GET /api/audit`
- `GET /api/audit?count=true`
- admin-only multi-account filter branch
- non-admin account-scoped branch

### P1 cluster
- time filters, module filters, user filters, media filters, event filters, sorting, and pagination

## 5. Known Failure Modes

1. A non-admin user can query audit data outside their own account.
2. A sensitive field leaks because redaction misses a nested structure.
3. `coupon` audits are returned without the related `coupon-group` context or with extra unrelated rows.
4. Count mode and list mode disagree for the same query.
5. Media-based or live-stream-based audit lookup misses relevant records because the regex match is too narrow.
6. Sorting and pagination produce unstable slices that make investigations hard to reproduce.

## 6. Recommended Test Strategy

### Automated first
- non-admin account-scoping tests
- admin multi-account tests
- redaction tests for sensitive fields in `data`
- module filter tests, including `coupon` and `coupon-group`
- date range boundary tests
- media/event matching tests
- count/list parity tests
- pagination and sort tests

### Manual first
- one support-style audit lookup by time range
- one admin cross-account audit lookup
- one coupon-related audit lookup
- one media-related audit lookup

## 7. Test Data Requirements

- one account with audit data for several modules
- one admin user and one non-admin user
- one audit with sensitive nested data
- one audit for `coupon`
- one audit for `coupon-group`
- one audit for a live stream event
- one audit for a media upload or media change

## 8. Exit Criteria for Audit API

The module can be considered covered enough for the first pass when:
- account scoping is enforced for admin and non-admin branches
- sensitive fields are redacted from returned audit payloads
- module filtering behaves consistently, including coupon extent
- count and list views agree for the same query
- time and pagination boundaries are covered

## 9. Notes for QA Design

This module is read-only, but it is still security-sensitive. The highest-value tests are about access control and redaction, because those defects can expose internal data without breaking the endpoint outright.

## 10. Next Update Needed

Revisit this register if audit scope expands to write operations, if additional fields must be redacted, or if module extent mappings change.
