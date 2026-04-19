# Endpoint Coverage Tracker — Mediastream Platform API

> **Leyenda:** ✅ Completo | 🔄 Parcial | ❌ Faltante | ⬛ Fuera de scope QA externo
>
> **Columnas:** `Documentado` = referencia en `.agents/skills/mediastream-api/references/` | `Tests` = batería en `tests/`

_Última actualización: 2026-04-03 (media-subresources, live-quizzes, customer)_

---

## Resumen Ejecutivo

| Estado | Módulos |
|--------|---------|
| ✅ Documentado + Tests completos | Media (core+subrecursos), Live Stream (core+quizzes), Live Logo, Live Schedule, Live Thumbnail, Playlist, Show (core+seasons+episodes), Category, Article, Ad, Coupon, Coupon Group, Access Token, Access Restriction (GET), Embed, Customer |
| 🔄 Documentado + Tests parciales | — |
| ❌ Documentado + Sin tests | CDN, Image, Lookup, Machine Learning |
| ⬛ Sin doc + Sin tests (fuera scope) | Admin, Settings (bulk), Account, Sale, Webhooks, Encoder, Internal (`/-/`) |

---

## 1. Media `/api/media`

> Referencia: `media.md`, `media-id.md`

| Método | Endpoint | Documentado | Tests | Test IDs |
|--------|----------|:-----------:|:-----:|---------|
| GET | `/api/media` (list) | ✅ | ✅ | `TC_MED_GET_list_*` |
| GET | `/api/media` (filter by title is/contains/starts_with) | ✅ | ✅ | `TC_MED_GET_list_filter_*` |
| GET | `/api/media` (filter published, all=true) | ✅ | ✅ | `TC_MED_GET_list_*` |
| GET | `/api/media` (paginación limit/skip) | ✅ | ✅ | `TC_MED_GET_list_*` |
| POST | `/api/media` (create video estándar) | ✅ | ✅ | `TC_MED_POST_create_*` |
| POST | `/api/media` (create payload completo) | ✅ | ✅ | `TC_MED_POST_create_*` |
| POST | `/api/media` (validaciones: sin título, tipo inválido) | ✅ | ✅ | `TC_MED_POST_create_*` |
| GET | `/api/media/:id` (detail) | ✅ | ✅ | `TC_MED_GET_by_id_*` |
| GET | `/api/media/:id` (not found) | ✅ | ✅ | `TC_MED_GET_by_id_not_found` |
| POST | `/api/media/:id` (update título, publicar) | ✅ | ✅ | `TC_MED_POST_update_*` |
| POST | `/api/media/:id` (limpiar description, categories) | ✅ | ✅ | `TC_MED_POST_update_clear_*` |
| DELETE | `/api/media/:id` (delete success) | ✅ | ✅ | `TC_MED_DELETE_*` |
| DELETE | `/api/media/:id` (already deleted) | ✅ | ✅ | `TC_MED_DELETE_*` |
| GET | `/api/media` (no token / invalid token) | ✅ | ✅ | auth cases |
| GET | `/api/media/:id/chapters` | ✅ | ✅ | `TC_MED_GET_chapters_*` |
| POST | `/api/media/:id/chapters` | ✅ | ✅ | `TC_MED_POST_chapters_*` |
| GET | `/api/media/:id/metadata` | ✅ | ✅ | `TC_MED_GET_metadata_*` |
| POST | `/api/media/:id/metadata` | ✅ | ✅ | `TC_MED_POST_metadata_*` |
| POST | `/api/media/:id/transcription` | ✅ | ✅ | `TC_MED_POST_transcription_*` |
| POST | `/api/media/:id/subtitle` | ✅ | ❌ | — (requiere archivo .srt multipart) |
| GET | `/api/media/:id/related` | ✅ | 🔄 | Solo en embed tests |

---

## 2. Live Stream `/api/live-stream`

> Referencia: `live-stream.md`, `live-stream-id.md`

