/**
 * DataFactory para generar datos de prueba estandarizados y limpiables.
 * Actualizado con métodos para Playlists.
 */
const { faker } = require('@faker-js/faker');

class DataFactory {
    constructor() {
        this.prefix = `[QA-AUTO]`;
    }

    generateTitle(suffix = 'Item') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        return `${this.prefix} ${suffix} ${timestamp} - ${faker.string.alphanumeric(6)}`;
    }

    // --- Medias ---
    generateMediaPayload(overrides = {}) {
        return {
            title: this.generateTitle('Media'),
            description: faker.lorem.paragraph(),
            is_published: 'false',
            is_pre_published: 'false',
            original: '720p',
            ...overrides
        };
    }

    // --- Playlists ---
    generateManualPlaylistPayload(mediaIds = [], overrides = {}) {
        return {
            name: this.generateTitle('PL-Manual'),
            description: faker.lorem.sentence(),
            type: 'manual',
            featured: false,
            no_ad: false,
            medias: mediaIds, // Array de IDs
            ...overrides
        };
    }

    generateSmartPlaylistPayload(overrides = {}) {
        return {
            name: this.generateTitle('PL-Smart'),
            description: faker.lorem.sentence(),
            type: 'smart',
            featured: false,
            // Reglas smart por defecto (traer todo) o personalizadas
            limit: 10,
            sort_by: 'date_created',
            sort_asc: false,
            ...overrides
        };
    }

    // --- Live Streams (SM2 /api/live-stream: name, type, online...) ---
    generateLiveStreamPayload(overrides = {}) {
        return {
            name: this.generateTitle('Live'),
            type: 'video',
            online: 'false',
            ...overrides
        };
    }
}

module.exports = new DataFactory();
