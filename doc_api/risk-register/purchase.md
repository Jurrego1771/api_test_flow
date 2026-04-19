# Purchase API Risk Register

**Scope:** API only
**Module:** `purchase` and purchase payment flows
**Source baseline:** `sm2` route and schema inspection
**Date:** 2026-04-19
**Owner:** QA

## 1. Module Summary

The `purchase` surface in `sm2` spans customer purchases, purchase payments, admin purchase listing, invoice generation, and sale-driven purchase creation. It is tightly coupled to payment gateways and mutates state across `CustomerPurchase`, `PurchasePayment`, `Customer`, `Product`, invoice counters, and billing side effects.

This module is high risk because purchase creation is not isolated from payment processing, payment updates can promote a purchase to `SUCCESS`, invoice and e-fact generation happen during save hooks, and some gateway-specific flows include duplicate-subscription mitigation. A defect here can create double charges, duplicate purchases, broken subscription state, wrong invoices, or reconciliation drift.

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
| PUR-RISK-001 | Purchase creation | A purchase is created with the wrong product, gateway, or type mapping | 5 | 4 | 4 | 80 | P0 | The purchase becomes the source of truth for billing and access | payload validation, product mapping, type normalization |
| PUR-RISK-002 | Duplicate prevention | Duplicate purchases slip through because the duplicate check is partial or gateway-specific | 5 | 4 | 5 | 100 | P0 | Double billing or duplicate subscriptions are severe and hard to unwind | duplicate subscription cases, gateway-specific uniqueness, race tests |
| PUR-RISK-003 | Sale flow | Sale-driven purchase creation links the wrong reseller, seller, or activation state | 4 | 4 | 4 | 64 | P0 | Sales activation depends on correct purchase linkage | reseller/seller linkage, activation querystring, mail side effects |
| PUR-RISK-004 | Purchase payment creation | Payment creation mutates purchase state incorrectly or creates the wrong payment amount/status | 5 | 4 | 5 | 100 | P0 | This is the money path and feeds downstream status transitions | gateway matrix, paymentIntent, coupon, metadata, status mapping |
| PUR-RISK-005 | Payment-to-purchase promotion | Saving a successful payment promotes the wrong purchase or promotes it twice | 5 | 4 | 5 | 100 | P0 | `PurchasePayment` post-save can flip `CustomerPurchase.status` to SUCCESS | repeated saves, idempotency, status transition coverage |
| PUR-RISK-006 | Invoice generation | Invoice creation writes the wrong file, fails under concurrency, or reuses stale invoice numbers | 5 | 3 | 5 | 75 | P0 | Invoice numbering and PDF creation are accounting-sensitive | invoice counter tests, file generation, repeated access |
| PUR-RISK-007 | E-fact generation | Automatic e-fact creation triggers twice or with wrong billing data | 5 | 3 | 5 | 75 | P0 | The e-fact side effect is hard to reverse once emitted | billing branch tests, account billing config, duplicate prevention |
| PUR-RISK-008 | Subscription duplication handling | MercadoPago duplicate subscription cancellation fails or cancels the wrong purchase | 5 | 3 | 5 | 75 | P0 | The schema contains explicit duplicate-subscription cleanup logic | duplicate active subscription tests, cancellation side effects |
| PUR-RISK-009 | Purchase update | Manual update changes metadata or status in a way that breaks billing history | 4 | 4 | 4 | 64 | P0 | The update route can overwrite active financial state | metadata merge, status restriction, valid_until/cancel_date |
| PUR-RISK-010 | Payment status check | Gateway status check reports success/failure for the wrong payment or silently ignores an error | 5 | 3 | 4 | 60 | P0 | External gateway polling often reconciles final truth | check-status tests, not-found cases, gateway routing |
| PUR-RISK-011 | Listing and filtering | Purchase/payment list endpoints return the wrong scope, filters, or pagination | 3 | 4 | 3 | 36 | P1 | Admin and support workflows rely on accurate search | filters, paging, account scope, payment population |
| PUR-RISK-012 | CSV export | CSV export omits or misformats financial columns | 3 | 3 | 4 | 36 | P1 | Export is used for reconciliation and support | CSV row integrity, headers, date formatting, special chars |
| PUR-RISK-013 | Customer linkage | Purchase state and customer payment counts drift from actual payments | 4 | 3 | 4 | 48 | P1 | Customer payment counters are updated from payment hooks | count consistency, add/remove payment behavior |
| PUR-RISK-014 | Product locking | A successful payment locks the wrong payment method or fails to lock the intended one | 4 | 3 | 4 | 48 | P1 | Product state is altered from payment save hooks | post-save hook verification, product/paymentMethod lookup |
| PUR-RISK-015 | Legacy / compatibility branches | Old product or gateway compatibility branches behave differently from the current purchase flow | 3 | 3 | 4 | 36 | P1 | The code contains special cases and fallback paths | gateway matrix, legacy payloads, compatibility coverage |

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
- `GET /api/customer/{customer_id}/purchase/{purchase_id}/invoice`
- `GET /api/purchase`
- `POST /api/sale/customer/create`
- `POST /api/sale/customer/{reseller_id}/seller/{seller_id}/customer/{customer_id}/purchase`

