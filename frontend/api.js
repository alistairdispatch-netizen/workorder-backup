/**
 * API Client
 * Centralized axios instance with auth interceptors.
 */

import axios from 'axios';

// Create axios instance with base configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────
export async function login(username, password) {
  const res = await api.post('/members/login', { username, password });
  const { access_token } = res.data;
  localStorage.setItem('access_token', access_token);

  // Decode JWT payload safely
  function base64UrlDecode(str) {
    let s = str.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return decodeURIComponent(
      atob(s)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  }
  const payload = JSON.parse(base64UrlDecode(access_token.split('.')[1]));
  localStorage.setItem('user', JSON.stringify({
    user_id: payload.user_id,
    username: payload.username,
    role: payload.role,
  }));
  return res.data;
}

export function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

export function getCurrentUser() {
  try {
    const s = localStorage.getItem('user');
    if (!s || s === 'undefined') return null;
    return JSON.parse(s);
  } catch {
    return null;
  }
}

// ─── Members ─────────────────────────────────────────
export async function getMembers() {
  const res = await api.get('/members/');
  return res.data;
}

export async function createMember(data) {
  const res = await api.post('/members/register', data);
  return res.data;
}

export async function updateMember(id, data) {
  const res = await api.put(`/members/${id}`, data);
  return res.data;
}

export async function deleteMember(id) {
  await api.delete(`/members/${id}`);
}

export async function changeMemberPassword(id, oldPassword, newPassword) {
  const body = { new_password: newPassword };
  if (oldPassword) body.old_password = oldPassword;
  await api.put(`/members/${id}/password`, body);
}

// ─── Settings ─────────────────────────────────────────
export async function getSettings() {
  const res = await api.get('/settings/all/');
  return res.data;
}

export async function createUnit(data) {
  const res = await api.post('/settings/units', data);
  return res.data;
}
export async function updateUnit(id, data) {
  const res = await api.put(`/settings/units/${id}`, data);
  return res.data;
}
export async function deleteUnit(id) {
  await api.delete(`/settings/units/${id}`);
}

export async function createLocation(data) {
  const res = await api.post('/settings/locations', data);
  return res.data;
}
export async function updateLocation(id, data) {
  const res = await api.put(`/settings/locations/${id}`, data);
  return res.data;
}
export async function deleteLocation(id) {
  await api.delete(`/settings/locations/${id}`);
}

export async function createCategory(data) {
  const res = await api.post('/settings/fault-categories', data);
  return res.data;
}
export async function updateCategory(id, data) {
  const res = await api.put(`/settings/fault-categories/${id}`, data);
  return res.data;
}
export async function deleteCategory(id) {
  await api.delete(`/settings/fault-categories/${id}`);
}

export async function createStatus(data) {
  const res = await api.post('/settings/statuses', data);
  return res.data;
}
export async function updateStatus(id, data) {
  const res = await api.put(`/settings/statuses/${id}`, data);
  return res.data;
}
export async function deleteStatus(id) {
  await api.delete(`/settings/statuses/${id}`);
}

// ─── Orders ─────────────────────────────────────────
export async function getOrders(params = {}) {
  const res = await api.get('/orders/', { params });
  return res.data;
}

export async function getOrder(id) {
  const res = await api.get(`/orders/${id}/`);
  return res.data;
}

export async function createOrder(data) {
  const res = await api.post('/orders/', data);
  return res.data;
}

export async function updateOrder(id, data) {
  const res = await api.put(`/orders/${id}/`, data);
  return res.data;
}

export async function deleteOrder(id) {
  await api.delete(`/orders/${id}/`);
}

// ─── Photos ─────────────────────────────────────────
export async function uploadPhoto(orderId, type, num, file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post(`/orders/${orderId}/photos/${type}/${num}/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function deletePhoto(orderId, type, num) {
  await api.delete(`/orders/${orderId}/photos/${type}/${num}/`);
}

export function getPhotoUrl(orderId, type, num) {
  const token = localStorage.getItem('access_token');
  return `${API_BASE_URL}/orders/${orderId}/photos/${type}/${num}/?token=${token}`;
}

// ─── PDF Export ────────────────────────────────────────
export async function exportOrderPdf(orderId) {
  const token = localStorage.getItem('access_token');
  const res = await fetch(`${API_BASE_URL}/orders/${orderId}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('下載失敗');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `工單_${orderId}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

// Legacy named export for authAPI
export const authAPI = {
  login: (username, password) => api.post('/members/login', { username, password }),
};

export default api;
