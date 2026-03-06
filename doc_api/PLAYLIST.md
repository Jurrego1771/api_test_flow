# Playlist Module - Complete Documentation
**Document ID:** PL-DOC-001  
**Version:** 1.0  
**Date:** 2026-03-05  
**Author:** Development Team  

---

## **OVERVIEW**

The Playlist module is a comprehensive content organization system in Mediastream Platform that allows users to create, manage, and distribute collections of multimedia content through different playlist types with advanced filtering and access control capabilities.

---

## **BUSINESS RULES**

### **BR-PL-001: Playlist Ownership**
- **Rule:** Each playlist belongs to exactly one account
- **Validation:** `account` field is required and indexed
- **Business Logic:** Users can only access playlists from their own account

### **BR-PL-002: Slug Uniqueness**
- **Rule:** Playlist slugs must be unique within each account
- **Validation:** Automatic slug generation with conflict resolution
- **Business Logic:** If slug exists, append timestamp: `{slug}-{timestamp}`

### **BR-PL-003: Media-Playlist Relationship**
- **Rule:** Media can belong to multiple playlists
- **Validation:** Bidirectional relationship maintained automatically
- **Business Logic:** When playlist is saved, update media's playlist array

### **BR-PL-004: Access Restrictions Inheritance**
- **Rule:** Playlists inherit access restrictions from account defaults
- **Validation:** Can override with specific restriction rules
- **Business Logic:** Advanced restrictions take precedence over defaults

### **BR-PL-005: Playlist Type Constraints**
- **Rule:** Each playlist has exactly one type (manual, smart, series, playout)
- **Validation:** Type field is required and immutable after creation
- **Business Logic:** Different rules apply based on type

### **BR-PL-006: Smart Playlist Auto-Update**
- **Rule:** Smart playlists automatically update when criteria change
- **Validation:** Real-time media filtering based on rules
- **Business Logic:** No manual media management for smart playlists

### **BR-PL-007: Series Structure Validation**
- **Rule:** Series must have unique season numbers within the playlist
- **Validation:** Season numbers must be positive integers
- **Business Logic:** Episodes must be associated with valid media IDs

### **BR-PL-008: Playout Rule Priority**
- **Rule:** Playout rules are evaluated in order of definition
- **Validation:** Multiple rules can exist, processed sequentially
- **Business Logic:** Results are aggregated and sorted per rule specifications

### **BR-PL-009: Featured Playlist Limits**
- **Rule:** No explicit limit on featured playlists per account
- **Validation:** Boolean flag only
- **Business Logic:** Featured playlists get priority in UI display

### **BR-PL-010: Access Token Security**
- **Rule:** Access tokens are unique and non-guessable
- **Validation:** UUID-based token generation
- **Business Logic:** Tokens provide bypass of access restrictions

---

## **API ENDPOINTS**

### **Base URL:** `https://platform.mediastre.am/api/playlist`

---

### **GET /api/playlist**
**Description:** Retrieve all playlists for the authenticated account

**Parameters:**
| Parameter | Type | Required | Default | Description |
|------------|------|----------|---------|-------------|
| all | boolean | No | false | Include unpublished playlists |
| limit | number | No | 50 | Maximum number of results |
| offset | number | No | 0 | Pagination offset |
| type | string | No | null | Filter by playlist type |
| category | string | No | null | Filter by category ID |

**Response Structure:**
```json
{
  "status": "OK",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "My Playlist",
      "slug": "my-playlist",
      "description": "Description here",
      "type": "manual",
      "account": "507f1f77bcf86cd799439012",
      "categories": ["507f1f77bcf86cd799439013"],
      "featured": false,
      "no_ad": false,
      "date_created": "2026-03-05T12:00:00.000Z",
      "medias_count": 15,
      "total_duration": 3600
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 50,
    "offset": 0,
    "pages": 2
  }
}
```

---

### **GET /api/playlist/{id}**
**Description:** Retrieve a specific playlist by ID

**Parameters:**
| Parameter | Type | Required | Description |
|------------|------|----------|-------------|
| id | string | Yes | Playlist ID |
| all | boolean | No | Include unpublished media |
| medias | boolean | No | Include media details |
| limit | number | No | Limit media results |

