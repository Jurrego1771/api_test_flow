# API Embed

## [Overview](#api-overview)

The platform offers a RESTful embed interface to interact with most of its components (Media, Categories, etc). By RESTful we mean the API will make proper use of HTTP verbs and response codes.

### Responses

All responses deliver a proper HTTP status code and a JSON payload. The data, which in some cases can be `null`, usually contains data about the requested resource and can be of type String, Number, Array or Object.

### Errors

Along with the JSON payload, errors are reported with a 4xx or 5xx HTTP status code.

**JSON Payload example:**
```json
  {
    "status": "OK",
    "data": ...
  }
```

**Error examples:**

* **HTTP 401 - Unauthorized**. The request is being made with an expired authorization token or one without the proper permissions.
* **HTTP 404 - Not Found**. The requested resource doesn't exists.
* **HTTP 500 - Internal Server Error**. The request wasn't fullfiled because of a server error.

### Versioning

Currently the API doesn't allow you to select a specific version. Breaking changes are infrequent to non existing and in the case of such modifications all customers are properly notified.

---

# Feed

## [List Categories](#categories-list)

> The API allows you to list for all of your account's Categories

#### Resource

`GET https://mdstrm.com/feed/apps/<ACCOUNT_ID>/category`

#### Permissions

**module feed active** are required to access this resource

#### Parameters

| Name | Type | Mandatory | Description |
| --- | --- | --- | ---
| page | Number | | Item to start pagination. (Defaults `1`) |
| limit | Number | | Maximum number of records to return. (Default `20`, Max `100`) |
| sort | String (Array) | | Sort records by attribute. To sort in a descending direction you must add a minus sign (-) before the attribute. Example: "-date_created" |

#### Request Example

```
GET https://mdstrm.com/feed/apps/5d49e087cb91053f883f517f/category
```

#### Response Example

```json
 {
    "id": "category-list-1",
    "type": {
        "value": "feed"
    },
    "title": "category list",
    "entry": [
        {
            "id": "category-list-1-5d4d91f90567454667ac98d6",
            "type": {
                "value": "feed"
            },
            "title": "Test 01",
            "summary": "",
            "content": {
                "type": "feed",
                "src": "https://mdstrm.com/feed/apps/5d49e087cb91053f883f517f/media?limit=20&category=5d4d91f90567454667ac98d6"
            }
        },
        {
            "id": "category-list-1-5d8e0c9399fc343050ebc156",
            "type": {
                "value": "feed"
            },
            "title": "Test 04",
            "summary": "",
            "media_group": [
                {
                    "type": "IMAGE",
                    "media_item": [
                        {
                            "src": "https://mdstrm.com/category/5d8e0c9399fc343050ebc156-1569885600477.png",
                            "key": "image_base",
                            "type": "image"
                        },
                        {
                            "src": "https://mdstrm.com/category/5d8e0c9399fc343050ebc156-1569885600477.png?w=319&h=319&fit=crop&crop=entropy&crop=faces",
                            "key": "large",
                            "type": "image"
                        },
                        {
                            "src": "https://mdstrm.com/category/5d8e0c9399fc343050ebc156-1569885600477.png?w=48&h=48&fit=crop&crop=entropy&crop=faces",
                            "key": "small",
                            "type": "image"
                        }
                    ]
                }
            ],
            "extensions": {
                "custom_attributes": {
                    "att-test-03": "2019-09-04T00:00:00.000Z",
                    "att-test-01": "Feed valido"
                }
            },
            "content": {
                "type": "feed",
                "src": "https://mdstrm.com/feed/apps/5d49e087cb91053f883f517f/media?limit=20&category=5d8e0c9399fc343050ebc156"
            }
        }
    ]
  }
```

## [Detail Category](#categories-detail)

> The API allows you to get all data for category

#### Resource

`GET https://mdstrm.com/feed/apps/<ACCOUNT_ID>/category/<CATEGORY_ID>`

#### Permissions

**module feed active** are required to access this resource

#### Parameters

| Name | Type | Mandatory | Description |
| --- | --- | --- | ---
| page | Number | | Item to start pagination. (Defaults `1`) |
| limit | Number | | Maximum number of records to return. (Default `20`, Max `100`) |
| sort | String (Array) | | Sort records by attribute. To sort in a descending direction you must add a minus sign (-) before the attribute. Example: "-date_created" |

#### Request Example

```
GET https://mdstrm.com/feed/apps/5d49e087cb91053f883f517f/category/5d4d91f90567454667ac98d6
```

