import { z } from 'zod';
import { gevsekMantiksal, gevsekMetin, gevsekSayi, serbest } from '../../core/semalar';

/**
 * Motor kaydı alanları. POST gövdesi ve PUT gövdesi aynı alanları kullanır; PUT KISMİ güncellemedir (gönderilmeyen
 * alan mevcut değerle korunur: şema alanları isteğe bağlı bırakır, service eksik/undefined alanı mevcut kayıttan alır).
 */
const motorAlanlari = {
  tarih: gevsekMetin,
  plaka: gevsekMetin,
  marka: gevsekMetin,
  model: gevsekMetin,
  km: gevsekSayi,
  yil: gevsekSayi,
  alis_fiyati: gevsekSayi,
  satis_fiyati: gevsekSayi,
  noter_alis: gevsekSayi,
  noter_satis: gevsekSayi,
  masraflar: gevsekSayi,
  alici_adi: gevsekMetin,
  alici_tc: gevsekMetin,
  alici_telefon: gevsekMetin,
  alici_adres: gevsekMetin,
  odeme_sekli: gevsekMetin,
  aciklama: gevsekMetin,
  durum: gevsekMetin,
  stok_tipi: gevsekMetin,
  satici_adi: gevsekMetin,
  satici_tc: gevsekMetin,
  kalan_odeme: gevsekSayi,
  fatura_kesildi: gevsekMantiksal,
  yevmiye_no: gevsekMetin,
  satis_tarihi: gevsekMetin,
  komisyoncu_adi: gevsekMetin,
  komisyoncu_telefon: gevsekMetin,
  komisyoncu_tutari: gevsekSayi,
  yatirimci_id: gevsekSayi,
  yatirimci_kar_orani: gevsekSayi,
  yatirimci_kar: gevsekSayi,
  liste_fiyati: gevsekSayi,
  /** Parçalı ödeme dağılımı: nesne, dizi ya da JSON metni. */
  odeme_detaylari: serbest,
  vitrin_baslik: gevsekMetin,
  vitrin_aciklama: gevsekMetin,
  vitrin_segment: gevsekMetin,
  vitrin_cc: gevsekSayi,
  vitrin_hasar: gevsekMetin,
};

/** POST / gövdesi. */
export const motorOlusturGovdesi = z.object(motorAlanlari);

/** PUT /:id gövdesi (kısmi güncelleme). `eski_kayit` yalnızca güncellemede gelir. */
export const motorGuncelleGovdesi = z.object({ ...motorAlanlari, eski_kayit: gevsekMantiksal });

export type MotorOlusturGovdesi = z.infer<typeof motorOlusturGovdesi>;
export type MotorGuncelleGovdesi = z.infer<typeof motorGuncelleGovdesi>;

/** GET / sorgu parametreleri. */
export interface MotorFiltresi {
  baslangic?: string;
  bitis?: string;
  durum?: string;
}
