import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { PageSkeleton } from '../../components/LoadingState';

const MODULE_MAP: Record<string, string> = {
  '/app/dashboard': 'dashboard',
  '/app/customers': 'customers',
  '/app/inventory': 'inventory',
  '/app/challans': 'challans',
  '/app/activity': 'activity',
  '/app/reports': 'reports',
  '/app/settings': 'settings',
};

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, canAccess } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageSkeleton />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const basePath = '/' + location.pathname.split('/').slice(1, 3).join('/');
  const module = MODULE_MAP[basePath];

  if (module && !canAccess(module)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return <>{children}</>;
}
