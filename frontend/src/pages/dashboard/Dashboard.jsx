/**
 * Dashboard Router Component
 *
 * Routes to the appropriate dashboard based on user role.
 */

import Loader from '../../components/common/Loader.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { ROLES } from '../../utils/constants.js';
import SuperAdminDashboard from './SuperAdminDashboard.jsx';
import OrgOwnerDashboard from './OrgOwnerDashboard.jsx';
import FinanceAdminDashboard from './FinanceAdminDashboard.jsx';
import ProductManagerDashboard from './ProductManagerDashboard.jsx';
import DeveloperDashboard from './DeveloperDashboard.jsx';
import DashboardPage from './DashboardPage.jsx';

function Dashboard() {
  const { user } = useAuth();

  // Handle role - can be string or populated object
  const userRole = user?.role?.name || user?.role;

  // Route to appropriate dashboard based on role
  switch (userRole) {
    case ROLES.SUPER_ADMIN:
      return <SuperAdminDashboard />;
    case ROLES.ORG_OWNER:
      return <OrgOwnerDashboard />;
    case ROLES.FINANCE_ADMIN:
      return <FinanceAdminDashboard />;
    case ROLES.PRODUCT_MANAGER:
      return <ProductManagerDashboard />;
    case ROLES.DEVELOPER:
      return <DeveloperDashboard />;
    case ROLES.VIEWER:
    default:
      // VIEWER and default fall back to the basic dashboard
      return <DashboardPage />;
  }
}

export default Dashboard;