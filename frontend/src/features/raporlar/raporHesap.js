// Rapor ekranlarının hesapları (saf fonksiyonlar: ekran/durum yok, doğrudan test edilebilir).
import { hesaplaKomisyon, detectPlatform } from '../eticaret/komisyon';

// Genel Özet'in "düzeltilmiş" toplamları: e-ticaret kârı sunucudan değil hesaplaKomisyon ile canlı hesaplanır,
// yedek parça envanteri (satış değeri - maliyet) toplama eklenir.
export const hesaplaToplamlar = (rapor) => {
  const hesaplananEticaretKar = rapor?.eticaret?.reduce((t, e) => {
    const pt = detectPlatform(e.platform_adi);
    const h = hesaplaKomisyon(e.satis_fiyati, e.alis_fiyati, e.komisyon_orani, e.kdv_orani || 20, e.kargo_ucreti || 0, e.adet, pt);
    return t + h.netKar;
  }, 0) || 0;
  const yedekParcaKar = rapor ? ((parseFloat(rapor.yedekParcaToplamDeger || 0)) - (parseFloat(rapor.yedekParcaToplamMaliyet || 0))) : 0;
  const duzeltilmisTotalKar = rapor ? (parseFloat(rapor.motorKar || 0) + parseFloat(rapor.isEmriKar || 0) + parseFloat(rapor.aksesuarKar || 0) + hesaplananEticaretKar + yedekParcaKar) : 0;
  const duzeltilmisTotalGelir = rapor ? (parseFloat(rapor.toplam?.gelir || 0) + parseFloat(rapor.yedekParcaToplamDeger || 0)) : 0;
  const duzeltilmisTotalMaliyet = rapor ? (parseFloat(rapor.toplam?.maliyet || 0) + parseFloat(rapor.yedekParcaToplamMaliyet || 0)) : 0;
  return { hesaplananEticaretKar, yedekParcaKar, duzeltilmisTotalKar, duzeltilmisTotalGelir, duzeltilmisTotalMaliyet };
};

// Yatırımcı özeti: stok bilgisi sunucudaki özetten, satılan/satış/kâr değerleri rapordaki motor satışlarından gelir.
export const yatirimciOzetBirlestir = (rapor, yatirimciOzet) => {
  if (!rapor) return yatirimciOzet;
  const motorOzetMap = new Map();
  (rapor.motorlar || []).forEach(m => {
    if (!m.yatirimci_id) return;
    const key = String(m.yatirimci_id);
    const prev = motorOzetMap.get(key) || { satilan_adet: 0, toplam_satis: 0, yatirimci_kar: 0, isletme_kar: 0 };
    const yatirimciKar = parseFloat(m.yatirimci_kar || 0);
    motorOzetMap.set(key, {
      satilan_adet: prev.satilan_adet + 1,
      toplam_satis: prev.toplam_satis + parseFloat(m.satis_fiyati || 0),
      yatirimci_kar: prev.yatirimci_kar + yatirimciKar,
      isletme_kar: prev.isletme_kar + (parseFloat(m.kar || 0) - yatirimciKar),
    });
  });
  return yatirimciOzet.map(y => {
    const motorOzet = motorOzetMap.get(String(y.id)) || {};
    return {
      ...y,
      satilan_adet: motorOzet.satilan_adet || 0,
      toplam_satis: motorOzet.toplam_satis || 0,
      yatirimci_kar: motorOzet.yatirimci_kar || 0,
      isletme_kar: motorOzet.isletme_kar || 0,
    };
  });
};
