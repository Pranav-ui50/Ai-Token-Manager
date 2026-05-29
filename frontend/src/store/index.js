/**
 * Zustand Store
 *
 * State management for the API Token Management pricing calculator.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

/**
 * Auth Store
 */
export const useAuthStore = create(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null,

        login: async (credentials) => {
          set({ loading: true, error: null });
          try {
            const response = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(credentials)
            });

            if (!response.ok) {
              throw new Error('Login failed');
            }

            const data = await response.json();
            set({
              user: data.user,
              token: data.token,
              isAuthenticated: true,
              loading: false
            });
            return data;
          } catch (error) {
            set({ error: error.message, loading: false });
            throw error;
          }
        },

        logout: () => {
          set({ user: null, token: null, isAuthenticated: false });
        },

        updateUser: (updates) => {
          set((state) => ({ user: { ...state.user, ...updates } }));
        },

        refreshToken: async () => {
          const { token } = get();
          if (!token) return;

          try {
            const response = await fetch('/api/auth/refresh', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (!response.ok) {
              throw new Error('Token refresh failed');
            }

            const data = await response.json();
            set({ token: data.token });
            return data.token;
          } catch (error) {
            set({ user: null, token: null, isAuthenticated: false });
            throw error;
          }
        }
      }),
      { name: 'auth-storage' }
    ),
    { name: 'auth-store' }
  )
);

/**
 * Organization Store
 */
export const useOrganizationStore = create(
  devtools(
    (set, get) => ({
      organization: null,
      members: [],
      usage: null,
      loading: false,
      error: null,

      fetchOrganization: async (organizationId) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`/api/organizations/${organizationId}`);
          if (!response.ok) throw new Error('Failed to fetch organization');
          const data = await response.json();
          set({ organization: data, loading: false });
          return data;
        } catch (error) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      updateOrganization: async (organizationId, updates) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`/api/organizations/${organizationId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
          });
          if (!response.ok) throw new Error('Failed to update organization');
          const data = await response.json();
          set({ organization: data, loading: false });
          return data;
        } catch (error) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      fetchMembers: async (organizationId) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`/api/organizations/${organizationId}/members`);
          if (!response.ok) throw new Error('Failed to fetch members');
          const data = await response.json();
          set({ members: data, loading: false });
          return data;
        } catch (error) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      addMember: async (organizationId, memberData) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`/api/organizations/${organizationId}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(memberData)
          });
          if (!response.ok) throw new Error('Failed to add member');
          const data = await response.json();
          set((state) => ({ members: [...state.members, data], loading: false }));
          return data;
        } catch (error) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      removeMember: async (organizationId, memberId) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`/api/organizations/${organizationId}/members/${memberId}`, {
            method: 'DELETE'
          });
          if (!response.ok) throw new Error('Failed to remove member');
          set((state) => ({
            members: state.members.filter((m) => m.id !== memberId),
            loading: false
          }));
        } catch (error) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      fetchUsage: async (organizationId, timeRange = '7d') => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`/api/organizations/${organizationId}/usage?range=${timeRange}`);
          if (!response.ok) throw new Error('Failed to fetch usage');
          const data = await response.json();
          set({ usage: data, loading: false });
          return data;
        } catch (error) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      clearOrganization: () => {
        set({ organization: null, members: [], usage: null });
      }
    }),
    { name: 'organization-store' }
  )
);

/**
 * Usage Store
 */
