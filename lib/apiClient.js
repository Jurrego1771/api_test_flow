/**
 * Wrapper for Playwright APIRequestContext to handle common logic
 * like auth headers, error handling, and logging.
 */
class ApiClient {
    constructor(requestContext, baseURL) {
        this.request = requestContext;
        this.baseURL = baseURL;
    }

    async post(endpoint, data, options = {}) {
        // Headers base + Token
        const headers = {
            ...options.headers,
            'x-api-token': process.env.API_TOKEN || '',
            'Content-Type': 'application/json'
        };

        try {
            const response = await this.request.post(`${this.baseURL}${endpoint}`, {
                data,
                ...options,
                headers,
            });
            return this._handleResponse(response);
        } catch (error) {
            console.error(`Error in POST ${endpoint}:`, error);
            throw error;
        }
    }

    async get(endpoint, options = {}) {
        // Headers base + Token
        const headers = {
            ...options.headers,
            'x-api-token': process.env.API_TOKEN || '',
        };

        try {
            const response = await this.request.get(`${this.baseURL}${endpoint}`, {
                ...options,
                headers,
            });
            return this._handleResponse(response);
        } catch (error) {
            console.error(`Error in GET ${endpoint}:`, error);
            throw error;
        }
    }

    async delete(endpoint, options = {}) {
        // Headers base + Token
        const headers = {
            ...options.headers,
            'x-api-token': process.env.API_TOKEN || '',
        };

        try {
            const response = await this.request.delete(`${this.baseURL}${endpoint}`, {
                ...options,
                headers,
            });
            return this._handleResponse(response);
        } catch (error) {
            console.error(`Error in DELETE ${endpoint}:`, error);
            throw error;
        }
    }

    async _handleResponse(response) {
        const status = response.status();
        let body = {};
        try {
            body = await response.json();
        } catch (e) {
            // Si no es JSON, devolvemos body vacío o texto
            // body = { text: await response.text() };
        }

        return {
            status,
            body,
            headers: response.headers(),
            ok: response.ok()
        };
    }
}

module.exports = { ApiClient };
