/**
 * Auth Context
 *
 * React context for authentication state management.
 */

import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import authApi from '../services/api/auth.api.js';
import { storage } from '../utils/helpers.js';
import { AUTH_KEYS } from '../utils/constants.js';

// Initial state
const initialState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  error: null
};

// Action types
const actionTypes = {
  AUTH_START: 'AUTH_START',
  AUTH_SUCCESS: 'AUTH_SUCCESS',
  AUTH_FAILURE: 'AUTH_FAILURE',
  LOGOUT: 'LOGOUT',
  UPDATE_USER: 'UPDATE_USER',
  SET_LOADING: 'SET_LOADING',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case actionTypes.AUTH_START:
      return {
        ...state,
        isLoading: true
      };
    case actionTypes.AUTH_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null
      };
    case actionTypes.AUTH_FAILURE:
      return {
        ...state,
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload
      };
    case actionTypes.LOGOUT:
      return {
        ...initialState,
        isLoading: false
      };
    case actionTypes.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };
    case actionTypes.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };
    case actionTypes.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext(null);

// Auth Provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize auth state from storage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('[Auth] Initializing auth state...');
        const accessToken = storage.get(AUTH_KEYS.TOKEN);
        const refreshToken = storage.get(AUTH_KEYS.REFRESH_TOKEN);
        const user = storage.get(AUTH_KEYS.USER);

        console.log('[Auth] Storage state:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          hasUser: !!user
        });

        if (accessToken && user) {
          dispatch({
            type: actionTypes.AUTH_SUCCESS,
            payload: { user, accessToken, refreshToken }
          });
          console.log('[Auth] Restored session from storage');
        } else {
          dispatch({ type: actionTypes.SET_LOADING, payload: false });
          console.log('[Auth] No stored session found');
        }
      } catch (error) {
        console.error('[Auth] Initialization error:', error);
        dispatch({ type: actionTypes.SET_LOADING, payload: false });
      }
    };

    initializeAuth();
  }, []);

  // Login
  const login = useCallback(async (email, password) => {
    console.log('[Auth] ========== LOGIN START ==========');
    console.log('[Auth] Email:', email);
    dispatch({ type: actionTypes.AUTH_START });

    try {
      console.log('[Auth] Calling authApi.login...');
      const response = await authApi.login({ email, password });

      console.log('[Auth] ========== API RESPONSE ==========');
      console.log('[Auth] Response:', response);
      console.log('[Auth] Response type:', typeof response);
      console.log('[Auth] Response.success:', response?.success);

      if (response && response.success) {
        const { user, accessToken, refreshToken } = response.data;

        console.log('[Auth] Login successful!');
        console.log('[Auth] User:', user?.email);
        console.log('[Auth] Has accessToken:', !!accessToken);
        console.log('[Auth] Has refreshToken:', !!refreshToken);

        // Store tokens and user
        storage.set(AUTH_KEYS.TOKEN, accessToken);
        storage.set(AUTH_KEYS.REFRESH_TOKEN, refreshToken);
        storage.set(AUTH_KEYS.USER, user);

        dispatch({
          type: actionTypes.AUTH_SUCCESS,
          payload: { user, accessToken, refreshToken }
        });

        console.log('[Auth] ========== LOGIN SUCCESS ==========');
        return { success: true, user };
      }

      // Handle non-success response
      console.log('[Auth] Response indicates failure');
      console.log('[Auth] Full response:', JSON.stringify(response, null, 2));

      // Extract error message - handle multiple response formats
      let errorMessage = 'Login failed. Please check your credentials and try again.';

      if (response?.error?.message) {
        errorMessage = response.error.message;
      } else if (response?.error) {
        // If error is a string instead of object
        errorMessage = typeof response.error === 'string' ? response.error : 'Login failed';
      } else if (response?.message) {
        errorMessage = response.message;
      }

      console.log('[Auth] Error message:', errorMessage);

      dispatch({ type: actionTypes.AUTH_FAILURE, payload: errorMessage });
      console.log('[Auth] ========== LOGIN FAILED (response) ==========');
      return { success: false, error: errorMessage };
    } catch (error) {
      console.log('[Auth] ========== LOGIN ERROR (catch) ==========');
      console.error('[Auth] Error caught:', error);
      console.error('[Auth] Error type:', error?.constructor?.name);
      console.error('[Auth] Error message:', error?.message);

      let errorMessage = 'Login failed. Please try again.';

      if (error.response) {
        // Server responded with error status
        const { data, status } = error.response;
        console.log('[Auth] Error has response');
        console.log('[Auth] Status:', status);
        console.log('[Auth] Data:', data);

        if (data?.error?.message) {
          errorMessage = data.error.message;
          console.log('[Auth] Using error.response.data.error.message:', errorMessage);
        } else if (data?.message) {
          errorMessage = data.message;
          console.log('[Auth] Using error.response.data.message:', errorMessage);
        } else if (status === 401) {
          errorMessage = 'Invalid email or password';
          console.log('[Auth] Using 401 default message:', errorMessage);
        } else if (status === 400) {
          errorMessage = 'Invalid request. Please check your input.';
          console.log('[Auth] Using 400 default message:', errorMessage);
        } else if (status >= 500) {
          errorMessage = 'Server error. Please try again later.';
          console.log('[Auth] Using 500 default message:', errorMessage);
        }
      } else if (error.request) {
        // Request was made but no response received
        console.log('[Auth] No response received');
        console.log('[Auth] Request:', error.request);
        errorMessage = 'Unable to connect to server. Please check your connection.';
      } else {
        // Something else happened
        console.log('[Auth] Other error type');
        errorMessage = error.message || 'An unexpected error occurred.';
      }

      console.log('[Auth] Final error message:', errorMessage);
      dispatch({ type: actionTypes.AUTH_FAILURE, payload: errorMessage });
      console.log('[Auth] ========== LOGIN FAILED (catch) ==========');
      return { success: false, error: errorMessage };
    }
  }, []);

  // Register
  const register = useCallback(async (userData) => {
    dispatch({ type: actionTypes.AUTH_START });

    try {
      const response = await authApi.register(userData);
      console.log('[Auth] Register response:', response);

      if (response.success) {
        const { user, accessToken, refreshToken, requiresPayment, planId, billingCycle } = response.data;

        // Store tokens and user (auto-login after registration)
        storage.set(AUTH_KEYS.TOKEN, accessToken);
        storage.set(AUTH_KEYS.REFRESH_TOKEN, refreshToken);
        storage.set(AUTH_KEYS.USER, user);

        dispatch({
          type: actionTypes.AUTH_SUCCESS,
          payload: { user, accessToken, refreshToken }
        });

        // Return with payment info for paid plans
        return {
          success: true,
          user,
          requiresPayment: requiresPayment || false,
          planId: planId || 'free',
          billingCycle: billingCycle || 'monthly'
        };
      }

      const errorMessage = response.error?.message || 'Registration failed';
      dispatch({ type: actionTypes.AUTH_FAILURE, payload: errorMessage });
      return { success: false, error: errorMessage };
    } catch (error) {
      console.error('[Auth] Register error:', error);

      let errorMessage = 'Registration failed. Please try again.';

      if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      dispatch({ type: actionTypes.AUTH_FAILURE, payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    console.log('[Auth] Logging out...');
    try {
      await authApi.logout();
    } catch (error) {
      console.error('[Auth] Logout API error:', error);
    } finally {
      // Clear storage
      storage.remove(AUTH_KEYS.TOKEN);
      storage.remove(AUTH_KEYS.REFRESH_TOKEN);
      storage.remove(AUTH_KEYS.USER);

      dispatch({ type: actionTypes.LOGOUT });
      console.log('[Auth] Logout complete');
    }
  }, []);

  // Forgot password
  const forgotPassword = useCallback(async (email) => {
    dispatch({ type: actionTypes.AUTH_START });

    try {
      const response = await authApi.forgotPassword(email);

      if (response.success) {
        dispatch({ type: actionTypes.SET_LOADING, payload: false });
        return {
          success: true,
          message: response.message,
          resetLink: response.resetLink
        };
      }

      const errorMessage = response.error?.message || 'Failed to send reset email';
      dispatch({ type: actionTypes.AUTH_FAILURE, payload: errorMessage });
      return { success: false, error: errorMessage };
    } catch (error) {
      let errorMessage = 'Failed to send reset email. Please try again.';

      if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      dispatch({ type: actionTypes.AUTH_FAILURE, payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, []);

  // Reset password
  const resetPassword = useCallback(async (token, email, password) => {
    dispatch({ type: actionTypes.AUTH_START });

    try {
      const response = await authApi.resetPassword({ token, email, password });

      if (response.success) {
        dispatch({ type: actionTypes.SET_LOADING, payload: false });
        return { success: true, message: response.message };
      }

      const errorMessage = response.error?.message || 'Password reset failed';
      dispatch({ type: actionTypes.AUTH_FAILURE, payload: errorMessage });
      return { success: false, error: errorMessage };
    } catch (error) {
      let errorMessage = 'Password reset failed. Please try again.';

      if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      dispatch({ type: actionTypes.AUTH_FAILURE, payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, []);

  // Verify email
  const verifyEmail = useCallback(async (token) => {
    dispatch({ type: actionTypes.AUTH_START });

    try {
      const response = await authApi.verifyEmail(token);

      if (response.success) {
        dispatch({ type: actionTypes.SET_LOADING, payload: false });
        return { success: true, message: response.message };
      }

      const errorMessage = response.error?.message || 'Email verification failed';
      dispatch({ type: actionTypes.AUTH_FAILURE, payload: errorMessage });
      return { success: false, error: errorMessage };
    } catch (error) {
      let errorMessage = 'Email verification failed. Please try again.';

      if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      dispatch({ type: actionTypes.AUTH_FAILURE, payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, []);

  // Get current user
  const getCurrentUser = useCallback(async () => {
    try {
      const response = await authApi.getCurrentUser();

      if (response.success) {
        const user = response.data.user;
        storage.set(AUTH_KEYS.USER, user);
        dispatch({ type: actionTypes.UPDATE_USER, payload: user });
        return { success: true, user };
      }

      return { success: false, error: response.error?.message || 'Failed to get user' };
    } catch (error) {
      return { success: false, error: error.message || 'Failed to get user' };
    }
  }, []);

  // Update profile
  const updateProfile = useCallback(async (userData) => {
    try {
      const response = await authApi.updateProfile(userData);

      if (response.success) {
        const user = response.data.user;
        storage.set(AUTH_KEYS.USER, user);
        dispatch({ type: actionTypes.UPDATE_USER, payload: user });
        return { success: true, user };
      }

      return { success: false, error: response.error?.message || 'Failed to update profile' };
    } catch (error) {
      return { success: false, error: error.message || 'Failed to update profile' };
    }
  }, []);

  // Change password
  const changePassword = useCallback(async (currentPassword, newPassword) => {
    try {
      const response = await authApi.changePassword({
        currentPassword,
        newPassword
      });

      if (response.success) {
        return { success: true, message: response.message };
      }

      return { success: false, error: response.error?.message || 'Failed to change password' };
    } catch (error) {
      return { success: false, error: error.message || 'Failed to change password' };
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: actionTypes.CLEAR_ERROR });
  }, []);

  const value = {
    ...state,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    verifyEmail,
    getCurrentUser,
    updateProfile,
    changePassword,
    clearError
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;