| Método | Endpoint | Documentado | Tests | Test IDs |
|--------|----------|:-----------:|:-----:|---------|
| GET | `/api/live-stream` (list) | ✅ | ✅ | `TC_LIV_GET_list_*` |
| GET | `/api/live-stream` (filter online/offline, type, bookmark) | ✅ | ✅ | `TC_LIV_GET_list_*` |
| GET | `/api/live-stream` (búsqueda, paginación) | ✅ | ✅ | `TC_LIV_GET_list_*` |
| POST | `/api/live-stream` (create video) | ✅ | ✅ | `TC_LIV_POST_create_*` |
| POST | `/api/live-stream` (create audio) | ✅ | ✅ | `TC_LIV_POST_create_*` |
| GET | `/api/live-stream/:id` (detail) | ✅ | ✅ | `TC_LIV_GET_by_id_*` |
| GET | `/api/live-stream/:id` (not found) | ✅ | ✅ | `TC_LIV_GET_by_id_not_found` |
| POST | `/api/live-stream/:id` (update nombre, config parcial) | ✅ | ✅ | `TC_LIV_POST_update_*` |
| POST | `/api/live-stream/:id` (clear player_skin) | ✅ | ✅ | `TC_LIV_POST_update_clear_*` |
| DELETE | `/api/live-stream/:id` | ✅ | ✅ | `TC_LIV_DELETE_*` |
| POST | `/api/live-stream/:id/toggle-online` | ✅ | ✅ | `TC_LIV_POST_toggle_online_*` |
| POST | `/api/live-stream/:id/toggle-bookmark` | ✅ | ✅ | `TC_LIV_POST_toggle_bookmark_*` |
| POST | `/api/live-stream/:id/start-record` | ✅ | ✅ | `TC_LIV_POST_start_record` |
| POST | `/api/live-stream/:id/refresh-token` | ✅ | ✅ | `TC_LIV_POST_refresh_token` |
| GET | `/api/live-stream` (no token / invalid token) | ✅ | ✅ | auth cases |
| GET | `/api/live-stream/:id/quizzes` | ✅ | ✅ | `TC_LIV_GET_quizzes_*` |
| POST | `/api/live-stream/:id/quizzes` | ✅ | ✅ | `TC_LIV_POST_quizzes_*` |
| POST | `/api/live-stream/:id/moment` | ✅ | ⬛ | 403 módulo no habilitado en este entorno |
| POST | `/api/live-stream/:id/social` | ✅ | ⬛ | 404 "Cannot POST" — endpoint no existe en este entorno |
| POST | `/api/live-stream/:id/restream` | ✅ | 🔄 | Solo GET en tests |
| GET | `/api/live-stream/:id/restream` | ✅ | ✅ | `TC_LIV_GET_restream` |

### 2.1 Live Logo `/api/live-stream/:id/logo`

| Método | Endpoint | Documentado | Tests | Test IDs |
|--------|----------|:-----------:|:-----:|---------|
| POST | `/api/live-stream/:id/logo` (upload válido) | ✅ | ✅ | `TC_LOG_001` |
| POST | `/api/live-stream/:id/logo` (URL externa) | ✅ | ✅ | `TC_LOG_004` |
| POST | `/api/live-stream/:id/logo` (oversized, formato inválido, vacío) | ✅ | ✅ | `TC_LOG_006-008` |
| POST | `/api/live-stream/:id/logo` (live inexistente, sin token) | ✅ | ✅ | `TC_LOG_009, 013` |
| DELETE | `/api/live-stream/:id/logo` | ✅ | ✅ | `TC_LOG_010, 012, 014` |

### 2.2 Live Schedule `/api/live-stream/:id/schedule-job`

| Método | Endpoint | Documentado | Tests | Test IDs |
|--------|----------|:-----------:|:-----:|---------|
| GET | `/api/live-stream/:id/schedule-job` | ✅ | ✅ | `TC_SCH_001-004` |
| POST | `/api/live-stream/:id/schedule-job` (create/update) | ✅ | ✅ | `TC_SCH_005-019` |
| DELETE | `/api/live-stream/:id/schedule-job/:jobId` | ✅ | ✅ | `TC_SCH_011` |
| GET/POST/DELETE | auth (sin token, token inválido) | ✅ | ✅ | `TC_SCH_020-023` |

### 2.3 Live Thumbnail `/api/live-stream/:id/thumb`

| Método | Endpoint | Documentado | Tests | Test IDs |
|--------|----------|:-----------:|:-----:|---------|
| POST | `/api/live-stream/:id/thumb` (upload) | ✅ | ✅ | `TC_THB_001` |
| GET | `/api/live-stream/:id/thumb` (list) | ✅ | ✅ | `TC_THB_002` |
| POST | `/api/live-stream/:id/thumb/:thumbId` (set default) | ✅ | ✅ | `TC_THB_003` |
| DELETE | `/api/live-stream/:id/thumb/:thumbId` | ✅ | ✅ | `TC_THB_004` |
| POST/DELETE | auth (sin token) | ✅ | ✅ | `TC_THB_005-006` |