export const useUsageStore = create(
  devtools(
    (set) => ({
      usageData: [],
      summary: null,
      loading: false,
      error: null,
      timeRange: '7d',

      setTimeRange: (range) => set({ timeRange: range }),

      fetchUsage: async (organizationId, timeRange = '7d') => {
        set({ loading: true, error: null, timeRange });
        try {
          const response = await fetch(`/api/usage/${organizationId}?range=${timeRange}`);
          if (!response.ok) throw new Error('Failed to fetch usage data');
          const data = await response.json();
          set({ usageData: data.usage, summary: data.summary, loading: false });
          return data;
        } catch (error) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      clearUsage: () => set({ usageData: [], summary: null })
    }),
    { name: 'usage-store' }
  )
);

/**
 * Pricing Store
 */
export const usePricingStore = create(
  devtools(
    (set) => ({
      plans: [],
      currentPlan: null,
      calculator: {
        provider: '',
        model: '',
        inputTokens: 1000,
        outputTokens: 500,
        requests: 100
      },
      calculatedCost: null,
      loading: false,
      error: null,

      fetchPlans: async () => {
        set({ loading: true, error: null });
        try {
          const response = await fetch('/api/pricing/plans');
          if (!response.ok) throw new Error('Failed to fetch plans');
          const data = await response.json();
          set({ plans: data, loading: false });
          return data;
        } catch (error) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      setCalculatorInputs: (inputs) => {
        set((state) => ({
          calculator: { ...state.calculator, ...inputs }
        }));
      },

      calculateCost: async () => {
        const { calculator } = usePricingStore.getState();
        set({ loading: true, error: null });
        try {
          const response = await fetch('/api/pricing/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(calculator)
          });
          if (!response.ok) throw new Error('Failed to calculate cost');
          const data = await response.json();
          set({ calculatedCost: data, loading: false });
          return data;
        } catch (error) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      selectPlan: async (planId) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch('/api/pricing/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planId })
          });
          if (!response.ok) throw new Error('Failed to select plan');
          const data = await response.json();
          set({ currentPlan: planId, loading: false });
          return data;
        } catch (error) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      clearCalculatedCost: () => set({ calculatedCost: null })
    }),
    { name: 'pricing-store' }
  )
);

/**
 * Notification Store
 */
export const useNotificationStore = create(
  devtools(
    (set) => ({
      notifications: [],
      unreadCount: 0,
      loading: false,
      error: null,

      fetchNotifications: async () => {
        set({ loading: true, error: null });
        try {
          const response = await fetch('/api/notifications');
          if (!response.ok) throw new Error('Failed to fetch notifications');
          const data = await response.json();
          set({
            notifications: data,
            unreadCount: data.filter((n) => !n.read).length,
            loading: false
          });
          return data;
        } catch (error) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      markAsRead: async (notificationId) => {
        try {
          const response = await fetch(`/api/notifications/${notificationId}/read`, {
            method: 'PUT'
          });
          if (!response.ok) throw new Error('Failed to mark as read');

          set((state) => ({
            notifications: state.notifications.map((n) =>
              n.id === notificationId ? { ...n, read: true } : n
            ),
            unreadCount: Math.max(0, state.unreadCount - 1)
          }));
        } catch (error) {
          set({ error: error.message });
          throw error;
        }
      },

      markAllAsRead: async () => {
        try {
          const response = await fetch('/api/notifications/read-all', {
            method: 'PUT'
          });
          if (!response.ok) throw new Error('Failed to mark all as read');

          set((state) => ({
            notifications: state.notifications.map((n) => ({ ...n, read: true })),
            unreadCount: 0
          }));
        } catch (error) {
          set({ error: error.message });
          throw error;
        }
      },

      addNotification: (notification) => {
        set((state) => ({
          notifications: [notification, ...state.notifications],
          unreadCount: state.unreadCount + 1
        }));
      },

      clearNotifications: () => set({ notifications: [], unreadCount: 0 })
    }),
    { name: 'notification-store' }
  )
);

/**
 * Settings Store
 */
export const useSettingsStore = create(
  devtools(
    persist(
      (set) => ({
        theme: 'system',
        language: 'en',
        sidebarCollapsed: false,
        notifications: {
          email: true,
          push: true,
          sound: false
        },

        setTheme: (theme) => set({ theme }),
        setLanguage: (language) => set({ language }),
        toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
        setNotifications: (notifications) =>
          set((state) => ({
            notifications: { ...state.notifications, ...notifications }
          })),

        resetSettings: () =>
          set({
            theme: 'system',
            language: 'en',
            sidebarCollapsed: false,
            notifications: { email: true, push: true, sound: false }
          })
      }),
      { name: 'settings-storage' }
    ),
    { name: 'settings-store' }
  )
);

/**
 * Combined store exports
 */
export const stores = {
  useAuthStore,
  useOrganizationStore,
  useUsageStore,
  usePricingStore,
  useNotificationStore,
  useSettingsStore
};

export default stores;