### P1 cluster
- advanced payment search/export endpoints, legacy sale purchase update branches, payment detail and invoice retrieval, and admin/reconciliation queries

## 5. Known Failure Modes

1. A purchase is created twice for the same customer and product because duplicate detection is gateway-specific.
2. A payment save flips a purchase to `SUCCESS`, but the payment was not meant to finalize the purchase.
3. An invoice is generated with the wrong number, or the counter increments twice under retry.
4. `e_fact` generation is triggered automatically from save hooks and creates duplicate documents.
5. The MercadoPago duplicate-subscription cleanup path cancels the wrong active subscription.
6. The purchase update route merges metadata correctly but still lets a support edit corrupt financial history.
7. CSV export returns incomplete or malformed payment rows, breaking reconciliation.
8. Customer payment counts drift from the actual number of payments because hook execution is partial.

## 6. Recommended Test Strategy

### Automated first
- duplicate purchase tests by gateway and product type
- payment creation tests for each supported gateway and coupon path
- payment save tests that verify purchase promotion to `SUCCESS` only once
- invoice generation tests with stable invoice counter behavior
- e-fact generation tests with billing enabled and disabled accounts
- payment status check tests for success, failure, and not-found branches
- list/filter/pagination tests for purchases and payments
- CSV export tests with row/header integrity
- legacy compatibility tests for sale-driven creation branches

### Manual first
- one end-to-end purchase creation and payment completion flow
- one duplicate-subscription reproduction for a supported recurring gateway
- one invoice download path and one e-fact path on a staged account
- one support-style manual update of metadata and cancel date
- one CSV reconciliation export with real-looking data

## 7. Test Data Requirements

- one customer with no purchases
- one customer with an active subscription
- one customer with a PPV purchase
- one product with a platform gateway
- one product with a recurring payment gateway
- one product with a coupon path
- one account with billing enabled for e-fact
- one account with billing disabled for e-fact
- one purchase with invoice number assigned
- one purchase with multiple payments and mixed statuses

## 8. Exit Criteria for Purchase API

The module can be considered covered enough for the first pass when:
- duplicate purchase prevention is tested for the supported gateway-specific branches
- payment create/update/check paths are covered for the main gateway matrix
- successful payment promotion to purchase `SUCCESS` is asserted exactly once
- invoice and e-fact hooks are verified with no duplicate side effects
- CSV export and admin listing are contract-tested
- sale-driven purchase creation has at least one happy path and one failure path

## 9. Notes for QA Design

This module should be treated as a money-and-state module, not a pure CRUD surface. The most valuable tests are around duplicate prevention, payment finalization, and hook-driven side effects, because those are the failures that cause financial drift and are hardest to spot manually.

## 10. Next Update Needed

Revisit this register if gateway support changes, if invoice or e-fact generation is moved out of save hooks, or if purchase creation is decoupled from payment finalization.
