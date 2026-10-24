import api from '../../shared/api/istemci';

// 2. El Motor
export const ikinciElMotorService = {
  getAll: (params) => api.get('/ikinci-el-motor', { params }),
  getById: (id) => api.get(`/ikinci-el-motor/${id}`),
  create: (data) => api.post('/ikinci-el-motor', data),
  update: (id, data) => api.put(`/ikinci-el-motor/${id}`, data),
  delete: (id) => api.delete(`/ikinci-el-motor/${id}`),
  getStats: () => api.get('/ikinci-el-motor/stats/ozet'),
};

// Satış belgeleri (sözleşme vb.). Yükleme JSON değil, ham dosya gövdesidir (base64 şişmesi olmasın).
export const satisBelgeService = {
  list: (motorId) => api.get(`/satis-belgeleri/motor/${motorId}`),
  arsiv: () => api.get('/satis-belgeleri/arsiv'),
  upload: (motorId, file) =>
    api.post(`/satis-belgeleri/motor/${motorId}`, file, {
      params: { ad: file.name },
      headers: { 'Content-Type': 'application/octet-stream' },
      timeout: 120000,
    }),
  download: (id) => api.get(`/satis-belgeleri/${id}/indir`, { responseType: 'blob' }),
  delete: (id) => api.delete(`/satis-belgeleri/${id}`),
};
