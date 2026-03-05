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
    return `${this.prefix} ${suffix} ${timestamp} - ${faker.string.alphanumeric(6)}`;
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
      medias: mediaIds, // Array de IDs
      ...overrides,
    };
  }

  generateSmartPlaylistPayload(overrides = {}) {
    return {
      name: this.generateTitle("PL-Smart"),
      description: faker.lorem.sentence(),
      type: "smart",
      featured: false,
      // Reglas smart por defecto (traer todo) o personalizadas
      limit: 10,
      sort_by: "date_created",
      sort_asc: false,
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
}

module.exports = new DataFactory();
