# Category API Risk Register

**Scope:** API only
**Module:** `category`
**Source baseline:** `sm2` route and schema inspection
**Date:** 2026-04-19
**Owner:** QA

## 1. Module Summary

The `category` module is a transversal taxonomy surface. It is used to organize content, build hierarchical filters, drive DRM visibility, and propagate category membership to `Media`, `Show`, and `Article` documents. It also contains image upload/delete flows and a media-assignment route that bulk-updates content records.

This module is high risk because changing a category can recalculate descendants and `filter_categories`, alter which content is discoverable, break parent-child trees, or detach category-linked media at scale. The API is not just CRUD; it is a tree manager with propagation hooks.

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
| CAT-RISK-001 | Tree integrity | Category parent updates create invalid loops or broken hierarchy paths | 5 | 4 | 4 | 80 | P0 | Parent-child chains drive all descendant filtering | ancestor/descendant checks, cycle prevention, root reassignment |
| CAT-RISK-002 | Filter propagation | `filter_categories` recalculation misses descendants or leaves stale category sets | 5 | 4 | 5 | 100 | P0 | The schema rewrites descendant filters after save | propagation tests, parent move tests, descendant consistency |
| CAT-RISK-003 | Content removal | Removing a category leaves stale references in `Media`, `Show`, or `Article` | 5 | 4 | 5 | 100 | P0 | Cleanup is asynchronous and crosses multiple collections | delete cascade tests, orphan checks, reference counts |
| CAT-RISK-004 | Media assignment | Assigning a category to media updates the wrong records or only partially applies | 4 | 4 | 4 | 64 | P0 | The bulk update route mutates many media docs | bulk assignment, partial failure, account scoping |
| CAT-RISK-005 | Access filtering | Category visibility or `filter_categories` changes expose or hide the wrong content | 5 | 3 | 4 | 60 | P0 | Category visibility drives search and discovery | read/list scope, user category filtering, negative tests |
| CAT-RISK-006 | DRM flags | DRM allow/deny compatibility flags persist incorrectly | 4 | 3 | 4 | 48 | P1 | DRM behavior depends on category flags | create/update branches, allow vs deny vs compatible |
| CAT-RISK-007 | Image lifecycle | Category image upload/delete leaves stale files or broken URLs | 3 | 4 | 3 | 36 | P1 | Image handling is file-backed and can drift from DB | upload/delete round-trip, file cleanup, URL contract |
| CAT-RISK-008 | Search/list | Category listing returns the wrong hierarchy or account scope | 4 | 3 | 3 | 36 | P1 | The list endpoint has several query modes and filters | full path, with_count, parent filters, admin vs user branch |
| CAT-RISK-009 | Slug uniqueness | Slug conflicts or collision handling cause unstable category URLs | 3 | 3 | 4 | 36 | P1 | Slugs are account-unique and auto-adjusted on conflict | duplicate-name collisions, unique enforcement, retry naming |
| CAT-RISK-010 | Account isolation | One account can see or mutate another account's categories | 5 | 2 | 4 | 40 | P0 | Categories are account-scoped and leak through filters easily | cross-account negative tests, not-found behavior |
| CAT-RISK-011 | Custom metadata | Custom fields and search metadata drift from actual category structure | 3 | 3 | 4 | 36 | P1 | The schema carries custom and filter metadata | custom round-trip, tree mutation after save |

## 4. Endpoint Clusters to Cover First

### P0 cluster
- `GET /api/category`
- `POST /api/category`
- `GET /api/category/{category_id}`
- `POST /api/category/{category_id}`
- `DELETE /api/category/{category_id}`
- `POST /api/category/{category_id}/media`
- `POST /api/category/{category_id}/ai-image`
- `POST /api/category/{category_id}/image`
- `DELETE /api/category/{category_id}/image`

### P1 cluster
- list/full-path/count modes, parent filtering, and the detail route

## 5. Known Failure Modes

1. Moving a category under a new parent creates a cycle or an invalid tree.
2. Recomputing `filter_categories` misses part of the descendant tree and content disappears from filters.
3. Deleting a category removes the row but leaves stale references in `Media`, `Show`, or `Article`.
4. Bulk category assignment updates some media and silently skips others when the cursor loop is interrupted.
5. A category image is replaced, but the previous file is left behind or the URL is stale.
6. DRM flags are saved but later reads show a different allow/deny state than the user intended.
7. Account-scoped filtering hides valid categories from non-admin users or leaks categories from another account.
8. Slug collision handling creates unexpected URLs after rename operations.

## 6. Recommended Test Strategy

### Automated first
- create/update/delete contract tests with parent and root categories
- cycle-prevention tests for parent updates
- descendant propagation tests after moving a category in the tree
- deletion tests that confirm cleanup in Media, Show, and Article
- bulk media assignment tests with multiple media IDs and partial failures
- list/query mode tests for `full`, `with_count`, parent filters, and search terms
- image upload/delete tests with file cleanup verification
- account isolation tests for all read/write routes

### Manual first
- one category tree edit with a parent move
- one delete scenario on a parent with descendants blocked by API
- one bulk media assignment on a production-like fixture set
- one category image replacement flow
- one admin vs non-admin list comparison

## 7. Test Data Requirements

- one category tree with at least three levels
- one category with children and grandchildren
- one account with multiple visible and hidden categories
- one media set assigned to categories
- one show with category associations
- one article with category associations
- one category with an existing image
- one user with restricted category access

## 8. Exit Criteria for Category API

The module can be considered covered enough for the first pass when:
- parent changes are validated against cycles and broken trees
- `filter_categories` propagation is verified after save
- delete paths prove that dependent references are cleaned up
- bulk media assignment is tested for success and partial failure
- list/detail endpoints return consistent hierarchy and scope results
- image upload/delete leaves no stale file or URL state

## 9. Notes for QA Design

This module should be treated as a taxonomy and propagation module, not just a CRUD surface. The highest-value tests are around tree integrity, descendant filter recalculation, and cleanup of dependent content, because those defects ripple into discovery, access control, and content organization.

## 10. Next Update Needed

Revisit this register if category hierarchy logic changes, if filter propagation moves out of model hooks, or if category-driven access filtering is redesigned.