**Response Structure:**
```json
{
  "status": "OK",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "My Playlist",
    "slug": "my-playlist",
    "description": "Description here",
    "type": "manual",
    "account": "507f1f77bcf86cd799439012",
    "categories": ["507f1f77bcf86cd799439013"],
    "featured": false,
    "no_ad": false,
    "image_url": "https://cdn.mdstrm.com/image.jpg",
    "metadata": {},
    "custom": {},
    "access_restrictions": {
      "enabled": true,
      "rule": "507f1f77bcf86cd799439014"
    },
    "access_rules": {
      "closed_access": {"enabled": false, "allow": true},
      "geo": {"enabled": true, "allow": true, "countries": ["US", "CA"]},
      "cellular": {"enabled": false, "allow": true},
      "devices": {"deny_mobile": false, "deny_tv": false},
      "referer": {"enabled": false, "allow": true, "referers": []},
      "ip": {"enabled": false, "allow": true, "ips": []}
    },
    "access_tokens": [
      {"name": "user@example.com", "token": "abc123def456"}
    ],
    "custom_html": [
      {"name": "header", "html": "<div>Custom Header</div>"}
    ],
    "rules": {
      "manual": {"medias": ["507f1f77bcf86cd799439015", "507f1f77bcf86cd799439016"]},
      "smart": {...},
      "series": {...},
      "playout": {...}
    },
    "date_created": "2026-03-05T12:00:00.000Z",
    "medias": [
      {
        "_id": "507f1f77bcf86cd799439015",
        "title": "Video Title",
        "slug": "video-title",
        "description": "Video description",
        "duration": 120,
        "thumbnails": [{"url": "https://cdn.mdstrm.com/thumb.jpg"}]
      }
    ]
  }
}
```

---

### **POST /api/playlist**
**Description:** Create a new playlist

**Parameters:**
| Parameter | Type | Required | Description |
|------------|------|----------|-------------|
| name | string | Yes | Playlist name |
| description | string | No | Playlist description |
| type | string | Yes | Playlist type: manual, smart, series, playout |
| categories | array | No | Category IDs |
| featured | boolean | No | Featured flag |
| no_ad | boolean | No | Disable ads |
| slug | string | No | Custom slug |
| icon | string | No | FontAwesome icon class |
| custom | object | No | Custom attributes |
| access_restrictions_enabled | boolean | No | Enable access restrictions |
| access_restrictions | string | No | Access restriction ID |
| rules | object | No | Type-specific rules |

**Type-Specific Rules:**

**Manual:**
```json
{
  "rules": {
    "manual": {
      "medias": ["media_id_1", "media_id_2"]
    }
  }
}
```

**Smart:**
```json
{
  "rules": {
    "smart": {
      "sort_by": "date_created",
      "sort_asc": true,
      "limit": 50,
      "title": "News Content",
      "title_rule": "contains",
      "categories": ["cat_id_1"],
      "categories_rule": "in_any",
      "tags": ["news", "breaking"],
      "tags_rule": "in_any",
      "created_after": "2026-01-01",
      "created_before": "2026-12-31",
      "recorded_after": "2026-01-01",
      "recorded_before": "2026-12-31",
      "min_duration": 60,
      "min_duration_unit": "s",
      "max_duration": 3600,
      "max_duration_unit": "s",
      "min_views": 100,
      "max_views": 10000
    }
  }
}
```

**Series:**
```json
{
  "rules": {
    "series": {
      "seasons": [
        {
          "number": 1,
          "description": "First Season",
          "episodes": [
            {"number": 1, "media": "media_id_1"},
            {"number": 2, "media": "media_id_2"}
          ]
        }
      ]
    }
  }
}
```

**Playout:**
```json
{
  "rules": {
    "playout": [
      {
        "sort_by": "date_created",
        "sort_asc": true,
        "limit": 20,
        "categories": ["cat_id_1"],
        "categories_rule": "in_any",
        "tags": ["tag1"],
        "tags_rule": "in_any"
      }
    ]
  }
}
```

**Response Structure:**
```json
{
  "status": "OK",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "New Playlist",
    "slug": "new-playlist",
    "type": "manual",
    "account": "507f1f77bcf86cd799439012",
    "date_created": "2026-03-05T12:00:00.000Z"
  }
}
```

---

### **PUT /api/playlist/{id}**
**Description:** Update an existing playlist

**Parameters:** Same as POST /api/playlist, plus:
| Parameter | Type | Required | Description |
|------------|------|----------|-------------|
| id | string | Yes | Playlist ID |

