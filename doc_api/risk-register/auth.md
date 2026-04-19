# Auth API Risk Register

**Scope:** API only
**Module:** `auth`
**Source baseline:** current platform route layout and access-token docs
**Date:** 2026-04-19
**Owner:** QA

## 1. Module Summary

The `auth` module handles streaming token issuance, validation, and revocation for protected playback paths. It is small in surface area but security-critical. A defect here can either block legitimate playback or allow unauthorized consumption of protected media or live content.

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
| AUTH-RISK-001 | Token issue | Token is issued without validating app credentials correctly | 5 | 4 | 4 | 80 | P0 | Unauthorized token issuance is a direct security defect | app_id/app_secret validation, missing session, negative cases |
| AUTH-RISK-002 | Token issue | Issued token is malformed or not unique | 5 | 3 | 4 | 60 | P0 | A bad token breaks playback or collides with other sessions | uniqueness, length/format, persistence integrity |
| AUTH-RISK-003 | Token validation | Valid token is rejected incorrectly | 5 | 4 | 4 | 80 | P0 | Playback should not fail for legitimate users | positive path, header/query parity, watchdog branch |
| AUTH-RISK-004 | Token validation | Invalid token is accepted | 5 | 4 | 5 | 100 | P0 | This is the main security failure mode | forged token, expired token, wrong session, wrong status flags |
| AUTH-RISK-005 | Revocation | Clearing a token fails to invalidate it everywhere | 5 | 4 | 5 | 100 | P0 | Revocation must be immediate and complete | updateMany behavior, session-based revoke, post-revoke checks |
| AUTH-RISK-006 | Session binding | Token/session binding is lost or mismatched | 5 | 3 | 4 | 60 | P0 | Session-based revocation and auditing depend on it | session issue, revoke by session, duplicate sessions |
| AUTH-RISK-007 | Watchdog path | Watchdog validation path bypasses or corrupts token state | 4 | 3 | 4 | 48 | P1 | Special validation mode should not alter normal behavior | watchdog flag, state transition, branch coverage |
| AUTH-RISK-008 | Redis / DB persistence | Token state is not persisted consistently across reads and writes | 5 | 3 | 4 | 60 | P0 | Streaming tokens rely on durable state | save/update consistency, lookup state, failure simulation |
| AUTH-RISK-009 | Error handling | Authentication failures return misleading status or headers | 3 | 4 | 3 | 36 | P1 | Clients depend on deterministic responses | X-Status behavior, JSON shape, unauthorized responses |
| AUTH-RISK-010 | Input validation | Missing required fields are accepted or mishandled | 4 | 4 | 3 | 48 | P1 | Bad requests should fail early | missing id, missing secret, missing session, null token |
| AUTH-RISK-011 | Replay / duplicate issue | Multiple token issue requests create overlapping valid tokens unexpectedly | 4 | 3 | 4 | 48 | P1 | Replay can create confusing access state | duplicate issuance, multi-session fixtures, cleanup |
| AUTH-RISK-012 | Token lifecycle | Expired or invalid tokens remain usable after revocation or expiration | 5 | 3 | 5 | 75 | P0 | Revocation/expiration must be strict | lifecycle tests, post-revoke validation, expired state |
| AUTH-RISK-013 | Compatibility | Header/query token inputs behave differently across clients | 4 | 3 | 3 | 36 | P1 | Different clients may use different transport conventions | token via query vs header, normalization parity |
| AUTH-RISK-014 | Observability | Authentication failures do not provide enough context for support | 2 | 4 | 4 | 32 | P1 | Token incidents are hard to diagnose without good context | log/response consistency, no secret leakage |

## 4. Endpoint Clusters to Cover First

### P0 cluster
- `GET /api/auth/issue`
- `GET /api/auth/token`
- `GET /api/auth/cleartoken`

### P1 cluster
- missing or malformed input branches
- watchdog branch in token validation
- header/query equivalence where supported

## 5. Known Failure Modes

1. A token is issued for a request that should have been rejected.
2. A valid token fails validation because the wrong state bit was persisted.
3. Clearing a token by session or token id does not actually revoke access.
4. The watchdog branch changes behavior in a way that normal clients can accidentally trigger.
5. The token is accepted after it should have expired or been invalidated.
6. Missing required fields return a misleading success-like response.

## 6. Recommended Test Strategy

### Automated first
- app credential negative/positive tests for token issuance
- token validation tests for valid, invalid, expired, and revoked states
- session revoke tests
- watchdog branch tests
- malformed input tests
- response header/status checks

### Manual first
- one end-to-end issue/validate/revoke cycle
- one invalid credential cycle
- one session revocation cycle

## 7. Test Data Requirements

- one valid streaming app credential pair
- one invalid credential pair
- one issued token fixture
- one session fixture tied to a token
- one revoked token fixture
- one expired or manually invalidated token fixture

## 8. Exit Criteria for Auth API

The module can be considered covered enough for the first pass when:
- token issue, validate, and revoke have happy-path and negative-path tests
- invalid credentials never yield a token
- revoked tokens fail immediately
- session-based revocation is covered
- response headers and JSON status are asserted exactly where used

## 9. Next Update Needed

This register should be revisited if streaming token format changes, if credential validation is moved elsewhere, or if token state storage changes from the current model.
