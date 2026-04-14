/**
 * Protected Route Component
 * Wraps routes that require authentication and/or specific roles.
 */

import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store';

export default function ProtectedRoute({ children, roles = ['admin', 'user', 'guest'] }) {
  const { isAuthenticated, user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has required role
  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/orders" replace />;
  }

  return children;
}