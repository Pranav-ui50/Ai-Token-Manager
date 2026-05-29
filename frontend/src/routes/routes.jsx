/**
 * Application Routes Configuration
 *
 * Defines all routes for the application.
 */

import React, { Suspense, lazy } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import ErrorBoundary from '../components/common/ErrorBoundary.jsx';
import Loader from '../components/common/Loader.jsx';

// Loading component
const PageLoader = () => <Loader fullPage />;

// Error fallback component
const PageErrorFallback = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
    <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Page Error</h1>
      <p className="text-gray-600 mb-4">This page encountered an error. Please try again.</p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C] transition-colors"
      >
        Reload Page
      </button>
    </div>
  </div>
);

// Auth guard for protected routes
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Guest guard for public-only routes (like login/register)
const GuestRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Wrapper component for error boundary with suspense
const PageWrapper = ({ children }) => (
  <ErrorBoundary fallback={<PageErrorFallback />}>
    <Suspense fallback={<PageLoader />}>
      {children}
    </Suspense>
  </ErrorBoundary>
);

// Lazy load pages
const LoginPage = lazy(() => import('../pages/auth/LoginPage.jsx'));
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage.jsx'));
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage.jsx'));
const ResetPasswordPage = lazy(() => import('../pages/auth/ResetPasswordPage.jsx'));
const Dashboard = lazy(() => import('../pages/dashboard/Dashboard.jsx'));
const OrganizationsPage = lazy(() => import('../pages/organizations/OrganizationsPage.jsx'));
const OrganizationDetailPage = lazy(() => import('../pages/organizations/OrganizationDetailPage.jsx'));
const AcceptInvitationPage = lazy(() => import('../pages/organizations/AcceptInvitationPage.jsx'));
const ProvidersPage = lazy(() => import('../pages/providers/ProvidersPage.jsx'));
const ProviderDetailPage = lazy(() => import('../pages/providers/ProviderDetailPage.jsx'));
const ModelsPage = lazy(() => import('../pages/models/ModelsPage.jsx'));
const ModelDetailPage = lazy(() => import('../pages/models/ModelDetailPage.jsx'));
const ModelCreatePage = lazy(() => import('../pages/models/ModelCreatePage.jsx'));
const FeaturesPage = lazy(() => import('../pages/features/FeaturesPage.jsx'));
const FeatureCreatePage = lazy(() => import('../pages/features/FeatureCreatePage.jsx'));
const FeatureDetailPage = lazy(() => import('../pages/features/FeatureDetailPage.jsx'));
const FeatureEditPage = lazy(() => import('../pages/features/FeatureEditPage.jsx'));
const PlansPage = lazy(() => import('../pages/plans/PlansPage.jsx'));
const PlanDetailPage = lazy(() => import('../pages/plans/PlanDetailPage.jsx'));
const ProjectsPage = lazy(() => import('../pages/projects/ProjectsPage.jsx'));
const ProjectDetailPage = lazy(() => import('../pages/projects/ProjectDetailPage.jsx'));
const AnalyticsPage = lazy(() => import('../pages/analytics/AnalyticsPage.jsx'));
const PricingHistoryPage = lazy(() => import('../pages/pricing/PricingHistoryPage.jsx'));
const SimulationsPage = lazy(() => import('../pages/simulations/SimulationsPage.jsx'));
const TeamPage = lazy(() => import('../pages/team/TeamPage.jsx'));
const BillingPage = lazy(() => import('../pages/billing/BillingPage.jsx'));
const SettingsPage = lazy(() => import('../pages/settings/SettingsPage.jsx'));
const IntegrationsPage = lazy(() => import('../pages/integrations/IntegrationsPage.jsx'));
const ApiKeysPage = lazy(() => import('../pages/api-keys/ApiKeysPage.jsx'));
const WebhooksPage = lazy(() => import('../pages/webhooks/WebhooksPage.jsx'));
const ReportsPage = lazy(() => import('../pages/reports/ReportsPage.jsx'));
const ReportDetailPage = lazy(() => import('../pages/reports/ReportDetailPage.jsx'));
const AuditLogsPage = lazy(() => import('../pages/audit/AuditLogsPage.jsx'));
const NotificationsPage = lazy(() => import('../pages/notifications/NotificationsPage.jsx'));
const ProfilePage = lazy(() => import('../pages/profile/ProfilePage.jsx'));
const NotFoundPage = lazy(() => import('../pages/errors/NotFoundPage.jsx'));
const ErrorPage = lazy(() => import('../pages/errors/ErrorPage.jsx'));

// Admin pages
const AdminUsersPage = lazy(() => import('../pages/admin/AdminUsersPage.jsx'));
const AdminOrganizationsPage = lazy(() => import('../pages/admin/AdminOrganizationsPage.jsx'));
const AdminOrganizationDetailPage = lazy(() => import('../pages/admin/AdminOrganizationDetailPage.jsx'));
const AdminProvidersPage = lazy(() => import('../pages/admin/AdminProvidersPage.jsx'));
const AdminModelsPage = lazy(() => import('../pages/admin/AdminModelsPage.jsx'));
const AdminSettingsPage = lazy(() => import('../pages/admin/AdminSettingsPage.jsx'));
const AdminSystemHealthPage = lazy(() => import('../pages/admin/AdminSystemHealthPage.jsx'));

