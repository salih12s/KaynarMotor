import api from '../../shared/api/istemci';

// Auth
export const authService = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  verify: () => api.get('/auth/verify'),
  getUsers: () => api.get('/auth/users'),
  createUser: (data) => api.post('/auth/users', data),
  getYatirimcilar: () => api.get('/auth/yatirimcilar'),
  getPersonelListesi: () => api.get('/auth/personel-listesi'),
  approveUser: (id) => api.patch(`/auth/users/${id}/approve`),
  rejectUser: (id) => api.patch(`/auth/users/${id}/reject`),
  deleteUser: (id) => api.delete(`/auth/users/${id}`),
  setSifre: (id, sifre) => api.patch(`/auth/users/${id}/sifre`, { sifre }),
  setYetkiler: (id, yetkiler) => api.patch(`/auth/users/${id}/yetkiler`, yetkiler),
  getActivityLogs: () => api.get('/auth/activity-logs'),
  getUserActivityLogs: (id) => api.get(`/auth/users/${id}/activity-logs`),
};