**Response Structure:**
```json
{
  "status": "OK",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Updated Playlist",
    "slug": "updated-playlist",
    "date_updated": "2026-03-05T12:30:00.000Z"
  }
}
```

---

### **DELETE /api/playlist/{id}**
**Description:** Delete a playlist

**Parameters:**
| Parameter | Type | Required | Description |
|------------|------|----------|-------------|
| id | string | Yes | Playlist ID |

**Response Structure:**
```json
{
  "status": "OK",
  "data": {
    "message": "Playlist deleted successfully",
    "_id": "507f1f77bcf86cd799439011"
  }
}
```

---

### **GET /api/playlist/{id}/medias**
**Description:** Get media items from a playlist

**Parameters:**
| Parameter | Type | Required | Default | Description |
|------------|------|----------|---------|-------------|
| id | string | Yes | - | Playlist ID |
| limit | number | No | 50 | Maximum results |
| offset | number | No | 0 | Pagination offset |
| select | string | No | null | Fields to select |

**Response Structure:**
```json
{
  "status": "OK",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439015",
      "title": "Video Title",
      "slug": "video-title",
      "description": "Video description",
      "duration": 120,
      "views": 1000,
      "date_created": "2026-03-05T10:00:00.000Z",
      "thumbnails": [{"url": "https://cdn.mdstrm.com/thumb.jpg", "is_default": true}],
      "categories": [{"_id": "cat_id", "name": "News"}],
      "tags": ["news", "breaking"],
      "position": 1
    }
  ],
  "pagination": {
    "total": 15,
    "limit": 50,
    "offset": 0
  }
}
```

---

### **POST /api/playlist/{id}/image**
**Description:** Upload playlist thumbnail image

**Parameters:**
| Parameter | Type | Required | Description |
|------------|------|----------|-------------|
| id | string | Yes | Playlist ID |
| image | file | Yes | Image file (multipart/form-data) |

**Response Structure:**
```json
{
  "status": "OK",
  "data": {
    "image_url": "https://cdn.mdstrm.com/playlist/image.jpg",
    "message": "Image uploaded successfully"
  }
}
```

---

### **DELETE /api/playlist/{id}/image**
**Description:** Delete playlist thumbnail image

**Parameters:**
| Parameter | Type | Required | Description |
|------------|------|----------|-------------|
| id | string | Yes | Playlist ID |

**Response Structure:**
```json
{
  "status": "OK",
  "data": {
    "message": "Image deleted successfully"
  }
}
```

---

### **POST /api/playlist/{id}/access-token**
**Description:** Generate access token for playlist

**Parameters:**
| Parameter | Type | Required | Description |
|------------|------|----------|-------------|
| id | string | Yes | Playlist ID |
| name | string | Yes | User email/name |
| notify | boolean | No | Send email notification |

**Response Structure:**
```json
{
  "status": "OK",
  "data": {
    "name": "user@example.com",
    "token": "abc123def456789",
    "playlist_id": "507f1f77bcf86cd799439011",
    "embed_url": "https://platform.mdstrm.com/embed/playlist/507f1f77bcf86cd799439011?token=abc123def456789"
  }
}
```

---

### **DELETE /api/playlist/{id}/access-token/{token}**
**Description:** Delete access token

**Parameters:**
| Parameter | Type | Required | Description |
|------------|------|----------|-------------|
| id | string | Yes | Playlist ID |
| token | string | Yes | Access token |

**Response Structure:**
```json
{
  "status": "OK",
  "data": {
    "message": "Access token deleted successfully"
  }
}
```

---

## **DATA MODELS**

