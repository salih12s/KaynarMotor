/*
 * İkinci el motor tipleri. Kaynak: `ikinci_el_motorlar` ve `satis_belgeleri` tabloları.
 * Sunucu, kullanıcının yetkisine göre alanları SİLER (backend ikinciElMotor.gorunum.ts: personel/muhasebeci/yatırımcı
 * için allowlist): bu yüzden mali ve kişi alanları isteğe bağlıdır; ekran `undefined` ile karşılaşabilir.
 */
import type { Sayi } from '../utils/bicim';

export interface Motor {
  id: number;
  tarih?: string | null;
  plaka?: string | null;
  marka?: string | null;
  model?: string | null;
  yil?: number | null;
  km?: number | null;
  durum?: string | null;
  /** 'sahip' (işletmenin) | 'yatirimci' | 'komisyon' */
  stok_tipi?: string | null;
  created_at?: string;
  updated_at?: string;
  fatura_kesildi?: boolean | null;
  eski_kayit?: boolean | null;
  // Alış tarafı
  alis_fiyati?: Sayi;
  noter_alis?: Sayi;
  masraflar?: Sayi;
  // Satış tarafı
  satis_fiyati?: Sayi;
  noter_satis?: Sayi;
  kalan_odeme?: Sayi;
  /** JSON metni: ödeme dağılımı. */
  odeme_detaylari?: string | null;
  odeme_sekli?: string | null;
  satis_tarihi?: string | null;
  tamamlama_tarihi?: string | null;
  yevmiye_no?: string | null;
  aciklama?: string | null;
  // Kişiler
  alici_adi?: string | null;
  alici_tc?: string | null;
  alici_telefon?: string | null;
  alici_adres?: string | null;
  satici_adi?: string | null;
  satici_tc?: string | null;
  komisyoncu_adi?: string | null;
  komisyoncu_telefon?: string | null;
  komisyoncu_tutari?: Sayi;
  // Kâr ve yatırımcı (yalnızca admin / ilgili yatırımcı)
  kar?: Sayi;
  yatirimci_id?: number | null;
  yatirimci_kar_orani?: Sayi;
  yatirimci_kar?: Sayi;
  liste_fiyati?: Sayi;
  // Vitrin alanları (stok kaydıyla birlikte tutulur)
  vitrin_baslik?: string | null;
  vitrin_aciklama?: string | null;
  vitrin_segment?: string | null;
  vitrin_cc?: number | null;
  vitrin_fiyat?: Sayi;
  vitrin_hasar?: string | null;
}

/** `/ikinci-el-motor/stats/ozet` yanıtı: satış sayaçları (BIGINT/DECIMAL toplamlar metin gelir). */
export type MotorIstatistik = Record<string, Sayi>;

/** `satis_belgeleri` listesi (içerik dahil değil). */
export interface SatisBelgesi {
  id: number;
  motor_id: number;
  dosya_adi: string;
  mime: string;
  boyut: number;
  yukleyen_id: number | null;
  yukleyen_adi: string | null;
  created_at: string;
  /** Belge arşivi listesinde motorun plakası ve bilgisi de gelir. */
  plaka?: string | null;
  marka?: string | null;
  model?: string | null;
}
