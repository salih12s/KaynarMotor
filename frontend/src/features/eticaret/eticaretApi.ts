import api, { type Govde } from '../../shared/api/istemci';
import type { EticaretIstatistik, EticaretSatis, Platform } from '../../shared/tipler';

// E-Ticaret
export const eticaretService = {
  // Platformlar
  getPlatformlar: () => api.get<Platform[]>('/eticaret/platformlar'),
  getPlatforms: () => api.get<Platform[]>('/eticaret/platformlar'),
  createPlatform: (data: Govde) => api.post<unknown>('/eticaret/platformlar', data),
  updatePlatform: (id: number, data: Govde) => api.put<unknown>(`/eticaret/platformlar/${id}`, data),
  deletePlatform: (id: number) => api.delete<unknown>(`/eticaret/platformlar/${id}`),
  // Satışlar
  getAll: () => api.get<EticaretSatis[]>('/eticaret'),
  getSales: () => api.get<EticaretSatis[]>('/eticaret'),
  getById: (id: number) => api.get<EticaretSatis>(`/eticaret/${id}`),
  create: (data: Govde) => api.post<unknown>('/eticaret', data),
  createSale: (data: Govde) => api.post<unknown>('/eticaret', data),
  update: (id: number, data: Govde) => api.put<unknown>(`/eticaret/${id}`, data),
  updateSale: (id: number, data: Govde) => api.put<unknown>(`/eticaret/${id}`, data),
  delete: (id: number) => api.delete<unknown>(`/eticaret/${id}`),
  deleteSale: (id: number) => api.delete<unknown>(`/eticaret/${id}`),
  getStats: () => api.get<EticaretIstatistik>('/eticaret/stats'),
};
