import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import Loader from './Loader.jsx';
import UnauthorizedPage from '../../pages/UnauthorizedPage.jsx';
import { getDashboardPath } from '../../utils/roleRoutes.js';
import { getToken } from '../../services/api.js';

export const ProtectedRoute = ({ children, requiredRoles, allowedRoles }) => {
  const { user, isAuthenticated, loading, passwordChangeSkipped } = useAuth();
  const location = useLocation();

  if (loading) return <Loader message="Verifying security credentials..." />;

  // ABSOLUTE GUARD: If no user object or not authenticated, bounce to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // MANDATORY FIRST LOGIN PASSWORD CHANGE GUARD
  if (user?.mustChangePassword && !passwordChangeSkipped && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (location.pathname === '/dashboard' && user?.role !== 'admin') {
    return <Navigate to={getDashboardPath(user?.role)} replace />;
  }

  const roles = allowedRoles || requiredRoles || [];
  if (roles.length > 0 && !roles.includes(user?.role)) {
    return <UnauthorizedPage requiredRoles={roles} />;
  }

  return children;
};

export const RoleProtectedRoute = ProtectedRoute;

export const PublicRoute = ({ children }) => {
  const { user, isAuthenticated, loading, passwordChangeSkipped } = useAuth();

  if (loading) return <Loader message="Loading StaffPulse..." />;

  if (isAuthenticated && user) {
    if (user.mustChangePassword && !passwordChangeSkipped) {
      return <Navigate to="/change-password" replace />;
    }
    return <Navigate to={getDashboardPath(user?.role)} replace />;
  }

  return children;
};

export const RootRoute = () => {
  const { user, isAuthenticated, loading, passwordChangeSkipped } = useAuth();
  
  // EXTRA PHYSICAL TOKEN CHECK: Bypass React state and verify physical storage directly.
  // If there is no token in storage, it is mathematically impossible to be authenticated.
  const hasPhysicalToken = !!getToken();

  if (!hasPhysicalToken) {
    return <Navigate to="/login" replace />;
  }

  if (loading) return <Loader message="Starting StaffPulse..." />;

  if (isAuthenticated && user) {
    if (user.mustChangePassword && !passwordChangeSkipped) {
      return <Navigate to="/change-password" replace />;
    }
    return <Navigate to={getDashboardPath(user?.role)} replace />;
  }

  return <Navigate to="/login" replace />;
};

export default ProtectedRoute;
