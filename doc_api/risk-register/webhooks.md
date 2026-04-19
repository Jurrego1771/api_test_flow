# Webhooks API Risk Register

**Scope:** API only
**Module:** `webhooks`
**Source baseline:** current platform route layout and payment webhook handlers
**Date:** 2026-04-19
**Owner:** QA

## 1. Module Summary

The `webhooks` module is an integration layer for external providers such as Stripe, Mercado Pago, Tiaxa, Apple, Cielo, Kushki, Google, PayPal, Ventipay, and Zoom. In this repo it is not a user-facing CRUD API; it is a set of event ingestion handlers that update payments, purchases, account state, and related records.

The main risks are malformed payload acceptance, provider-specific event mapping errors, duplicate processing, retries that do not converge, and side effects that mutate the wrong purchase or payment record.

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
| WH-RISK-001 | Payload validation | Invalid webhook payload is accepted or partially processed | 5 | 4 | 4 | 80 | P0 | Bad events can mutate production billing state | schema checks, required fields, provider-specific contract tests |
| WH-RISK-002 | Event mapping | Provider event type/action maps to the wrong handler | 5 | 4 | 4 | 80 | P0 | Wrong handler means wrong side effects | event matrix tests, provider-to-handler mapping, unsupported events |
| WH-RISK-003 | Idempotency | Same webhook is processed more than once and duplicates side effects | 5 | 4 | 5 | 100 | P0 | Duplicate charge/payment state is a serious billing defect | dedupe tests, replay tests, retry behavior |
| WH-RISK-004 | Retry behavior | Retry loops never converge or stop too early | 5 | 3 | 4 | 60 | P0 | The code intentionally retries some handlers | retry limits, transient failure simulation, terminal failure mapping |
| WH-RISK-005 | Payment mutation | Webhook updates the wrong payment record or wrong purchase link | 5 | 4 | 5 | 100 | P0 | Billing state and support history depend on correct linkage | customer/payment lookup tests, purchase_id/transaction_id logic |
| WH-RISK-006 | Account scope | Webhook events mutate records across the wrong account | 5 | 3 | 5 | 75 | P0 | Tenant isolation is critical in multi-account billing | account lookup, negative cross-account fixtures |
| WH-RISK-007 | Status transitions | Payment/purchase status transitions are incorrect or incomplete | 5 | 4 | 4 | 80 | P0 | Billing state must be accurate for downstream workflows | success/failure/refund/chargeback transitions |
| WH-RISK-008 | Provider-specific parsing | Provider payload shape changes break parsing silently | 5 | 3 | 4 | 60 | P0 | External payloads are a high-churn surface | malformed payloads, missing nested fields, versioned variants |
| WH-RISK-009 | Stripe charge handling | Stripe charge succeeded updates amount, card, or transaction metadata incorrectly | 5 | 3 | 5 | 75 | P0 | Stripe directly updates the payment record | amount scaling, card extraction, invoice/transaction ID mapping |
| WH-RISK-010 | Mercado Pago handling | Mercado Pago webhook rejects valid events or processes unsupported events | 4 | 3 | 4 | 48 | P1 | Mercado Pago has a strict type/action matrix | supported event matrix, account validation, unsupported-event rejection |
| WH-RISK-011 | Tiaxa handling | Tiaxa activation/failure/unsubscribe events write the wrong billing state | 5 | 3 | 4 | 60 | P0 | Tiaxa is a billing-critical external integration | activation, coupon, failed, unsubscribe, duplicate replay |
| WH-RISK-012 | Refund/chargeback | Refund or dispute events do not reconcile against the original payment | 5 | 3 | 5 | 75 | P0 | Chargebacks/refunds are high impact and easy to miss | refunded/dispute event coverage, original payment lookup |
| WH-RISK-013 | Side effects | Webhook triggers partial updates and leaves inconsistent state | 5 | 3 | 4 | 60 | P0 | Some handlers update multiple records or fields | transaction boundaries, save failures, compensating behavior |
| WH-RISK-014 | Error mapping | Webhook errors return the wrong status code or leak internal details | 3 | 4 | 4 | 48 | P1 | Providers need predictable failure semantics | 400/404/412/500 mapping, message hygiene |
| WH-RISK-015 | Unsupported provider | Unknown provider route or event path behaves unpredictably | 3 | 3 | 3 | 27 | P1 | New integrations tend to fail here first | unsupported route coverage, explicit rejection behavior |
| WH-RISK-016 | Duplicate key / stale lookup | Reprocessing an event hits stale lookups or duplicate key conditions | 4 | 3 | 4 | 48 | P1 | Retry and replay conditions are common in webhook land | replay tests, duplicate event fixture, DB uniqueness |
| WH-RISK-017 | Observability | Webhook failures do not provide enough context for reconciliation | 3 | 4 | 4 | 48 | P1 | Support needs to diagnose provider failures quickly | error payloads, logging context, handler-specific messages |
| WH-RISK-018 | Provider drift | Provider payload/version drift breaks one handler while others still work | 4 | 3 | 4 | 48 | P1 | Each provider evolves independently | per-provider smoke suite and fixtures |

## 4. Endpoint Clusters to Cover First

### P0 cluster
- Stripe event handlers for payment success, refund, dispute, invoice, and subscription changes
- Mercado Pago webhook entrypoint and event matrix
- Tiaxa webhook entrypoint and event matrix
- any provider handler that mutates `Customer`, `CustomerPurchase`, or `PurchasePayment`

### P1 cluster
- provider routes with unsupported actions or malformed body
- routes that only validate and do not mutate state

## 5. Known Failure Modes

1. A webhook payload is accepted but updates the wrong payment because the lookup key changed.
2. The same provider event is replayed and the system applies the side effect twice.
3. A retry path never reaches a stable outcome and keeps returning transient failure.
4. A provider event with a valid shape is rejected because one nested field is missing or renamed.
5. A payment is marked successful, but amount, card, or transaction metadata is wrong.
6. A refund/dispute event is processed without reconciling the original payment.
7. An unsupported provider or action accidentally falls through into a partial mutation path.

## 6. Recommended Test Strategy

### Automated first
- provider-specific fixture tests for valid event payloads
- malformed payload tests with exact rejection codes
- idempotency and replay tests
- retry-path tests for transient failures
- account isolation tests for mutated billing records
- refund/dispute/success/failure state transition tests

### Manual first
- one happy-path event per active provider
- one failure-path event per active provider
- one replay test for a known event id
- one refund or dispute reconciliation test if the provider is active

## 7. Test Data Requirements

- one account per active payment provider
- one customer and one purchase per provider
- one payment fixture in pending state
- one payment fixture in success state
- one refund/dispute fixture for providers that support it
- one malformed payload fixture per provider family
- one duplicate/replay event fixture

## 8. Exit Criteria for Webhooks API

The module can be considered covered enough for the first pass when:
- every active provider has at least one happy-path and one failure-path test
- replay/idempotency behavior is explicitly verified where supported
- payment mutation side effects are asserted at the record level
- malformed payloads are rejected with deterministic status codes
- unsupported event types do not mutate state

## 9. Next Update Needed

This register should be revisited when a provider adds or changes event types, when webhook retries change, or when billing record linkage logic is refactored.
