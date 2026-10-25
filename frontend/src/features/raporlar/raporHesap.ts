// Rapor ekranlarının hesapları (saf fonksiyonlar: ekran/durum yok, doğrudan test edilebilir).
import { hesaplaKomisyon, detectPlatform } from '../eticaret/komisyon';
import { sayiDegeri } from '../../shared/utils/bicim';
import type { AralikRaporu, YatirimciOzeti } from '../../shared/tipler';

// Genel Özet'in "düzeltilmiş" toplamları: e-ticaret kârı sunucudan değil hesaplaKomisyon ile canlı hesaplanır,
// yedek parça envanteri (satış değeri - maliyet) toplama eklenir.
export const hesaplaToplamlar = (rapor: AralikRaporu | null | undefined) => {
  const hesaplananEticaretKar =
    rapor?.eticaret?.reduce((t, e) => {
      const pt = detectPlatform(e.platform_adi);
      const h = hesaplaKomisyon(e.satis_fiyati, e.alis_fiyati, e.komisyon_orani, e.kdv_orani || 20, e.kargo_ucreti || 0, e.adet, pt);
      return t + h.netKar;
    }, 0) || 0;
  const yedekParcaKar = rapor ? sayiDegeri(rapor.yedekParcaToplamDeger) - sayiDegeri(rapor.yedekParcaToplamMaliyet) : 0;
  const duzeltilmisTotalKar = rapor
    ? sayiDegeri(rapor.motorKar) + sayiDegeri(rapor.isEmriKar) + sayiDegeri(rapor.aksesuarKar) + hesaplananEticaretKar + yedekParcaKar
    : 0;
  const duzeltilmisTotalGelir = rapor ? sayiDegeri(rapor.toplam?.gelir) + sayiDegeri(rapor.yedekParcaToplamDeger) : 0;
  const duzeltilmisTotalMaliyet = rapor ? sayiDegeri(rapor.toplam?.maliyet) + sayiDegeri(rapor.yedekParcaToplamMaliyet) : 0;
  return { hesaplananEticaretKar, yedekParcaKar, duzeltilmisTotalKar, duzeltilmisTotalGelir, duzeltilmisTotalMaliyet };
};

interface MotorOzeti {
  satilan_adet: number;
  toplam_satis: number;
  yatirimci_kar: number;
  isletme_kar: number;
}

// Yatırımcı özeti: stok bilgisi sunucudaki özetten, satılan/satış/kâr değerleri rapordaki motor satışlarından gelir.
export const yatirimciOzetBirlestir = (rapor: AralikRaporu | null | undefined, yatirimciOzet: YatirimciOzeti[]): YatirimciOzeti[] => {
  if (!rapor) return yatirimciOzet;
  const motorOzetMap = new Map<string, MotorOzeti>();
  (rapor.motorlar || []).forEach((m) => {
    if (!m.yatirimci_id) return;
    const key = String(m.yatirimci_id);
    const prev = motorOzetMap.get(key) || { satilan_adet: 0, toplam_satis: 0, yatirimci_kar: 0, isletme_kar: 0 };
    const yatirimciKar = sayiDegeri(m.yatirimci_kar);
    motorOzetMap.set(key, {
      satilan_adet: prev.satilan_adet + 1,
      toplam_satis: prev.toplam_satis + sayiDegeri(m.satis_fiyati),
      yatirimci_kar: prev.yatirimci_kar + yatirimciKar,
      isletme_kar: prev.isletme_kar + (sayiDegeri(m.kar) - yatirimciKar),
    });
  });
  return yatirimciOzet.map((y) => {
    const motorOzet = motorOzetMap.get(String(y.id));
    return {
      ...y,
      satilan_adet: motorOzet?.satilan_adet || 0,
      toplam_satis: motorOzet?.toplam_satis || 0,
      yatirimci_kar: motorOzet?.yatirimci_kar || 0,
      isletme_kar: motorOzet?.isletme_kar || 0,
    };
  });
};