// Routes configuration
const routes = [
  // ===========================================
  // Public Routes (Guest Only)
  // ===========================================
  {
    path: '/login',
    element: (
      <GuestRoute>
        <PageWrapper>
          <LoginPage />
        </PageWrapper>
      </GuestRoute>
    )
  },
  {
    path: '/register',
    element: (
      <GuestRoute>
        <PageWrapper>
          <RegisterPage />
        </PageWrapper>
      </GuestRoute>
    )
  },
  {
    path: '/forgot-password',
    element: (
      <GuestRoute>
        <PageWrapper>
          <ForgotPasswordPage />
        </PageWrapper>
      </GuestRoute>
    )
  },
  {
    path: '/reset-password',
    element: (
      <GuestRoute>
        <PageWrapper>
          <ResetPasswordPage />
        </PageWrapper>
      </GuestRoute>
    )
  },

  // ===========================================
  // Protected Routes (Auth Required) - With Dashboard Layout
  // ===========================================
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>
            <Dashboard />
          </PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },

  // ===========================================
  // Organization Routes
  // ===========================================
  {
    path: '/organizations',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>
            <OrganizationsPage />
          </PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },
  {
    path: '/organizations/:id',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>
            <OrganizationDetailPage />
          </PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },
  {
    path: '/invite/:token',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>
            <AcceptInvitationPage />
          </PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },

  // ===========================================
  // Provider Routes
  // ===========================================
  {
    path: '/providers',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>
            <ProvidersPage />
          </PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },
  {
    path: '/providers/:id',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>
            <ProviderDetailPage />
          </PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },

  // ===========================================
  // Model Routes
  // ===========================================
  {
    path: '/models',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>
            <ModelsPage />
          </PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },
  {
    path: '/models/new',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>
            <ModelCreatePage />
          </PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },
  {
    path: '/models/:id/edit',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>
            <ModelCreatePage />
          </PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },
  {
    path: '/models/:id',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>
            <ModelDetailPage />
          </PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },

  // ===========================================
  // Feature Routes
  // ===========================================
  {
    path: '/features',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>
            <FeaturesPage />
          </PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },
  {
    path: '/features/new',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>
            <FeatureCreatePage />
          </PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },
  {
    path: '/features/:id/edit',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>
            <FeatureEditPage />
          </PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },
  {
    path: '/features/:id',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>
            <FeatureDetailPage />
          </PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },

  // ===========================================
  // Plan Routes
  // ===========================================
  {
    path: '/plans',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>
            <PlansPage />
          </PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },
  {
    path: '/plans/:id',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>
            <PlanDetailPage />
          </PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },

  // ===========================================
  // Project Routes
  // ===========================================
  {
    path: '/projects',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>
            <ProjectsPage />
          </PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },
  {
    path: '/projects/:id',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>
            <ProjectDetailPage />
          </PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },

  // ===========================================
  // Analytics Routes
  // ===========================================
  {
    path: '/analytics',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>
            <AnalyticsPage />
          </PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },

  // ===========================================
  // Pricing History Routes
  // ===========================================
  {
    path: '/pricing-history',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>
            <PricingHistoryPage />
          </PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },

  // ===========================================
  // Simulations Routes
  // ===========================================
  {
    path: '/simulations',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>
            <SimulationsPage />
          </PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },

  // ===========================================
  // Team Routes
  // ===========================================
  {
    path: '/team',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>
            <TeamPage />
          </PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },

  // ===========================================
  // Billing Routes
  // ===========================================
  {
    path: '/billing',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>
            <BillingPage />
          </PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },

  // ===========================================
  // Settings Routes
  // ===========================================
  {
    path: '/settings',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>
            <SettingsPage />
          </PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },

  // ===========================================
  // Integrations Routes
  // ===========================================
  {
    path: '/integrations',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>
            <IntegrationsPage />
          </PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },

  // ===========================================
  // API Keys Routes
  // ===========================================
  {
    path: '/api-keys',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>
            <ApiKeysPage />
          </PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },

  // ===========================================
  // Webhooks Routes
  // ===========================================
  {
    path: '/webhooks',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>
            <WebhooksPage />
          </PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },

  // ===========================================
  // Reports Routes
  // ===========================================
  {
    path: '/reports',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>
            <ReportsPage />
          </PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },
  {
    path: '/reports/:id',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>
            <ReportDetailPage />
          </PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },

  // ===========================================
  // Audit Logs Routes
  // ===========================================
  {
    path: '/audit-logs',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>
            <AuditLogsPage />
          </PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },

  // ===========================================
  // Notifications Routes
  // ===========================================
  {
    path: '/notifications',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>
            <NotificationsPage />
          </PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },

  // ===========================================
  // Profile Routes
  // ===========================================
  {
    path: '/profile',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>
            <ProfilePage />
          </PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },

  // ===========================================
  // Admin Routes (Super Admin Only)
  // ===========================================
  {
    path: '/admin/users',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>
            <AdminUsersPage />
          </PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/organizations',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>
            <AdminOrganizationsPage />
          </PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/organizations/:id',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>
            <AdminOrganizationDetailPage />
          </PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/providers',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>
            <AdminProvidersPage />
          </PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/models',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>
            <AdminModelsPage />
          </PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/settings',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>
            <AdminSettingsPage />
          </PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/system-health',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <PageWrapper>
            <AdminSystemHealthPage />
          </PageWrapper>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },

  // ===========================================
  // Error Routes
  // ===========================================
  {
    path: '/404',
    element: <NotFoundPage />
  },
  {
    path: '/500',
    element: <ErrorPage />
  },
  {
    path: '*',
    element: <NotFoundPage />
  },

  // ===========================================
  // Default Route
  // ===========================================
  {
    path: '/',
    element: <Navigate to="/login" replace />
  }
];

export default routes;