# Customer API Risk Register

**Scope:** API only
**Module:** `customer`
**Source baseline:** current platform route layout and customer docs
**Date:** 2026-04-19
**Owner:** QA

## 1. Module Summary

The `customer` module is a large customer-identity and support surface. It handles customer CRUD, login/password recovery, sessions, devices, profile data, media progress, ratings, refunds, purchase linkage, analytics exports, and subscription/payment-adjacent operations.

This module is risky because it contains personally identifiable information, auth-like operations, and many nested sub-resources that feed billing, playback, and support workflows. A bug here can leak PII, break customer access, or corrupt purchase history.

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
| CUST-RISK-001 | Customer read | Sensitive customer data is exposed in list/detail responses | 5 | 4 | 4 | 80 | P0 | Customer records contain PII and auth-related data | secret masking, excluded fields, role differences |
| CUST-RISK-002 | Customer create/update | Partial updates overwrite unrelated customer fields | 5 | 4 | 4 | 80 | P0 | The update path touches many nested subtrees | field isolation, regression on untouched fields |
| CUST-RISK-003 | Email uniqueness | Duplicate customer emails are allowed or blocked incorrectly | 5 | 4 | 4 | 80 | P0 | Email is a primary identity field | uniqueness checks, federation edge cases, negative tests |
| CUST-RISK-004 | Password handling | Password validation or hashing is broken | 5 | 4 | 5 | 100 | P0 | Password security is central to customer access | validation, hashing, missing password behavior |
| CUST-RISK-005 | Login/authorization | Login or session-related flows accept invalid credentials or state | 5 | 4 | 5 | 100 | P0 | Customer access must be correct | login, session creation, invalid credentials, lockout cases |
| CUST-RISK-006 | Password recovery | Recover-password flow allows unauthorized resets or leaks token state | 5 | 3 | 5 | 75 | P0 | Account takeover risk is high | reset token issuance, lookup, invalid/expired cases |
| CUST-RISK-007 | Session lifecycle | Customer sessions are not revoked or expire incorrectly | 5 | 3 | 4 | 60 | P0 | Session control affects account security | create/detail/delete, expiry, account isolation |
| CUST-RISK-008 | Device lifecycle | Customer device create/update/delete corrupts playback/device history | 4 | 3 | 4 | 48 | P1 | Device state is used by auth and analytics | device CRUD, duplicate device ids, account scope |
| CUST-RISK-009 | Purchase linkage | Customer purchase records are corrupted or cross-linked incorrectly | 5 | 4 | 4 | 80 | P0 | Purchase history drives payment and entitlement flows | purchase create/update/detail, customer ownership |
| CUST-RISK-010 | Purchase payment | Customer purchase payment updates create inconsistent billing state | 5 | 4 | 5 | 100 | P0 | Billing correctness depends on this path | payment create/update/check, status transitions |
| CUST-RISK-011 | Subscription lifecycle | Subscription delete/cancel flows do not reconcile provider state | 5 | 3 | 5 | 75 | P0 | External billing subscriptions must be consistent | provider-specific delete paths, cancel semantics |
| CUST-RISK-012 | Refund handling | Refund requests or records are not linked to the correct payment | 5 | 3 | 4 | 60 | P0 | Refunds affect finance and support | refund create/index, purchase/payment linkage |
| CUST-RISK-013 | Media progress | Playback progress is lost, overwritten, or scoped incorrectly | 3 | 4 | 3 | 36 | P1 | Progress state is user-visible and easy to regress | create/update/delete/index, account isolation |
| CUST-RISK-014 | Customer profiles | Profile CRUD or list behavior exposes wrong profile data | 3 | 3 | 4 | 36 | P1 | Profiles may carry sensitive metadata | profile CRUD, status filtering, ownership |
| CUST-RISK-015 | Analytics export | CSV/analytics endpoints return wrong scope or malformed output | 4 | 4 | 4 | 64 | P0 | Support/reporting workflows rely on accurate exports | CSV output, pagination, filters, deleted-customer export |
| CUST-RISK-016 | Metadata filtering | Advanced metadata and nested query filters behave inconsistently | 4 | 4 | 3 | 48 | P1 | The query surface is complex and easy to break | metadata.* filters, social/external filters, date ranges |
| CUST-RISK-017 | Federation / external identity | Federation and external identity fields are mapped or filtered incorrectly | 4 | 3 | 4 | 48 | P1 | External identity affects matching and support | federationId, external_id, external[] behavior |
| CUST-RISK-018 | Account scope | One account can access or mutate another account's customers | 5 | 3 | 5 | 75 | P0 | Tenant isolation is non-negotiable | cross-account negative tests on all major endpoints |
| CUST-RISK-019 | Validation | Birthday, email, phone, social fields, and metadata limits validate inconsistently | 4 | 4 | 3 | 48 | P1 | Input normalization is spread across many fields | invalid dates, invalid email, length limits, trim/null |
| CUST-RISK-020 | Delete/deactivate | Deleted or deactivated customers still appear in active flows | 4 | 3 | 4 | 48 | P1 | Support/export flows must distinguish deleted data | delete vs obsolete handling, CSV deleted export |
| CUST-RISK-021 | Data masking in exports | CSV exports leak PII or sensitive metadata unexpectedly | 5 | 3 | 4 | 60 | P0 | Exports are a common leakage vector | CSV schema, downloadable metadata, masked fields |
| CUST-RISK-022 | Rate/limit guards | Validation limit rules reject valid payloads or allow oversized ones | 3 | 3 | 4 | 36 | P1 | Limits protect data quality and storage | validateChartsLimit branches, oversized payloads |
| CUST-RISK-023 | Error handling | 400/404/500 behavior is inconsistent across customer sub-resources | 3 | 4 | 3 | 36 | P1 | Consistent errors make support and automation reliable | response mapping, missing customer/session behavior |

