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
                    await this.apiClient.delete(`/api/playlist/${resource.id}`);
                    console.log(`Deleted Playlist: ${resource.id}`);
                }
                else if (resource.type === 'category') {
                    await this.apiClient.delete(`/api/category/${resource.id}`);
                    console.log(`Deleted Category: ${resource.id}`);
                }
                else if (resource.type === 'show') {
                    await this.apiClient.delete(`/api/show/${resource.id}`);
                    console.log(`Deleted Show: ${resource.id}`);
                }
                else if (resource.type === 'article') {
                    await this.apiClient.delete(`/api/article/${resource.id}`);
                    console.log(`Deleted Article: ${resource.id}`);
                }
                else if (resource.type === 'live-stream') {
                    await this.apiClient.delete(`/api/live-stream/${resource.id}`);
                    console.log(`Deleted Live Stream: ${resource.id}`);
                }
                else if (resource.type === 'coupon') {
                    await this.apiClient.delete(`/api/coupon/${resource.id}`);
                    console.log(`Deleted Coupon: ${resource.id}`);
                }
                else if (resource.type === 'ad') {
                    await this.apiClient.delete(`/api/ad/${resource.id}`);
                    console.log(`Deleted Ad: ${resource.id}`);
                }
                else if (resource.type === 'season') {
                    // id format: "showId/seasonId"
                    const [showId, seasonId] = resource.id.split('/');
                    await this.apiClient.delete(`/api/show/${showId}/season/${seasonId}`);
                    console.log(`Deleted Season: ${seasonId} (show: ${showId})`);
                }
                else if (resource.type === 'episode') {
                    // id format: "showId/seasonId/episodeId"
                    const [showId, seasonId, episodeId] = resource.id.split('/');
                    await this.apiClient.delete(`/api/show/${showId}/season/${seasonId}/episode/${episodeId}`);
                    console.log(`Deleted Episode: ${episodeId} (season: ${seasonId})`);
                }
                else if (resource.type === 'quiz') {
                    // id format: "liveId/quizId"
                    const [liveId, quizId] = resource.id.split('/');
                    await this.apiClient.delete(`/api/live-stream/${liveId}/quizzes/${quizId}`);
                    console.log(`Deleted Quiz: ${quizId} (live: ${liveId})`);
                }
                else if (resource.type === 'customer') {
                    // No DELETE endpoint — deactivate instead
                    await this.apiClient.post(`/api/customer/${resource.id}`, { status: 'INACTIVE' });
                    console.log(`Deactivated Customer: ${resource.id}`);
                }
            } catch (error) {
                console.error(`Failed to cleanup ${resource.type} ${resource.id}`, error);
            }
        }
        this.createdResources = [];
    }

    async cleanAll() {
        return this.clean();
    }
}

module.exports = { ResourceCleaner };
