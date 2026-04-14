/**
 * Auth Store
 * Manages authentication state using Zustand.
 */

import { create } from 'zustand';
import api from './api';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  // Initialize auth state from localStorage
  init: () => {
    const token = localStorage.getItem('access_token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ token, user, isAuthenticated: true });
      } catch (e) {
        // Invalid stored data, clear it
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
      }
    }
    set({ isLoading: false });
  },

  // Login
  login: async (username, password) => {
    try {
      const response = await api.post('/members/login', { username, password });
      const { access_token } = response.data;
      
      // Save token first (before any authenticated request)
      localStorage.setItem('access_token', access_token);
      
      // Get user info
      const userResponse = await api.get('/members/me');
      const user = userResponse.data;
      
      // Store in localStorage
      localStorage.setItem('user', JSON.stringify(user));
      
      set({
        token: access_token,
        user,
        isAuthenticated: true,
      });
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Login failed',
      };
    }
  },

  // Logout
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    set({
      token: null,
      user: null,
      isAuthenticated: false,
    });
  },

  // Check if user has role
  hasRole: (role) => {
    const { user } = get();
    if (!user) return false;
    
    const roleHierarchy = { admin: 3, user: 2, guest: 1 };
    return (roleHierarchy[user.role] || 0) >= (roleHierarchy[role] || 0);
  },

  // Check if user is admin
  isAdmin: () => get().user?.role === 'admin',

  // Check if user is guest
  isGuest: () => get().user?.role === 'guest',
}));