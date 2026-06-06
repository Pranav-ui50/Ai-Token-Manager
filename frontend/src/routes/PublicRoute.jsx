/**
 * Public Route Component
 *
 * Routes accessible without authentication.
 * Redirects authenticated users away from auth pages.
 */

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PublicRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // Show nothing while checking auth status
  if (isLoading) {
    return null;
  }

  // Redirect authenticated users to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default PublicRoute;