/**
 * Private Route Component
 *
 * Protects routes that require authentication.
 */

import { Navigate, Outlet } from 'react-router-dom';

// TODO: Import auth context/store when implemented
// import { useAuth } from '../context/AuthContext';

const PrivateRoute = () => {
  // TODO: Check authentication status
  // const { isAuthenticated, isLoading } = useAuth();

  // Placeholder: Always authenticated for now
  const isAuthenticated = true;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default PrivateRoute;