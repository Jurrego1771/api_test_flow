/**
 * DataFactory para generar datos de prueba estandarizados y limpiables.
 * Actualizado con métodos para Playlists.
 */
const { faker } = require("@faker-js/faker");

class DataFactory {
  constructor() {
    this.prefix = `[QA-AUTO]`;
  }

  generateTitle(suffix = "Item") {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    return `${this.prefix} ${suffix} ${timestamp} - ${faker.random.alphaNumeric(6)}`;
  }

  // --- Medias ---
  generateMediaPayload(overrides = {}) {
    return {
      title: this.generateTitle("Media"),
      description: faker.lorem.paragraph(),
      is_published: "false",
      is_pre_published: "false",
      original: "720p",
      ...overrides,
    };
  }

  // --- Playlists ---
  generateManualPlaylistPayload(mediaIds = [], overrides = {}) {
    return {
      name: this.generateTitle("PL-Manual"),
      description: faker.lorem.sentence(),
      type: "manual",
      featured: false,
      no_ad: false,
      rules: {
        manual: {
          medias: mediaIds,
        },
      },
      ...overrides,
    };
  }

  generateSmartPlaylistPayload(overrides = {}) {
    return {
      name: this.generateTitle("PL-Smart"),
      description: faker.lorem.sentence(),
      type: "smart",
      featured: false,
      rules: {
        smart: {
          sort_by: "date_created",
          sort_asc: false,
          limit: 10,
          ...overrides.rules?.smart,
        },
      },
      ...overrides,
    };
  }

  generateSeriesPlaylistPayload(overrides = {}) {
    return {
      name: this.generateTitle("PL-Series"),
      description: faker.lorem.sentence(),
      type: "series",
      featured: false,
      rules: {
        series: {
          seasons: [
            {
              number: 1,
              description: "Season 1",
              episodes: [],
            },
          ],
          ...overrides.rules?.series,
        },
      },
      ...overrides,
    };
  }

  generatePlayoutPlaylistPayload(overrides = {}) {
    return {
      name: this.generateTitle("PL-Playout"),
      description: faker.lorem.sentence(),
      type: "playout",
      featured: false,
      rules: {
        playout: [
          {
            sort_by: "date_created",
            sort_asc: false,
            limit: 10,
          },
        ],
        ...overrides.rules?.playout,
      },
      ...overrides,
    };
  }

  // --- Live Streams (SM2 /api/live-stream: name, type, online...) ---
  generateLiveStreamPayload(overrides = {}) {
    return {
      name: this.generateTitle("Live"),
      type: "video",
      online: "false",
      ...overrides,
    };
  }

  // --- Shows ---
  generateShowPayload(overrides = {}) {
    const showTypes = ["tvshow", "radioshow", "podcast", "mixed"];
    const randomType = showTypes[Math.floor(Math.random() * showTypes.length)];

    const validGenres = [
      "action",
      "adventure",
      "animation",
      "arts",
      "automotive",
      "aviation",
      "biography",
      "business",
      "comedy",
      "crime",
      "design",
      "documentary",
      "drama",
      "education",
      "fantasy",
      "fashion & beauty",
      "fitness & nutrition",
      "food",
      "gadgets",
      "games & hobbies",
      "health",
      "history",
      "hobbies",
      "horror",
      "investing",
      "kids & family",
      "language courses",
      "management & marketing",
      "medicine",
      "music",
      "mystery",
      "news",
      "outdoor",
      "performing arts",
      "personal journals",
      "philosophy",
      "places & travel",
      "podcasting",
      "political",
      "professional",
      "science & medicine",
      "self-help",
      "shopping",
      "social sciences",
      "software how-to",
      "sports & recreation",
      "talk show",
      "tech news",
      "technology",
      "thriller",
      "training",
      "tv & film",
      "urban",
      "video games",
      "visual arts",
      "war",
      "western",
    ];

    const randomGenre =
      validGenres[Math.floor(Math.random() * validGenres.length)];

    return {
      account: process.env.ACCOUNT_ID || "test-account",
      title: this.generateTitle("Show"),
      description: faker.lorem.paragraph(),
      type: randomType,
      genres: [randomGenre],
      is_published: "false",
      first_emision: faker.date.past().toISOString(),
      ...overrides,
    };
  }

  generateShowMinimalPayload(overrides = {}) {
    return {
      account: process.env.ACCOUNT_ID || "test-account",
      title: this.generateTitle("Show-Minimal"),
      type: "tvshow",
      ...overrides,
    };
  }

  generateShowFullPayload(overrides = {}) {
    return {
      account: process.env.ACCOUNT_ID || "test-account",
      title: this.generateTitle("Show-Full"),
      description: faker.lorem.paragraphs(2),
      type: "podcast",
      genres: ["music", "education"],
      is_published: "true",
      first_emision: faker.date.past().toISOString(),
      rating: 7,
      ...overrides,
    };
  }

  // --- Access Restrictions ---
  generateAccessRestrictionPayload(overrides = {}) {
    return {
      name: this.generateTitle("AR"),
      media_closed_access_restriction: "disable",
      media_aes_restriction: "disable",
      media_drm_restriction: "disable",
      categories: [],
      apply_to_sub_categories: true,
      access_rules: [],
      ...overrides,
    };
  }

  generateAccessRestrictionWithGeoRule(countries = ["US", "CA"], overrides = {}) {
    return this.generateAccessRestrictionPayload({
      access_rules: [
        {
          context: "geo",
          access: true,
          allow_unknown: true,
          exclusive: false,
          rules: countries,
          type: "country",
          client_validation: false,
        },
      ],
      ...overrides,
    });
  }

  // --- Schedule Job (Live Stream) ---
  /**
   * Genera un payload para crear/actualizar un schedule-job en un live stream.
   * Basado en la estructura de campos separados: date_start, hour, minute, etc.
   */
  generateSchedulePayload(overrides = {}) {
    const now = new Date();
    const future = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Mañana
    
    const year = future.getFullYear();
    const month = String(future.getMonth() + 1).padStart(2, '0');
    const day = String(future.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    return {
      name: this.generateTitle("SchBox"),
      geo_restriction: "allow",
      geo_restriction_countries: ["co"],
      tz_offset: -5,
      type: "onetime",
      date_start: dateStr,
      date_end: dateStr,
      date_start_hour: "10",
      date_start_minute: "00",
      date_end_hour: "11",
      date_end_minute: "00",
      ...overrides,
    };
  }

  generateRecurringSchedulePayload(overrides = {}) {
    return this.generateSchedulePayload({
      type: "recurring",
      days: ["monday", "wednesday", "friday"],
      ...overrides,
    });
  }

  generateAccessRestrictionWithIPRule(ips = ["192.168.1.0/24"], overrides = {}) {
    return this.generateAccessRestrictionPayload({
      access_rules: [
        {
          context: "ip",
          access: true,
          allow_unknown: true,
          exclusive: false,
          rules: ips,
          client_validation: false,
        },
      ],
      ...overrides,
    });
  }
}

module.exports = new DataFactory();
