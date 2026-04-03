const base = require("@playwright/test");
require("dotenv").config();

// ─── Allure auto-labeling ─────────────────────────────────────────────────────
// Labels are injected via testInfo.annotations using the allure.label.<name>
// type format, which allure-playwright picks up via getMetadataLabel().
// This works from fixtures (unlike allure.feature() which requires test context).

const MOD_FEATURE = {
  MED: "Media",
  LIVE: "Live Stream",
  AD: "Ads",
  CAT: "Category",
  PLS: "Playlist",
  ART: "Article",
  SHW: "Show",
  CPN: "Coupon",
  AR: "Access Restriction",
  EMB: "Embed",
  LOG: "Logo",
  SCH: "Schedule",
  THB: "Thumbnail",
};

// Ordered: first match wins
const STORY_RULES = [
  [/no_token|invalid_token|no_auth|without_token/, "Authentication"],
  [/not_found|missing_|invalid_|empty_name|empty_title|_neg_/, "Negative Cases"],
  [/create|insert/, "Create"],
  [/delete|remove/, "Delete"],
  [/update|persist|clear/, "Update"],
  [/search/, "Search"],
  [/filter|list_filter|list_without|without_category/, "Filter"],
  [/list/, "List"],
  [/detail|by_id/, "Detail"],
  [/preview/, "Preview"],
];

const SEVERITY_CRITICAL = /_(create|delete_by_id|delete_article|delete_media|delete_ad|delete_playlist)\b/;
const SEVERITY_MINOR    = /_(no_token|invalid_token|not_found|missing_|invalid_|empty_|_neg_)/;

/**
 * Derives Allure labels from a TC_<MOD>_[NNN_]<METHOD>_<resource>_<scenario> test title.
 * Returns null for tests that don't follow the TC_ convention.
 */
function deriveAllureLabels(title) {
  const match = title.match(/^TC_([A-Z]+)_(?:\d+_)?[A-Z]+_(.+)/i);
  if (!match) return null;

  const [, mod, rest] = match;
  const lower = (title + "_" + rest).toLowerCase();

  const feature = MOD_FEATURE[mod] || mod;

  let story = "General";
  for (const [pattern, name] of STORY_RULES) {
    if (pattern.test(lower)) { story = name; break; }
  }

  let severity = "normal";
  if (SEVERITY_CRITICAL.test(lower)) severity = "critical";
  else if (SEVERITY_MINOR.test(lower)) severity = "minor";

  return { feature, story, severity };
}

// ─── Fixture ──────────────────────────────────────────────────────────────────

exports.test = base.test.extend({
  authRequest: async ({ playwright }, use, testInfo) => {
    // Auto-label every test that follows the TC_ naming convention
    const labels = deriveAllureLabels(testInfo.title);
    if (labels) {
      testInfo.annotations.push(
        { type: "allure.label.epic",     description: "Mediastream Platform API" },
        { type: "allure.label.feature",  description: labels.feature },
        { type: "allure.label.story",    description: labels.story },
        { type: "allure.label.severity", description: labels.severity },
      );
    }

    const context = await playwright.request.newContext({
      baseURL: process.env.BASE_URL,
      extraHTTPHeaders: {
        "X-API-Token": process.env.API_TOKEN,
      },
    });

    // Proxy para interceptar llamadas y adjuntar evidencias en caso de error
    const proxyContext = new Proxy(context, {
      get(target, prop) {
        if (['get', 'post', 'put', 'delete', 'patch'].includes(prop)) {
          return async (...args) => {
            const response = await target[prop](...args);

            // Si la respuesta no es exitosa (>= 400), adjuntamos evidencia
            if (!response.ok()) {
              const url = args[0];
              const options = args[1] || {};
              const status = response.status();
              let responseBody;
              try {
                responseBody = await response.json();
              } catch (e) {
                responseBody = await response.text();
              }

              const logEntry = {
                method: prop.toUpperCase(),
                url: url,
                requestHeaders: options.headers || {},
                requestBody: options.data || options.form || options.multipart || 'N/A',
                responseStatus: status,
                responseBody: responseBody
              };

              await testInfo.attach(`API-Error-${prop.toUpperCase()}`, {
                body: JSON.stringify(logEntry, null, 2),
                contentType: 'application/json'
              });
            }
            return response;
          };
        }
        return target[prop];
      }
    });

    await use(proxyContext);
    await context.dispose();
  },
});

exports.expect = base.expect;