---

## 3. Playlist `/api/playlist`

> Referencia: `playlist.md`

| Método | Endpoint | Documentado | Tests | Test IDs |
|--------|----------|:-----------:|:-----:|---------|
| GET | `/api/playlist` (list, limit, filter type) | ✅ | ✅ | `TC_PLS_GET_list_*` |
| GET | `/api/playlist/:id` (detail) | ✅ | ✅ | `TC_PLS_GET_detail_*` |
| GET | `/api/playlist/:id?medias=true` | ✅ | ✅ | `TC_PLS_GET_detail_medias_*` |
| GET | `/api/playlist/:id` (not found) | ✅ | ✅ | `TC_PLS_GET_detail_not_found` |
| POST | `/api/playlist` (create manual) | ✅ | ✅ | `TC_PLS_POST_create_manual_*` |
| POST | `/api/playlist` (create smart) | ✅ | ✅ | `TC_PLS_POST_create_smart_*` |
| POST | `/api/playlist` (create series) | ✅ | ✅ | `TC_PLS_POST_create_series_*` |
| POST | `/api/playlist` (create playout) | ✅ | ✅ | `TC_PLS_POST_create_playout_*` |
| POST | `/api/playlist` (validaciones negativas) | ✅ | ✅ | `TC_PLS_POST_create_missing_*` |
| POST | `/api/playlist/:id` (update nombre, medias, flags, geo) | ✅ | ✅ | `TC_PLS_POST_update_*` |
| DELETE | `/api/playlist/:id` | ✅ | ✅ | `TC_PLS_DELETE_*` |
| GET | `/api/playlist/:id/content` | ✅ | ⬛ | 404 NOT_FOUND para playlists manuales — sólo funciona en contexto embed (ya cubierto en `TC_EMB_GET_api_playlist_content`) |

---

## 4. Show `/api/show`

> Referencia: `show.md`, `show-id.md`, `show-season-episode.md`

| Método | Endpoint | Documentado | Tests | Test IDs |
|--------|----------|:-----------:|:-----:|---------|
| GET | `/api/show` (list, paginación, filtros, sort) | ✅ | ✅ | `TC_SHW_GET_list_*` |
| GET | `/api/show` (no token / invalid token) | ✅ | ✅ | auth cases |
| POST | `/api/show` (create minimal, full, validaciones) | ✅ | ✅ | `TC_SHW_001-004, NEG_001-004` |
| GET | `/api/show/:id` (detail, con populate) | ✅ | ✅ | `TC_SHW_010-011` |
| GET | `/api/show/:id` (not found, invalid ID) | ✅ | ✅ | `TC_SHW_NEG_010-011` |
| POST | `/api/show/:id` (update partial, complete, next_episode) | ✅ | ✅ | `TC_SHW_040-042` |
| POST | `/api/show/:id` (field persistence, clear description) | ✅ | ✅ | `TC_SHW_*` |
| DELETE | `/api/show/:id` (soft delete, status verification) | ✅ | ✅ | `TC_SHW_050-051` |
| DELETE | `/api/show/:id` (not found, invalid ID) | ✅ | ✅ | `TC_SHW_NEG_050-051` |
| GET | `/api/show/:id/season` (list, limit, show_not_found) | ✅ | ✅ | `TC_SHW_GET_season_list_*` |
| POST | `/api/show/:id/season` (create, validaciones, auth) | ✅ | ✅ | `TC_SHW_POST_season_*` |
| GET | `/api/show/:id/season/:seasonId` (detail, populate) | ✅ | ✅ | `TC_SHW_GET_season_by_id_*` |
| POST | `/api/show/:id/season/:seasonId` (update title, desc, persist) | ✅ | ✅ | `TC_SHW_POST_season_update_*` |
| DELETE | `/api/show/:id/season/:seasonId` | ✅ | ✅ | `TC_SHW_DELETE_season_*` |
| GET | `/api/show/:id/season/:seasonId/episode` (list, limit, empty) | ✅ | ✅ | `TC_SHW_GET_episode_list_*` |
| POST | `/api/show/:id/season/:seasonId/episode` (create, validaciones, auth) | ✅ | ✅ | `TC_SHW_POST_episode_*` |
| GET | `/api/show/:id/season/:seasonId/episode/:episodeId` (detail) | ✅ | ✅ | `TC_SHW_GET_episode_by_id_*` |
| POST | `/api/show/:id/season/:seasonId/episode/:episodeId` (update, persist) | ✅ | ✅ | `TC_SHW_POST_episode_update_*` |
| DELETE | `/api/show/:id/season/:seasonId/episode/:episodeId` | ✅ | ✅ | `TC_SHW_DELETE_episode_*` |

