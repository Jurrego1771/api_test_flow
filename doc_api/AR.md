# Access Restrictions Module - Complete Documentation

## Overview
The Access Restrictions module in Mediastream Platform provides two different interfaces for managing content access control:

1. **Legacy View** - Traditional interface with predefined restriction types
2. **Advanced View** - Flexible rule-based system with granular control

## Architecture

### Database Schema
**File:** `src/server/model/schemas/access_restrictions.coffee`

```coffeescript
AccessRestrictionSchema = new Schema
  _name: String (unique)
  name: String (required, indexed)
  account: ObjectId (ref: 'Account', required, indexed)
  is_default: Boolean (indexed)
  default_type: String (enum: ['media', 'event'], indexed)
  categories: [ObjectId] (ref: 'Category', indexed)
  apply_to_sub_categories: Boolean (default: true)
  date_created: Date (default: new Date, indexed)
  closed_access:
    enabled: Boolean (default: false)
    allow: Boolean (default: false)
  aes:
    enabled: Boolean (default: false)
    allow: Boolean (default: false)
  drm:
    enabled: Boolean (default: false)
    allow: Boolean (default: false)
    allow_incompatible: Boolean (default: false)
  access_rules: [AccessRuleItemSchema]
```

### Access Rule Item Schema
```coffeescript
AccessRuleItemSchema = new Schema
  context: String (required)
  access: Boolean (default: true)
  type: String
  exclusive: Boolean (default: false)
  client_validation: Boolean (default: false)
  allow_unknown: Boolean (default: true)
  rules: [String]
  allow_regex: Boolean (default: false)
  regex: String
```

## 1. Legacy Access Restrictions

### Frontend Client
**File:** `src/client/settings/access_restrictions/legacy.coffee`

**Features:**
- Simple radio-button interface for each restriction type
- Fixed set of restriction categories
- Direct form submission to `/api/account/access-restrictions`

**Available Restrictions:**
- **Geo Restriction** - Allow/deny countries
- **Cellular Networks** - Allow/deny mobile networks
- **Device Restrictions** - Basic mobile/TV blocking
- **Advanced Device Options** - OS, Browser, Brand, Type restrictions
- **Referrer Restriction** - Domain-based access control
- **IP Restriction** - IP address/range filtering
- **User Agent Restriction** - Browser/device filtering with regex support
- **Closed Access** - Enable/disable content access
- **DRM** - Digital Rights Management settings

### Backend View
**File:** `views/settings/access_restrictions/legacy.coffee`

**UI Components:**
- Traditional form layout with radio buttons
- Chosen.js for multi-select fields
- AutoComplete integration for dynamic inputs
- Responsive grid layout

## 2. Advanced Access Restrictions

### Frontend Client
**File:** `src/client/settings/access_restrictions/advanced/detail.coffee`

**Features:**
- Rule-based system with drag-and-drop ordering
- Dynamic rule creation/editing/deletion
- Rule testing functionality
- Category-based application
- Client-side validation options

**Rule Contexts Available:**
- `*` - Everything (catch-all rule)
- `geo` - Geographic fencing by country
- `device` - Device type (Mobile, TV)
- `os` - Operating system
- `device_type` - Device category
- `browser` - Browser type
- `brand` - Device brand
- `referrer` - Referer domain
- `cellular` - Cellular network detection
- `ip` - IP address/range
- `asn` - Autonomous System Number
- `user-agent` - User agent string with regex support

**Rule Properties:**
- **Access** - Allow/Deny toggle
- **Exclusive** - "Is" vs "Is not" logic
- **Client Validation** - Client-side blocking option
- **Allow Unknown** - Include unidentified requests
- **Rules List** - Specific values to match
- **Regex Support** - Pattern matching for user-agents

### Backend View
**File:** `views/settings/access_restrictions/advanced/detail.coffee`

**UI Components:**
- Interactive rule table with ordering controls
- Modal dialogs for rule creation/editing
- Test modal for rule validation
- Category selection with sub-category options
- Security settings (Closed Access, AES, DRM)

### List View
**File:** `views/settings/access_restrictions/advanced/index.coffee`

**Features:**
- Table view of all access restrictions
- Create new restriction button
- Edit/delete actions
- Date created tracking

## 3. API Endpoints

### Legacy API
- **POST** `/api/account/access-restrictions` - Update legacy restrictions

### Advanced API
**File:** `docs/swagger/platform/settings-access-restrictions.yaml`

