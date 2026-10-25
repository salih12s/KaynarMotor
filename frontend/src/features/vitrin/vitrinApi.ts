import api, { API_URL, type Govde } from '../../shared/api/istemci';
import type { VitrinIletisim, VitrinIlan, VitrinSegment } from '../../shared/tipler';

/** Tek ilan yanıtı: görsellerin kimlikleri de gelir. */
export interface VitrinIlanDetayi extends VitrinIlan {
  gorsel_idler: number[];
}

/** Marka listesi satırı: marka adı ve ilan adedi (BIGINT, metin gelebilir). */
export interface VitrinMarka {
  marka: string;
  adet: number | string;
}

// Vitrin (genel kullanıma açık mağaza)
export const vitrinService = {
  getAll: (params?: Govde) => api.get<VitrinIlan[]>('/vitrin', { params }),
  getAllAdmin: (params?: Govde) => api.get<VitrinIlan[]>('/vitrin', { params: { ...params, hepsi: 1 } }),
  getById: (id: number) => api.get<VitrinIlanDetayi>(`/vitrin/${id}`),
  getIletisim: () => api.get<VitrinIletisim[]>('/vitrin/iletisim'),
  getSegmentler: () => api.get<VitrinSegment[]>('/vitrin/segmentler'),
  getYuklemeSiniri: () => api.get<unknown>('/vitrin/yukleme-siniri'),
  getMarkalar: (durum?: string) => api.get<VitrinMarka[]>('/vitrin/markalar', { params: durum ? { durum } : {} }),
  addSegment: (ad: string) => api.post<unknown>('/vitrin/segmentler', { ad }),
  create: (data: Govde) => api.post<unknown>('/vitrin', data),
  update: (id: number, data: Govde) => api.put<unknown>(`/vitrin/${id}`, data),
  reorder: (kategori: string, urunIds: number[]) => api.put<unknown>('/vitrin/sirala', { kategori, urun_ids: urunIds }),
  setPublished: (id: number, yayinda: boolean) => api.patch<unknown>(`/vitrin/${id}/yayin`, { yayinda }),
  moveToPosition: (id: number, sira: number) => api.patch<unknown>(`/vitrin/${id}/sira`, { sira }),
  delete: (id: number) => api.delete<unknown>(`/vitrin/${id}`),
  updateIletisim: (kategori: string, data: Govde) => api.put<unknown>(`/vitrin/iletisim/${kategori}`, data),
  gorselUrl: (id: number) => `${API_URL}/vitrin/gorsel/${id}`,
  videoUrl: (id: number) => `${API_URL}/vitrin/video/${id}`,
  iletisimGorselUrl: (kategori: string) => `${API_URL}/vitrin/iletisim-gorsel/${kategori}`,
};