---

## 5. Category `/api/category`

> Referencia: `category.md`

| Método | Endpoint | Documentado | Tests | Test IDs |
|--------|----------|:-----------:|:-----:|---------|
| GET | `/api/category` (list sin filtro) | ✅ | ✅ | `TC_CAT_GET_list_no_filter` |
| GET | `/api/category?category_name=` | ✅ | ✅ | `TC_CAT_GET_list_filter_by_name` |
| GET | `/api/category?full=true` | ✅ | ✅ | `TC_CAT_GET_list_full_flag` |
| GET | `/api/category?with_count=true` | ✅ | ✅ | `TC_CAT_GET_list_with_count_flag` |
| GET | `/api/category` (no token / invalid token) | ✅ | ✅ | `TC_CAT_GET_list_no_token`, `_invalid_token` |
| POST | `/api/category` (create minimal, full, validaciones) | ✅ | ✅ | `TC_CAT_POST_create_*` |
| POST | `/api/category` (clear description) | ✅ | ✅ | `TC_CAT_POST_update_clear_description` |
| GET | `/api/category/:id` | ✅ | ✅ | `TC_CAT_GET_category_by_id` |
| GET | `/api/category/:id` (not found, no token, invalid token) | ✅ | ✅ | `TC_CAT_GET_category_by_id_*` |
| POST | `/api/category/:id` (update nombre, descripción, DRM) | ✅ | ✅ | `TC_CAT_POST_update_category_*` |
| POST | `/api/category/:id` (asignar child a parent) | ✅ | ✅ | `TC_CAT_POST_update_category_assign_child_to_parent` |
| POST | `/api/category/:id` (not found, no token) | ✅ | ✅ | `TC_CAT_POST_update_category_not_found`, `_no_token` |
| DELETE | `/api/category/:id` | ✅ | ✅ | `TC_CAT_DELETE_category_by_id` |
| DELETE | `/api/category/:id` (not found, no token, invalid token) | ✅ | ✅ | `TC_CAT_DELETE_category_*` |

---

## 6. Article `/api/article`

> Referencia: `article.md`

| Método | Endpoint | Documentado | Tests | Test IDs |
|--------|----------|:-----------:|:-----:|---------|
| GET | `/api/article` (paginación) | ✅ | ✅ | `TC_ART_GET_list_pagination` |
| GET | `/api/article?count=true` | ✅ | ✅ | `TC_ART_GET_list_count_flag` |
| GET | `/api/article?without_category=true` | ✅ | ✅ | `TC_ART_GET_list_without_category` |
| GET | `/api/article` (no token / invalid token) | ✅ | ✅ | `TC_ART_GET_list_no_token`, `_invalid_token` |
| GET | `/api/article/search?` | ✅ | ✅ | `TC_ART_GET_search_by_title_and_tags` |
| POST | `/api/article` (create válido, sin título) | ✅ | ✅ | `TC_ART_POST_create_*` |
| GET | `/api/article/:id` (detail) | ✅ | ✅ | `TC_ART_GET_detail_by_id` |
| POST | `/api/article/:id` (update, field persistence, clear) | ✅ | ✅ | `TC_ART_POST_update_*` |
| POST | `/api/article/:id/preview` | ✅ | ✅ | `TC_ART_POST_preview_valid` |
| DELETE | `/api/article/:id` | ✅ | ✅ | `TC_ART_DELETE_article_by_id` |
| DELETE | `/api/article/:id` (not found) | ✅ | ✅ | `TC_ART_DELETE_article_not_found` |
| POST | `/api/article/generate` (IA) | ✅ | ⬛ | 404 NOT_FOUND — endpoint no existe en este entorno |

