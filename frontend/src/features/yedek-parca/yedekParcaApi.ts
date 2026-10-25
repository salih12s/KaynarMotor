import api, { type Govde } from '../../shared/api/istemci';
import type { YedekParcaSatis, YedekParcaStok } from '../../shared/tipler';

// Yedek Parçalar
export const yedekParcaService = {
  getAll: () => api.get<YedekParcaSatis[]>('/yedek-parcalar'),
  getById: (id: number) => api.get<YedekParcaSatis>(`/yedek-parcalar/${id}`),
  create: (data: Govde) => api.post<unknown>('/yedek-parcalar', data),
  update: (id: number, data: Govde) => api.put<unknown>(`/yedek-parcalar/${id}`, data),
  delete: (id: number) => api.delete<unknown>(`/yedek-parcalar/${id}`),
};

// Yedek Parça Stok
export const yedekParcaStokService = {
  getAll: () => api.get<YedekParcaStok[]>('/yedek-parca-stok'),
  search: (q: string) => api.get<YedekParcaStok[]>('/yedek-parca-stok/ara', { params: { q } }),
  getByBarkod: (kod: string) => api.get<YedekParcaStok>(`/yedek-parca-stok/barkod/${encodeURIComponent(kod)}`),
  getNextStokKodu: () => api.get<{ nextStokKodu: string }>('/yedek-parca-stok/next-stok-kodu'),
  create: (data: Govde) => api.post<YedekParcaStok>('/yedek-parca-stok', data),
  update: (id: number, data: Govde) => api.put<YedekParcaStok>(`/yedek-parca-stok/${id}`, data),
  delete: (id: number) => api.delete<unknown>(`/yedek-parca-stok/${id}`),
  topluEkle: (stoklar: Govde[]) => api.post<{ message: string }>('/yedek-parca-stok/toplu', { stoklar }),
};
