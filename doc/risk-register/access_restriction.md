# Access Restriction API Risk Register

**Scope:** API only
**Module:** `access_restriction` (`/api/settings/advanced-access-restrictions`)
**Source baseline:** `sm2` route and schema inspection
**Date:** 2026-05-31
**Owner:** QA

## 1. Risk Register

| ID | Risk | Priority | Layer | Covered |
|----|------|----------|-------|---------|
| AR-001 | Create AR without `name` → error | P0 | Regression | ✗ |
| AR-002 | Geo rule with invalid countries | P0 | Regression | ✗ |
| AR-003 | IP rule with invalid CIDR | P0 | Regression | ✗ |
| AR-004 | Apply AR to media and verify access | P1 | Integration | ✗ |
| AR-005 | Multiple rules in same AR | P1 | Regression | ✗ |
| AR-006 | Response schema does not break | P0 | Contract | ✓ |
| AR-007 | DELETE AR in use by media | P1 | Regression | ✗ |
| AR-008 | `apply_to_sub_categories: true` inherits to child categories | P2 | Integration | ✗ |
| AR-009 | Error body schema (400/404) | P1 | Contract | ✗ |
| AR-010 | AR with all restrictions enabled | P1 | Regression | ✗ |

## 2. Known API Quirks

- Long base path: `/api/settings/advanced-access-restrictions`
- ResourceCleaner type: `accessRestriction`
- Geo rule shape: `{ context: "geo", type: "country", rules: ["US", "CA"] }`
- IP rule shape: `{ context: "ip", rules: ["192.168.1.0/24"] }`
- `apply_to_sub_categories` affects child categories — use caution in integration tests
