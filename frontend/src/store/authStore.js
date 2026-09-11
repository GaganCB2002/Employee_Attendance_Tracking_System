import { create } from 'zustand';
import { authApi } from '../api/auth';

export const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('attendx_user') || 'null'),
  token: localStorage.getItem('attendx_token') || null,
  isLoading: false,
  error: null,
  isLocked: false,
  remainingAttempts: null,

  login: async (identifier, password) => {
    set({ isLoading: true, error: null, isLocked: false });
    try {
      const data = await authApi.login(identifier, password);
      if (data.success && data.token) {
        localStorage.setItem('attendx_token', data.token);
        localStorage.setItem('attendx_user', JSON.stringify(data.user));
        set({
          user: data.user,
          token: data.token,
          isLoading: false,
          error: null,
          isLocked: false,
        });
        return { success: true, user: data.user };
      }
      set({ isLoading: false, error: data.error || 'Login failed' });
      return { success: false, error: data.error };
    } catch (err) {
      const errRes = err.response?.data;
      const isLocked = errRes?.isLocked || false;
      const errorMsg = errRes?.error || 'Authentication failed. Check credentials or network.';
      const remainingAttempts = errRes?.remainingAttempts;

      set({
        isLoading: false,
        error: errorMsg,
        isLocked,
        remainingAttempts,
      });
      return { success: false, error: errorMsg, isLocked };
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch (e) {
      // ignore
    } finally {
      localStorage.removeItem('attendx_token');
      localStorage.removeItem('attendx_user');
      set({ user: null, token: null, error: null, isLocked: false });
    }
  },

  checkAuth: async () => {
    const token = localStorage.getItem('attendx_token');
    if (!token) {
      set({ user: null, token: null });
      return null;
    }
    try {
      const data = await authApi.getMe();
      if (data.success && data.user) {
        localStorage.setItem('attendx_user', JSON.stringify(data.user));
        set({ user: data.user });
        return data.user;
      }
    } catch (err) {
      localStorage.removeItem('attendx_token');
      localStorage.removeItem('attendx_user');
      set({ user: null, token: null });
    }
    return null;
  },
}));
