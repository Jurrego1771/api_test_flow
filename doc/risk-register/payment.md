# Payment API Risk Register

**Scope:** API only
**Module:** `payment`
**Source baseline:** current platform Swagger and route layout
**Date:** 2026-04-19
**Owner:** QA

## 1. Module Summary

The `payment` module is one of the highest-risk API areas because it handles customer purchases, payment attempts, gateway status updates, payment queries, CSV export, and gateway-specific flows. Failures here can create direct financial impact, duplicate charges, broken reconciliation, or customer-facing purchase issues.

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
| PAY-RISK-001 | Purchase create/update | Duplicate or inconsistent purchase records | 5 | 4 | 4 | 80 | P0 | Can charge or provision customers incorrectly | duplicate protection, idempotency, status transitions, response shape |
| PAY-RISK-002 | Payment creation | Gateway-specific body or options are rejected or misrouted | 5 | 4 | 4 | 80 | P0 | Payment initiation is the first critical step | gateway matrix, required fields, invalid gateway, body validation |
| PAY-RISK-003 | Payment status | Payment is marked success/failure incorrectly | 5 | 3 | 5 | 75 | P0 | A wrong state affects revenue and fulfillment | state transitions, status normalization, gateway refresh checks |
| PAY-RISK-004 | Account isolation | Cross-account purchase/payment leakage | 5 | 3 | 5 | 75 | P0 | Security and data isolation issue | authz, customer scope, purchase scope, negative tests |
| PAY-RISK-005 | Gateway integration | External gateway errors are not handled cleanly | 5 | 4 | 4 | 80 | P0 | Gateway outages or bad responses can break checkout | timeout, malformed payload, retry behavior, failure mapping |
| PAY-RISK-006 | Tiaxa token flow | Token generation or redirect URL assembly fails | 5 | 3 | 4 | 60 | P0 | Can block payment page access for Tiaxa customers | config validation, token response parsing, URL contract |
| PAY-RISK-007 | Payment check | Refresh/check endpoint diverges from gateway reality | 5 | 3 | 4 | 60 | P0 | Reconciliation depends on accurate status sync | check endpoint, stale status, bad options, 404 behavior |
| PAY-RISK-008 | Query/list | Payment listing returns wrong account, wrong filters, or wrong pagination | 4 | 4 | 3 | 48 | P1 | Used heavily for support and accounting | filter matrix, limit/page/skip, customer/purchase filters |
| PAY-RISK-009 | CSV export | CSV stream breaks encoding, delimiters, or field mapping | 4 | 3 | 4 | 48 | P1 | Export is support-critical and easy to regress | stream response, headers, delimiter, large dataset smoke |
| PAY-RISK-010 | Search | Advanced search returns inaccurate or incomplete results | 4 | 3 | 4 | 48 | P1 | Support teams rely on this for investigation | status, gateway, date range, transaction id, credit card last4 |
| PAY-RISK-011 | Metadata | Payment metadata is stored or updated incorrectly | 4 | 3 | 3 | 36 | P1 | Metadata often carries gateway references and reconciliation keys | partial updates, merge behavior, non-destructive updates |
| PAY-RISK-012 | Customer-purchase consistency | Purchase and payment relations drift apart | 5 | 3 | 4 | 60 | P0 | Broken relation causes missing history or wrong billing view | linkage checks, create/update/check lifecycle |
| PAY-RISK-013 | Validation | Invalid or missing required fields are accepted or produce wrong status codes | 4 | 4 | 3 | 48 | P1 | Bad input should fail early and consistently | schema validation, 400/404 mapping, edge values |
| PAY-RISK-014 | Deprecated PayPal | Stale or deprecated PayPal endpoint behavior changes unexpectedly | 3 | 2 | 3 | 18 | P2 | Deprecated routes still need regression coverage | confirm 410 response and no accidental reactivation |
| PAY-RISK-015 | Product mapping | Payment method does not match configured product method | 5 | 3 | 4 | 60 | P0 | Checkout can accept invalid combinations or reject valid ones | product/payment-method compatibility, negative combinations |
| PAY-RISK-016 | Partial failure | Purchase is created but payment flow fails mid-way | 5 | 3 | 5 | 75 | P0 | Can leave customers in inconsistent billing state | rollback expectations, compensating behavior, retry semantics |
| PAY-RISK-017 | Observability | Failures are logged without enough context to reconcile incidents | 3 | 4 | 4 | 48 | P1 | Hard to support production payment incidents without traceability | error payloads, log context, correlation keys |
| PAY-RISK-018 | Performance | Payment list and export queries degrade with account growth | 4 | 3 | 4 | 48 | P1 | Support and finance queries become slow or time out | pagination, cursor path, large-account smoke |

## 4. Endpoint Clusters to Cover First

### P0 cluster
- `GET /api/customer/{customer_id}/purchase`
- `POST /api/customer/{customer_id}/purchase`
- `GET /api/customer/{customer_id}/purchase/{purchase_id}`
- `POST /api/customer/{customer_id}/purchase/{purchase_id}`
- `GET /api/customer/{customer_id}/purchase/{purchase_id}/payment`
- `POST /api/customer/{customer_id}/purchase/{purchase_id}/payment`
- `POST /api/customer/{customer_id}/purchase/{purchase_id}/payment/{payment_id}`
- `POST /api/customer/{customer_id}/purchase/{purchase_id}/payment/{payment_id}/check`
- `GET /api/customer/payment`
- `GET /api/customer/payment/{payment_id}`
- `GET /api/payment/tiaxa/token`

### P1 cluster
- CSV export path on `GET /api/customer/payment?format=csv`
- advanced search path on `GET /api/customer/payment?advanced_search=true`
- filter combinations for status, gateway, date range, customer, purchase, product

### P2 cluster
- deprecated PayPal route behavior and status code
- support-only edge cases that are already intentionally disabled

## 5. Known Failure Modes

1. Purchase is created successfully but payment initiation fails, leaving an orphaned purchase.
2. Gateway response is malformed but the API still returns a success-looking payload.
3. Status refresh disagrees with gateway truth and support cannot reconcile it.
4. CSV export streams partial data or wrong columns for finance teams.
5. A customer sees another account's payment history because filters or scoping are wrong.
6. Tiaxa flow fails due to bad config, token parsing, or URL assembly.
7. Duplicate requests create duplicate payments or duplicate purchase state transitions.

## 6. Recommended Test Strategy

### Automated first
- contract tests for purchase and payment create/update/check responses
- negative tests for missing/invalid gateway, customer, purchase, and payment ids
- cross-account authorization tests
- idempotency and duplicate-request tests where supported
- CSV export smoke with small fixture set
- status refresh tests with mocked gateway responses

### Manual first
- one end-to-end happy path per gateway that is actively used
- one end-to-end failure path per gateway
- support-style query and CSV export check for real fixtures
- Tiaxa redirect/token flow if the integration is active in the environment

## 7. Test Data Requirements

- one customer with an active purchase
- one purchase per active gateway
- one payment in each key status: pending, success, failure, refunded
- one invalid gateway fixture
- one cross-account fixture
- one dataset large enough to exercise pagination and CSV output

## 8. Exit Criteria for Payment API

The module can be considered covered enough for the first pass when:
- all P0 endpoints have automated smoke coverage
- every gateway currently in use has at least one happy-path and one failure-path test
- cross-account leakage tests pass
- CSV export has at least one structural test
- deprecated routes are explicitly asserted and not left untested by accident

## 9. Next Update Needed

This register should be revisited after the first real payment API run, especially if the active gateway set changes or if reconciliation issues appear.
