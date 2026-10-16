import api from '../../shared/api/istemci';

// Yedek Parçalar
export const yedekParcaService = {
  getAll: () => api.get('/yedek-parcalar'),
  getById: (id) => api.get(`/yedek-parcalar/${id}`),
  create: (data) => api.post('/yedek-parcalar', data),
  update: (id, data) => api.put(`/yedek-parcalar/${id}`, data),
  delete: (id) => api.delete(`/yedek-parcalar/${id}`),
};

// Yedek Parça Stok
export const yedekParcaStokService = {
  getAll: () => api.get('/yedek-parca-stok'),
  search: (q) => api.get('/yedek-parca-stok/ara', { params: { q } }),
  getByBarkod: (kod) => api.get(`/yedek-parca-stok/barkod/${encodeURIComponent(kod)}`),
  getNextStokKodu: () => api.get('/yedek-parca-stok/next-stok-kodu'),
  create: (data) => api.post('/yedek-parca-stok', data),
  update: (id, data) => api.put(`/yedek-parca-stok/${id}`, data),
  delete: (id) => api.delete(`/yedek-parca-stok/${id}`),
  topluEkle: (stoklar) => api.post('/yedek-parca-stok/toplu', { stoklar }),
};
