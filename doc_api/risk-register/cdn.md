# CDN API Risk Register

**Scope:** API only
**Module:** `cdn`
**Source baseline:** current platform Swagger and route layout
**Date:** 2026-04-19
**Owner:** QA

## 1. Module Summary

The `cdn` module in this repo is an administrative API for managing CDN distributions and CDN certificates. It does not test edge delivery itself; it tests configuration integrity, ownership, and the correctness of the data needed for delivery infrastructure.

The highest risks are malformed origin graphs, duplicate URLs, certificate handling mistakes, and account leakage. Those issues can break downstream delivery or make the wrong CDN configuration active.

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
| CDN-RISK-001 | Distribution CRUD | Distribution payload persists invalid origin, group, or request_path structure | 5 | 4 | 4 | 80 | P0 | Bad config can break downstream delivery | schema validation, nested mapping, response contract |
| CDN-RISK-002 | Distribution CRUD | Distribution create/update mutates IDs incorrectly when remapping nested objects | 5 | 4 | 4 | 80 | P0 | The code remaps placeholder IDs before save | nested ID remap tests, origin/group/path linkage |
| CDN-RISK-003 | URL uniqueness | Duplicate CDN URLs are accepted or rejected inconsistently | 5 | 4 | 4 | 80 | P0 | URL uniqueness is critical for routing and DNS ownership | duplicate key behavior, error mapping, update conflicts |
| CDN-RISK-004 | Account isolation | One account can read or mutate another account's CDN resources | 5 | 3 | 5 | 75 | P0 | Security and tenant isolation issue | authz, account scoping, negative reads/updates/deletes |
| CDN-RISK-005 | Certificate CRUD | CDN certificate create/update stores malformed or incomplete cert material | 5 | 3 | 5 | 75 | P0 | Broken certificates can invalidate delivery setup | key/crt/chain validation, required fields, persistence |
| CDN-RISK-006 | Certificate ownership | Certificates can be linked to the wrong account or exposed cross-account | 5 | 3 | 5 | 75 | P0 | CDN certs are sensitive operational data | account scoping, cross-account negative tests |
| CDN-RISK-007 | Distribution delete | Deleting a CDN distribution leaves stale references or misleading success | 4 | 3 | 4 | 48 | P1 | Downstream config may still reference the deleted resource | delete result, post-delete 404, orphan checks |
| CDN-RISK-008 | Certificate delete | Deleting a certificate leaves stale references or invalid active config | 4 | 3 | 4 | 48 | P1 | Certificates are usually referenced by distributions | delete result, relation checks, post-delete lookup |
| CDN-RISK-009 | Validation mapping | Invalid payloads return the wrong HTTP status or error code | 4 | 4 | 3 | 48 | P1 | Consumers need predictable failure handling | 400 vs 404 vs 500 mapping, invalid field names |
| CDN-RISK-010 | Query/list | List endpoints return wrong account scope or incomplete sets | 4 | 4 | 3 | 48 | P1 | Admin tools rely on accurate listing | account filters, empty lists, pagination if added later |
| CDN-RISK-011 | Nested origin relationships | Origin groups reference unknown origins or cyclic/missing references | 5 | 3 | 4 | 60 | P0 | Distribution graph integrity matters for routing | referential integrity, missing id, remap coverage |
| CDN-RISK-012 | Request path routing | Request path patterns and origin bindings are stored incorrectly | 5 | 3 | 4 | 60 | P0 | Routing behavior depends on these bindings | regex pattern persistence, origin binding, order sensitivity |
| CDN-RISK-013 | Error handling | Database or validation failures are masked behind generic errors | 3 | 4 | 4 | 48 | P1 | Hard to diagnose config problems without precise errors | error payloads, invalid fields, duplicate URL branches |
| CDN-RISK-014 | Response contract | Distribution/certificate responses drift from the API contract | 4 | 4 | 4 | 64 | P0 | Clients and admin tools depend on stable shapes | snapshot tests for list/detail/create/update/delete |
| CDN-RISK-015 | Unsupported delivery assumptions | API tests accidentally overreach into edge delivery behavior | 2 | 3 | 4 | 24 | P1 | This repo should not pretend to validate edge runtime | keep scope on config only, separate integration tests later |

## 4. Endpoint Clusters to Cover First

### P0 cluster
- `GET /api/cdn/cdn`
- `POST /api/cdn/cdn`
- `GET /api/cdn/cdn/{cdn_distribution_id}`
- `POST /api/cdn/cdn/{cdn_distribution_id}`
- `DELETE /api/cdn/cdn/{cdn_distribution_id}`
- `GET /api/cdn/certificte`
- `POST /api/cdn/certificte`
- `GET /api/cdn/certificte/{cdn_certificate_id}`
- `POST /api/cdn/certificte/{cdn_certificate_id}`
- `DELETE /api/cdn/certificte/{cdn_certificate_id}`

### P1 cluster
- duplicate URL validation paths
- invalid cert material paths
- missing resource paths

## 5. Known Failure Modes

1. A distribution saves, but nested origin IDs or group references are no longer coherent.
2. A duplicate URL slips through or produces the wrong error mapping.
3. Certificate material is saved with missing fields and only fails downstream.
4. One account can retrieve or mutate another account's CDN data.
5. A delete call succeeds but the config still appears reachable in follow-up reads.
6. The API accepts malformed request_path patterns that later break routing.
7. A generic DB error hides a validation problem that should be actionable.

## 6. Recommended Test Strategy

### Automated first
- create/update/delete contract tests for distributions and certificates
- nested object remap tests for placeholder IDs in origin, origin_group, request_path
- account isolation tests for read/write/delete
- duplicate URL validation tests
- invalid cert material tests
- response snapshot tests for list/detail/create/update/delete flows

### Manual first
- one distribution create/update/delete flow
- one certificate create/update/delete flow
- one duplicate URL scenario
- one invalid request_path/origin graph scenario

## 7. Test Data Requirements

- one valid CDN distribution fixture
- one valid CDN certificate fixture
- one duplicate URL fixture
- one invalid certificate fixture
- one account-scoped negative fixture
- one nested origin group fixture with multiple origins and request paths

## 8. Exit Criteria for CDN API

The module can be considered covered enough for the first pass when:
- all CRUD endpoints have happy-path and negative-path tests
- nested ID remapping is explicitly tested
- account isolation is verified for distributions and certificates
- duplicate URL errors are asserted exactly
- response shapes are stable across list and detail endpoints

## 9. Next Update Needed

This register should be revisited if CDN ownership rules change, if certificate validation becomes stricter, or if delivery-edge behavior is moved into this API surface.
