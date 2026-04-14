/**
 * Main App Component
 * Handles routing and global layout.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store';

// Pages
import LoginPage from './pages/LoginPage';
import OrderListPage from './pages/OrderListPage';
import OrderDetailPage from './pages/OrderDetailPage';
import OrderCreatePage from './pages/OrderCreatePage';
import OrderEditPage from './pages/OrderEditPage';
import SettingsPage from './pages/SettingsPage';
import MembersPage from './pages/MembersPage';

// Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const { init, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    init();
  }, [init]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Protected routes with layout */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/orders" replace />} />
          
          {/* Orders */}
          <Route path="orders" element={
            <ProtectedRoute roles={['admin', 'user', 'guest']}>
              <OrderListPage />
            </ProtectedRoute>
          } />
          <Route path="orders/new" element={
            <ProtectedRoute roles={['admin', 'user']}>
              <OrderCreatePage />
            </ProtectedRoute>
          } />
          <Route path="orders/:id" element={
            <ProtectedRoute roles={['admin', 'user', 'guest']}>
              <OrderDetailPage />
            </ProtectedRoute>
          } />
          <Route path="orders/:id/edit" element={
            <ProtectedRoute roles={['admin', 'user']}>
              <OrderEditPage />
            </ProtectedRoute>
          } />
          
          {/* Settings - Admin only */}
          <Route path="settings" element={
            <ProtectedRoute roles={['admin']}>
              <SettingsPage />
            </ProtectedRoute>
          } />
          
          {/* Members - Admin only */}
          <Route path="members" element={
            <ProtectedRoute roles={['admin']}>
              <MembersPage />
            </ProtectedRoute>
          } />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/orders" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;