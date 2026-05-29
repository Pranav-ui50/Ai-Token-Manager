/**
 * Base API Service
 *
 * Provides methods for making HTTP requests to the backend API.
 */

import apiClient from './axios.js';

class ApiService {
  /**
   * Make a GET request
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  async get(endpoint, params = {}) {
    return apiClient.get(endpoint, { params });
  }

  /**
   * Make a POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @returns {Promise}
   */
  async post(endpoint, data = {}) {
    return apiClient.post(endpoint, data);
  }

  /**
   * Make a PUT request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @returns {Promise}
   */
  async put(endpoint, data = {}) {
    return apiClient.put(endpoint, data);
  }

  /**
   * Make a PATCH request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @returns {Promise}
   */
  async patch(endpoint, data = {}) {
    return apiClient.patch(endpoint, data);
  }

  /**
   * Make a DELETE request
   * @param {string} endpoint - API endpoint
   * @returns {Promise}
   */
  async delete(endpoint) {
    return apiClient.delete(endpoint);
  }
}

export default new ApiService();