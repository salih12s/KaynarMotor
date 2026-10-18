import api, { API_URL } from '../../shared/api/istemci';

// Vitrin (genel kullanıma açık mağaza)
export const vitrinService = {
  getAll: (params) => api.get('/vitrin', { params }),
  getAllAdmin: (params) => api.get('/vitrin', { params: { ...params, hepsi: 1 } }),
  getById: (id) => api.get(`/vitrin/${id}`),
  getIletisim: () => api.get('/vitrin/iletisim'),
  getSegmentler: () => api.get('/vitrin/segmentler'),
  getYuklemeSiniri: () => api.get('/vitrin/yukleme-siniri'),
  getMarkalar: (durum) => api.get('/vitrin/markalar', { params: durum ? { durum } : {} }),
  addSegment: (ad) => api.post('/vitrin/segmentler', { ad }),
  create: (data) => api.post('/vitrin', data),
  update: (id, data) => api.put(`/vitrin/${id}`, data),
  reorder: (kategori, urunIds) => api.put('/vitrin/sirala', { kategori, urun_ids: urunIds }),
  setPublished: (id, yayinda) => api.patch(`/vitrin/${id}/yayin`, { yayinda }),
  moveToPosition: (id, sira) => api.patch(`/vitrin/${id}/sira`, { sira }),
  delete: (id) => api.delete(`/vitrin/${id}`),
  updateIletisim: (kategori, data) => api.put(`/vitrin/iletisim/${kategori}`, data),
  gorselUrl: (id) => `${API_URL}/vitrin/gorsel/${id}`,
  videoUrl: (id) => `${API_URL}/vitrin/video/${id}`,
  iletisimGorselUrl: (kategori) => `${API_URL}/vitrin/iletisim-gorsel/${kategori}`,
};