- **GET** `/api/settings/advanced-access-restrictions` - List all restrictions
- **GET** `/api/settings/advanced-access-restrictions/{id}` - Get specific restriction
- **POST** `/api/settings/advanced-access-restrictions` - Create new restriction
- **POST** `/api/settings/advanced-access-restrictions/{id}` - Update restriction
- **DELETE** `/api/settings/advanced-access-restrictions/{id}` - Delete restriction

### API Response Structure
```json
{
  "status": "OK",
  "data": {
    "_id": "string",
    "name": "string",
    "account": "string",
    "is_default": boolean,
    "default_type": "media|event",
    "categories": ["string"],
    "apply_to_sub_categories": boolean,
    "date_created": "ISO date",
    "closed_access": {
      "enabled": boolean,
      "allow": boolean
    },
    "aes": {
      "enabled": boolean,
      "allow": boolean
    },
    "drm": {
      "enabled": boolean,
      "allow": boolean,
      "allow_incompatible": boolean
    },
    "access_rules": [AccessRuleItem]
  }
}
```

## 4. Rule Processing Logic

### Validation Methods
**File:** `src/server/model/schemas/access_restrictions.coffee` (lines 40-100)

**Context-specific validation:**
- **Geo/ASN** - Country/ASN code matching with case-insensitive comparison
- **IP** - Range checking using `range_check` library
- **Referrer** - Domain/subdomain matching with regex patterns
- **User-Agent** - String matching or regex pattern validation
- **Device/OS/Browser/Brand** - Exact string matching
- **Cellular** - Network type detection

### Rule Evaluation Order
1. Default rules (account-level)
2. Category-based rules (inherited)
3. Specific restriction rules (by ID)

Rules are evaluated in order within each restriction, with the first matching rule determining access.

### Caching Strategy
- **Default Rules** - 60-second TTL with memory caching
- **Category Rules** - MD5-based cache keys with 60-second TTL
- **Specific Rules** - ID-based caching with memory storage for events

## 5. Security Features

### Closed Access
- Complete content blocking
- Override all other rules when enabled

### AES-128 Encryption
- Media encryption support
- Key management integration

### DRM (Digital Rights Management)
- Multi-device DRM support
- Incompatible device handling
- Provider integration (Widevine, PlayReady, FairPlay)

### Client-Side Validation
- HTML5 Network API integration
- Pre-request blocking
- Reduced server load

## 6. Middleware Integration

### Access Checking Middleware
**Files:**
- `src/server/middleware-embed/check-access-restrictions.coffee`
- `src/server/middleware-embed/live-access.coffee`
- `src/server/middleware-embed/media-access.coffee`

**Process:**
1. Extract request context (IP, User-Agent, Referrer, etc.)
2. Retrieve applicable access restrictions
3. Evaluate rules in order
4. Apply security settings (DRM, AES, etc.)
5. Return access decision

## 7. Migration System

### Migration Script
**File:** `scripts/migrate_access_restrictions.coffee`

Handles conversion from legacy to advanced system:
- Account rule extraction
- Category mapping
- Rule transformation
- Default rule creation

## 8. Testing Framework

### Rule Testing Interface
**Location:** Advanced view modal

**Test Parameters:**
- Device type selection
- Country selection
- Referrer input
- IP address input
- ASN input
- Cellular network detection

**Test Results:**
- Pass/fail indication
- Rule that triggered the decision
- Detailed explanation

## 9. Integration Points

### Content Types
- **Media** - VOD content with full feature support
- **Events** - Live streaming with limited DRM support
- **Playlists** - Collection-level restrictions

### Category System
- Hierarchical category application
- Sub-category inheritance options
- Content-based rule assignment

### CDN Integration
- Edge authentication
- Token-based access
- Geographic distribution

## 10. Performance Considerations

### Caching Layers
- Redis-based rule caching
- Memory storage for frequently accessed rules
- CDN-level access enforcement

### Database Optimization
- Indexed fields for fast queries
- Lean queries for rule evaluation
- Batch processing for bulk operations

### Client-Side Optimization
- Pre-flight validation
- Local rule caching
- Reduced server requests

## Summary

The Access Restrictions module provides a comprehensive, multi-layered content protection system with both simple (Legacy) and advanced (Advanced) interfaces. The system supports:

- **Geographic restrictions** by country
- **Network-based filtering** (IP, ASN, cellular)
- **Device identification** (type, OS, browser, brand)
- **Referer validation** for embed control
- **User-agent filtering** with regex support
- **Security features** (DRM, AES, closed access)
- **Category-based application** with inheritance
- **Rule testing** and validation tools
- **Performance optimization** through caching

The Advanced system offers superior flexibility and power, while the Legacy system maintains backward compatibility for existing implementations.
