/**
 * Organization Context
 *
 * Manages organization state using React Context + useReducer.
 * Automatically sets current organization from authenticated user.
 */

import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import organizationApi from '../services/api/organization.api.js';

// Initial state
const initialState = {
  organizations: [],
  currentOrganization: null,
  isLoading: false,
  error: null
};

// Action types
const ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_ORGANIZATIONS: 'SET_ORGANIZATIONS',
  SET_CURRENT_ORGANIZATION: 'SET_CURRENT_ORGANIZATION',
  ADD_ORGANIZATION: 'ADD_ORGANIZATION',
  UPDATE_ORGANIZATION: 'UPDATE_ORGANIZATION',
  REMOVE_ORGANIZATION: 'REMOVE_ORGANIZATION',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Reducer
function organizationReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.payload };
    case ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, isLoading: false };
    case ACTIONS.SET_ORGANIZATIONS:
      return { ...state, organizations: action.payload, isLoading: false };
    case ACTIONS.SET_CURRENT_ORGANIZATION:
      return { ...state, currentOrganization: action.payload, isLoading: false };
    case ACTIONS.ADD_ORGANIZATION:
      return {
        ...state,
        organizations: [action.payload, ...state.organizations],
        isLoading: false
      };
    case ACTIONS.UPDATE_ORGANIZATION:
      return {
        ...state,
        organizations: state.organizations.map(org =>
          org._id === action.payload._id ? action.payload : org
        ),
        currentOrganization: state.currentOrganization?._id === action.payload._id
          ? action.payload
          : state.currentOrganization,
        isLoading: false
      };
    case ACTIONS.REMOVE_ORGANIZATION:
      return {
        ...state,
        organizations: state.organizations.filter(org => org._id !== action.payload),
        currentOrganization: state.currentOrganization?._id === action.payload
          ? null
          : state.currentOrganization,
        isLoading: false
      };
    case ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };
    default:
      return state;
  }
}

// Create context
const OrganizationContext = createContext(null);

// Provider component
export function OrganizationProvider({ children }) {
  const [state, dispatch] = useReducer(organizationReducer, initialState);
  const { user, isAuthenticated } = useAuth();

  // Auto-initialize organization from authenticated user
  useEffect(() => {
    const initializeOrganization = async () => {
      // Only run if user is authenticated and has an organization
      if (!isAuthenticated || !user) {
        return;
      }

      // Get organization ID from user object
      const userOrgId = user?.organization?._id || user?.organization;

      if (!userOrgId) {
        console.log('[OrganizationContext] User has no organization');
        return;
      }

      // If currentOrganization is already set and matches user's org, skip
      if (state.currentOrganization?._id === userOrgId) {
        console.log('[OrganizationContext] Current organization already set');
        return;
      }

      console.log('[OrganizationContext] Initializing organization for user:', userOrgId);

      try {
        dispatch({ type: ACTIONS.SET_LOADING, payload: true });
        const organization = await organizationApi.getById(userOrgId);
        dispatch({ type: ACTIONS.SET_CURRENT_ORGANIZATION, payload: organization });
        console.log('[OrganizationContext] Organization initialized:', organization?.name);
      } catch (error) {
        console.error('[OrganizationContext] Failed to fetch organization:', error);
        dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      }
    };

    initializeOrganization();
  }, [isAuthenticated, user?._id, user?.organization?._id || user?.organization]);

  // Fetch organizations
  const fetchOrganizations = useCallback(async () => {
    try {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      const organizations = await organizationApi.getMyOrganizations();
      dispatch({ type: ACTIONS.SET_ORGANIZATIONS, payload: organizations });
    } catch (error) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
    }
  }, []);

  // Create organization
  const createOrganization = useCallback(async (data) => {
    try {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      const organization = await organizationApi.create(data);
      dispatch({ type: ACTIONS.ADD_ORGANIZATION, payload: organization });
      return organization;
    } catch (error) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, []);

  // Get organization by ID
  const getOrganization = useCallback(async (id) => {
    try {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      const organization = await organizationApi.getById(id);
      dispatch({ type: ACTIONS.SET_CURRENT_ORGANIZATION, payload: organization });
      return organization;
    } catch (error) {
      const errorMessage = error.isNetworkError
        ? error.message
        : error.response?.data?.error?.message || error.message || 'Failed to load organization';
      dispatch({ type: ACTIONS.SET_ERROR, payload: errorMessage });
      throw error;
    }
  }, []);

  // Update organization
  const updateOrganization = useCallback(async (id, data) => {
    try {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      const organization = await organizationApi.update(id, data);
      dispatch({ type: ACTIONS.UPDATE_ORGANIZATION, payload: organization });
      return organization;
    } catch (error) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, []);

  // Delete organization
  const deleteOrganization = useCallback(async (id) => {
    try {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      await organizationApi.delete(id);
      dispatch({ type: ACTIONS.REMOVE_ORGANIZATION, payload: id });
    } catch (error) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, []);

  // Invite member
  const inviteMember = useCallback(async (orgId, data) => {
    try {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      const result = await organizationApi.inviteMember(orgId, data);
      // Refresh organization to get updated invitations
      await getOrganization(orgId);
      return result;
    } catch (error) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, [getOrganization]);

  // Add member directly (create user account)
  const addMember = useCallback(async (orgId, data) => {
    try {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      const result = await organizationApi.addMember(orgId, data);
      // Refresh organization to get updated members
      await getOrganization(orgId);
      return result;
    } catch (error) {
      // Use the server's error message if available
      const errorCode = error.response?.data?.error?.code || error.response?.data?.code;
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message;
      // Only set error state for non-limit errors (limit errors are handled via toast)
      if (errorCode !== 'LIMIT_EXCEEDED') {
        dispatch({ type: ACTIONS.SET_ERROR, payload: errorMessage });
      }
      throw error;
    }
  }, [getOrganization]);

  // Remove member
  const removeMember = useCallback(async (orgId, memberId) => {
    try {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      await organizationApi.removeMember(orgId, memberId);
      // Refresh organization to get updated members
      await getOrganization(orgId);
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message;
      dispatch({ type: ACTIONS.SET_ERROR, payload: errorMessage });
      throw error;
    }
  }, [getOrganization]);

  // Update member role
  const updateMemberRole = useCallback(async (orgId, memberId, roleId) => {
    try {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      await organizationApi.updateMemberRole(orgId, memberId, roleId);
      // Refresh organization to get updated members
      await getOrganization(orgId);
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message;
      dispatch({ type: ACTIONS.SET_ERROR, payload: errorMessage });
      throw error;
    }
  }, [getOrganization]);

  // Leave organization
  const leaveOrganization = useCallback(async (orgId) => {
    try {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      await organizationApi.leaveOrganization(orgId);
      dispatch({ type: ACTIONS.REMOVE_ORGANIZATION, payload: orgId });
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message;
      dispatch({ type: ACTIONS.SET_ERROR, payload: errorMessage });
      throw error;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_ERROR });
  }, []);

  // Set current organization
  const setCurrentOrganization = useCallback((organization) => {
    dispatch({ type: ACTIONS.SET_CURRENT_ORGANIZATION, payload: organization });
  }, []);

  const value = {
    ...state,
    fetchOrganizations,
    createOrganization,
    getOrganization,
    updateOrganization,
    deleteOrganization,
    inviteMember,
    addMember,
    removeMember,
    updateMemberRole,
    leaveOrganization,
    clearError,
    setCurrentOrganization
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

// Custom hook to use organization context
export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}

export default OrganizationContext;