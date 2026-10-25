import api, { type Govde } from '../../shared/api/istemci';
import type { AksesuarIstatistik, AksesuarSatis, AksesuarStok } from '../../shared/tipler';

// Aksesuarlar
export const aksesuarService = {
  getAll: () => api.get<AksesuarSatis[]>('/aksesuarlar'),
  getById: (id: number) => api.get<AksesuarSatis>(`/aksesuarlar/${id}`),
  create: (data: Govde) => api.post<unknown>('/aksesuarlar', data),
  update: (id: number, data: Govde) => api.put<unknown>(`/aksesuarlar/${id}`, data),
  delete: (id: number) => api.delete<unknown>(`/aksesuarlar/${id}`),
  getStats: () => api.get<AksesuarIstatistik>('/aksesuarlar/stats/genel'),
};

// Aksesuar Stok
export const aksesuarStokService = {
  getAll: () => api.get<AksesuarStok[]>('/aksesuar-stok'),
  search: (q: string) => api.get<AksesuarStok[]>('/aksesuar-stok/ara', { params: { q } }),
  getByBarkod: (kod: string) => api.get<AksesuarStok>(`/aksesuar-stok/barkod/${encodeURIComponent(kod)}`),
  getNextStokKodu: () => api.get<{ nextStokKodu: string }>('/aksesuar-stok/next-stok-kodu'),
  create: (data: Govde) => api.post<AksesuarStok>('/aksesuar-stok', data),
  update: (id: number, data: Govde) => api.put<AksesuarStok>(`/aksesuar-stok/${id}`, data),
  delete: (id: number) => api.delete<unknown>(`/aksesuar-stok/${id}`),
  topluEkle: (stoklar: Govde[]) => api.post<{ message: string }>('/aksesuar-stok/toplu', { stoklar }),
};