#### Response Example

```json
  {
    "id": "5d4d91f90567454667ac98d6-1",
    "type": {
        "value": "feed"
    },
    "title": "Test 01",
    "summary": "",
    "entry": [
        {
            "id": "5d4d91f90567454667ac98d6-1-5d8e810865016438deff7efc",
            "type": {
                "value": "feed"
            },
            "title": "Test 01-2",
            "summary": "",
            "content": {
                "type": "feed",
                "src": "https://mdstrm.com/feed/apps/5d49e087cb91053f883f517f/media?category=5d8e810865016438deff7efc"
            }
        }
    ]
  }
```

## [List Medias](#media-list)

> The API allows you to list for all of your account's Medias

#### Resource

`GET https://mdstrm.com/feed/apps/<ACCOUNT_ID>/media?category={CATEGORY_ID}`

#### Permissions

**module feed active** are required to access this resource

#### Parameters

| Name | Type | Mandatory | Description |
| --- | --- | --- | ---
| tags | String (Array) | | Tag names to associate to Media. |
| page | Number | | Item to start pagination. (Defaults `1`) |
| category | String | | Filter by category_id. |
| limit | Number | | Maximum number of records to return. (Default `20`, Max `100`) |
| sort | String (Array) | | Sort records by attribute. To sort in a descending direction you must add a minus sign (-) before the attribute. Example: "-date_created" |

#### Request Example

```
GET https://mdstrm.com/feed/apps/5d49e087cb91053f883f517f/media?category=5d8e0c9399fc343050ebc156
```

#### Response Example

```json
 {
    "id": "medias-5d8e0c9399fc343050ebc156-1",
    "type": {
        "value": "feed"
    },
    "title": "media list",
    "entry": [
        {
            "id": "5d49e1bcc2741e0874e1f0df",
            "type": {
                "value": "video"
            },
            "title": "Dragon Ball Z Op",
            "summary": "Primer opening de Dragon Ball Z",
            "updated": "2019-08-06T20:23:24Z",
            "extensions": {},
            "content": {
                "type": "video/hls",
                "src": "https://develop.mdstrm.com/video/5d49e1bcc2741e0874e1f0df.m3u8"
            }
        }
    ]
  }
```

## [Detail Media](#media-detail)

> The API allows you to get all details of media.

#### Resource

`GET https://mdstrm.com/feed/apps/<ACCOUNT_ID>/media/<MEDIA_ID>`

#### Permissions

**module feed active** are required to access this resource

#### Request Example

```
GET https://mdstrm.com/feed/apps/5d49e087cb91053f883f517f/media/5d49e1bcc2741e0874e1f0df
```

#### Response Example

```json
  {
      "id": "5d49e1bcc2741e0874e1f0df",
      "type": {
          "value": {
              "value": "feed"
          }
      },
      "title": "Dragon Ball Z Op",
      "entry": [
          {
              "id": "5d49e1bcc2741e0874e1f0df",
              "type": {
                  "value": "video"
              },
              "title": "Dragon Ball Z Op",
              "summary": "Primer opening de Dragon Ball Z",
              "updated": "2019-08-06T20:23:24Z",
              "media_group": [
                  {
                      "type": "IMAGE",
                      "media_item": [
                          {
                              "src": "https://mdstrm.com/thumbs/5d49e087cb91053f883f517f/thumb_5d49e1bcc2741e0874e1f0df_5d49e1bcc2741e0874e1f0e7_54s.jpg",
                              "key": "image_base",
                              "type": "image"
                          },
                          {
                              "src": "https://mdstrm.com/thumbs/5d49e087cb91053f883f517f/thumb_5d49e1bcc2741e0874e1f0df_5d49e1bcc2741e0874e1f0e7_54s.jpg?w=319&h=319&fit=crop&crop=entropy&crop=faces",
                              "key": "large",
                              "type": "image"
                          },
                          {
                              "src": "https://mdstrm.com/thumbs/5d49e087cb91053f883f517f/thumb_5d49e1bcc2741e0874e1f0df_5d49e1bcc2741e0874e1f0e7_54s.jpg?w=48&h=48&fit=crop&crop=entropy&crop=faces",
                              "key": "small",
                              "type": "image"
                          }
                      ]
                  }
              ],
              "extensions": {},
              "content": {
                  "type": "video/hls",
                  "src": "https://mdstrm.com/video/5d49e1bcc2741e0874e1f0df.m3u8"
              }
          }
      ]
  }
```