### **Playlist Model**
```javascript
{
  _id: ObjectId,
  name: String (required),
  slug: String (indexed),
  _slug: String,
  description: String,
  image_url: String,
  metadata: Object,
  type: String (enum: ['manual', 'smart', 'series', 'playout'], required),
  icon: String,
  rules: {
    playout: [{
      sort_by: String,
      sort_asc: Boolean (default: true),
      limit: Number,
      categories: [ObjectId],
      categories_rule: String,
      tags: [String],
      tags_rule: String
    }],
    manual: {
      medias: [ObjectId]
    },
    smart: {
      sort_by: String,
      sort_asc: Boolean (default: true),
      limit: Number,
      title: String,
      title_rule: String,
      categories: [ObjectId],
      categories_rule: String,
      tags: [String],
      tags_rule: String,
      created_after: Date,
      created_before: Date,
      recorded_after: Date,
      recorded_before: Date,
      min_duration: Number,
      min_duration_unit: String (enum: ['s', 'm', 'h']),
      max_duration: Number,
      max_duration_unit: String (enum: ['s', 'm', 'h']),
      min_views: Number,
      max_views: Number
    },
    series: {
      seasons: [{
        number: Number,
        description: String,
        episodes: [{
          number: Number,
          media: ObjectId
        }]
      }]
    }
  },
  account: ObjectId (ref: 'Account', indexed),
  date_created: Date (default: Date.now),
  featured: Boolean,
  custom: Object,
  categories: [ObjectId] (ref: 'Category'),
  no_ad: Boolean (default: false),
  access_restrictions: {
    enabled: Boolean (default: true),
    rule: ObjectId (ref: 'AccessRestriction')
  },
  access_rules: {
    closed_access: {
      enabled: Boolean (default: false),
      allow: Boolean (default: true)
    },
    geo: {
      enabled: Boolean (default: false),
      allow: Boolean (default: true),
      countries: [String]
    },
    cellular: {
      enabled: Boolean (default: false),
      allow: Boolean (default: true)
    },
    devices: {
      deny_mobile: Boolean (default: false),
      deny_desktop: Boolean (default: false),
      deny_tv: Boolean (default: false)
    },
    referer: {
      enabled: Boolean (default: false),
      allow: Boolean (default: true),
      referers: [String]
    },
    ip: {
      enabled: Boolean (default: false),
      allow: Boolean (default: true),
      ips: [String]
    }
  },
  access_tokens: [{
    name: String,
    token: String
  }],
  custom_html: [{
    name: String,
    html: String
  }]
}
```

---

## **USE CASES**

### **UC-PL-001: Create Manual Playlist**
**Description:** User creates a curated list of specific videos

**Steps:**
1. User selects "Manual" playlist type
2. User searches and adds specific media items
3. User arranges media in desired order
4. User sets playlist name and description
5. System saves playlist with manual rules

**API Flow:**
```
POST /api/playlist
{
  "name": "Top Videos March 2026",
  "type": "manual",
  "rules": {
    "manual": {
      "medias": ["media_001", "media_002", "media_003"]
    }
  }
}
```

---

### **UC-PL-002: Create Smart Playlist**
**Description:** System automatically generates playlist based on criteria

**Steps:**
1. User selects "Smart" playlist type
2. User defines filtering criteria (categories, tags, dates, etc.)
3. User sets sorting and limits
4. System generates dynamic playlist
5. Playlist updates automatically when new content matches criteria

**API Flow:**
```
POST /api/playlist
{
  "name": "Latest News",
  "type": "smart",
  "rules": {
    "smart": {
      "categories": ["news_category"],
      "tags_rule": "in_any",
      "tags": ["breaking", "urgent"],
      "sort_by": "date_created",
      "sort_asc": false,
      "limit": 20
    }
  }
}
```

---

### **UC-PL-003: Create Series Playlist**
**Description:** User organizes episodic content into seasons and episodes

**Steps:**
1. User selects "Series" playlist type
2. User adds seasons with descriptions
3. User adds episodes to each season with episode numbers
4. User assigns media to episodes
5. System maintains series structure

**API Flow:**
```
POST /api/playlist
{
  "name": "Documentary Series 2026",
  "type": "series",
  "rules": {
    "series": {
      "seasons": [
        {
          "number": 1,
          "description": "First Season",
          "episodes": [
            {"number": 1, "media": "doc_ep001"},
            {"number": 2, "media": "doc_ep002"}
          ]
        }
      ]
    }
  }
}
```

---

### **UC-PL-004: Create Playout Playlist**
**Description:** User creates scheduled programming with multiple rules

**Steps:**
1. User selects "Playout" playlist type
2. User creates multiple rules with different criteria
3. User sets sorting and limits for each rule
4. System combines results from all rules
5. Playlist provides scheduled content flow

**API Flow:**
```
POST /api/playlist
{
  "name": "24-Hour News Channel",
  "type": "playout",
  "rules": {
    "playout": [
      {
        "sort_by": "date_created",
        "limit": 10,
        "categories": ["breaking_news"],
        "categories_rule": "in_any"
      },
      {
        "sort_by": "views",
        "limit": 20,
        "categories": ["featured"],
        "categories_rule": "in_any"
      }
    ]
  }
}
```

