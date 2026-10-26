import api, { API_URL, type Govde } from '../../shared/api/istemci';
import type { BelgeArsivGrubu, Motor, MotorIstatistik, SatisBelgesi, SifirMotor } from '../../shared/tipler';

// 2. El Motor
export const ikinciElMotorService = {
  getAll: (params?: Govde) => api.get<Motor[]>('/ikinci-el-motor', { params }),
  getById: (id: number) => api.get<Motor>(`/ikinci-el-motor/${id}`),
  create: (data: Govde) => api.post<Motor>('/ikinci-el-motor', data),
  update: (id: number, data: Govde) => api.put<Motor>(`/ikinci-el-motor/${id}`, data),
  delete: (id: number) => api.delete<unknown>(`/ikinci-el-motor/${id}`),
  getStats: () => api.get<MotorIstatistik>('/ikinci-el-motor/stats/ozet'),
};

// Sıfır motor stoğu (model listesi). Görseller base64 data URL dizisi olarak gönderilir; ilki kapak.
export const sifirMotorService = {
  getAll: () => api.get<SifirMotor[]>('/sifir-motor'),
  getById: (id: number) => api.get<SifirMotor>(`/sifir-motor/${id}`),
  create: (data: Govde) => api.post<SifirMotor>('/sifir-motor', data, { timeout: 120000 }),
  update: (id: number, data: Govde) => api.put<SifirMotor>(`/sifir-motor/${id}`, data, { timeout: 120000 }),
  delete: (id: number) => api.delete<unknown>(`/sifir-motor/${id}`),
  // Herkese açık uç: <img src> başlık gönderemez
  gorselUrl: (id: number) => `${API_URL}/sifir-motor/gorsel/${id}`,
};

// Satış belgeleri (sözleşme vb.). Yükleme JSON değil, ham dosya gövdesidir (base64 şişmesi olmasın).
export const satisBelgeService = {
  list: (motorId: number) => api.get<SatisBelgesi[]>(`/satis-belgeleri/motor/${motorId}`),
  arsiv: () => api.get<BelgeArsivGrubu[]>('/satis-belgeleri/arsiv'),
  upload: (motorId: number, file: File) =>
    api.post<unknown>(`/satis-belgeleri/motor/${motorId}`, file, {
      params: { ad: file.name },
      headers: { 'Content-Type': 'application/octet-stream' },
      timeout: 120000,
    }),
  download: (id: number) => api.get<Blob>(`/satis-belgeleri/${id}/indir`, { responseType: 'blob' }),
  delete: (id: number) => api.delete<unknown>(`/satis-belgeleri/${id}`),
};