---

## 7. Ad `/api/ad`

> Referencia: `ads.md`

| Método | Endpoint | Documentado | Tests | Test IDs |
|--------|----------|:-----------:|:-----:|---------|
| GET | `/api/ad` (list, paginación) | ✅ | ✅ | `TC_AD_GET_list_*` |
| GET | `/api/ad/search?name=` | ✅ | ✅ | `TC_AD_GET_search_by_name` |
| GET | `/api/ad/search?id=` | ✅ | ✅ | `TC_AD_GET_search_by_id` |
| GET | `/api/ad` (no token / invalid token) | ✅ | ✅ | `TC_AD_GET_list_no_token`, `_invalid_token` |
| POST | `/api/ad` (create válido) | ✅ | ✅ | `TC_AD_POST_create_ad_valid` |
| GET | `/api/ad/:id` | ✅ | ✅ | `TC_AD_GET_ad_by_id` |
| GET | `/api/ad/:id` (not found) | ✅ | ✅ | `TC_AD_GET_ad_not_found` |
| POST | `/api/ad/:id` (update, validaciones, not found) | ✅ | ✅ | `TC_AD_POST_update_*` |
| POST | `/api/ad/:id` (field persistence, clear tags/categories) | ✅ | ✅ | `TC_AD_*_clear_*` |
| DELETE | `/api/ad/:id` | ✅ | ✅ | `TC_AD_DELETE_ad_by_id` |
| DELETE | `/api/ad/:id` (not found) | ✅ | ✅ | `TC_AD_DELETE_ad_not_found` |

---

## 8. Coupon `/api/coupon`

> Referencia: `coupon.md`

| Método | Endpoint | Documentado | Tests | Test IDs |
|--------|----------|:-----------:|:-----:|---------|
| GET | `/api/coupon` (list) | ✅ | ✅ | `TC_CPN_001` |
| GET | `/api/coupon?custom_code=` | ✅ | ✅ | `TC_CPN_002` |
| GET | `/api/coupon?page=&limit=` (paginación) | ✅ | ✅ | `TC_CPN_004` |
| GET | `/api/coupon` (no token / invalid token) | ✅ | ✅ | `TC_CPN_GET_list_no_token`, `_invalid_token` |
| POST | `/api/coupon` (create non-reusable, reusable custom code) | ✅ | ✅ | `TC_CPN_006-007` |
| POST | `/api/coupon` (duplicate code, datos inválidos) | ✅ | ✅ | `TC_CPN_008-009` |
| GET | `/api/coupon/:id` | ✅ | ✅ | `TC_CPN_010` |
| GET | `/api/coupon/:id` (not found) | ✅ | ✅ | `TC_CPN_013` |
| GET | `/api/coupon/:code/search` | ✅ | ✅ | `TC_CPN_011` |
| DELETE | `/api/coupon/:id` | ✅ | ✅ | `TC_CPN_012` |
| GET | `/api/coupon-group` (list) | ✅ | ✅ | `TC_CPN_GET_group_list_*` |
| POST | `/api/coupon-group` (create, nombre único, sin nombre) | ✅ | ✅ | `TC_CPN_POST_group_create_*` |
| GET | `/api/coupon-group/:id` (subgroups list) | ✅ | ✅ | `TC_CPN_GET_group_subgroups_*` |
| POST | `/api/coupon-group/:id/disable` (bulk disable, validaciones) | ✅ | ✅ | `TC_CPN_POST_group_disable_*` |
| POST | `/api/coupon-group/:id` (update) | ✅ | ⬛ | Endpoint no existe en la API (no documentado realmente) |
| DELETE | `/api/coupon-group/:id` | ✅ | ⬛ | Endpoint no existe — 404 "Cannot DELETE" |

---

## 9. Access Restriction `/api/settings/advanced-access-restrictions`

> Referencia: `access-restrictions.md`

