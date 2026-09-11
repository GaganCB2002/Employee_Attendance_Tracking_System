import api from './client';

export const authApi = {
  login: async (identifier, password) => {
    const res = await api.post('/auth/login', { identifier, password });
    return res.data;
  },

  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },

  logout: async () => {
    const res = await api.post('/auth/logout');
    return res.data;
  },

  lockSession: async () => {
    const res = await api.post('/auth/lock-session');
    return res.data;
  },
};
