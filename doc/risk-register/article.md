# Article API Risk Register

**Scope:** API only
**Module:** `article`
**Source baseline:** `sm2` route and schema inspection
**Date:** 2026-05-31
**Owner:** QA

## 1. Risk Register

| ID | Risk | Priority | Layer | Covered |
|----|------|----------|-------|---------|
| ART-001 | Endpoint returns 404 in all environments (known bug) | P0 | Integration | ✓ |
| ART-002 | Create article with HTML content | P1 | Integration | ✓ |
| ART-003 | Response schema if endpoint is available | P1 | Contract | ✗ |
| ART-004 | `is_published: true` on creation | P1 | Regression | ✗ |
| ART-005 | Tags and keywords persistence | P2 | Regression | ✗ |

## 2. Known API Quirks

- Use `ensureEndpointAvailable` before any test — returns 404 in dev/staging environments
- Do not assume endpoint availability