| Método | Endpoint | Documentado | Tests | Test IDs |
|--------|----------|:-----------:|:-----:|---------|
| GET | `/api/settings/advanced-access-restrictions` (list) | ✅ | ✅ | `TC_AR_001` |
| GET | `/api/settings/advanced-access-restrictions` (no token) | ✅ | ✅ | `TC_AR_002` |
| GET | `/api/settings/advanced-access-restrictions` (invalid token) | ✅ | ✅ | `TC_AR_003` |
| GET | `/api/settings/advanced-access-restrictions/:id` (not found) | ✅ | ✅ | `TC_AR_NEG_010` |
| GET | `/api/settings/advanced-access-restrictions/:id` (invalid ID) | ✅ | ✅ | `TC_AR_NEG_011` |
| POST | `/api/settings/advanced-access-restrictions` (create) | ✅ | ⬛ | Requiere sesión de navegador, no API token (302 redirect) |
| POST | `/api/settings/advanced-access-restrictions/:id` (update) | ✅ | ⬛ | Requiere sesión de navegador, no API token (302 redirect) |
| DELETE | `/api/settings/advanced-access-restrictions/:id` | ✅ | ⬛ | Requiere sesión de navegador, no API token (302 redirect) |

---

## 10. Access Token `/api/access`

> Referencia: `access-token.md`

| Método | Endpoint | Documentado | Tests | Test IDs |
|--------|----------|:-----------:|:-----:|---------|
| POST | `/api/access/issue` (media, live, params opcionales) | ✅ | ✅ | `TC_AT_POST_issue_*` |
| POST | `/api/access/issue` (unicidad de tokens) | ✅ | ✅ | `TC_AT_POST_issue_tokens_are_unique` |
| POST | `/api/access/issue` (sin token, token inválido) | ✅ | ✅ | `TC_AT_POST_issue_no_token`, `_invalid_token` |
| POST | `/api/access/issue` (validaciones: type inválido, id inválido) | ✅ | ✅ | `TC_AT_POST_issue_missing_*`, `_invalid_*` |

---

## 11. Embed (URLs de reproducción)

> Referencia: `.agents/skills/mediastream-embed/`

### 11.1 VOD Embed `/embed/:mediaId`

| Endpoint / Param | Documentado | Tests | Test IDs |
|-----------------|:-----------:|:-----:|---------|
| `/embed/:id` (basic load) | ✅ | ✅ | `TC_EMB_GET_vod_basic_load` |
| `?autoplay=` | ✅ | ✅ | `TC_EMB_GET_vod_autoplay_*` |
| `?start=`, `?loop=`, `?controls=` | ✅ | ✅ | `TC_EMB_GET_vod_*` |
| `?volume=`, `?title=`, `?description=` | ✅ | ✅ | `TC_EMB_GET_vod_*` |
| `?poster=`, `?player=`, `?player_skin=` | ✅ | ✅ | `TC_EMB_GET_vod_*` |
| `?no_ad=true&admin_token=` | ✅ | ✅ | `TC_EMB_GET_vod_no_ad_*` |
| `?acc_token=`, `?debug=true`, `?dnt=true` | ✅ | ✅ | `TC_EMB_GET_vod_*` |
| `?without_cookies=true` | ✅ | ✅ | `TC_EMB_GET_vod_cookieless_mode` |

### 11.2 Live Stream Embed `/live/:id`

| Endpoint / Param | Documentado | Tests | Test IDs |
|-----------------|:-----------:|:-----:|---------|
| `/live/:id` (basic load) | ✅ | ✅ | `TC_EMB_GET_live_basic_load` |
| `?autoplay=` | ✅ | ✅ | `TC_EMB_GET_live_autoplay_*` |
| `/live/:id/playlist.m3u8` | ✅ | ✅ | `TC_EMB_GET_live_playlist_hls` |
| `/live/:id/manifest.smil` | ✅ | ✅ | `TC_EMB_GET_live_manifest_smil` |
| `?rtmpt=true` | ✅ | ✅ | `TC_EMB_GET_live_rtmpt_param` |

### 11.3 Live DVR

| Endpoint | Documentado | Tests | Test IDs |
|---------|:-----------:|:-----:|---------|
| `/live/:id/master.m3u8?start=&end=` | ✅ | ✅ | `TC_EMB_GET_dvr_range_by_dates` |
| `/live/:id/master.m3u8?dvrOffset=` | ✅ | ✅ | `TC_EMB_GET_dvr_offset_seconds` |
| `/live/:id/master.m3u8?delay=` | ✅ | ✅ | `TC_EMB_GET_dvr_delay_param` |

### 11.4 Video Directo

