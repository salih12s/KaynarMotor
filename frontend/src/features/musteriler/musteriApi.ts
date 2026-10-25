import api, { type Govde } from '../../shared/api/istemci';
import type { Musteri, MusteriDetayi } from '../../shared/tipler';

// Müşteriler
export const musteriService = {
  getAll: () => api.get<Musteri[]>('/musteriler'),
  getById: (id: number) => api.get<MusteriDetayi>(`/musteriler/${id}`),
  create: (data: Govde) => api.post<unknown>('/musteriler', data),
  update: (id: number, data: Govde) => api.put<unknown>(`/musteriler/${id}`, data),
  delete: (id: number) => api.delete<unknown>(`/musteriler/${id}`),
  search: (query: string) => api.get<Musteri[]>(`/musteriler/ara/${encodeURIComponent(query)}`),
  searchByPhone: (telefon: string) => api.get<Musteri | null>(`/musteriler/telefon/${encodeURIComponent(telefon)}`),
};
