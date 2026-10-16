import api from '../../shared/api/istemci';

// E-Ticaret
export const eticaretService = {
  // Platformlar
  getPlatformlar: () => api.get('/eticaret/platformlar'),
  getPlatforms: () => api.get('/eticaret/platformlar'),
  createPlatform: (data) => api.post('/eticaret/platformlar', data),
  updatePlatform: (id, data) => api.put(`/eticaret/platformlar/${id}`, data),
  deletePlatform: (id) => api.delete(`/eticaret/platformlar/${id}`),
  // Satışlar
  getAll: () => api.get('/eticaret'),
  getSales: () => api.get('/eticaret'),
  getById: (id) => api.get(`/eticaret/${id}`),
  create: (data) => api.post('/eticaret', data),
  createSale: (data) => api.post('/eticaret', data),
  update: (id, data) => api.put(`/eticaret/${id}`, data),
  updateSale: (id, data) => api.put(`/eticaret/${id}`, data),
  delete: (id) => api.delete(`/eticaret/${id}`),
  deleteSale: (id) => api.delete(`/eticaret/${id}`),
  getStats: () => api.get('/eticaret/stats'),
};