| Endpoint | Documentado | Tests | Test IDs |
|---------|:-----------:|:-----:|---------|
| `/video/:id/master.m3u8?profile=max/min` | ✅ | ✅ | `TC_EMB_GET_video_profile_*` |
| `/video/:id/master.m3u8` (HLS) | ✅ | ✅ | `TC_EMB_GET_video_stream_hls` |
| `/video/:id/master.mpd` (DASH) | ✅ | ✅ | `TC_EMB_GET_video_stream_dash` |
| `/video/:id/video.mp4` | ✅ | ✅ | `TC_EMB_GET_video_stream_mp4` |

### 11.5 OEmbed, Feed, Share, Watch

| Endpoint | Documentado | Tests | Test IDs |
|---------|:-----------:|:-----:|---------|
| `/oembed?url=&format=json/xml` | ✅ | ✅ | `TC_EMB_GET_oembed_*` |
| `/oembed?maxwidth=&maxheight=` | ✅ | ✅ | `TC_EMB_GET_oembed_max_dimensions` |
| `/feed/:accountId/media` (category, sort, tags, limit) | ✅ | ✅ | `TC_EMB_GET_feed_*` |
| `/share/media/:id`, `/share/live/:id` | ✅ | ✅ | `TC_EMB_GET_share_*` |
| `/watch/:scheduleJobId` | ✅ | ✅ | `TC_EMB_GET_watch_*` |
| `/api/media/:id?format=json` (player API) | ✅ | ✅ | `TC_EMB_GET_api_video_detail_json` |
| `/api/playlist/:id/content` (player API) | ✅ | ✅ | `TC_EMB_GET_api_playlist_content` |
| `/api/access-restrictions/media/:id` | ✅ | ✅ | `TC_EMB_GET_api_access_restrictions` |

---

## 12. Módulos Documentados — Sin Tests ❌

### Channel `/api/channel`

> Referencia: `channel.md`

| Método | Endpoint | Documentado | Tests |
|--------|----------|:-----------:|:-----:|
| GET | `/api/channel` (list) | ✅ | ❌ |
| POST | `/api/channel` (create) | ✅ | ⬛ | 404 "Cannot POST" — write endpoints no existen en este entorno |
| GET | `/api/channel/:id` | ✅ | ❌ |
| POST | `/api/channel/:id` (update) | ✅ | ⬛ | No existe |
| DELETE | `/api/channel/:id` | ✅ | ⬛ | No existe |

### CDN `/api/cdn`

> Referencia: `cdn.md`

| Método | Endpoint | Documentado | Tests |
|--------|----------|:-----------:|:-----:|
| GET | `/api/cdn` (list) | ✅ | ❌ |
| POST | `/api/cdn` (create) | ✅ | ❌ |
| GET | `/api/cdn/:id` | ✅ | ❌ |
| POST | `/api/cdn/:id` (update) | ✅ | ❌ |
| DELETE | `/api/cdn/:id` | ✅ | ❌ |

### Customer `/api/customer`

> Referencia: `customer.md` | ~67 endpoints en la API

| Método | Endpoint | Documentado | Tests |
|--------|----------|:-----------:|:-----:|
| GET | `/api/customer` (list, paginación, filtros) | ✅ | ✅ | `TC_CST_GET_list_*` |
| POST | `/api/customer` (create, validaciones) | ✅ | ✅ | `TC_CST_POST_create_*` |
| GET | `/api/customer/:id` (detail, not found) | ✅ | ✅ | `TC_CST_GET_by_id_*` |
| POST | `/api/customer/:id` (update, persist) | ✅ | ✅ | `TC_CST_POST_update_*` |
| DELETE | `/api/customer/:id` | ✅ | ✅ | `TC_CST_DELETE_*` |
| GET | `/api/customer/:id/profile` | ✅ | ❌ | — (requiere datos de suscripción activa) |
| GET | `/api/customer/:id/purchase` | ✅ | ❌ | — (requiere historial de compras) |
| POST | `/api/customer/:id/subscription` | ✅ | ❌ | — (requiere proveedor externo configurado) |
| DELETE | `/api/customer/:id/subscription/:provider` | ✅ | ❌ | — (requiere suscripción activa) |

### Image `/api/image`

> Referencia: `image.md`

| Método | Endpoint | Documentado | Tests |
|--------|----------|:-----------:|:-----:|
| GET | `/api/image` | ✅ | ❌ |
| POST | `/api/image` (upload + transformaciones) | ✅ | ❌ |

