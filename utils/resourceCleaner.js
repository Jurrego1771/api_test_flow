/**
 * Test Cleaner: Clase para registrar y eliminar recursos creados durante los tests.
 * Actualizado para soportar Playlists.
 */
const { test, expect } = require('@playwright/test');
const { ApiClient } = require('../lib/apiClient');

class ResourceCleaner {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.createdResources = [];
    }

    register(type, id) {
        this.createdResources.push({ type, id });
    }

    async clean() {
        console.log(`Cleaning up ${this.createdResources.length} resources...`);
        const reversedResources = [...this.createdResources].reverse();

        for (const resource of reversedResources) {
            try {
                if (resource.type === 'media') {
                    await this.apiClient.delete(`/api/media/${resource.id}`);
                    console.log(`Deleted Media: ${resource.id}`);
                }
                else if (resource.type === 'playlist') {
                    // Nota: Swagger dice DELETE /api/playlist/{id}
                    await this.apiClient.delete(`/api/playlist/${resource.id}`);
                    console.log(`Deleted Playlist: ${resource.id}`);
                }
            } catch (error) {
                console.error(`Failed to cleanup ${resource.type} ${resource.id}`, error);
            }
        }
        this.createdResources = [];
    }
}

module.exports = { ResourceCleaner };
