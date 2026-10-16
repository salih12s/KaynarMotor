import api from '../../shared/api/istemci';

// Raporlar
export const raporService = {
  getGunluk: (tarih) => api.get('/raporlar/gunluk', { params: { tarih } }),
  getAralik: (baslangic, bitis) => api.get('/raporlar/aralik', { params: { baslangic, bitis } }),
  getGenel: () => api.get('/raporlar/genel'),
  getFisKar: (baslangic, bitis) => api.get('/raporlar/fis-kar', { params: { baslangic, bitis } }),
  getPersoneller: () => api.get('/raporlar/personeller'),
  getYatirimciRapor: (params) => api.get('/raporlar/yatirimci-rapor', { params }),
  getYatirimciOzet: (baslangic, bitis) => api.get('/raporlar/yatirimci-ozet', { params: { baslangic, bitis } }),
};

// Veresiye (Açık borçlar)
export const veresiyeService = {
  getAll: () => api.get('/veresiye'),
};
