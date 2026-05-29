/**
 * Public Route Component
 *
 * Routes accessible without authentication.
 * Redirects authenticated users away from auth pages.
 */

import { Navigate, Outlet } from 'react-router-dom';

// TODO: Import auth context/store when implemented
// import { useAuth } from '../context/AuthContext';

const PublicRoute = () => {
  // TODO: Check authentication status
  // const { isAuthenticated } = useAuth();

  // Placeholder: Not authenticated for now
  const isAuthenticated = false;

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default PublicRoute;