## 4. Endpoint Clusters to Cover First

### P0 cluster
- `GET /api/customer`
- `POST /api/customer`
- `GET /api/customer/{customer_id}`
- `POST /api/customer/{customer_id}`
- `DELETE /api/customer/{customer_id}`
- `POST /api/customer/login`
- `POST /api/customer/check-password`
- `POST /api/customer/recover-password`
- `POST /api/customer/session`
- `DELETE /api/customer/session/{session_id}`
- `POST /api/customer/purchase`
- `POST /api/customer/purchase/{purchase_id}`
- `POST /api/customer/purchase/{purchase_id}/payment`
- `POST /api/customer/purchase/{purchase_id}/payment/{payment_id}`
- `POST /api/customer/purchase/{purchase_id}/payment/{payment_id}/check`
- `GET /api/customer/rating`
- `POST /api/customer/refund`
- `GET /api/customer/refund`
- deleted customer CSV export branch

### P1 cluster
- device CRUD
- profile CRUD
- media progress CRUD
- customer analytics endpoints
- subscription provider-specific delete/finish flows

## 5. Known Failure Modes

1. A customer list or detail response leaks a password, token, or another secret.
2. Two customers end up with the same email in the same account when they should not.
3. A partial update changes unrelated social or payment fields.
4. Login or password recovery works for an invalid state and creates an account takeover path.
5. A purchase/payment created under a customer is linked to the wrong account or customer id.
6. CSV export includes the wrong columns or leaks metadata that should not be exported.
7. Deleted customers still appear in active queries or support reports.
8. A nested metadata or social field update silently drops data because of normalization.

## 6. Recommended Test Strategy

### Automated first
- create/update/delete contract tests for customer CRUD
- login and password recovery tests with valid and invalid credentials
- session lifecycle tests
- cross-account isolation tests
- purchase/payment linkage tests
- CSV export structure tests
- invalid field and limit validation tests
- deleted-customer export tests

### Manual first
- one account creation and login flow
- one password recovery flow
- one customer update with nested social, metadata, and payment-adjacent fields
- one deleted-customer export check
- one purchase/payment flow tied to the customer

## 7. Test Data Requirements

- one active customer account
- one deleted customer fixture
- one customer with sessions
- one customer with devices and profiles
- one customer with purchase/payment history
- one customer with external identity fields
- one customer with social and metadata-heavy payloads
- one admin and one non-admin account for scope checks

## 8. Exit Criteria for Customer API

The module can be considered covered enough for the first pass when:
- customer CRUD has positive and negative tests
- login, password, and recovery flows are validated
- purchase/payment linkage is explicitly checked
- CSV exports are structurally verified
- account isolation is enforced across list and detail endpoints
- deleted customers are handled distinctly in exports and active queries

## 9. Next Update Needed

This register should be revisited when customer auth flows change, when new nested sub-resources are added, or when identity federation logic is refactored.
