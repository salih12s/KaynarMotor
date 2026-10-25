import api, { type Govde } from '../../shared/api/istemci';

// Raporlar. Yanıt şekilleri rapor ekranları TypeScript'e geçerken (aşama 4.6) `shared/tipler/rapor.ts`'de tanımlanır.
export const raporService = {
  getGunluk: (tarih: string) => api.get<unknown>('/raporlar/gunluk', { params: { tarih } }),
  getAralik: (baslangic: string, bitis: string) => api.get<unknown>('/raporlar/aralik', { params: { baslangic, bitis } }),
  getGenel: () => api.get<unknown>('/raporlar/genel'),
  getFisKar: (baslangic: string, bitis: string) => api.get<unknown>('/raporlar/fis-kar', { params: { baslangic, bitis } }),
  getPersoneller: () => api.get<unknown>('/raporlar/personeller'),
  getYatirimciRapor: (params: Govde) => api.get<unknown>('/raporlar/yatirimci-rapor', { params }),
  getYatirimciOzet: (baslangic: string, bitis: string) => api.get<unknown>('/raporlar/yatirimci-ozet', { params: { baslangic, bitis } }),
};

// Veresiye (Açık borçlar)
export const veresiyeService = {
  getAll: () => api.get<unknown>('/veresiye'),
};