---

### **UC-PL-005: Share Playlist with Access Token**
**Description:** User generates secure access token for external sharing

**Steps:**
1. User navigates to playlist settings
2. User generates access token with recipient email
3. System creates unique token
4. User shares embed URL with token
5. External users access playlist with token

**API Flow:**
```
POST /api/playlist/{id}/access-token
{
  "name": "external@partner.com",
  "notify": true
}
```

**Embed URL:** `https://platform.mdstrm.com/embed/playlist/{id}?token={token}`

---

### **UC-PL-006: Apply Geographic Restrictions**
**Description:** User restricts playlist access by geographic location

**Steps:**
1. User enables geographic restrictions
2. User selects allowed/denied countries
3. User saves playlist settings
4. System enforces restrictions on access

**API Flow:**
```
PUT /api/playlist/{id}
{
  "access_rules": {
    "geo": {
      "enabled": true,
      "allow": true,
      "countries": ["US", "CA", "MX"]
    }
  }
}
```

---

## **ERROR HANDLING**

### **Common Error Responses**

#### **400 Bad Request**
```json
{
  "status": "ERROR",
  "message": "Invalid playlist type",
  "data": "Type must be one of: manual, smart, series, playout"
}
```

#### **401 Unauthorized**
```json
{
  "status": "ERROR", 
  "message": "Authentication required",
  "data": "Please provide valid API token"
}
```

#### **403 Forbidden**
```json
{
  "status": "ERROR",
  "message": "Access denied",
  "data": "You don't have permission to access this playlist"
}
```

#### **404 Not Found**
```json
{
  "status": "ERROR",
  "message": "Playlist not found",
  "data": "Playlist ID does not exist"
}
```

#### **409 Conflict**
```json
{
  "status": "ERROR",
  "message": "Slug already exists",
  "data": "Please choose a different slug"
}
```

#### **422 Unprocessable Entity**
```json
{
  "status": "ERROR",
  "message": "Validation failed",
  "data": {
    "name": "Name is required",
    "type": "Invalid playlist type"
  }
}
```

---

## **PERFORMANCE CONSIDERATIONS**

### **Caching Strategy**
- **Playlist Data:** 60-second TTL cache
- **Media Lists:** 30-second TTL cache
- **Smart Results:** Cache based on rule hash
- **Access Rules:** 5-minute TTL cache

### **Pagination**
- Default limit: 50 items
- Maximum limit: 200 items
- Offset-based pagination for large datasets

### **Lazy Loading**
- Media details loaded on demand
- Thumbnail images CDN-optimized
- Progressive content loading

---

## **SECURITY CONSIDERATIONS**

### **Access Control**
- Account-level isolation
- Token-based authentication
- Role-based permissions
- IP and geographic restrictions

### **Data Validation**
- Input sanitization for all fields
- SQL injection prevention
- XSS protection in custom HTML
- File upload validation

### **Rate Limiting**
- 100 requests per minute per account
- 10 playlist creations per hour
- 5 image uploads per minute

---

## **INTEGRATION POINTS**

### **Access Restrictions Module**
- Playlist inherits account restrictions
- Can override with specific rules
- Token-based bypass capabilities

### **Media Management**
- Bidirectional relationship maintenance
- Automatic metadata synchronization
- Thumbnail and preview generation

### **CDN Integration**
- Image optimization and delivery
- Video streaming URLs
- Geographic content distribution

### **Analytics Integration**
- View tracking per playlist
- Engagement metrics
- Performance analytics

---

## **VERSION COMPATIBILITY**

### **API Versioning**
- Current version: v1
- Backward compatibility maintained
- Deprecated endpoints announced 30 days prior
- Breaking changes require version bump

### **Data Migration**
- Automatic schema updates
- Legacy format support
- Data validation during migration
- Rollback capabilities

---

**Document Control**
- **Owner:** Development Team
- **Reviewers:** Product Team, QA Team
- **Approval:** Technical Lead
- **Next Review:** 2026-06-05

**Change History**
| **Version** | **Date** | **Changes** | **Author** |
|------------|----------|-------------|------------|
| 1.0 | 2026-03-05 | Initial documentation | Development Team |
