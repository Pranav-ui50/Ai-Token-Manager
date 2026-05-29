/**
 * Axios API Client
 *
 * Centralized Axios configuration for API requests.
 */

import axios from 'axios';

import { API_CONFIG, AUTH_KEYS, HTTP_STATUS } from '../utils/constants.js';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token to headers if exists
    const token = localStorage.getItem(AUTH_KEYS.TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add organization ID if exists
    const userData = localStorage.getItem(AUTH_KEYS.USER);
    if (userData) {
      try {
        const user = JSON.parse(userData);
        if (user.organizationId) {
          config.headers['X-Organization-ID'] = user.organizationId;
        }
      } catch {
        // Ignore JSON parse errors
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Return the data directly
    return response.data;
  },
  (error) => {
    // Handle specific error cases
    if (!error.response) {
      // Network error
      return Promise.reject({
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Unable to connect to server. Please check your connection.'
        }
      });
    }

    const { status, data } = error.response;

    // Handle specific HTTP status codes
    switch (status) {
      case HTTP_STATUS.UNAUTHORIZED:
        // Clear auth data and redirect to login
        localStorage.removeItem(AUTH_KEYS.TOKEN);
        localStorage.removeItem(AUTH_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(AUTH_KEYS.USER);

        // Redirect to login if not already there
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        break;

      case HTTP_STATUS.FORBIDDEN:
        // Handle forbidden access
        return Promise.reject({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this resource.'
          }
        });

      case HTTP_STATUS.NOT_FOUND:
        return Promise.reject({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'The requested resource was not found.'
          }
        });

      case HTTP_STATUS.TOO_MANY_REQUESTS:
        return Promise.reject({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.'
          }
        });

      default:
        // Return the error from the server
        return Promise.reject(
          data || {
            success: false,
            error: {
              code: 'SERVER_ERROR',
              message: 'An unexpected error occurred. Please try again.'
            }
          }
        );
    }

    return Promise.reject(error);
  }
);

export default apiClient;