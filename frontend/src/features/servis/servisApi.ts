import api, { type Govde } from '../../shared/api/istemci';
import type { IsEmri, IsEmriDetayi } from '../../shared/tipler';

// İş Emirleri
export const isEmriService = {
  getAll: (params?: Govde) => api.get<IsEmri[]>('/is-emirleri', { params }),
  getById: (id: number) => api.get<IsEmriDetayi>(`/is-emirleri/${id}`),
  create: (data: Govde) => api.post<IsEmriDetayi>('/is-emirleri', data),
  update: (id: number, data: Govde) => api.put<IsEmriDetayi>(`/is-emirleri/${id}`, data),
  delete: (id: number) => api.delete<unknown>(`/is-emirleri/${id}`),
  getNextFisNo: () => api.get<{ nextFisNo: number }>('/is-emirleri/next-fis-no/preview'),
};

// Servis geçmişi (müşteri QR sayfası — token halka açık, oluşturma yetkili)
export const servisGecmisiService = {
  getByToken: (token: string) => api.get<unknown>(`/servis-gecmisi/${encodeURIComponent(token)}`),
  getQrToken: (plaka: string) => api.post<{ token: string }>('/is-emirleri/qr-token', { plaka }),
};
