/**
 * Axios Client Configuration
 *
 * Configured axios instance with interceptors for authentication and error handling.
 */

import axios from 'axios';
import { AUTH_KEYS } from '../../utils/constants.js';
import { storage } from '../../utils/helpers.js';

// Base URL from environment or default
// In development, use '/api' to go through Vite proxy
// In production, use the full URL from environment variable
const BASE_URL = import.meta.env.DEV
  ? '/api'  // In development, use Vite proxy
  : (import.meta.env.VITE_API_URL || '/api');

// Log configuration in development
if (import.meta.env.DEV) {
  console.log('[API] Environment VITE_API_URL:', import.meta.env.VITE_API_URL);
  console.log('[API] Using BASE_URL:', BASE_URL);
}

// Log configuration in development
if (import.meta.env.DEV) {
  console.log('[API] Base URL:', BASE_URL);
}

// Create axios instance
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Debug: Log the baseURL in development
if (import.meta.env.DEV) {
  console.log('[API] apiClient baseURL:', apiClient.defaults.baseURL);
}

// Auth endpoints that should NOT trigger token refresh on 401
const PUBLIC_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/resend-verification',
  '/auth/refresh'
];

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage using the same key as AuthContext
    const token = storage.get(AUTH_KEYS.TOKEN);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add organization ID header if available
    const organizationId = storage.get('currentOrganizationId');
    if (organizationId) {
      config.headers['X-Organization-ID'] = organizationId;
    }

    // Log request in development
    if (import.meta.env.DEV) {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, config.data);
    }

    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors and token refresh
apiClient.interceptors.response.use(
  (response) => {
    // Log response in development
    if (import.meta.env.DEV) {
      console.log(`[API] Response ${response.config.url}:`, response.data);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 403 Forbidden for billing endpoints silently (expected for superadmins)
    const isBillingEndpoint = originalRequest?.url?.includes('/billing');
    const is403Forbidden = error.response?.status === 403;

    if (isBillingEndpoint && is403Forbidden) {
      // Return empty data instead of rejecting
      return { data: null };
    }

    // Log error in development (except 403 Forbidden for billing endpoints)
    if (import.meta.env.DEV) {
      console.error('[API] Error:', {
        url: originalRequest?.url,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
    }

    // Handle network errors (no response received)
    if (!error.response) {
      const networkError = new Error(
        error.code === 'ECONNABORTED'
          ? 'Request timed out. Please try again.'
          : 'Network error. Please check your connection and ensure the server is running.'
      );
      networkError.isNetworkError = true;
      return Promise.reject(networkError);
    }

    // If not a 401 error, just reject
    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // Check for specific error codes that should force logout
    const errorCode = error.response?.data?.code || error.response?.data?.error?.code;

    // If ROLE_CHANGED, PASSWORD_CHANGED, or session invalid - force logout without token refresh
    if (errorCode === 'ROLE_CHANGED' || errorCode === 'PASSWORD_CHANGED') {
      console.log('[API] Session invalidated due to', errorCode);

      // Clear all auth data
      storage.remove(AUTH_KEYS.TOKEN);
      storage.remove(AUTH_KEYS.REFRESH_TOKEN);
      storage.remove(AUTH_KEYS.USER);

      // Store message to show on login page
      const message = errorCode === 'ROLE_CHANGED'
        ? 'Your role has been updated. Please log in again to see your new permissions.'
        : 'Your password was changed. Please log in again.';
      sessionStorage.setItem('auth_message', message);

      // Redirect to login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }

      return Promise.reject(error);
    }

    // Check if this is a public endpoint (login, register, etc.)
    const requestUrl = originalRequest?.url || '';
    const isPublicEndpoint = PUBLIC_ENDPOINTS.some(endpoint => requestUrl.includes(endpoint));

    if (isPublicEndpoint) {
      // For public endpoints, just pass the error through
      // Don't try to refresh token or redirect
      console.log('[API] Public endpoint 401, passing error through');
      return Promise.reject(error);
    }

    // For protected endpoints, try to refresh the token
    if (originalRequest._retry) {
      // Already tried to refresh, redirect to login
      console.log('[API] Token refresh failed, redirecting to login');
      storage.remove(AUTH_KEYS.TOKEN);
      storage.remove(AUTH_KEYS.REFRESH_TOKEN);
      storage.remove(AUTH_KEYS.USER);

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }

      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      // Try to refresh the token
      const refreshToken = storage.get(AUTH_KEYS.REFRESH_TOKEN);

      if (!refreshToken) {
        // No refresh token, redirect to login
        console.log('[API] No refresh token, redirecting to login');
        storage.remove(AUTH_KEYS.TOKEN);
        storage.remove(AUTH_KEYS.USER);

        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }

        return Promise.reject(error);
      }

      console.log('[API] Attempting token refresh');
      const response = await axios.post(`${BASE_URL}/auth/refresh`, {
        refreshToken
      });

      const { accessToken, refreshToken: newRefreshToken } = response.data.data;

      // Store new tokens using the same keys as AuthContext
      storage.set(AUTH_KEYS.TOKEN, accessToken);
      storage.set(AUTH_KEYS.REFRESH_TOKEN, newRefreshToken);

      // Update authorization header
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;

      console.log('[API] Token refreshed successfully');
      // Retry original request
      return apiClient(originalRequest);
    } catch (refreshError) {
      // Refresh failed - clear tokens and redirect to login
      console.error('[API] Token refresh failed:', refreshError);
      storage.remove(AUTH_KEYS.TOKEN);
      storage.remove(AUTH_KEYS.REFRESH_TOKEN);
      storage.remove(AUTH_KEYS.USER);

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }

      return Promise.reject(refreshError);
    }
  }
);

export default apiClient;