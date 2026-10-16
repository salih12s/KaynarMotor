import api from '../../shared/api/istemci';

// Müşteriler
export const musteriService = {
  getAll: () => api.get('/musteriler'),
  getById: (id) => api.get(`/musteriler/${id}`),
  create: (data) => api.post('/musteriler', data),
  update: (id, data) => api.put(`/musteriler/${id}`, data),
  delete: (id) => api.delete(`/musteriler/${id}`),
  search: (query) => api.get(`/musteriler/ara/${encodeURIComponent(query)}`),
  searchByPhone: (telefon) => api.get(`/musteriler/telefon/${encodeURIComponent(telefon)}`),
};
