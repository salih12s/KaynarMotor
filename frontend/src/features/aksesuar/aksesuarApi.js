import api from '../../shared/api/istemci';

// Aksesuarlar
export const aksesuarService = {
  getAll: () => api.get('/aksesuarlar'),
  getById: (id) => api.get(`/aksesuarlar/${id}`),
  create: (data) => api.post('/aksesuarlar', data),
  update: (id, data) => api.put(`/aksesuarlar/${id}`, data),
  delete: (id) => api.delete(`/aksesuarlar/${id}`),
  getStats: () => api.get('/aksesuarlar/stats/genel'),
};

// Aksesuar Stok
export const aksesuarStokService = {
  getAll: () => api.get('/aksesuar-stok'),
  search: (q) => api.get('/aksesuar-stok/ara', { params: { q } }),
  getByBarkod: (kod) => api.get(`/aksesuar-stok/barkod/${encodeURIComponent(kod)}`),
  getNextStokKodu: () => api.get('/aksesuar-stok/next-stok-kodu'),
  create: (data) => api.post('/aksesuar-stok', data),
  update: (id, data) => api.put(`/aksesuar-stok/${id}`, data),
  delete: (id) => api.delete(`/aksesuar-stok/${id}`),
  topluEkle: (stoklar) => api.post('/aksesuar-stok/toplu', { stoklar }),
};
