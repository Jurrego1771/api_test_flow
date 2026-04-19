# Access API Risk Register

**Scope:** API only
**Module:** `access`
**Source baseline:** current platform Swagger and route layout
**Date:** 2026-04-19
**Owner:** QA

## 1. Module Summary

The `access` module is small in surface area but critical in business impact. It governs token issuance and validation for media and live content, including playback authorization, publishing checks, token expiration, IP/User-Agent binding, DRM and encryption flags, and token deletion. A defect here can either block legitimate playback or expose protected content.

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
| ACC-RISK-001 | Token issue | Token is issued with wrong scope or content id | 5 | 4 | 4 | 80 | P0 | Wrong token scope can grant or deny access incorrectly | id/type validation, media vs live routing, response contract |
| ACC-RISK-002 | Token validation | Valid token is rejected because of IP/User-Agent mismatch logic | 5 | 4 | 4 | 80 | P0 | Breaks playback for legitimate users | client_ip, user_agent, header/query parity, normalization |
| ACC-RISK-003 | Token validation | Invalid token is accepted | 5 | 3 | 5 | 75 | P0 | Direct unauthorized access risk | negative tests, forged token, missing token, wrong stream id |
| ACC-RISK-004 | Expiration | Token expiration is not enforced or is enforced too aggressively | 5 | 3 | 4 | 60 | P0 | Causes either content leakage or user-facing outages | TTL, max use, current_use, expired token behavior |
| ACC-RISK-005 | DRM/encryption | DRM or encrypted playback flags are applied incorrectly | 5 | 3 | 5 | 75 | P0 | Security and playback compatibility regressions are high impact | DRM-incompatible device cases, encrypted/non-encrypted media, admin bypass |
| ACC-RISK-006 | Public access | Public media path bypasses access restrictions unexpectedly | 5 | 3 | 5 | 75 | P0 | Could expose content meant to remain protected | public_access branch, advanced restrictions, closed access cases |
| ACC-RISK-007 | Publish validation | Publish token validation accepts the wrong live stream or rejects a valid one | 5 | 3 | 4 | 60 | P0 | Live publication reliability depends on this gate | token match, event lookup, invalid tcurl/body/header cases |
| ACC-RISK-008 | Token delete | Deleting a token does not actually invalidate it | 4 | 4 | 4 | 64 | P0 | Revocation must work immediately | delete path, cache invalidation, post-delete rejection |
| ACC-RISK-009 | Stream routing | Stream id normalization strips the wrong suffix or misses variants | 4 | 3 | 4 | 48 | P1 | Can reject valid playback for renditions or accept the wrong one | `_720p`/`_1080p` suffix handling, protocol override, edge variants |
| ACC-RISK-010 | Validation lock | Validation lock changes usage counting unexpectedly | 4 | 3 | 4 | 48 | P1 | Can undercount or overcount token consumption | repeated validations, max_use enforcement, race-like retries |
| ACC-RISK-011 | Account token | Account token binding is bypassed or miscompared | 5 | 2 | 5 | 50 | P0 | Can break account-level containment | acc_token mismatch, positive and negative paths |
| ACC-RISK-012 | Type handling | `media` and `live` type branching returns the wrong validation path | 5 | 3 | 4 | 60 | P0 | Two very different flows share the module | branch coverage for type, wrong headers, wrong ids |
| ACC-RISK-013 | Caching | Cached token or content data becomes stale and authorizes incorrectly | 5 | 3 | 4 | 60 | P0 | Access decisions depend on current content state | cache TTL, invalidation, post-update behavior |
| ACC-RISK-014 | Header/query parity | Query and header inputs behave differently across callers | 4 | 4 | 3 | 48 | P1 | Different clients may use different transport conventions | x-access-token vs query, x-client-ip vs query, x-user-agent vs query |
| ACC-RISK-015 | Error mapping | Invalid requests return misleading statuses or messages | 3 | 4 | 3 | 36 | P1 | Poor error handling makes failures hard to diagnose | 400/401/403 contract checks, missing id/type, invalid event |
| ACC-RISK-016 | Redis operations | Redis token lookup or update fails silently | 5 | 3 | 4 | 60 | P0 | Redis is a hard dependency for access validation | unavailable Redis, partial writes, key formatting, expiration update |
| ACC-RISK-017 | Publishing workflow | `check/publish` allows publishing without a valid token | 5 | 3 | 4 | 60 | P0 | Live publish gate is security-sensitive | token match, fallback behavior, invalid tcurl parsing |
| ACC-RISK-018 | Playback workflow | `check/play` and `check/playback` diverge in behavior | 4 | 3 | 4 | 48 | P1 | Similar endpoints should not create inconsistent client behavior | parity tests between endpoints, response/status consistency |

## 4. Endpoint Clusters to Cover First

### P0 cluster
- `POST /api/access/issue`
- `DELETE /api/access`
- `GET /api/access/check/play`
- `GET /api/access/check/playback`
- `GET /api/access/check/publish`
- `GET /api/access/check/start`

### P1 cluster
- header/query equivalence across all check endpoints
- stream suffix normalization variants
- validation lock and max-use combinations

## 5. Known Failure Modes

1. A valid token is rejected because the caller used headers instead of query params, or vice versa.
2. A token is issued for the wrong object type and later validates against the wrong content.
3. DRM or encryption logic flips access state for incompatible devices.
4. Token deletion updates Redis but the old token still validates because of stale state or bad key handling.
5. Publish validation accepts an invalid token when the request body carries an unexpected field layout.
6. Stream id normalization strips a rendition suffix incorrectly and blocks playback.
7. Expired tokens remain usable long enough to create a security or billing issue.

## 6. Recommended Test Strategy

### Automated first
- token issue happy path for `media` and `live`
- token validation negative cases for wrong id, wrong type, wrong ip, wrong user-agent, missing token
- expiry and max-use enforcement tests
- delete invalidation test against Redis-backed token lookup
- publish validation tests for valid and invalid live-stream tokens
- parity checks between query-based and header-based access paths

### Manual first
- one real media playback token flow
- one real live publish flow
- one DRM/encryption-sensitive flow if enabled in the environment
- one revocation scenario to confirm immediate invalidation

## 7. Test Data Requirements

- one protected media asset
- one protected live stream
- one public media asset
- one DRM-enabled fixture if the environment supports it
- one token bound to IP and user-agent
- one expired token fixture
- one token deletion fixture

## 8. Exit Criteria for Access API

The module can be considered covered enough for the first pass when:
- all P0 endpoints have automated positive and negative coverage
- token deletion is verified to invalidate the token immediately
- media and live token issuance both have scoped tests
- DRM/encryption branches are explicitly covered if enabled
- header-based and query-based access paths behave consistently

## 9. Next Update Needed

This register should be revisited if token storage changes, if Redis behavior changes, or if new client conventions appear for headers versus query parameters.
