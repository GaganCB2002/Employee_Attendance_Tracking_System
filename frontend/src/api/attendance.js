import api from './client';

export const attendanceApi = {
  // Employee Checkpoint
  getCheckpointStatus: async () => {
    const res = await api.get('/attendance/status');
    return res.data;
  },

  submitCheckpoint: async (payload) => {
    // Supports either FormData (with file) or JSON (with base64 photo)
    const isFormData = payload instanceof FormData;
    const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
    const res = await api.post('/attendance/checkpoint', payload, config);
    return res.data;
  },

  getMyRecords: async (date) => {
    const res = await api.get('/attendance/my', { params: { date } });
    return res.data;
  },

  // Admin Records & Folder View
  listRecords: async (params = {}) => {
    const res = await api.get('/attendance', { params });
    return res.data;
  },

  getFolderView: async (params = {}) => {
    const res = await api.get('/attendance/folder', { params });
    return res.data;
  },

  approveLateException: async (id, notes = '') => {
    const res = await api.post(`/attendance/${id}/approve`, { notes });
    return res.data;
  },

  // Telemetry Dashboard & Lockouts
  getDashboardAggregates: async (params = {}) => {
    const res = await api.get('/admin/aggregates', { params });
    return res.data;
  },

  getLockouts: async (params = {}) => {
    const res = await api.get('/admin/lockouts', { params });
    return res.data;
  },

  unlockUser: async (id, type = 'EMPLOYEE') => {
    const res = await api.post(`/admin/unlock/${id}`, { type });
    return res.data;
  },

  getAuditLogs: async (limit = 100) => {
    const res = await api.get('/admin/audit', { params: { limit } });
    return res.data;
  },

  getMetadata: async () => {
    const res = await api.get('/admin/metadata');
    return res.data;
  },

  // Employee Management
  listEmployees: async (params = {}) => {
    const res = await api.get('/employees', { params });
    return res.data;
  },

  createEmployee: async (formData) => {
    const isFormData = formData instanceof FormData;
    const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
    const res = await api.post('/employees', formData, config);
    return res.data;
  },

  updateEmployee: async (id, data) => {
    const isFormData = data instanceof FormData;
    const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
    const res = await api.put(`/employees/${id}`, data, config);
    return res.data;
  },

  // Geofence Management
  listGeofences: async (params = {}) => {
    const res = await api.get('/geofences', { params });
    return res.data;
  },

  createGeofence: async (data) => {
    const res = await api.post('/geofences', data);
    return res.data;
  },

  updateGeofence: async (id, data) => {
    const res = await api.put(`/geofences/${id}`, data);
    return res.data;
  },

  deleteGeofence: async (id) => {
    const res = await api.delete(`/geofences/${id}`);
    return res.data;
  },

  validateCoordinates: async (latitude, longitude, sectionId) => {
    const res = await api.post('/geofences/validate', { latitude, longitude, sectionId });
    return res.data;
  },
};
