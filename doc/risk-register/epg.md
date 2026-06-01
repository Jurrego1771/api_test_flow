# EPG API Risk Register

**Scope:** API only
**Module:** `epg` (`/api/settings/epg-mask/input`)
**Source baseline:** `sm2` route and schema inspection
**Date:** 2026-05-31
**Owner:** QA

## 1. Risk Register

| ID | Risk | Priority | Layer | Covered |
|----|------|----------|-------|---------|
| EPG-001 | Create EPG input without `name` → error | P0 | Smoke | ✓ |
| EPG-002 | Invalid `epgUrl` → validation | P0 | Regression | ✗ |
| EPG-003 | `timezone` out of range (-12 to +12) | P1 | Regression | ✗ |
| EPG-004 | Assign EPG input to live stream | P1 | Integration | ✓ |
| EPG-005 | EPG with `enabled: true` vs `enabled: false` | P1 | Regression | ✗ |
| EPG-006 | Response schema does not break | P0 | Contract | ✓ |
| EPG-007 | DELETE EPG input removed from live stream | P1 | Integration | ✓ |
| EPG-008 | Multiple EPG inputs, assign specific one | P2 | Integration | ✗ |

## 2. Known API Quirks

- ResourceCleaner type: `epg-origin`, DELETE route: `/api/settings/epg-mask/input/:id`
- EPG input `id` is numeric (not a MongoDB ObjectId)
- `timezone` is offset in whole hours (integer)
- EPG URL must be a valid URL — feed content is not validated on creation
