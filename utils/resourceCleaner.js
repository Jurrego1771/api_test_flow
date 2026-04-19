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
                } else if (resource.type === 'playlist') {
                    await this.apiClient.delete(`/api/playlist/${resource.id}`);
                } else if (resource.type === 'ad') {
                    await this.apiClient.delete(`/api/ad/${resource.id}`);
                } else if (resource.type === 'category') {
                    await this.apiClient.delete(`/api/category/${resource.id}`);
                } else if (resource.type === 'coupon') {
                    await this.apiClient.delete(`/api/coupon/${resource.id}`);
                } else if (resource.type === 'show') {
                    await this.apiClient.delete(`/api/show/${resource.id}`);
                } else if (resource.type === 'article') {
                    await this.apiClient.delete(`/api/article/${resource.id}`);
                } else if (resource.type === 'live-stream') {
                    await this.apiClient.delete(`/api/live-stream/${resource.id}`);
                } else if (resource.type === 'accessRestriction') {
                    await this.apiClient.delete(`/api/settings/advanced-access-restrictions/${resource.id}`);
                } else if (resource.type === 'season') {
                    // id format: "showId/seasonId"
                    const [showId, seasonId] = resource.id.split('/');
                    await this.apiClient.delete(`/api/show/${showId}/season/${seasonId}`);
                } else if (resource.type === 'episode') {
                    // id format: "showId/seasonId/episodeId"
                    const [showId, seasonId, episodeId] = resource.id.split('/');
                    await this.apiClient.delete(`/api/show/${showId}/season/${seasonId}/episode/${episodeId}`);
                } else if (resource.type === 'quiz') {
                    // id format: "liveId/quizId"
                    const [liveId, quizId] = resource.id.split('/');
                    await this.apiClient.delete(`/api/live-stream/${liveId}/quizzes/${quizId}`);
                } else if (resource.type === 'customer') {
                    // No DELETE endpoint — deactivate instead
                    await this.apiClient.post(`/api/customer/${resource.id}`, { status: 'INACTIVE' });
                }
                console.log(`Cleaned ${resource.type}: ${resource.id}`);
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
