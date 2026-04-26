# Account API Risk Register

**Scope:** API only
**Module:** `account`
**Source baseline:** current platform route layout
**Date:** 2026-04-19
**Owner:** QA

## 1. Module Summary

The `account` module is a high-risk cross-cutting configuration surface. It exposes account profile data and mutates many account-level settings, including login options, payment provider configuration, social integrations, analytics, CDN-related settings, peering, billing, AI/ITG/PlayAnywhere integrations, whitelists, and media defaults.

This module is dangerous because small mistakes can affect almost every other module in the platform. A bad update can break login, payments, playback defaults, whitelists, provider integrations, or feature flags across the account.

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
| ACCNT-RISK-001 | Account read | Account payload leaks sensitive fields or omits required runtime data | 5 | 3 | 4 | 60 | P0 | Account data contains many secrets and runtime configs | response contract, secret masking, role-based differences |
| ACCNT-RISK-002 | Core update | Partial update mutates unrelated account settings | 5 | 4 | 4 | 80 | P0 | The update route touches many independent subtrees | field isolation, regression on untouched settings |
| ACCNT-RISK-003 | Password change | Password update flow accepts weak or invalid passwords, or fails to persist securely | 5 | 3 | 4 | 60 | P0 | Authentication security depends on this path | password validation, hashing, user-save behavior |
| ACCNT-RISK-004 | Login whitelist | IP whitelist is applied incorrectly and blocks admins or allows invalid clients | 5 | 4 | 4 | 80 | P0 | Can lock out the whole account or weaken access control | whitelist validation, public IP checks, admin exceptions |
| ACCNT-RISK-005 | Payment config | Payment provider credentials are stored or updated incorrectly | 5 | 4 | 5 | 100 | P0 | Broken credentials affect checkout and billing | stripe/kushki/mp/paypal/tiaxa/ventipay validation, required fields |
| ACCNT-RISK-006 | Feature flags | Enabling/disabling account modules leaves inconsistent state across consumers | 5 | 3 | 4 | 60 | P0 | Many flows branch on these flags | module flag tests, dependent branch coverage |
| ACCNT-RISK-007 | Social integrations | Social token/connection updates leak secrets or corrupt integration state | 4 | 3 | 4 | 48 | P1 | Social APIs rely on these secrets and defaults | secret masking, update merge behavior, defaults |
| ACCNT-RISK-008 | Zoom accounts | Zoom account metadata or tokens are exposed or overwritten incorrectly | 4 | 3 | 4 | 48 | P1 | Zoom accounts are filtered/masked for a reason | token masking, account mapping, enabled flags |
| ACCNT-RISK-009 | Google Analytics | GA tracking ID validation accepts bad input or strips valid data | 3 | 4 | 3 | 36 | P1 | Analytics setup should be predictable | format validation, whitespace trimming, null handling |
| ACCNT-RISK-010 | CDN / playback defaults | Default player skin, logo URLs, and playback defaults are saved incorrectly | 4 | 3 | 3 | 36 | P1 | These settings affect many UI/player consumers | default player skin, logo, media defaults |
| ACCNT-RISK-011 | Whitelists | Login whitelist change can brick admin access or fail to validate client IP | 5 | 3 | 5 | 75 | P0 | This can lock out operators entirely | whitelist negative/positive tests, range checks |
| ACCNT-RISK-012 | Billing settings | Billing and provider subtrees accept malformed or partial config | 5 | 3 | 5 | 75 | P0 | Billing configuration is operationally sensitive | DGI, payments, provider branches, secret fields |
| ACCNT-RISK-013 | External integrations | Third-party integration settings are persisted with wrong ownership or scope | 4 | 3 | 4 | 48 | P1 | Multiple external services are configured here | account scope, required fields, per-provider updates |
| ACCNT-RISK-014 | Permission bypass | Non-admin users can mutate admin-only configuration branches | 5 | 3 | 5 | 75 | P0 | This is a security boundary, not a preference | role-based negative tests, admin-only branches |
| ACCNT-RISK-015 | Data normalization | Empty strings, nulls, and trimming behavior corrupt stored settings | 4 | 4 | 3 | 48 | P1 | This route heavily normalizes inputs | null/empty/trim edge cases across fields |
| ACCNT-RISK-016 | Cross-module blast radius | A bad account update breaks other modules that depend on these settings | 5 | 4 | 4 | 80 | P0 | Many modules read from account config continuously | dependency-aware regression checks |
| ACCNT-RISK-017 | Recommended shows default | Recommended shows default update mutates the wrong config or fails mid-way | 3 | 2 | 4 | 24 | P1 | Feature-specific but still account-scoped | conditional update path, integration flag dependency |
| ACCNT-RISK-018 | Error handling | Validation or DB errors are masked or returned with wrong status | 3 | 4 | 3 | 36 | P1 | Operators need clear errors to recover safely | 400/404/500 mapping, duplicate Mailchimp branch |

## 4. Endpoint Clusters to Cover First

### P0 cluster
- `GET /api/account`
- `POST /api/account`
- `POST /api/account/password`
- `POST /api/account/login_ip_whitelist`
- payment provider configuration branches inside account update
- admin-only integration branches inside account update

### P1 cluster
- logo and player default fields
- social token/connection branches
- analytics, peering, DFP, ITG, PlayAnywhere, feeds, Mailchimp, recommended shows defaults

## 5. Known Failure Modes

1. An account update succeeds but silently changes a field that the caller did not intend to touch.
2. A login whitelist update locks out valid admins or accepts an invalid public IP.
3. A payment provider secret is truncated, normalized, or overwritten incorrectly.
4. A non-admin user mutates a branch that should have been admin-only.
5. A secret leaks back in the `GET /api/account` response.
6. A conditional sub-update returns success even when the nested update failed.
7. Empty-string handling converts a valid setting into `null` or an empty object unexpectedly.

## 6. Recommended Test Strategy

### Automated first
- read response shape and secret masking checks
- update isolation tests for unrelated fields
- admin vs non-admin authorization tests
- whitelist positive/negative tests using IP-range fixtures
- provider credential branch tests for each active provider family
- null/empty/trim normalization tests
- duplicate Mailchimp list id negative test

### Manual first
- one full account update smoke test in a staging account
- one login whitelist change and recovery test
- one payment config change test in a non-production environment
- one admin-only branch rejection test

## 7. Test Data Requirements

- one admin account
- one non-admin account
- one account with existing provider config
- one account with login whitelist enabled
- one account with social tokens and zoom accounts
- one account with payment provider configs populated
- one account with recommended-shows enabled if the feature is active

## 8. Exit Criteria for Account API

The module can be considered covered enough for the first pass when:
- read responses do not leak sensitive fields
- whitelist updates are tested for valid and invalid client IPs
- admin-only branches reject non-admins
- payment/provider config branches have at least one happy-path and one negative-path test
- unrelated account fields stay unchanged after updates

## 9. Next Update Needed

This register should be revisited whenever new account-level integrations are added, when login policy changes, or when any shared config subtree is refactored.
