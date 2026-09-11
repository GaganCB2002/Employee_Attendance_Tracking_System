import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Attach JWT token from localStorage if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('attendx_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for session expiration and lockouts
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't auto-redirect if on login page
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('attendx_token');
        localStorage.removeItem('attendx_user');
        window.location.href = '/login?session_expired=1';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
