const { ApiClient } = require('../lib/apiClient');

const MAX_PASSES = 4;
const PASS_DELAY_MS = 600;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class ResourceCleaner {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.createdResources = [];
    }

    register(type, id) {
        // Guard: un id nulo/undefined (p.ej. create devolvió data sin _id) generaba un
        // "Cleaned customer: undefined" fantasma — DELETE /api/.../undefined daba 404 y se
        // loggeaba como limpio. Se ignora y se avisa para no enmascarar el problema.
        if (id == null || id === 'undefined') {
            console.warn(`ResourceCleaner: register('${type}') con id inválido (${id}) — se ignora`);
            return;
        }
        this.createdResources.push({ type, id });
    }

    /**
     * Ejecuta el DELETE (o desactivación) según el tipo.
     * Devuelve la respuesta {status, ok, body} o null si el tipo es desconocido.
     */
    async _deleteResource({ type, id }) {
        switch (type) {
            case 'media':
                return this.apiClient.delete(`/api/media/${id}`);
            case 'playlist':
                return this.apiClient.delete(`/api/playlist/${id}`);
            case 'ad':
                return this.apiClient.delete(`/api/ad/${id}`);
            case 'category':
                return this.apiClient.delete(`/api/category/${id}`);
            case 'coupon':
                return this.apiClient.delete(`/api/coupon/${id}`);
            case 'show':
                return this.apiClient.delete(`/api/show/${id}`);
            case 'article':
                return this.apiClient.delete(`/api/article/${id}`);
            case 'live-stream':
                return this.apiClient.delete(`/api/live-stream/${id}`);
            case 'accessRestriction':
                return this.apiClient.delete(`/api/settings/advanced-access-restrictions/${id}`);
            case 'season': {
                // id format: "showId/seasonId"
                const [showId, seasonId] = id.split('/');
                return this.apiClient.delete(`/api/show/${showId}/season/${seasonId}`);
            }
            case 'episode': {
                // id format: "showId/seasonId/episodeId"
                const [showId, seasonId, episodeId] = id.split('/');
                return this.apiClient.delete(`/api/show/${showId}/season/${seasonId}/episode/${episodeId}`);
            }
            case 'quiz': {
                // id format: "liveId/quizId"
                const [liveId, quizId] = id.split('/');
                return this.apiClient.delete(`/api/live-stream/${liveId}/quizzes/${quizId}`);
            }
            case 'customer':
                // Soft-delete real: DELETE -> status DELETED + obsolete + date_deleted
                // (el customer sale del listado por defecto de la cuenta).
                // Antes: POST update {status:INACTIVE}, que devolvía 200 pero DEJABA el
                // customer presente (INACTIVE) -> los recursos se acumulaban en la cuenta.
                return this.apiClient.delete(`/api/customer/${id}`);
            case 'epg-origin':
                return this.apiClient.delete(`/api/settings/epg-mask/input/${id}`);
            default:
                return null;
        }
    }

    async clean() {
        // Orden-independiente: cleanup multi-pass. Un padre bloqueado por CANT_DELETE_PARENT
        // en una pasada se borra en la siguiente, una vez que sus hijos ya salieron.
        // El delay entre pasadas también absorbe el lag de propagación del backend.
        let worklist = [...this.createdResources].reverse();
        console.log(`Cleaning up ${worklist.length} resources...`);

        const reasons = new Map();

        for (let pass = 1; pass <= MAX_PASSES && worklist.length > 0; pass++) {
            if (pass > 1) await sleep(PASS_DELAY_MS);
            const remaining = [];

            for (const resource of worklist) {
                try {
                    const res = await this._deleteResource(resource);
                    if (res === null) {
                        console.warn(`ResourceCleaner: tipo desconocido "${resource.type}" (${resource.id}) — se omite`);
                        continue;
                    }
                    if (res.ok || res.status === 404) {
                        // 404 = ya no existe (borrado en el test o pasada previa)
                        console.log(`Cleaned ${resource.type}: ${resource.id}`);
                    } else {
                        reasons.set(resource, res.body?.data ?? res.status);
                        remaining.push(resource);
                    }
                } catch (error) {
                    reasons.set(resource, error?.message ?? String(error));
                    remaining.push(resource);
                }
            }

            // Sin progreso en esta pasada → no insistir (dependencia real irresoluble)
            if (remaining.length === worklist.length) {
                worklist = remaining;
                break;
            }
            worklist = remaining;
        }

        for (const resource of worklist) {
            console.error(`LEAK: no se pudo limpiar ${resource.type} ${resource.id} — ${reasons.get(resource)}`);
        }

        // Conserva solo lo que realmente quedó sin borrar — permite reintento/inspección posterior
        this.createdResources = worklist;
        if (worklist.length) {
            console.warn(`ResourceCleaner: ${worklist.length} recurso(s) quedaron sin limpiar`);
        }
        return worklist;
    }

    async cleanAll() {
        return this.clean();
    }
}

module.exports = { ResourceCleaner };
