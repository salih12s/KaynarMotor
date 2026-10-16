import api from '../../shared/api/istemci';

// İş Emirleri
export const isEmriService = {
  getAll: (params) => api.get('/is-emirleri', { params }),
  getById: (id) => api.get(`/is-emirleri/${id}`),
  create: (data) => api.post('/is-emirleri', data),
  update: (id, data) => api.put(`/is-emirleri/${id}`, data),
  delete: (id) => api.delete(`/is-emirleri/${id}`),
  getNextFisNo: () => api.get('/is-emirleri/next-fis-no/preview'),
};

// Servis geçmişi (müşteri QR sayfası — token halka açık, oluşturma yetkili)
export const servisGecmisiService = {
  getByToken: (token) => api.get(`/servis-gecmisi/${encodeURIComponent(token)}`),
  getQrToken: (plaka) => api.post('/is-emirleri/qr-token', { plaka }),
};
