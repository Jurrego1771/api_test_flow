# Show API Risk Register

**Scope:** API only
**Module:** `show`
**Source baseline:** `sm2` route and schema inspection
**Date:** 2026-05-31
**Owner:** QA

## 1. Risk Register

| ID | Risk | Priority | Layer | Covered |
|----|------|----------|-------|---------|
| SHW-001 | Create show without `title` or `type` → 400 | P0 | Regression | ✓ |
| SHW-002 | Invalid type rejected | P0 | Regression | ✓ |
| SHW-003 | Create season under valid show | P0 | Smoke | ✓ |
| SHW-004 | Create episode under valid season | P0 | Smoke | ✓ |
| SHW-005 | Episode with associated media → media visible in show | P1 | Integration | ✓ |
| SHW-006 | DELETE show removes seasons and episodes (cascade) | P1 | Integration | ✓ (show-cascade.integration.spec.js) |
| SHW-007 | Orphaned season after DELETE show | P1 | Regression | ✗ |
| SHW-008 | Episode ordering within season | P2 | Regression | ✗ |
| SHW-009 | Response schema does not break | P0 | Contract | ✓ |
| SHW-010 | `genres` with invalid value normalized or rejected | P1 | Regression | ✓ |
| SHW-011 | `first_emision` with invalid date format | P1 | Regression | ✗ |

## 2. Known API Quirks

- `POST /api/show` requires `{ form: true }`
- `genres` must be a value from the documented enum (see `dataFactory.generateShowPayload`)
- Seasons cleaned up with ResourceCleaner type `season`, id format: `"showId/seasonId"`
- Episodes: id format `"showId/seasonId/episodeId"`