### Lookup `/api/lookup`

> Referencia: `lookup.md`

| Método | Endpoint | Documentado | Tests |
|--------|----------|:-----------:|:-----:|
| GET | `/api/lookup/country` | ✅ | ❌ |
| GET | `/api/lookup/language` | ✅ | ❌ |

### Machine Learning `/api/machine-learning`

> Referencia: `machine-learning.md`

| Método | Endpoint | Documentado | Tests |
|--------|----------|:-----------:|:-----:|
| GET/POST | `/api/machine-learning/person` | ✅ | ❌ |
| GET/POST | `/api/machine-learning/brand` | ✅ | ❌ |
| GET/POST | `/api/machine-learning/caption` | ✅ | ❌ |

---

## 13. Módulos en la API — Sin Documentar y Sin Tests ⬛

> Estos módulos existen en `sm2/app.coffee` pero están fuera del scope actual de QA externo.
> Se listan para trazabilidad.

| Módulo | Endpoints aprox. | Ruta base | Prioridad QA |
|--------|-----------------|-----------|-------------|
| **Settings** (general) | ~141 | `/api/settings/` | Baja — configuración admin |
| **Admin** | ~72 | `/api/admin/` | Fuera scope |
| **Account** | ~39 | `/api/account/` | Baja |
| **Sale** | ~31 | `/api/sale/` | Media |
| **Internal** | ~61 | `/-/` | Fuera scope (callbacks internos) |
| **SMS** | ~30 | `/api/sms/` | Baja |
| **Webhooks** | ~12 | `/api/webhooks/` | Fuera scope (terceros) |
| **Encoder** | ~10 | `/api/encoder/` | Baja |
| **Device** | ~5 | `/api/device/` | Baja |
| **Autocomplete** | ~11 | `/api/autocomplete/` | Baja |
| **Audit** | — | `/api/audit/` | Baja |

---

## Checklist de Pendientes — Prioridad Alta 🔴

- [x] **Access Restriction (escritura)** — ⬛ Fuera de scope: POST create/update y DELETE requieren sesión de navegador (302 redirect con API token)
- [x] **Show Season — POST create** — `tests/show/season_create.test.js` (10 casos, BUG: 500 en lugar de 404 con showId inexistente)
- [x] **Show Season (CRUD completo)** — `tests/show/season_crud.test.js` (18 casos, BUGS: not_found devuelve 500 en lugar de 404; soft delete mantiene season accesible vía GET; list sin campo `status`; GET/UPDATE devuelven season en root sin wrapper)
- [x] **Show Episodes (CRUD completo)** — `tests/show/episode_crud.test.js` (22 casos, BUGS: not_found → 500; mismo formato no-estándar que seasons; CONSTRAINT: un media solo puede aparecer en un episodio por temporada)
- [x] **Access Token** — `tests/access/access_token.test.js` (13 casos, BUG: 401 INVALID_OBJECT_ID en vez de 404 para ID inexistente)
- [x] **Coupon Group** — `tests/cupones/coupon_group.test.js` (12 casos, BUG: disable sin fechas retorna DB_ERROR en vez de BOTH_DATE_START_AND_DATE_END_ARE_REQUIRED; DELETE y POST update no existen como endpoints)

## Checklist de Pendientes — Prioridad Media 🟡

- [x] **Customer** — `tests/customer/customer.test.js` (CRUD básico: list, create, get by id, update, delete)
- [x] **Channel** — ⬛ Fuera de scope: POST/PUT/DELETE no existen; GET list sin datos relevantes
- [x] **Media sub-recursos** — `tests/media/media_subresources.test.js` (chapters GET/POST, metadata GET/POST trigger, transcription validaciones)
- [x] **Live sub-recursos** — `tests/live/live_quizzes.test.js` (quizzes list/create); moment y social ⬛ fuera de scope
- [x] **Playlist** — ⬛ `/api/playlist/:id/content` retorna 404 para playlists manuales (ya cubierto en embed tests)
- [x] **Article** — ⬛ `/api/article/generate` retorna 404 en este entorno

## Checklist de Pendientes — Prioridad Baja 🟢


- [ ] **CDN** — Crear batería básica
- [ ] **Image** — Crear batería básica
- [ ] **Lookup** — Crear tests GET simples
- [ ] **Machine Learning** — Crear tests para person, brand, caption
