import api, { type Govde } from '../../shared/api/istemci';
import type { AralikRaporu, FisKarSatiri, VeresiyeYaniti, YatirimciOzeti, YatirimciRaporu } from '../../shared/tipler';

// Raporlar
export const raporService = {
  getGunluk: (tarih: string) => api.get<unknown>('/raporlar/gunluk', { params: { tarih } }),
  getAralik: (baslangic: string, bitis: string) => api.get<AralikRaporu>('/raporlar/aralik', { params: { baslangic, bitis } }),
  getGenel: () => api.get<unknown>('/raporlar/genel'),
  getFisKar: (baslangic: string, bitis: string) => api.get<FisKarSatiri[]>('/raporlar/fis-kar', { params: { baslangic, bitis } }),
  getPersoneller: () => api.get<string[]>('/raporlar/personeller'),
  getYatirimciRapor: (params: Govde) => api.get<YatirimciRaporu>('/raporlar/yatirimci-rapor', { params }),
  getYatirimciOzet: (baslangic: string, bitis: string) => api.get<YatirimciOzeti[]>('/raporlar/yatirimci-ozet', { params: { baslangic, bitis } }),
};

// Veresiye (Açık borçlar)
export const veresiyeService = {
  getAll: () => api.get<VeresiyeYaniti>('/veresiye'),
};
