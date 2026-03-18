// fixtures/embed.fixture.js
const base = require("@playwright/test");
require("dotenv").config();

/**
 * Fixture para pruebas del sistema Embed SM2
 * Proporciona helpers para construir URLs y realizar peticiones
 */
exports.test = base.test.extend({
  // Configuración del embed
  embedConfig: async ({}, use) => {
    const config = {
      host: process.env.EMBED_HOST || "dev.mdstrm.com",
      protocol: process.env.EMBED_PROTOCOL || "https",

      // IDs de prueba
      mediaId: process.env.EMBED_MEDIA_ID || "507f1f77bcf86cd799439011",
      liveStreamId: process.env.EMBED_LIVE_STREAM_ID || "507f1f77bcf86cd799439012",
      playlistId: process.env.EMBED_PLAYLIST_ID || "507f1f77bcf86cd799439013",
      accountId: process.env.EMBED_ACCOUNT_ID || "507f1f77bcf86cd799439014",
      categoryId: process.env.EMBED_CATEGORY_ID || "507f1f77bcf86cd799439015",
      playerId: process.env.EMBED_PLAYER_ID || "507f1f77bcf86cd799439016",
      scheduleJobLiveId: process.env.EMBED_SCHEDULE_JOB_LIVE_ID || "507f1f77bcf86cd799439017",
      scheduleJobVodId: process.env.EMBED_SCHEDULE_JOB_VOD_ID || "507f1f77bcf86cd799439018",

      // Tokens
      adminToken: process.env.EMBED_ADMIN_TOKEN || "",
      accToken: process.env.EMBED_ACC_TOKEN || "",
      accessToken: process.env.EMBED_ACCESS_TOKEN || "",

      // Assets de prueba
      testPosterUrl: process.env.EMBED_TEST_POSTER_URL || "https://via.placeholder.com/1280x720",

      // Base URL
      get baseUrl() {
        return `${this.protocol}://${this.host}`;
      },
    };
    await use(config);
  },

  // Request context para embed (sin autenticación de platform)
  embedRequest: async ({ playwright, embedConfig }, use, testInfo) => {
    const context = await playwright.request.newContext({
      baseURL: embedConfig.baseUrl,
    });

    // Proxy para adjuntar evidencias en errores
    const proxyContext = new Proxy(context, {
      get(target, prop) {
        if (["get", "post", "put", "delete", "patch", "head"].includes(prop)) {
          return async (...args) => {
            const response = await target[prop](...args);

            if (!response.ok() && response.status() !== 302) {
              const url = args[0];
              const options = args[1] || {};
              let responseBody;
              try {
                responseBody = await response.json();
              } catch (e) {
                try {
                  responseBody = await response.text();
                } catch (e2) {
                  responseBody = "N/A";
                }
              }

              const logEntry = {
                method: prop.toUpperCase(),
                url: url,
                requestHeaders: options.headers || {},
                responseStatus: response.status(),
                responseBody: responseBody,
              };

              await testInfo.attach(`Embed-Error-${prop.toUpperCase()}`, {
                body: JSON.stringify(logEntry, null, 2),
                contentType: "application/json",
              });
            }
            return response;
          };
        }
        return target[prop];
      },
    });

    await use(proxyContext);
    await context.dispose();
  },

  // Helpers para construir URLs
  embedUrl: async ({ embedConfig }, use) => {
    const helpers = {
      /**
       * URL de embed VOD
       * @param {string} mediaId - ID del media (opcional, usa default)
       * @param {Object} params - Query parameters
       */
      vod: (mediaId = embedConfig.mediaId, params = {}) => {
        const url = new URL(`${embedConfig.baseUrl}/embed/${mediaId}`);
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.set(key, String(value));
        });
        return url.toString();
      },

      /**
       * URL de embed VOD con path override
       * @param {string} mediaId - ID del media
       * @param {Object} params - Parámetros como key/value para path
       */
      vodPathOverride: (mediaId = embedConfig.mediaId, params = {}) => {
        let path = `${embedConfig.baseUrl}/embed/${mediaId}`;
        Object.entries(params).forEach(([key, value]) => {
          path += `/${key}/${encodeURIComponent(String(value))}`;
        });
        return path;
      },

      /**
       * URL de video directo
       * @param {string} mediaId - ID del media
       * @param {string} format - Formato (m3u8, mpd, mp4, json)
       * @param {Object} params - Query parameters
       */
      video: (mediaId = embedConfig.mediaId, format = "m3u8", params = {}) => {
        const url = new URL(`${embedConfig.baseUrl}/video/${mediaId}.${format}`);
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.set(key, String(value));
        });
        return url.toString();
      },

      /**
       * URL de live stream embed
       * @param {string} liveId - ID del live stream
       * @param {Object} params - Query parameters
       */
      liveStream: (liveId = embedConfig.liveStreamId, params = {}) => {
        const url = new URL(`${embedConfig.baseUrl}/live-stream/${liveId}`);
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.set(key, String(value));
        });
        return url.toString();
      },

      /**
       * URL de live stream playlist
       * @param {string} liveId - ID del live stream
       * @param {string} format - Formato (m3u8, f4m, smil)
       * @param {Object} params - Query parameters
       */
      livePlaylist: (liveId = embedConfig.liveStreamId, format = "m3u8", params = {}) => {
        const url = new URL(`${embedConfig.baseUrl}/live-stream-playlist/${liveId}.${format}`);
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.set(key, String(value));
        });
        return url.toString();
      },

      /**
       * URL de live DVR master playlist
       * @param {string} liveId - ID del live stream
       * @param {Object} params - Query parameters (start, end, dvrOffset, etc.)
       */
      liveDvrMaster: (liveId = embedConfig.liveStreamId, params = {}) => {
        const url = new URL(`${embedConfig.baseUrl}/live-stream-playlist/${liveId}/master.m3u8`);
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.set(key, String(value));
        });
        return url.toString();
      },

      /**
       * URL de playlist
       * @param {string} playlistId - ID de la playlist
       * @param {Object} params - Query parameters
       */
      playlist: (playlistId = embedConfig.playlistId, params = {}) => {
        const url = new URL(`${embedConfig.baseUrl}/playlist/${playlistId}`);
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.set(key, String(value));
        });
        return url.toString();
      },

      /**
       * URL de share
       * @param {string} type - Tipo (media, live)
       * @param {string} id - ID del contenido
       */
      share: (type, id) => {
        return `${embedConfig.baseUrl}/share/${type}/${id}`;
      },

      /**
       * URL de feed
       * @param {string} accountId - ID de la cuenta
       * @param {string} feedType - Tipo de feed (media, category, show, etc.)
       * @param {string|null} feedTypeId - ID del tipo (opcional)
       * @param {Object} params - Query parameters
       */
      feed: (accountId = embedConfig.accountId, feedType = "media", feedTypeId = null, params = {}) => {
        let path = `${embedConfig.baseUrl}/feed/apps/${accountId}/${feedType}`;
        if (feedTypeId) {
          path += `/${feedTypeId}`;
        }
        const url = new URL(path);
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.set(key, String(value));
        });
        return url.toString();
      },

      /**
       * URL de OEmbed
       * @param {string} embedUrl - URL del embed a describir
       * @param {Object} params - Query parameters (format, maxwidth, maxheight)
       */
      oembed: (embedUrl, params = {}) => {
        const url = new URL(`${embedConfig.baseUrl}/oembed`);
        url.searchParams.set("url", embedUrl);
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.set(key, String(value));
        });
        return url.toString();
      },

      /**
       * URL de watch
       * @param {string} scheduleJobId - ID del schedule job
       */
      watch: (scheduleJobId) => {
        return `${embedConfig.baseUrl}/watch/${scheduleJobId}`;
      },

      /**
       * URL de API
       * @param {string} endpoint - Endpoint de la API
       */
      api: (endpoint) => {
        return `${embedConfig.baseUrl}${endpoint}`;
      },
    };

    await use(helpers);
  },
});

exports.expect = base.expect;
