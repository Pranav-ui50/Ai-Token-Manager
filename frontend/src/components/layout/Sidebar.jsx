/**
 * Sidebar Component
 *
 * Navigation sidebar with role-based menu items.
 * Full-height fixed sidebar with Red & White theme styling.
 */

import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useSiteSettings } from '../../context/SiteSettingsContext.jsx';
import { ROLE_LABELS } from '../../utils/constants.js';

// Get the backend base URL for serving static files
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BACKEND_URL = API_BASE_URL.replace('/api', '');

// Base menu items configuration by role
// For org_owner, organization link is computed dynamically
// Supports both flat arrays and grouped sections (with section property)
const getBaseMenuItems = (userOrganizationId) => ({
  super_admin: [
    { path: '/admin', icon: 'dashboard', label: 'Dashboard' },
    { path: '/admin/users', icon: 'users', label: 'Users' },
    { path: '/admin/organizations', icon: 'building', label: 'Organizations' },
    { path: '/admin/plans', icon: 'view-grid', label: 'Plans & Pricing' },
    { path: '/admin/providers', icon: 'server', label: 'AI Providers' },
    { path: '/admin/pricing', icon: 'currency-dollar', label: 'Pricing' },
    { path: '/admin/landing-content', icon: 'globe', label: 'Landing Page' },
    { path: '/admin/testimonials', icon: 'chat', label: 'Testimonials' },
    { path: '/admin/platform-stats', icon: 'stats', label: 'Platform Stats' },
    { path: '/audit-logs', icon: 'clipboard-list', label: 'Audit Logs' },
    { path: '/admin/settings', icon: 'settings', label: 'System Settings' }
  ],
  org_owner: [
    { path: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { path: '/projects', icon: 'folder', label: 'Projects' },
    { path: '/analytics', icon: 'trending-up', label: 'Analytics' },
    { path: '/team', icon: 'users', label: 'Team Members' },
    { path: '/billing', icon: 'credit-card', label: 'Billing' },
    { path: '/providers', icon: 'server', label: 'Providers' },
    { path: '/simulations', icon: 'calculator', label: 'Simulations' },
    { path: '/models', icon: 'chip', label: 'Models' },
    { path: '/integrations', icon: 'puzzle', label: 'Integrations' },
    { path: '/webhooks', icon: 'webhook', label: 'Webhooks' },
    { path: '/audit-logs', icon: 'clipboard-list', label: 'Audit Logs' },
    { path: '/settings', icon: 'settings', label: 'Settings' }
  ],
  finance_admin: [
    { path: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { path: '/subscription', icon: 'credit-card', label: 'Subscription' },
    { path: '/simulations', icon: 'calculator', label: 'Simulations' },
    { path: '/invoices', icon: 'document-text', label: 'Invoices' },
    { path: '/reports', icon: 'chart-bar', label: 'Reports' },
    { path: '/analytics', icon: 'trending-up', label: 'Analytics' }
  ],
  product_manager: [
    // Overview Section
    { section: 'Overview' },
    { path: '/dashboard', icon: 'dashboard', label: 'Dashboard' },

    // Feature Management Section
    { section: 'Feature Management' },
    { path: '/features', icon: 'cube', label: 'Features' },
    { path: '/model-mapping', icon: 'link', label: 'Model Mapping' },
    { path: '/token-estimates', icon: 'calculator', label: 'Token Estimates' },
    { path: '/feature-cost', icon: 'currency-dollar', label: 'Feature Cost' },
    { path: '/usage-analytics', icon: 'chart-bar', label: 'Usage Insights' },

    // Analytics Section
    { section: 'Analytics' },
    { path: '/profit-analysis', icon: 'trending-up', label: 'Profit Analysis' },
    { path: '/analytics', icon: 'chart-pie', label: 'Reports & Analytics' }
  ],
  developer: [
    { path: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { path: '/integrations', icon: 'puzzle', label: 'Integrations' },
    { path: '/webhooks', icon: 'webhook', label: 'Webhooks' },
    { path: '/audit-logs', icon: 'clipboard-list', label: 'Audit Logs' },
    { path: '/usage', icon: 'chart-pie', label: 'Token Usage' }
  ],
  viewer: [
    { path: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { path: '/projects', icon: 'folder', label: 'Projects' },
    { path: '/features', icon: 'cube', label: 'Features' },
    { path: '/plans', icon: 'view-grid', label: 'Plans' },
    { path: '/simulations', icon: 'calculator', label: 'Simulations' },
    { path: '/analytics', icon: 'trending-up', label: 'Analytics' }
  ]
});

// Icon components
const Icons = {
  dashboard: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  building: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  users: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  server: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
    </svg>
  ),
  chip: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
    </svg>
  ),
  settings: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  'credit-card': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  'currency-dollar': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  calculator: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  'document-text': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  'chart-bar': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  'trending-up': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  cube: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  'view-grid': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  'chart-pie': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
    </svg>
  ),
  key: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  ),
  puzzle: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
    </svg>
  ),
  document: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  book: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  folder: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  webhook: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
  'clipboard-list': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  globe: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  ),
  link: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
  'token-estimate': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
    </svg>
  ),
  chat: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  stats: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
};

function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const { settings } = useSiteSettings();
  const navigate = useNavigate();

  // Handle role - can be string or populated object
  const userRole = user?.role?.name || user?.role || 'viewer';

  // Get organization ID - can be string or populated object
  const userOrganizationId = user?.organization?._id || user?.organization || null;

  // Get menu items based on role and organization
  const allMenuItems = getBaseMenuItems(userOrganizationId);
  const menuItems = allMenuItems[userRole] || allMenuItems.viewer;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar - Fixed full height on desktop */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen w-64 bg-white border-r border-gray-200
          flex flex-col
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo - Fixed at top */}
        <div className="flex-shrink-0 flex items-center gap-3 px-4 py-4 border-b border-gray-200">
          <div className="w-10 h-10 bg-[#DC2626] rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{settings?.siteName || 'API Token Manager'}</h1>
            <p className="text-xs text-gray-500">{settings?.siteDescription || 'AI API Token Cost Management Platform'}</p>
          </div>
        </div>

        {/* Role Badge */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-gray-100">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-[#DC2626]">
            {ROLE_LABELS[userRole] || 'Viewer'}
          </span>
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
          <ul className="space-y-1 px-3">
            {menuItems.map((item, index) => {
              // Check if this is a section header
              if (item.section) {
                return (
                  <li key={`section-${index}`} className="pt-4 pb-2 first:pt-0">
                    <span className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {item.section}
                    </span>
                  </li>
                );
              }
              // Regular menu item
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/admin' || item.path === '/dashboard'}
                    onClick={onClose}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                      ${isActive
                        ? 'bg-red-50 text-[#DC2626]'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    {Icons[item.icon]}
                    {item.label}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Section - Fixed at bottom */}
        <div className="flex-shrink-0 border-t border-gray-200 p-4 bg-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#DC2626] to-[#B91C1C] rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
              {user?.avatar ? (
                <img
                  src={user.avatar.startsWith('http') ? user.avatar : `${BACKEND_URL}${user.avatar}`}
                  alt={`${user.firstName}'s avatar`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm font-bold text-white">
                  {user?.firstName?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-white hover:bg-[#DC2626] rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;