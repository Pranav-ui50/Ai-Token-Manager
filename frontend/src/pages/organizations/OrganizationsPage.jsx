/**
 * Organizations Page
 *
 * Displays organizations list. For org_owner, redirects to their organization.
 * For super_admin, shows all organizations.
 * Note: Organization is created during registration, so org_owner always has one.
 */

import Loader from '../../components/common/Loader.jsx';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useOrganization } from '../../context/OrganizationContext.jsx';

function OrganizationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organizations, isLoading, error, fetchOrganizations } = useOrganization();

  // Get user role and organization
  const userRole = user?.role?.name || user?.role || 'viewer';
  const userOrganizationId = user?.organization?._id || user?.organization || null;

  // For org_owner: redirect to their organization settings
  // They should always have an organization (created during registration)
  useEffect(() => {
    if (userRole === 'org_owner' && userOrganizationId) {
      navigate(`/organizations/${userOrganizationId}`, { replace: true });
    }
  }, [userRole, userOrganizationId, navigate]);

  // Fetch organizations on mount (for super_admin viewing all)
  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const handleOrganizationClick = (orgId) => {
    navigate(`/organizations/${orgId}`);
  };

  // Show loading while redirecting org_owner
  if (userRole === 'org_owner' && userOrganizationId) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-[#DC2626] mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-4 text-gray-500">Redirecting to your organization...</p>
        </div>
      </div>
    );
  }

  // For org_owner without organization (edge case - shouldn't happen normally)
  // Show message to contact support
  if (userRole === 'org_owner' && !userOrganizationId) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Organization Setup Required</h2>
          <p className="text-gray-600 mb-6">
            Your account was created without an organization. This shouldn't normally happen.
            Please contact support to resolve this issue.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2 bg-[#DC2626] text-white font-medium rounded-lg hover:bg-[#B91C1C] transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // For other roles (super_admin, etc.) - show organization list
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#DC2626] rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Organizations</h1>
              <p className="text-xs text-gray-500">View all organizations in the system</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && organizations.length === 0 ? (
          <div className="flex items-center justify-center min-h-64">
            <div className="text-center">
              <svg className="animate-spin h-10 w-10 text-[#DC2626] mx-auto" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="mt-4 text-gray-500">Loading organizations...</p>
            </div>
          </div>
        ) : organizations.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No organizations found</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              There are no organizations in the system yet.
            </p>
          </div>
        ) : (
          /* Organizations Grid */
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {organizations.map((org) => (
              <div
                key={org._id}
                onClick={() => handleOrganizationClick(org._id)}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-md hover:border-red-200 transition-all group"
              >
                <div className="flex items-start gap-4">
                  {org.logo ? (
                    <img
                      src={org.logo}
                      alt={org.name}
                      className="h-14 w-14 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-[#DC2626] to-[#B91C1C] flex items-center justify-center shadow-sm">
                      <span className="text-xl font-bold text-white">
                        {org.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 truncate group-hover:text-[#DC2626] transition-colors">
                      {org.name}
                    </h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      {org.memberCount || org.members?.length || 0} members
                    </p>
                  </div>
                </div>

                {org.description && (
                  <p className="mt-4 text-sm text-gray-600 line-clamp-2">
                    {org.description}
                  </p>
                )}

                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    Owner: {org.owner?.firstName} {org.owner?.lastName}
                  </span>
                  <svg className="w-5 h-5 text-gray-300 group-hover:text-[#DC2626] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default OrganizationsPage;