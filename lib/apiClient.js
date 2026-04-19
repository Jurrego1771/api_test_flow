/**
 * Wrapper for Playwright APIRequestContext to handle common logic
 * like auth headers, error handling, and logging.
 */
class ApiClient {
    constructor(requestContext, baseURL) {
        this.request = requestContext;
        this.baseURL = baseURL || process.env.BASE_URL || '';
    }

    async post(endpoint, data, options = {}) {
        const { form: isForm = false, multipart: isMultipart = false, headers: extraHeaders = {}, ...restOptions } = options;
        const headers = {
            ...extraHeaders,
            'x-api-token': process.env.API_TOKEN || '',
            ...(!isForm && !isMultipart && { 'Content-Type': 'application/json' }),
        };
        const requestBody = isForm ? { form: data } : isMultipart ? { multipart: data } : data !== null ? { data } : {};

        try {
            const response = await this.request.post(`${this.baseURL}${endpoint}`, {
                ...requestBody,
                ...restOptions,
                headers,
            });
            return this._handleResponse(response);
        } catch (error) {
            console.error(`Error in POST ${endpoint}:`, error);
            throw error;
        }
    }

    async get(endpoint, options = {}) {
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

    async put(endpoint, data, options = {}) {
        const headers = {
            ...options.headers,
            'x-api-token': process.env.API_TOKEN || '',
            'Content-Type': 'application/json'
        };

        try {
            const response = await this.request.put(`${this.baseURL}${endpoint}`, {
                data,
                ...options,
                headers,
            });
            return this._handleResponse(response);
        } catch (error) {
            console.error(`Error in PUT ${endpoint}:`, error);
            throw error;
        }
    }

    async delete(endpoint, options = {}) {
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
            // non-JSON response
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
