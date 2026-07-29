import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config/api';
import { queryClient } from '../lib/queryClient';

const AdminAuthContext = createContext(null);

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const savedAdmin = localStorage.getItem('admin_user');
    if (token && savedAdmin) {
      setAdmin(JSON.parse(savedAdmin));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const form = new URLSearchParams();
    form.append('username', email);
    form.append('password', password);

    const res = await axios.post(
      `${API_BASE}/auth/admin/login`,
      form,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const token = res.data.access_token;
    localStorage.setItem('admin_token', token);

    // Fetch profile
    const me = await axios.get(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    localStorage.setItem('admin_user', JSON.stringify(me.data));
    setAdmin(me.data);
    return me.data;
  };

  const logout = async () => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      try {
        await axios.post(
          `${API_BASE}/auth/signout`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch {
        // Still clear local session even if revoke fails (e.g. Redis down / expired token)
      }
    }
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    queryClient.clear();
    setAdmin(null);
  };

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => useContext(AdminAuthContext);

export const getToken = () => localStorage.getItem('admin_token');

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use(config => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
